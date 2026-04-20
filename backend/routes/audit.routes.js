import express from 'express';
import AuditLog from '../models/AuditLog.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/audit
// @desc    Get audit logs
// @access  Private (Hospital Admin, Super Admin)
router.get('/', authorize('hospital_admin', 'super_admin'), async (req, res, next) => {
  try {
    const filter = {};

    // Hospital admins can only see their hospital's logs
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    // Optional filters
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }
    if (req.query.action) {
      filter.action = req.query.action;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const logs = await AuditLog.find(filter)
      .populate('userId', 'firstName lastName email role')
      .populate('hospitalId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100)
      .skip(parseInt(req.query.skip) || 0);

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      count: logs.length,
      total,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/audit/:id
// @desc    Get single audit log
// @access  Private
router.get('/:id', authorize('hospital_admin', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };

    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const log = await AuditLog.findOne(filter)
      .populate('userId', 'firstName lastName email role')
      .populate('hospitalId', 'name');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

