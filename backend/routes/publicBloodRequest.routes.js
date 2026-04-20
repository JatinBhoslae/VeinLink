import express from 'express';
import { body, validationResult } from 'express-validator';
import PublicBloodRequest from '../models/PublicBloodRequest.model.js';
import Hospital from '../models/Hospital.model.js';
import PublicUser from '../models/PublicUser.model.js';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import donorNotificationService from '../services/donorNotification.service.js';

const router = express.Router();

// Create public blood request
router.post(
  '/',
  protectPublic,
  [
    body('hospitalId').isMongoId(),
    body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('quantity').isInt({ min: 1 }),
    body('reason').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { hospitalId } = req.body;
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital || !hospital.isApproved) {
        return res.status(400).json({ success: false, message: 'Hospital not found or not approved' });
      }

      const user = await PublicUser.findById(req.publicUser._id);
      
      const request = await PublicBloodRequest.create({
        userId: req.publicUser._id,
        hospitalId,
        city: user?.city,
        pinCode: user?.pinCode,
        ...req.body,
      });

      // Geosynchronized Operative Triangulation (Nearby Donors)
      let nearbyOperatives = [];
      if (user?.location?.coordinates?.length === 2) {
        nearbyOperatives = await PublicUser.find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: user.location.coordinates
              },
              $maxDistance: 10000 // 10km tactical radius
            }
          },
          bloodGroup: req.body.bloodGroup,
          _id: { $ne: user._id },
          isActive: true
        }).select('firstName lastName phone bloodGroup city location locationUpdatedAt preferences');

        // Strategic Mass Notification Protocol
        try {
          donorNotificationService.notifyEmergency(
            req.body.bloodGroup,
            user.location,
            10, // 10km tactical radius
            req.body.urgency.toUpperCase()
          );
        } catch (notifErr) {
          console.error('📡 [SIGNAL ERROR] Mass notification failed:', notifErr.message);
        }
      }

      res.status(201).json({ 
        success: true, 
        data: request,
        nearbyOperatives: nearbyOperatives 
      });
    } catch (error) {
      next(error);
    }
  }
);

// List own public blood requests
router.get('/', protectPublic, async (req, res, next) => {
  try {
    const filter = { userId: req.publicUser._id };
    if (req.query.status) filter.status = req.query.status;

    const requests = await PublicBloodRequest.find(filter)
      .populate('hospitalId', 'name address')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// Accept a blood request (For Donors)
router.patch('/:id/accept', protectPublic, async (req, res, next) => {
  try {
    const request = await PublicBloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Mission already processed' });
    }

    // Update mission status
    request.status = 'accepted';
    request.donorContactShared = true;
    request.targetDonorId = req.publicUser._id; // The user who accepted is now the target
    await request.save();

    // Notify the requester
    const requester = await PublicUser.findById(request.userId);
    if (requester) {
      donorNotificationService.sendNotification(requester, {
        title: 'MISSION LOCKED: Operative Identified',
        message: `Strategic Alert: An operative has accepted your extraction mission for ${request.bloodGroup}. Direct contact protocol active.`,
        type: 'success'
      });
    }

    res.json({ success: true, message: 'Mission accepted. Contact protocol initiated.', data: request });
  } catch (error) {
    next(error);
  }
});

// Get single
router.get('/:id', protectPublic, async (req, res, next) => {
  try {
    const request = await PublicBloodRequest.findById(req.params.id)
      .populate('hospitalId', 'name address')
      .populate('targetDonorId', 'firstName lastName phone email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Logic to only show contact if authorized
    if (request.userId.toString() !== req.publicUser._id.toString() && 
        request.targetDonorId?._id.toString() !== req.publicUser._id.toString()) {
      // If not requester or donor, hide sensitive intel
      if (request.targetDonorId) {
        request.targetDonorId.phone = 'REDACTED';
        request.targetDonorId.email = 'REDACTED';
      }
    }

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

export default router;
