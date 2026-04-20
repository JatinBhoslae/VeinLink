import express from 'express';
import { body, validationResult } from 'express-validator';
import BloodCamp from '../models/BloodCamp.model.js';
import Donor from '../models/Donor.model.js';
import BloodUnit from '../models/BloodUnit.model.js';
import Hospital from '../models/Hospital.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/blood-camps
// @desc    Get all blood camps
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

    const camps = await BloodCamp.find(filter)
      .sort({ startDate: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .skip(parseInt(req.query.skip) || 0);

    const total = await BloodCamp.countDocuments(filter);

    res.json({
      success: true,
      count: camps.length,
      total,
      data: camps,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/blood-camps/:id
// @desc    Get single blood camp
// @access  Private
router.get('/:id', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const camp = await BloodCamp.findOne(filter)
      .populate('checkIns.donorId', 'firstName lastName bloodGroup phone')
      .populate('checkIns.checkedInBy', 'firstName lastName');

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found',
      });
    }

    res.json({
      success: true,
      data: camp,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/blood-camps/public/:publicLink
// @desc    Get blood camp by public link (for public registration)
// @access  Public
router.get('/public/:publicLink', async (req, res, next) => {
  try {
    const camp = await BloodCamp.findOne({ publicLink: req.params.publicLink })
      .populate('hospitalId', 'name address');

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found',
      });
    }

    res.json({
      success: true,
      data: camp,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/blood-camps
// @desc    Create new blood camp
// @access  Private (Hospital Admin)
router.post(
  '/',
  authorize('hospital_admin'),
  [
    body('name').trim().notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('location.address').trim().notEmpty(),
    body('location.zipCode').optional().isLength({ min: 6, max: 6 }).isNumeric(),
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

      const campId = `CAMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const publicLink = `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const campData = {
        campId,
        hospitalId: req.user.hospitalId,
        publicLink,
        ...req.body,
      };

      const camp = await BloodCamp.create(campData);

      await logAction('BLOOD_CAMP_CREATED', 'BloodCamp', camp._id, req.user._id, req.user.hospitalId, campData, req);

      res.status(201).json({
        success: true,
        data: camp,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/blood-camps/:id
// @desc    Update blood camp
// @access  Private (Hospital Admin)
router.put('/:id', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const camp = await BloodCamp.findOne(filter);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found',
      });
    }

    const oldData = camp.toObject();
    Object.assign(camp, req.body);
    await camp.save();

    await logAction('BLOOD_CAMP_UPDATED', 'BloodCamp', camp._id, req.user._id, req.user.hospitalId, {
      old: oldData,
      new: camp.toObject(),
    }, req);

    res.json({
      success: true,
      data: camp,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/blood-camps/:id/register
// @desc    Register donor for time slot (public or authenticated)
// @access  Public/Authenticated
router.post(
  '/:id/register',
  [
    body('donorId').optional().isMongoId(),
    body('timeSlotIndex').isInt({ min: 0 }),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
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

      const camp = await BloodCamp.findById(req.params.id);

      if (!camp) {
        return res.status(404).json({
          success: false,
          message: 'Blood camp not found',
        });
      }

      const { timeSlotIndex, donorId, firstName, lastName, phone, email } = req.body;

      if (timeSlotIndex >= camp.timeSlots.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time slot index',
        });
      }

      const timeSlot = camp.timeSlots[timeSlotIndex];

      if (timeSlot.registeredDonors.length >= timeSlot.maxDonors) {
        return res.status(400).json({
          success: false,
          message: 'Time slot is full',
        });
      }

      // If donorId provided, verify it exists and belongs to hospital
      if (donorId) {
        const donor = await Donor.findOne({
          _id: donorId,
          hospitalId: camp.hospitalId,
        });

        if (!donor) {
          return res.status(404).json({
            success: false,
            message: 'Donor not found',
          });
        }

        // Check if already registered
        const alreadyRegistered = timeSlot.registeredDonors.some(
          (reg) => reg.donorId.toString() === donorId
        );

        if (alreadyRegistered) {
          return res.status(400).json({
            success: false,
            message: 'Donor already registered for this time slot',
          });
        }

        timeSlot.registeredDonors.push({
          donorId,
          registeredAt: new Date(),
        });
      } else {
        // Public registration - create temporary entry
        timeSlot.registeredDonors.push({
          firstName,
          lastName,
          phone,
          email,
          registeredAt: new Date(),
        });
      }

      camp.totalRegistrations += 1;
      await camp.save();

      res.json({
        success: true,
        message: 'Successfully registered for time slot',
        data: camp,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/blood-camps/:id/checkin
// @desc    Check in donor at camp
// @access  Private (Staff)
router.post(
  '/:id/checkin',
  authorize('hospital_admin', 'staff'),
  [
    body('donorId').isMongoId(),
    body('qrScanned').optional().isBoolean(),
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

      const filter = { _id: req.params.id };
      
      if (req.user.role !== 'super_admin') {
        filter.hospitalId = req.user.hospitalId;
      }

      const camp = await BloodCamp.findOne(filter);

      if (!camp) {
        return res.status(404).json({
          success: false,
          message: 'Blood camp not found',
        });
      }

      const { donorId, qrScanned } = req.body;

      // Check if already checked in
      const alreadyCheckedIn = camp.checkIns.some(
        (checkIn) => checkIn.donorId.toString() === donorId
      );

      if (alreadyCheckedIn) {
        return res.status(400).json({
          success: false,
          message: 'Donor already checked in',
        });
      }

      camp.checkIns.push({
        donorId,
        checkedInBy: req.user._id,
        qrScanned: qrScanned || false,
      });

      camp.totalCollections += 1;
      await camp.save();

      await logAction('BLOOD_CAMP_CHECKIN', 'BloodCamp', camp._id, req.user._id, req.user.hospitalId, {
        donorId,
      }, req);

      res.json({
        success: true,
        message: 'Donor checked in successfully',
        data: camp,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/blood-camps/:id/complete
// @desc    Complete blood camp and record collected blood
// @access  Private (Hospital Admin, Staff)
router.post(
  '/:id/complete',
  authorize('hospital_admin', 'staff'),
  [
    body('collections').isArray({ min: 1 }).withMessage('Collections must be a non-empty array'),
    body('collections.*.bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
    body('collections.*.units').custom((value) => {
      const n = parseInt(value);
      return !isNaN(n) && n >= 0;
    }).withMessage('Units must be a non-negative number'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const camp = await BloodCamp.findById(req.params.id);
      if (!camp) {
        return res.status(404).json({ success: false, message: 'Blood camp not found' });
      }

      if (camp.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Camp already completed' });
      }

      const { collections } = req.body;
      camp.bloodGroupCollections = collections;
      camp.status = 'completed';
      
      const totalUnits = collections.reduce((acc, curr) => acc + curr.units, 0);
      camp.totalCollections = totalUnits;

      await camp.save();

      // Create BloodUnit records for each collection
      const bloodUnitsToCreate = [];
      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 42); // 42 days shelf life
      
      for (const col of collections) {
        for (let i = 0; i < col.units; i++) {
          // Unique bagId: CAMP-[CampID]-[Group]-[Timestamp]-[Random]-[Index]
          const uniqueSuffix = `${Math.random().toString(36).substring(2, 7)}-${i}`;
          const bagId = `BAG-CAMP-${camp.campId}-${col.bloodGroup}-${Date.now()}-${uniqueSuffix}`.toUpperCase();
          
          bloodUnitsToCreate.push({
            bagId,
            qrCode: bagId,
            bloodGroup: col.bloodGroup,
            hospitalId: camp.hospitalId,
            collectionDate: now,
            expiryDate: expiryDate,
            status: 'available',
            volume: 450
          });
        }
      }

      if (bloodUnitsToCreate.length > 0) {
        await BloodUnit.insertMany(bloodUnitsToCreate);
      }

      await logAction('BLOOD_CAMP_COMPLETED', 'BloodCamp', camp._id, req.user._id, req.user.hospitalId, {
        collections,
        totalUnits
      }, req);

      res.json({
        success: true,
        message: 'Camp completed and inventory updated',
        data: camp,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/blood-camps/:id/report
// @desc    Get blood camp report data
// @access  Private
router.get('/:id/report', authorize('hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const camp = await BloodCamp.findById(req.params.id)
      .populate('hospitalId', 'name address phone email')
      .populate('checkIns.donorId', 'firstName lastName bloodGroup phone');

    if (!camp) {
      return res.status(404).json({ success: false, message: 'Blood camp not found' });
    }

    // Return detailed data for report generation
    res.json({
      success: true,
      data: {
        camp,
        generatedAt: new Date(),
        generatedBy: {
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

