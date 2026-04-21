import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import PublicUser from '../models/PublicUser.model.js';
import Hospital from '../models/Hospital.model.js';
import { sendEmergencyAlertEmail } from '../utils/emergencyEmail.js';

const router = express.Router();

// @route   POST /api/hospitals/panic
// @desc    Hospital panic button — instantly broadcast to ALL nearby donors
// @access  Private (hospital_admin, staff)
// @route   GET /api/panic/status
// @desc    Check current hospital's panic status
// @access  Private
router.get('/status', protect, async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.user.hospitalId).select('emergencyStatus');
        res.json({ success: true, status: hospital?.emergencyStatus || { isActive: false } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch panic status' });
    }
});

// @route   POST /api/panic/off
// @desc    Deactivate hospital panic mode
// @access  Private (hospital_admin, staff)
router.post('/off', protect, authorize('hospital_admin', 'staff', 'super_admin'), async (req, res) => {
    try {
        await Hospital.findByIdAndUpdate(req.user.hospitalId, {
            $set: { 
                'emergencyStatus.isActive': false,
                'emergencyStatus.bloodGroups': [],
                'emergencyStatus.message': ''
            }
        });
        res.json({ success: true, message: 'Panic Mode Deactivated Successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to deactivate panic mode' });
    }
});

// @route   POST /api/panic
// @desc    Hospital panic button — instantly broadcast and ACTIVATE State
// @access  Private (hospital_admin, staff)
router.post('/', protect, authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
    try {
        const { bloodGroups, message, unitsNeeded } = req.body;

        if (!bloodGroups || !Array.isArray(bloodGroups) || bloodGroups.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one blood group.' });
        }

        // Get hospital info & Update Panic State
        const hospital = await Hospital.findByIdAndUpdate(req.user.hospitalId, {
            $set: {
                'emergencyStatus.isActive': true,
                'emergencyStatus.bloodGroups': bloodGroups,
                'emergencyStatus.message': message || '',
                'emergencyStatus.initiatedAt': new Date()
            }
        }, { new: true });
        const hospitalName = hospital?.name || 'Vein Link Hospital';
        const hospitalAddress = hospital?.address 
            ? `${hospital.address.street}, ${hospital.address.city}, ${hospital.address.zipCode}`
            : 'Check App for Location';
        
        // Generate Google Maps URL for Navigation
        // Use hospital coordinates if available, otherwise use dummy location (Airoli Medical Hub) as fallback
        let lat = 19.1458; // Default Dummy Latitude (Airoli)
        let lng = 72.9928; // Default Dummy Longitude (Airoli)
        
        if (hospital?.location?.coordinates && hospital.location.coordinates.length === 2) {
            lng = hospital.location.coordinates[0];
            lat = hospital.location.coordinates[1];
        }

        // Use 'dir' (Directions) API to show route directly from donor's location to hospital
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(hospitalName)}`;

        // 1. Notify MATCHING Donors
        const donors = await PublicUser.find({ bloodGroup: { $in: bloodGroups } }).select('firstName lastName email phone bloodGroup city pinCode');
        
        // 2. Notify ALL Hospitals
        const hospitals = await Hospital.find({ _id: { $ne: req.user.hospitalId }, isApproved: true }).select('name email phone address');

        const totalTargets = donors.length + hospitals.length;
        const broadcastPromises = [];

        // Donor notifications
        donors.forEach(donor => {
            broadcastPromises.push(
                sendEmergencyAlertEmail(donor, {
                    bloodGroup: donor.bloodGroup,
                    patientName: hospitalName,
                    patientLocation: hospital?.location || { type: 'Point', coordinates: [lng, lat] },
                    message: message || `🚨 URGENT: ${hospitalName} needs ${bloodGroups.join(', ')} blood immediately!`,
                    notes: `Hospital-initiated panic for ${bloodGroups.join(', ')}. ${unitsNeeded || 'Multiple'} units required. ${message || ''}`
                })
            );
        });

        // Hospital notifications
        hospitals.forEach(hosp => {
            broadcastPromises.push(
                sendEmergencyAlertEmail({ firstName: 'Medical', lastName: 'Colleague', email: hosp.email }, {
                    bloodGroup: bloodGroups.join(', '),
                    patientName: hospitalName,
                    patientLocation: hospital?.location || { type: 'Point', coordinates: [lng, lat] },
                    message: `🚨 INTER-HOSPITAL EMERGENCY: ${hospitalName} has initiated PANIC MODE for ${bloodGroups.join(', ')}.`,
                    notes: `Network asset ${hospitalName} is in panic state. Please check inventory. ${message || ''}`
                })
            );
        });

        // Fire and forget
        Promise.allSettled(broadcastPromises).then((results) => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            console.log(`🚨 Panic broadcast finalized: ${successful}/${totalTargets} alerts delivered.`);
        });

        res.json({
            success: true,
            message: `Panic mode active! notifying ${donors.length} donors and ${hospitals.length} network hospitals.`,
            status: hospital.emergencyStatus,
            data: {
                donorsNotified: donors.length,
                hospitalsNotified: hospitals.length,
                groups: bloodGroups
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
