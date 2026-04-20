import express from 'express';
import { body, validationResult } from 'express-validator';
import BloodRequest from '../models/BloodRequest.model.js';
import BloodUnit from '../models/BloodUnit.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/blood-requests
// @desc    Get all blood requests
// @access  Private
router.get('/', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = {};
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.bloodGroup) {
      filter.bloodGroup = req.query.bloodGroup;
    }

    const requests = await BloodRequest.find(filter)
      .populate('requestedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .skip(parseInt(req.query.skip) || 0);

    const total = await BloodRequest.countDocuments(filter);

    res.json({
      success: true,
      count: requests.length,
      total,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/blood-requests/:id
// @desc    Get single blood request
// @access  Private
router.get('/:id', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const request = await BloodRequest.findOne(filter)
      .populate('requestedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('fulfilledUnits.unitId');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/blood-requests
// @desc    Create new blood request
// @access  Private
router.post(
  '/',
  authorize('hospital_admin', 'staff'),
  [
    body('patientName').trim().notEmpty(),
    body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('quantity').isInt({ min: 1 }),
    body('reason').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const bloodRequest = await BloodRequest.create({
        requestId,
        hospitalId: req.user.hospitalId,
        requestedBy: req.user._id,
        ...req.body,
      });

      await logAction('BLOOD_REQUEST_CREATED', 'BloodRequest', bloodRequest._id, req.user._id, req.user.hospitalId, req.body, req);

      res.status(201).json({
        success: true,
        data: bloodRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/blood-requests/:id/approve
// @desc    Approve blood request
// @access  Private (Hospital Admin)
router.put('/:id/approve', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const bloodRequest = await BloodRequest.findOne(filter);

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    if (bloodRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${bloodRequest.status}`,
      });
    }

    // Check available stock
    const availableUnits = await BloodUnit.find({
      hospitalId: req.user.hospitalId,
      bloodGroup: bloodRequest.bloodGroup,
      status: 'available',
      expiryDate: { $gt: new Date() },
    }).limit(bloodRequest.quantity);

    if (availableUnits.length < bloodRequest.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${availableUnits.length}, Required: ${bloodRequest.quantity}`,
      });
    }

    // Reserve units
    for (const unit of availableUnits) {
      unit.status = 'reserved';
      await unit.save();
    }

    bloodRequest.status = 'approved';
    bloodRequest.approvedBy = req.user._id;
    bloodRequest.approvedAt = new Date();
    await bloodRequest.save();

    await logAction('BLOOD_REQUEST_APPROVED', 'BloodRequest', bloodRequest._id, req.user._id, req.user.hospitalId, {
      unitsReserved: availableUnits.length,
    }, req);

    // Send notification to requester
    await notificationService.notifyBloodRequestApproved(bloodRequest._id, req.user.hospitalId);

    res.json({
      success: true,
      data: bloodRequest,
      reservedUnits: availableUnits.map(u => u._id),
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/blood-requests/:id/reject
// @desc    Reject blood request
// @access  Private (Hospital Admin)
router.put(
  '/:id/reject',
  authorize('hospital_admin'),
  [body('reason').trim().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const filter = { _id: req.params.id };
      
      if (req.user.role !== 'super_admin') {
        filter.hospitalId = req.user.hospitalId;
      }

      const bloodRequest = await BloodRequest.findOne(filter);

      if (!bloodRequest) {
        return res.status(404).json({
          success: false,
          message: 'Blood request not found',
        });
      }

      if (bloodRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Request is already ${bloodRequest.status}`,
        });
      }

      bloodRequest.status = 'rejected';
      bloodRequest.rejectedReason = req.body.reason;
      bloodRequest.approvedBy = req.user._id;
      await bloodRequest.save();

      await logAction('BLOOD_REQUEST_REJECTED', 'BloodRequest', bloodRequest._id, req.user._id, req.user.hospitalId, {
        reason: req.body.reason,
      }, req);

      // Send notification to requester
      await notificationService.notifyBloodRequestRejected(bloodRequest._id, req.body.reason);

      res.json({
        success: true,
        data: bloodRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/blood-requests/:id/fulfill
// @desc    Fulfill blood request
// @access  Private (Hospital Admin)
router.put('/:id/fulfill', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const bloodRequest = await BloodRequest.findOne(filter);

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    if (bloodRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Request must be approved before fulfillment',
      });
    }

    // Get reserved units
    const reservedUnits = await BloodUnit.find({
      hospitalId: req.user.hospitalId,
      bloodGroup: bloodRequest.bloodGroup,
      status: 'reserved',
    }).limit(bloodRequest.quantity);

    if (reservedUnits.length < bloodRequest.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough reserved units',
      });
    }

    // Issue units
    const fulfilledUnits = [];
    for (const unit of reservedUnits) {
      unit.status = 'issued';
      unit.issuedTo = {
        requestId: bloodRequest._id,
        issuedAt: new Date(),
        issuedBy: req.user._id,
      };
      await unit.save();

      fulfilledUnits.push({
        unitId: unit._id,
        fulfilledAt: new Date(),
      });
    }

    bloodRequest.status = 'fulfilled';
    bloodRequest.fulfilledUnits = fulfilledUnits;
    await bloodRequest.save();

    await logAction('BLOOD_REQUEST_FULFILLED', 'BloodRequest', bloodRequest._id, req.user._id, req.user.hospitalId, {
      unitsIssued: fulfilledUnits.length,
    }, req);

    // Send notification to requester
    await notificationService.notifyBloodRequestFulfilled(bloodRequest._id);

    res.json({
      success: true,
      data: bloodRequest,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

