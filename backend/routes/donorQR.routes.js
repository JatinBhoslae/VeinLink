import express from 'express';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import PublicUser from '../models/PublicUser.model.js';
import Donor from '../models/Donor.model.js';
import DonationAppointment from '../models/DonationAppointment.model.js';
import { protect } from '../middleware/auth.middleware.js';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import { sendAppointmentCompletionEmail } from '../utils/appointmentEmail.js';
import { calculateNextEligibleDate } from '../utils/eligibility.js';

const router = express.Router();

// @route   GET /api/donor-qr/generate
// @desc    Generate QR code for donor profile
// @access  Private (Public User)
router.get('/generate', protectPublic, async (req, res, next) => {
    try {
        const user = await PublicUser.findById(req.publicUser._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get donation stats
        const completedDonations = await DonationAppointment.find({
            userId: req.publicUser._id,
            status: 'completed',
        }).sort({ appointmentDate: -1 });

        const totalDonations = completedDonations.length;
        const lastDonation = completedDonations[0]?.appointmentDate || null;

        // Build QR data
        const qrData = {
            id: user._id.toString(),
            name: `${user.firstName} ${user.lastName}`,
            bloodGroup: user.bloodGroup || 'Not specified',
            phone: user.phone || '',
            email: user.email || '',
            totalDonations,
            lastDonation: lastDonation ? lastDonation.toISOString().split('T')[0] : 'Never',
            livesSaved: totalDonations * 3,
            rewardPoints: user.rewardPoints || 0,
            badges: (user.badges || []).length,
            verified: true,
            platform: 'Vein Link',
            generatedAt: new Date().toISOString(),
        };

        // Generate QR code as base64 data URL
        const qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
            width: 400,
            margin: 2,
            color: {
                dark: '#1a1a2e',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
        });

        res.json({
            success: true,
            data: {
                qrImage,
                qrData,
            },
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/donor-qr/scan
// @desc    Scan and verify donor QR code (for hospitals)
// @access  Private (Staff)
router.post('/scan', protect, async (req, res, next) => {
    try {
        const { qrData } = req.body;
        if (!qrData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid QR code data',
            });
        }

        let donorId;
        let appointmentId;

        if (typeof qrData === 'string') {
            donorId = qrData;
        } else {
            donorId = qrData.id || qrData.userId;
            appointmentId = qrData.appointmentId;
        }

        if (!donorId && !appointmentId) {
            return res.status(400).json({ success: false, message: 'Identity signature missing' });
        }

        let appointment = null;
        let user = null;

        if (appointmentId) {
            appointment = await DonationAppointment.findById(appointmentId)
                .populate('hospitalId', 'name address')
                .populate('campId', 'name location');
            if (appointment) {
                user = await PublicUser.findById(appointment.userId);
            }
        } else {
            if (donorId && mongoose.Types.ObjectId.isValid(donorId)) {
                user = await PublicUser.findById(donorId);
            }
            // Auto-detect active appointment if scanning by user ID
            if (user) {
                appointment = await DonationAppointment.findOne({
                    userId: user._id,
                    status: 'booked'
                }).sort({ createdAt: -1 });
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Donor not found in system',
                verified: false,
            });
        }

        // Get fresh stats
        const completedDonations = await DonationAppointment.find({
            userId: user._id,
            status: 'completed',
        }).sort({ updatedAt: -1 });

        const totalDonations = completedDonations.length;
        const lastDonation = completedDonations[0]?.updatedAt || completedDonations[0]?.createdAt || null;

        // Check eligibility via nextEligibleDate or fallback to 90-day gap
        let isEligible = true;
        let daysUntilEligible = 0;
        
        const nextDate = user.nextEligibleDate || (lastDonation ? calculateNextEligibleDate(lastDonation, user.gender) : null);

        if (nextDate && new Date(nextDate) > new Date()) {
            isEligible = false;
            daysUntilEligible = Math.ceil((new Date(nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }

        res.json({
            success: true,
            verified: true,
            data: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                bloodGroup: user.bloodGroup,
                phone: user.phone,
                email: user.email,
                totalDonations,
                lastDonation: lastDonation ? lastDonation.toISOString().split('T')[0] : 'Never',
                livesSaved: totalDonations * 3,
                rewardPoints: user.rewardPoints || 0,
                isEligible,
                daysUntilEligible,
                recentAppointments: completedDonations,
                activeAppointment: appointment && appointment.status === 'booked' ? appointment : null
            },
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/donor-qr/complete-appointment
// @desc    Mark appointment as completed and notify donor
// @access  Private (Staff)
router.post('/complete-appointment', protect, async (req, res, next) => {
    try {
        const { appointmentId } = req.body;
        if (!appointmentId) {
            return res.status(400).json({ success: false, message: 'Appointment ID required' });
        }

        const appointment = await DonationAppointment.findById(appointmentId)
            .populate('hospitalId', 'name address')
            .populate('campId', 'name location');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Mission mission record not found' });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Mission already accomplished' });
        }

        appointment.status = 'completed';
        appointment.completedAt = new Date();
        await appointment.save();

        // Update user points and eligibility
        const user = await PublicUser.findById(appointment.userId);
        if (user) {
            const pointsEarned = 50; // standard reward
            user.rewardPoints = (user.rewardPoints || 0) + pointsEarned;
            
            // UPDATED: Calculate next eligibility windows
            user.lastDonationDate = appointment.completedAt;
            user.nextEligibleDate = calculateNextEligibleDate(appointment.completedAt, user.gender);
            
            await user.save();

            // Send completion email
            sendAppointmentCompletionEmail(user, appointment, {
                hospitalName: appointment.hospitalId?.name || appointment.campId?.name || 'Sector Alpha',
                pointsEarned
            }).catch(err => console.error('Completion email error:', err));
        }

        res.json({
            success: true,
            message: 'Mission accomplished. Donor dossier upgraded.',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
});

export default router;
