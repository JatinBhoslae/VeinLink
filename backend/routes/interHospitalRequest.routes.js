import express from 'express';
import { body, validationResult } from 'express-validator';
import InterHospitalRequest from '../models/InterHospitalRequest.model.js';
import BloodUnit from '../models/BloodUnit.model.js';
import Hospital from '../models/Hospital.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/inter-hospital-requests
// @desc    List inter-hospital requests where user hospital is sender or receiver
// @access  Private (hospital_admin, staff, super_admin)
router.get('/', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role !== 'super_admin') {
      filter.$or = [
        { fromHospital: req.user.hospitalId },
        { toHospital: req.user.hospitalId },
      ];
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.bloodGroup) {
      filter.bloodGroup = req.query.bloodGroup;
    }

    const requests = await InterHospitalRequest.find(filter)
      .populate('fromHospital', 'name email')
      .populate('toHospital', 'name email')
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/inter-hospital-requests
// @desc    Create new inter-hospital blood request
// @access  Private (hospital_admin, staff)
router.post(
  '/',
  authorize('hospital_admin', 'staff'),
  [
    body('toHospital').isMongoId(),
    body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('quantity').isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!req.user.hospitalId) {
        return res.status(400).json({ success: false, message: 'User is not linked to a hospital' });
      }

      if (req.user.hospitalId.toString() === req.body.toHospital) {
        return res.status(400).json({ success: false, message: 'Cannot request blood from your own hospital' });
      }

      const targetHospital = await Hospital.findById(req.body.toHospital);
      if (!targetHospital || !targetHospital.isApproved) {
        return res.status(400).json({ success: false, message: 'Target hospital not found or not approved' });
      }

      const request = await InterHospitalRequest.create({
        fromHospital: req.user.hospitalId,
        toHospital: req.body.toHospital,
        requestedBy: req.user._id,
        bloodGroup: req.body.bloodGroup,
        quantity: req.body.quantity,
        urgency: req.body.urgency || 'medium',
        note: req.body.note,
      });

      await logAction('INTER_HOSPITAL_REQUEST_CREATED', 'InterHospitalRequest', request._id, req.user._id, req.user.hospitalId, req.body, req);

      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/inter-hospital-requests/:id/approve
// @desc    Approve an inter-hospital request (receiver hospital)
// @access  Private (hospital_admin)
router.put('/:id/approve', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const request = await InterHospitalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.toHospital.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    // Check stock in receiver hospital
    const availableUnits = await BloodUnit.find({
      hospitalId: req.user.hospitalId,
      bloodGroup: request.bloodGroup,
      status: 'available',
      expiryDate: { $gt: new Date() },
    }).limit(request.quantity);

    if (availableUnits.length < request.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock at receiver hospital. Available: ${availableUnits.length}, Required: ${request.quantity}`,
      });
    }

    request.status = 'approved';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    await logAction('INTER_HOSPITAL_REQUEST_APPROVED', 'InterHospitalRequest', request._id, req.user._id, req.user.hospitalId, {}, req);

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/inter-hospital-requests/:id/reject
// @desc    Reject an inter-hospital request (receiver hospital)
// @access  Private (hospital_admin)
router.put('/:id/reject', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const request = await InterHospitalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.toHospital.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    request.rejectedReason = req.body.reason || 'Rejected by hospital';
    request.approvedBy = req.user._id;
    await request.save();

    await logAction('INTER_HOSPITAL_REQUEST_REJECTED', 'InterHospitalRequest', request._id, req.user._id, req.user.hospitalId, { reason: request.rejectedReason }, req);

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/inter-hospital-requests/:id/complete
// @desc    Mark an inter-hospital request as completed (after transfer)
// @access  Private (hospital_admin)
router.put('/:id/complete', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const request = await InterHospitalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Either side's admin can mark as completed
    if (
      request.fromHospital.toString() !== req.user.hospitalId.toString() &&
      request.toHospital.toString() !== req.user.hospitalId.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this request' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved requests can be completed' });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    await logAction('INTER_HOSPITAL_REQUEST_COMPLETED', 'InterHospitalRequest', request._id, req.user._id, req.user.hospitalId, {}, req);

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

export default router;
