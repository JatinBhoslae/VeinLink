import express from 'express';
import EmergencyRequest from '../models/EmergencyRequest.model.js';
import Donor from '../models/Donor.model.js';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { getIO } from '../utils/socket.js';
import { sendEmergencyAlertEmail, sendDonorAcceptedEmail } from '../utils/emergencyEmail.js';
import PublicUser from '../models/PublicUser.model.js';

const router = express.Router();

// ============================================================
// Haversine formula — distance between two lat/lng pairs in km
// ============================================================
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ============================================================
// Priority scoring for donors (lower = better)
// ============================================================
function computeDonorScore(donor, patientLat, patientLng) {
    let score = 0;

    // 1. Distance (weight 50%)
    if (donor.location?.coordinates) {
        const [lng, lat] = donor.location.coordinates;
        const dist = haversineDistance(patientLat, patientLng, lat, lng);
        score += dist * 50; // closer = lower score
        donor._distanceKm = Math.round(dist * 100) / 100;
    } else {
        score += 9999;
        donor._distanceKm = null;
    }

    // 2. Last donation date — prefer donors who haven't donated recently (weight 30%)
    if (donor.lastDonationDate) {
        const daysSinceLastDonation =
            (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
        // More days since last donation = lower score (better)
        score -= Math.min(daysSinceLastDonation, 365) * 0.3;
    } else {
        // Never donated — very available
        score -= 365 * 0.3;
    }

    // 3. Eligibility bonus (weight 20%)
    if (donor.isEligible) {
        score -= 20;
    }

    // 4. Live Signal Bonus (Tactical Heartbeat)
    // If operative has a heartbeat in the last 5 minutes, give a massive priority boost
    if (donor.locationUpdatedAt) {
        const minutesSincePulse = (Date.now() - new Date(donor.locationUpdatedAt).getTime()) / (1000 * 60);
        if (minutesSincePulse < 5) {
            score -= 100; // Peak priority for live operatives
            donor._isLive = true;
        }
    }

    donor._score = Math.round(score * 100) / 100;
    return donor;
}

// ============================================================
// Find donors within a given radius for a blood group
// ============================================================
async function findDonorsInRadius(bloodGroup, longitude, latitude, radiusKm, excludeIds = []) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Search Strategic Hospital-Registered Donors
    const donorQuery = {
        bloodGroup,
        isEligible: true,
        _id: { $nin: excludeIds }
    };

    // 2. Search Live Public Operatives (Tactical Network)
    const publicUserQuery = {
        bloodGroup,
        isActive: true,
        _id: { $nin: excludeIds }
    };

    try {
        const [registeredDonors, publicOperatives] = await Promise.all([
            Donor.find({
                ...donorQuery,
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                        $maxDistance: radiusKm * 1000,
                    },
                },
            }).limit(25),
            PublicUser.find({
                ...publicUserQuery,
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                        $maxDistance: radiusKm * 1000,
                    },
                },
            }).limit(25)
        ]);

        return [...registeredDonors, ...publicOperatives];
    } catch (err) {
        console.log('📡 [SIGNAL ERROR] High-frequency geospatial search failed:', err.message);
        return [];
    }
}

// ============================================================
// POST /api/emergency-broadcast — Create emergency request
// (Public user creates the emergency request)
// ============================================================
router.post('/', protectPublic, async (req, res) => {
    try {
        const { bloodGroup, latitude, longitude, notes } = req.body;
        const user = req.publicUser;

        if (!bloodGroup || latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'Blood group and location (latitude, longitude) are required.',
            });
        }

        // Check if user already has an active request
        const existingActive = await EmergencyRequest.findOne({
            patientId: user._id,
            status: 'Active',
        });
        if (existingActive) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active emergency request. Please wait or cancel it first.',
                data: existingActive,
            });
        }

        // Create the emergency request
        const emergencyRequest = await EmergencyRequest.create({
            patientId: user._id,
            patientName: `${user.firstName} ${user.lastName}`,
            patientPhone: user.phone || '',
            bloodGroup,
            patientLocation: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            currentSearchRadius: 1,
            notes: notes || '',
            radiusExpandedAt: [{ radius: 1, expandedAt: new Date() }],
        });

        // Find donors within 1km radius (excluding the requester asset)
        const donors = await findDonorsInRadius(bloodGroup, longitude, latitude, 1, [user._id]);

        // Score and rank donors
        const rankedDonors = donors
            .map((d) => computeDonorScore(d.toObject ? d.toObject() : d, latitude, longitude))
            .sort((a, b) => a._score - b._score);

        // Create donor response entries (Automated Donor Chain System)
        const donorResponses = rankedDonors.map((d, idx) => ({
            donorId: d._id,
            status: idx < 2 ? 'Pending' : 'Queued',
            notifiedAt: idx < 2 ? new Date() : null,
            distanceKm: d._distanceKm,
            notifiedAtRadius: 1,
        }));

        emergencyRequest.donorResponses = donorResponses;
        const initialDonorsNotified = Math.min(2, rankedDonors.length);
        emergencyRequest.totalDonorsNotified = initialDonorsNotified;
        await emergencyRequest.save();

        const initialDonors = rankedDonors.slice(0, 2);

        // Send real-time notifications to each donor
        try {
            const io = getIO();
            for (const donor of initialDonors) {
                const room = `user_${donor._id}`;
                console.log(`📡 [SIGNAL DISPATCH] Emitting mission to room: ${room} for donor: ${donor.firstName}`);
                
                io.to(room).emit('emergency_broadcast_alert', {
                    requestId: emergencyRequest._id,
                    bloodGroup,
                    patientName: emergencyRequest.patientName,
                    distanceKm: donor._distanceKm,
                    donorId: donor._id,
                    donorName: `${donor.firstName} ${donor.lastName}`,
                    message: `Emergency Alert: A nearby patient urgently needs ${bloodGroup} blood.`,
                    timestamp: new Date(),
                });
            }

            // Also broadcast to all connected users for global awareness
            io.emit('emergency_broadcast_new', {
                requestId: emergencyRequest._id,
                bloodGroup,
                radius: 1,
                donorsNotified: donorResponses.length,
                timestamp: new Date(),
            });
        } catch (socketErr) {
            console.error('Socket broadcast failed (non-critical):', socketErr.message);
        }

        // Send email notifications to all matched donors (async, non-blocking)
        const emailResults = [];
        for (const donor of initialDonors) {
            if (donor.email) {
                sendEmergencyAlertEmail(donor, emergencyRequest)
                    .then((r) => emailResults.push({ email: donor.email, ...r }))
                    .catch((e) => console.error('Email send error:', e.message));
            }
        }
        console.log(`📧 Queued ${rankedDonors.filter(d => d.email).length} emergency alert emails`);

        res.status(201).json({
            success: true,
            message: `Emergency broadcast created. Automated donor chain started: 2 notified, ${rankedDonors.length - 2 > 0 ? (rankedDonors.length - 2) : 0} queued.`,
            data: {
                request: emergencyRequest,
                donorsNotified: initialDonorsNotified,
                totalDonorsMatched: donorResponses.length,
                donors: initialDonors.map((d) => ({
                    _id: d._id,
                    name: `${d.firstName} ${d.lastName}`,
                    distanceKm: d._distanceKm,
                    score: d._score,
                })),
            },
        });
    } catch (error) {
        console.error('Emergency broadcast creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// POST /api/emergency-broadcast/:id/expand — Expand search radius
// ============================================================
router.post('/:id/expand', protectPublic, async (req, res) => {
    try {
        const request = await EmergencyRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Emergency request not found' });
        }
        if (request.status !== 'Active') {
            return res.status(400).json({ success: false, message: 'Request is no longer active' });
        }

        const radiusLevels = [1, 3, 5];
        const currentIdx = radiusLevels.indexOf(request.currentSearchRadius);
        if (currentIdx >= radiusLevels.length - 1) {
            return res.status(400).json({ success: false, message: 'Maximum search radius (5km) already reached' });
        }

        const newRadius = radiusLevels[currentIdx + 1];
        const [longitude, latitude] = request.patientLocation.coordinates;

        // IDs of donors already notified
        const alreadyNotifiedIds = request.donorResponses.map((r) => r.donorId);

        // Find new donors in the expanded radius, exclude already-notified
        const newDonors = await findDonorsInRadius(
            request.bloodGroup,
            longitude,
            latitude,
            newRadius,
            alreadyNotifiedIds
        );

        const rankedNewDonors = newDonors
            .map((d) => computeDonorScore(d.toObject ? d.toObject() : d, latitude, longitude))
            .sort((a, b) => a._score - b._score);

        const newResponses = rankedNewDonors.map((d) => ({
            donorId: d._id,
            status: 'Pending',
            notifiedAt: new Date(),
            distanceKm: d._distanceKm,
            notifiedAtRadius: newRadius,
        }));

        request.donorResponses.push(...newResponses);
        request.totalDonorsNotified += newResponses.length;
        request.currentSearchRadius = newRadius;
        request.radiusExpandedAt.push({ radius: newRadius, expandedAt: new Date() });
        await request.save();

        // Real-time notification
        try {
            const io = getIO();
            for (const donor of rankedNewDonors) {
                // Tactical Signal: Notify the newly identified operative directly
                io.to(`user_${donor._id}`).emit('emergency_broadcast_alert', {
                    requestId: request._id,
                    bloodGroup: request.bloodGroup,
                    patientName: request.patientName,
                    distanceKm: donor._distanceKm,
                    donorId: donor._id,
                    donorName: `${donor.firstName} ${donor.lastName}`,
                    message: `Emergency Alert: A nearby patient urgently needs ${request.bloodGroup} blood. Please respond if you are available to donate.`,
                    timestamp: new Date(),
                });
            }

            io.emit('emergency_broadcast_expanded', {
                requestId: request._id,
                bloodGroup: request.bloodGroup,
                newRadius,
                newDonorsNotified: newResponses.length,
                totalNotified: request.totalDonorsNotified,
                timestamp: new Date(),
            });
        } catch (socketErr) {
            console.error('Socket expand broadcast failed:', socketErr.message);
        }

        // Send email notifications to newly found donors (async, non-blocking)
        for (const donor of rankedNewDonors) {
            if (donor.email) {
                sendEmergencyAlertEmail(donor, request)
                    .catch((e) => console.error('Email send error:', e.message));
            }
        }
        console.log(`📧 Queued ${rankedNewDonors.filter(d => d.email).length} emails for expanded radius`);

        res.json({
            success: true,
            message: `Radius expanded to ${newRadius}km. ${newResponses.length} new donor(s) notified.`,
            data: {
                request,
                newDonorsNotified: newResponses.length,
                totalDonorsNotified: request.totalDonorsNotified,
            },
        });
    } catch (error) {
        console.error('Radius expansion error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// POST /api/emergency-broadcast/:id/respond — Donor Accept/Reject
// ============================================================
router.post('/:id/respond', protectPublic, async (req, res) => {
    try {
        const { donorId, action } = req.body; // action: 'Accept' or 'Reject'

        if (!donorId || !['Accept', 'Reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'donorId and action (Accept/Reject) are required.',
            });
        }

        const request = await EmergencyRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Emergency request not found' });
        }
        if (request.status !== 'Active') {
            return res.status(400).json({ success: false, message: 'This emergency request is no longer active.' });
        }

        // Find the donor response entry
        const responseEntry = request.donorResponses.find(
            (r) => r.donorId.toString() === donorId && r.status === 'Pending'
        );
        if (!responseEntry) {
            return res.status(400).json({
                success: false,
                message: 'No pending response found for this donor.',
            });
        }

        if (action === 'Accept') {
            responseEntry.status = 'Accepted';
            responseEntry.respondedAt = new Date();
            request.acceptedDonor = donorId;
            request.status = 'Accepted';
            request.acceptedCount += 1;
            request.timeTakenToAcceptMs = Date.now() - request.createdAt.getTime();

            // Mark all other pending responses as expired
            request.donorResponses.forEach((r) => {
                if (r.donorId.toString() !== donorId && r.status === 'Pending') {
                    r.status = 'Expired';
                }
            });

            await request.save();

            // Fetch donor details to share with patient (Polymorphic Lookup)
            let donor = await Donor.findById(donorId).select(
                'firstName lastName phone email bloodGroup location gender city state address'
            );
            
            if (!donor) {
                donor = await PublicUser.findById(donorId).select(
                    'firstName lastName phone email bloodGroup location gender city state address'
                );
            }

            if (!donor) {
                return res.status(404).json({ success: false, message: 'Donor identity could not be verified' });
            }

            // Fetch patient details to share with donor
            const patient = await PublicUser.findById(request.patientId).select(
                'firstName lastName phone email bloodGroup location gender city state address'
            );
            console.log('📋 [RESPOND] Patient lookup result:', patient ? { 
                name: `${patient.firstName} ${patient.lastName}`, 
                phone: patient.phone, 
                email: patient.email,
                gender: patient.gender,
                city: patient.city 
            } : 'NOT FOUND');
            console.log('📋 [RESPOND] Donor lookup result:', { 
                name: `${donor.firstName} ${donor.lastName}`, 
                phone: donor.phone, 
                email: donor.email,
                gender: donor.gender,
                city: donor.city 
            });

            const donorFullDetails = {
                name: `${donor.firstName} ${donor.lastName}`,
                firstName: donor.firstName,
                lastName: donor.lastName,
                phone: donor.phone,
                email: donor.email,
                bloodGroup: donor.bloodGroup,
                gender: donor.gender,
                city: donor.city,
                state: donor.state,
                address: donor.address,
                location: donor.location,
            };

            const patientFullDetails = {
                name: request.patientName,
                firstName: patient?.firstName,
                lastName: patient?.lastName,
                phone: request.patientPhone || patient?.phone,
                email: patient?.email,
                bloodGroup: request.bloodGroup,
                gender: patient?.gender,
                city: patient?.city,
                state: patient?.state,
                address: patient?.address,
                location: request.patientLocation,
            };

            // Send real-time update
            try {
                const io = getIO();
                // Notify the patient with donor full details
                io.to(`user_${request.patientId}`).emit('emergency_donor_accepted', {
                    requestId: request._id,
                    donor: donorFullDetails,
                    patientDetails: patientFullDetails,
                    message: 'A donor has accepted your emergency request!',
                    timestamp: new Date(),
                });

                // Notify the donor with patient full details
                io.to(`user_${donorId}`).emit('emergency_mission_confirmed', {
                    requestId: request._id,
                    patientDetails: patientFullDetails,
                    donorDetails: donorFullDetails,
                    message: 'Mission confirmed! Patient details are now available.',
                    timestamp: new Date(),
                });

                // Broadcast status update
                io.emit('emergency_broadcast_resolved', {
                    requestId: request._id,
                    bloodGroup: request.bloodGroup,
                    timeTakenMs: request.timeTakenToAcceptMs,
                    timestamp: new Date(),
                });
            } catch (socketErr) {
                console.error('Socket accept notification failed:', socketErr.message);
            }

            // Send email to patient with donor contact details
            try {
                if (patient?.email) {
                    sendDonorAcceptedEmail(patient.email, `${patient.firstName} ${patient.lastName}`, donor, request)
                        .catch((e) => console.error('Patient email error:', e.message));
                    console.log(`📧 Donor-accepted email queued for patient ${patient.email}`);
                }
            } catch (emailErr) {
                console.error('Patient email lookup failed:', emailErr.message);
            }

            res.json({
                success: true,
                message: 'Thank you! The patient has been notified with your contact details.',
                data: {
                    request,
                    donorDetails: donorFullDetails,
                    patientDetails: patientFullDetails,
                },
            });
        } else {
            // Reject
            responseEntry.status = 'Rejected';
            responseEntry.respondedAt = new Date();
            request.rejectedCount += 1;

            // Automatic Donor Chain System
            // Pull the next Queued donor into Pending
            const nextQueuedIndex = request.donorResponses.findIndex(r => r.status === 'Queued');
            let nextDonorActivated = false;

            if (nextQueuedIndex !== -1) {
                const nextEntry = request.donorResponses[nextQueuedIndex];
                nextEntry.status = 'Pending';
                nextEntry.notifiedAt = new Date();
                request.totalDonorsNotified += 1;
                nextDonorActivated = true;

                // Fire off asynchronous notifications for the new donor
                Donor.findById(nextEntry.donorId).then(donor => {
                    if (!donor) return;

                    // Email
                    if (donor.email) {
                        sendEmergencyAlertEmail(donor, request).catch(e => console.error(e));
                    }
                    // Socket Alert
                    try {
                        const io = getIO();
                        // Tactical Signal: Notify the next operative in the chain directly
                        io.to(`user_${donor._id}`).emit('emergency_broadcast_alert', {
                            requestId: request._id,
                            bloodGroup: request.bloodGroup,
                            patientName: request.patientName,
                            distanceKm: nextEntry.distanceKm,
                            donorId: donor._id,
                            donorName: `${donor.firstName} ${donor.lastName}`,
                            message: `Emergency Alert (Chain Activated): A patient urgently needs ${request.bloodGroup} blood.`,
                            timestamp: new Date(),
                        });
                    } catch (e) { }
                });
            }

            await request.save();

            try {
                const io = getIO();
                io.emit('emergency_broadcast_update', {
                    requestId: request._id,
                    event: 'donor_rejected',
                    donorId,
                    totalNotified: request.totalDonorsNotified,
                    rejectedCount: request.rejectedCount,
                    timestamp: new Date(),
                });
            } catch (socketErr) {
                console.error('Socket reject notification failed:', socketErr.message);
            }

            res.json({
                success: true,
                message: 'Response recorded. Thank you for your response.',
                data: { request },
            });
        }
    } catch (error) {
        console.error('Donor response error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// POST /api/emergency-broadcast/:id/cancel — Cancel request
// ============================================================
router.post('/:id/cancel', protectPublic, async (req, res) => {
    try {
        const request = await EmergencyRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Emergency request not found' });
        }
        if (request.patientId.toString() !== req.publicUser._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (request.status !== 'Active') {
            return res.status(400).json({ success: false, message: 'Request is not active' });
        }

        request.status = 'Cancelled';
        request.donorResponses.forEach((r) => {
            if (r.status === 'Pending') r.status = 'Expired';
        });
        await request.save();

        try {
            const io = getIO();
            io.emit('emergency_broadcast_cancelled', {
                requestId: request._id,
                timestamp: new Date(),
            });
        } catch (socketErr) {
            console.error('Socket cancel broadcast failed:', socketErr.message);
        }

        res.json({ success: true, message: 'Emergency request cancelled.', data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/emergency-broadcast/my — Get user's emergency requests
// ============================================================
router.get('/my', protectPublic, async (req, res) => {
    try {
        let requests = await EmergencyRequest.find({ patientId: req.publicUser._id })
            .populate('donorResponses.donorId', 'firstName lastName phone email bloodGroup')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        // Manually resolve acceptedDonor (polymorphic — could be Donor or PublicUser)
        for (const req of requests) {
            if (req.acceptedDonor) {
                let donorData = await Donor.findById(req.acceptedDonor)
                    .select('firstName lastName phone email bloodGroup gender city state address location')
                    .lean();
                if (!donorData) {
                    donorData = await PublicUser.findById(req.acceptedDonor)
                        .select('firstName lastName phone email bloodGroup gender city state address location')
                        .lean();
                }
                req.acceptedDonor = donorData || req.acceptedDonor;
            }
        }

        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/emergency-broadcast/:id — Get single request details
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        let request = await EmergencyRequest.findById(req.params.id)
            .populate('patientId', 'firstName lastName phone email bloodGroup gender city state address location')
            .populate('donorResponses.donorId', 'firstName lastName phone email bloodGroup location')
            .lean();

        if (!request) {
            return res.status(404).json({ success: false, message: 'Emergency request not found' });
        }

        // Manually resolve acceptedDonor (polymorphic)
        if (request.acceptedDonor) {
            let donorData = await Donor.findById(request.acceptedDonor)
                .select('firstName lastName phone email bloodGroup gender city state address location')
                .lean();
            if (!donorData) {
                donorData = await PublicUser.findById(request.acceptedDonor)
                    .select('firstName lastName phone email bloodGroup gender city state address location')
                    .lean();
            }
            request.acceptedDonor = donorData || request.acceptedDonor;
        }

        res.json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/emergency-broadcast/admin/all — Admin view all requests
// ============================================================
router.get('/admin/all', protect, async (req, res) => {
    try {
        const { status, bloodGroup, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (bloodGroup) query.bloodGroup = bloodGroup;

        const total = await EmergencyRequest.countDocuments(query);
        const requests = await EmergencyRequest.find(query)
            .populate('patientId', 'firstName lastName phone email bloodGroup')
            .populate('acceptedDonor', 'firstName lastName phone email bloodGroup')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Compute high-precision summary stats
        const allRequestsSummary = await EmergencyRequest.find({}, 'status totalDonorsNotified acceptedCount rejectedCount timeTakenToAcceptMs');
        
        const stats = {
            total: allRequestsSummary.length,
            active: allRequestsSummary.filter((r) => r.status === 'Active').length,
            accepted: allRequestsSummary.filter((r) => r.status === 'Accepted').length,
            expired: allRequestsSummary.filter((r) => r.status === 'Expired').length,
            cancelled: allRequestsSummary.filter((r) => r.status === 'Cancelled').length,
            totalDonorsNotified: allRequestsSummary.reduce((s, r) => s + (r.totalDonorsNotified || 0), 0),
            totalAccepted: allRequestsSummary.reduce((s, r) => s + (r.acceptedCount || 0), 0),
            totalRejected: allRequestsSummary.reduce((s, r) => s + (r.rejectedCount || 0), 0),
            avgTimeTakenMs: 
                allRequestsSummary.filter((r) => r.timeTakenToAcceptMs).length > 0
                    ? allRequestsSummary
                        .filter((r) => r.timeTakenToAcceptMs)
                        .reduce((s, r) => s + r.timeTakenToAcceptMs, 0) / 
                      allRequestsSummary.filter((r) => r.timeTakenToAcceptMs).length
                    : 0,
        };

        res.json({
            success: true,
            data: requests,
            stats,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Admin fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
