import express from 'express';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import NotificationLog from '../models/NotificationLog.model.js';
import PublicUser from '../models/PublicUser.model.js';
import donorNotificationService from '../services/donorNotification.service.js';
import { calculateNextEligibleDate } from '../utils/eligibility.js';

const router = express.Router();

/**
 * @route   PATCH /api/notifications/preferences
 * @desc    Update donor notification preferences
 * @access  Private (Donor)
 */
router.patch('/preferences', protectPublic, async (req, res, next) => {
    try {
        const { email, sms, push, liveTracking } = req.body;
        const user = await PublicUser.findById(req.publicUser._id);
        
        if (user) {
            user.preferences = {
                ...user.preferences,
                ...(email !== undefined && { email }),
                ...(sms !== undefined && { sms }),
                ...(push !== undefined && { push }),
                ...(liveTracking !== undefined && { liveTracking })
            };
            await user.save();
        }

        res.json({ success: true, preferences: user.preferences });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/notifications/logs
 * @desc    Get notification logs for a donor
 * @access  Private (Donor)
 */
router.get('/logs', protectPublic, async (req, res, next) => {
    try {
        const logs = await NotificationLog.find({ userId: req.publicUser._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/notifications/emergency
 * @desc    Broadcast emergency alert to nearby donors
 * @access  Private (Staff/Admin)
 */
router.post('/emergency', protect, async (req, res, next) => {
    try {
        const { bloodGroup, latitude, longitude, radiusKm, urgencyText } = req.body;
        
        if (!bloodGroup || !latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Incomplete coordinates or blood group' });
        }

        const location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };

        const result = await donorNotificationService.notifyEmergency(bloodGroup, location, radiusKm, urgencyText);
        
        res.json({ 
            success: true, 
            message: `Broadcasting emergency signal for ${bloodGroup} to donors in range.`,
            count: result.length 
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/notifications/check-eligibility
 * @desc    Manually trigger eligibility check and return status
 * @access  Private (Donor)
 */
router.post('/check-eligibility', protectPublic, async (req, res, next) => {
    try {
        const user = await PublicUser.findById(req.publicUser._id);
        
        // Recalculate if values are missing
        if (!user.nextEligibleDate && user.lastDonationDate) {
            user.nextEligibleDate = calculateNextEligibleDate(user.lastDonationDate, user.gender);
            await user.save();
        }

        const now = new Date();
        const isEligible = user.nextEligibleDate ? new Date(user.nextEligibleDate) <= now : true;
        
        let daysRemaining = 0;
        if (!isEligible && user.nextEligibleDate) {
            daysRemaining = Math.ceil((new Date(user.nextEligibleDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        res.json({ 
            success: true, 
            data: {
                isEligible,
                nextEligibleDate: user.nextEligibleDate,
                lastDonationDate: user.lastDonationDate,
                daysRemaining
            } 
        });
    } catch (error) {
        next(error);
    }
});

export default router;
