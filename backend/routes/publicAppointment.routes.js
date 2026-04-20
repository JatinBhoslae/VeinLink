import express from 'express';
import { body, validationResult } from 'express-validator';
import DonationAppointment from '../models/DonationAppointment.model.js';
import Hospital from '../models/Hospital.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import HospitalSlot from '../models/HospitalSlot.model.js';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import { sendAppointmentBookingEmail } from '../utils/appointmentEmail.js';

const router = express.Router();

// Book hospital donation appointment (simple date/time)
router.post(
  '/hospital',
  protectPublic,
  [body('hospitalId').isMongoId(), body('timeSlot').isISO8601()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Check mission readiness (Eligibility)
      if (req.publicUser.nextEligibleDate && new Date(req.publicUser.nextEligibleDate) > new Date()) {
        const daysRemaining = Math.ceil((new Date(req.publicUser.nextEligibleDate) - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          success: false, 
          message: `Regeneration Phase Incomplete. Deployment locked for ${daysRemaining} more cycles.` 
        });
      }

      const hospital = await Hospital.findById(req.body.hospitalId);
      if (!hospital || !hospital.isApproved) {
        return res.status(400).json({ success: false, message: 'Hospital not found or not approved' });
      }

      const appointment = await DonationAppointment.create({
        userId: req.publicUser._id,
        hospitalId: req.body.hospitalId,
        timeSlot: req.body.timeSlot,
      });

      // Send confirmation email (async)
      sendAppointmentBookingEmail(req.publicUser, appointment, {
        hospitalName: hospital.name,
        hospitalAddress: hospital.address,
        latitude: hospital.location?.coordinates?.[1] || 0,
        longitude: hospital.location?.coordinates?.[0] || 0,
        timeSlot: req.body.timeSlot,
        type: 'hospital'
      }).catch(err => console.error('Booking email error:', err));

      res.status(201).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  }
);

// Public: get active hospital slots for a specific hospital
router.get('/hospital-slots/:hospitalId', async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const slots = await HospitalSlot.find({
      hospitalId,
      status: 'active',
    }).sort({ startTime: 1 });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

// Book a specific hospital slot
router.post(
  '/hospital-slot',
  protectPublic,
  [body('hospitalId').isMongoId(), body('slotId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Check mission readiness (Eligibility)
      if (req.publicUser.nextEligibleDate && new Date(req.publicUser.nextEligibleDate) > new Date()) {
        const daysRemaining = Math.ceil((new Date(req.publicUser.nextEligibleDate) - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          success: false, 
          message: `Regeneration Phase Incomplete. Deployment locked for ${daysRemaining} more cycles.` 
        });
      }

      const { hospitalId, slotId } = req.body;

      const hospital = await Hospital.findById(hospitalId);
      if (!hospital || !hospital.isApproved) {
        return res.status(400).json({ success: false, message: 'Hospital not found or not approved' });
      }

      const slot = await HospitalSlot.findOne({ _id: slotId, hospitalId });
      if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found for this hospital' });
      }

      if (slot.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Slot is not active' });
      }

      if (slot.bookedCount >= slot.capacity) {
        return res.status(400).json({ success: false, message: 'Slot is full' });
      }

      // Prevent duplicate active booking for the same hospital
      const existingAppt = await DonationAppointment.findOne({
        userId: req.publicUser._id,
        hospitalId,
        status: 'booked'
      });

      if (existingAppt) {
        return res.status(400).json({ 
          success: false, 
          message: 'You already have an active deployment scheduled at this sector. Please complete or abort it before re-booking.' 
        });
      }

      const appointment = await DonationAppointment.create({
        userId: req.publicUser._id,
        hospitalId: slot.hospitalId,
        hospitalSlotId: slot._id,
        timeSlot: slot.startTime,
      });

      slot.bookedCount += 1;
      await slot.save();

      // Send confirmation email (async)
      sendAppointmentBookingEmail(req.publicUser, appointment, {
        hospitalName: hospital.name,
        hospitalAddress: hospital.address,
        latitude: hospital.location?.coordinates?.[1] || 0,
        longitude: hospital.location?.coordinates?.[0] || 0,
        timeSlot: slot.startTime,
        type: 'hospital'
      }).catch(err => console.error('Slot booking email error:', err));

      res.status(201).json({ success: true, data: appointment, slot });
    } catch (error) {
      next(error);
    }
  }
);

// Book camp slot (wraps BloodCamp time slot registration)
router.post(
  '/camp',
  protectPublic,
  [body('campId').isMongoId(), body('timeSlotIndex').isInt({ min: 0 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Check mission readiness (Eligibility)
      if (req.publicUser.nextEligibleDate && new Date(req.publicUser.nextEligibleDate) > new Date()) {
        const daysRemaining = Math.ceil((new Date(req.publicUser.nextEligibleDate) - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          success: false, 
          message: `Regeneration Phase Incomplete. Deployment locked for ${daysRemaining} more cycles.` 
        });
      }

      const camp = await BloodCamp.findById(req.body.campId);
      if (!camp) {
        return res.status(404).json({ success: false, message: 'Blood camp not found' });
      }

      const timeSlotIndex = req.body.timeSlotIndex;
      if (timeSlotIndex >= camp.timeSlots.length) {
        return res.status(400).json({ success: false, message: 'Invalid time slot index' });
      }

      const timeSlot = camp.timeSlots[timeSlotIndex];
      if (timeSlot.registeredDonors.length >= timeSlot.maxDonors) {
        return res.status(400).json({ success: false, message: 'Time slot is full' });
      }

      // Register anonymous entry for now
      timeSlot.registeredDonors.push({
        firstName: req.publicUser.firstName,
        lastName: req.publicUser.lastName,
        phone: req.publicUser.phone,
        email: req.publicUser.email,
        registeredAt: new Date(),
      });

      camp.totalRegistrations += 1;
      await camp.save();

      // Prevent duplicate active booking for the same camp
      const existingAppt = await DonationAppointment.findOne({
        userId: req.publicUser._id,
        campId: camp._id,
        status: 'booked'
      });

      if (existingAppt) {
        return res.status(400).json({ 
          success: false, 
          message: 'You are already registered for this camp. Access your mission card in the dashboard.' 
        });
      }

      const appointment = await DonationAppointment.create({
        userId: req.publicUser._id,
        campId: camp._id,
        campTimeSlotIndex: timeSlotIndex,
      });

      // Send confirmation email (async)
      console.log(`📡 Dispatching Mission Briefing to: ${req.publicUser.email}`);
      sendAppointmentBookingEmail(req.publicUser, appointment, {
        hospitalName: camp.name,
        hospitalAddress: camp.location.address,
        latitude: camp.location.coordinates?.latitude || 0,
        longitude: camp.location.coordinates?.longitude || 0,
        timeSlot: `${new Date(camp.startDate).toDateString()} ${timeSlot.startTime}`,
        type: 'camp'
      }).catch(err => console.error('❌ Camp booking email error:', err));

      res.status(201).json({ success: true, data: appointment, camp });
    } catch (error) {
      next(error);
    }
  }
);

// List own appointments
router.get('/', protectPublic, async (req, res, next) => {
  try {
    const appointments = await DonationAppointment.find({ userId: req.publicUser._id })
      .populate('hospitalId', 'name address')
      .populate('campId', 'name location');

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
});

// Cancel appointment
router.put('/:id/cancel', protectPublic, async (req, res, next) => {
  try {
    const appt = await DonationAppointment.findOne({ _id: req.params.id, userId: req.publicUser._id });
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    appt.status = 'cancelled';
    await appt.save();

    res.json({ success: true, data: appt });
  } catch (error) {
    next(error);
  }
});

export default router;
