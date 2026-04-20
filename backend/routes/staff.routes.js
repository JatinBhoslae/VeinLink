import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/staff
// @desc    Get all staff members
// @access  Private (Hospital Admin, Super Admin)
router.get('/', authorize('hospital_admin', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { role: 'staff' };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const staff = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/staff/:id
// @desc    Get single staff member
// @access  Private
router.get('/:id', authorize('hospital_admin', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, role: 'staff' };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const staff = await User.findOne(filter).select('-password');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/staff
// @desc    Create new staff member
// @access  Private (Hospital Admin)
router.post(
  '/',
  authorize('hospital_admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('staffType').isIn(['screening', 'collection', 'inventory', 'camp', 'reception']),
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

      const { email, password, firstName, lastName, staffType, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists',
        });
      }

      const staff = await User.create({
        email,
        password,
        firstName,
        lastName,
        role: 'staff',
        hospitalId: req.user.hospitalId,
        staffType,
        phone,
      });

      await logAction('STAFF_CREATED', 'User', staff._id, req.user._id, req.user.hospitalId, { staffType }, req);

      res.status(201).json({
        success: true,
        data: {
          id: staff._id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          staffType: staff.staffType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/staff/:id
// @desc    Update staff member
// @access  Private (Hospital Admin)
router.put('/:id', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, role: 'staff' };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const staff = await User.findOne(filter);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    const oldData = staff.toObject();
    const { password, ...updateData } = req.body;

    if (password) {
      staff.password = password;
    }

    Object.assign(staff, updateData);
    await staff.save();

    await logAction('STAFF_UPDATED', 'User', staff._id, req.user._id, req.user.hospitalId, {
      old: oldData,
      new: staff.toObject(),
    }, req);

    res.json({
      success: true,
      data: {
        id: staff._id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        staffType: staff.staffType,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/staff/:id
// @desc    Delete staff member
// @access  Private (Hospital Admin)
router.delete('/:id', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, role: 'staff' };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const staff = await User.findOneAndDelete(filter);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    await logAction('STAFF_DELETED', 'User', staff._id, req.user._id, req.user.hospitalId, {}, req);

    res.json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

