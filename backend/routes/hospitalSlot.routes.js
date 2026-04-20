import express from 'express';
import HospitalSlot from '../models/HospitalSlot.model.js';
import DonationAppointment from '../models/DonationAppointment.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require hospital auth
router.use(protect, authorize('hospital_admin', 'staff'));

// @route   GET /api/hospital-slots
// @desc    Get slots for current hospital (optionally by date range)
// @access  Private (Hospital Admin, Staff)
router.get('/', async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital context not found for user' });
    }

    const { startDate, endDate } = req.query;
    const filter = { hospitalId };

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const slots = await HospitalSlot.find(filter).sort({ startTime: 1 });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/hospital-slots
// @desc    Create a new slot for current hospital
// @access  Private (Hospital Admin, Staff)
router.post('/', async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital context not found for user' });
    }

    const { startTime, endTime, capacity } = req.body;

    if (!startTime || !endTime || !capacity) {
      return res.status(400).json({ success: false, message: 'startTime, endTime and capacity are required' });
    }

    const slot = await HospitalSlot.create({
      hospitalId,
      startTime,
      endTime,
      capacity,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/hospital-slots/:id
// @desc    Update slot capacity or status
// @access  Private (Hospital Admin, Staff)
router.put('/:id', async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const slot = await HospitalSlot.findOne({ _id: req.params.id, hospitalId });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    const { capacity, status } = req.body;

    if (capacity !== undefined) {
      if (capacity < slot.bookedCount) {
        return res.status(400).json({
          success: false,
          message: 'Capacity cannot be less than current booked count',
        });
      }
      slot.capacity = capacity;
    }

    if (status) {
      slot.status = status;
    }

    await slot.save();

    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/hospital-slots/:id/appointments
// @desc    Get donation appointments for a specific slot of current hospital
// @access  Private (Hospital Admin, Staff)
router.get('/:id/appointments', async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital context not found for user' });
    }

    const slot = await HospitalSlot.findOne({ _id: req.params.id, hospitalId });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    const appointments = await DonationAppointment.find({
      hospitalId,
      hospitalSlotId: slot._id,
    })
      .populate('userId', 'firstName lastName phone email bloodGroup')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
});

export default router;
