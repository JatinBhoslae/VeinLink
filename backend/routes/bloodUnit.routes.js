import express from 'express';
import { body, validationResult } from 'express-validator';
import BloodUnit from '../models/BloodUnit.model.js';
import Donor from '../models/Donor.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';
import { generateQRCode } from '../utils/generateQR.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/blood-units
// @desc    Get all blood units
// @access  Private
router.get('/', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = {};
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    // Filters
    if (req.query.bloodGroup) {
      filter.bloodGroup = req.query.bloodGroup;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.expiringSoon === 'true') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      filter.expiryDate = { $lte: sevenDaysFromNow, $gte: new Date() };
    }

    const bloodUnits = await BloodUnit.find(filter)
      .populate('donorId', 'firstName lastName bloodGroup phone')
      .sort({ collectionDate: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .skip(parseInt(req.query.skip) || 0);

    const total = await BloodUnit.countDocuments(filter);

    res.json({
      success: true,
      count: bloodUnits.length,
      total,
      data: bloodUnits,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/blood-units/:id
// @desc    Get single blood unit
// @access  Private
router.get('/:id', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const bloodUnit = await BloodUnit.findOne(filter)
      .populate('donorId')
      .populate('hospitalId', 'name');

    if (!bloodUnit) {
      return res.status(404).json({
        success: false,
        message: 'Blood unit not found',
      });
    }

    res.json({
      success: true,
      data: bloodUnit,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/blood-units/qr/:bagId
// @desc    Get blood unit by QR code/bag ID
// @access  Private
router.get('/qr/:bagId', authorize('hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const filter = { bagId: req.params.bagId };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const bloodUnit = await BloodUnit.findOne(filter)
      .populate('donorId')
      .populate('hospitalId', 'name');

    if (!bloodUnit) {
      return res.status(404).json({
        success: false,
        message: 'Blood unit not found',
      });
    }

    res.json({
      success: true,
      data: bloodUnit,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/blood-units
// @desc    Create new blood unit (with QR code)
// @access  Private (Staff - Collection)
router.post(
  '/',
  authorize('hospital_admin', 'staff'),
  [
    body('donorId').isMongoId(),
    body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
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

      const { donorId, bloodGroup, volume, rackNumber } = req.body;

      // Verify donor exists and belongs to hospital
      const donor = await Donor.findOne({
        _id: donorId,
        hospitalId: req.user.hospitalId,
      });

      if (!donor) {
        return res.status(404).json({
          success: false,
          message: 'Donor not found',
        });
      }

      // Generate unique bag ID
      const bagId = `BLD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Generate QR code data
      const qrData = {
        bagId,
        donorId: donor._id.toString(),
        donorName: `${donor.firstName} ${donor.lastName}`,
        bloodGroup,
        collectionDate: new Date(),
        hospitalId: req.user.hospitalId.toString(),
        rackNumber: rackNumber || null,
      };

      const qrCode = await generateQRCode(qrData);

      // Calculate expiry date (42 days from collection)
      const collectionDate = new Date();
      const expiryDate = new Date(collectionDate);
      expiryDate.setDate(expiryDate.getDate() + 42);

      // Create blood unit
      const bloodUnit = await BloodUnit.create({
        bagId,
        qrCode,
        bloodGroup,
        donorId,
        hospitalId: req.user.hospitalId,
        collectionDate,
        expiryDate,
        status: 'collected',
        volume: volume || 450,
        rackNumber,
      });

      // Update donor's last donation date and total donations
      donor.lastDonationDate = new Date();
      donor.totalDonations += 1;
      await donor.save();

      await logAction('BLOOD_UNIT_CREATED', 'BloodUnit', bloodUnit._id, req.user._id, req.user.hospitalId, qrData, req);

      res.status(201).json({
        success: true,
        data: bloodUnit,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/blood-units/:id/status
// @desc    Update blood unit status
// @access  Private
router.put(
  '/:id/status',
  authorize('hospital_admin', 'staff'),
  [
    body('status').isIn(['collected', 'tested', 'available', 'reserved', 'issued', 'expired', 'disposed']),
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

      const bloodUnit = await BloodUnit.findOne(filter);

      if (!bloodUnit) {
        return res.status(404).json({
          success: false,
          message: 'Blood unit not found',
        });
      }

      const oldStatus = bloodUnit.status;
      bloodUnit.status = req.body.status;
      await bloodUnit.save();

      await logAction('BLOOD_UNIT_STATUS_UPDATED', 'BloodUnit', bloodUnit._id, req.user._id, req.user.hospitalId, {
        oldStatus,
        newStatus: req.body.status,
      }, req);

      res.json({
        success: true,
        data: bloodUnit,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/blood-units/:id/test-results
// @desc    Update test results
// @access  Private (Staff - Testing)
router.put(
  '/:id/test-results',
  authorize('hospital_admin', 'staff'),
  async (req, res, next) => {
    try {
      const filter = { _id: req.params.id };
      
      if (req.user.role !== 'super_admin') {
        filter.hospitalId = req.user.hospitalId;
      }

      const bloodUnit = await BloodUnit.findOne(filter);

      if (!bloodUnit) {
        return res.status(404).json({
          success: false,
          message: 'Blood unit not found',
        });
      }

      const { hiv, hepatitisB, hepatitisC, syphilis } = req.body;

      if (hiv) {
        bloodUnit.testResults.hiv = {
          ...bloodUnit.testResults.hiv,
          ...hiv,
          testedAt: new Date(),
          testedBy: req.user._id,
        };
      }
      if (hepatitisB) {
        bloodUnit.testResults.hepatitisB = {
          ...bloodUnit.testResults.hepatitisB,
          ...hepatitisB,
          testedAt: new Date(),
          testedBy: req.user._id,
        };
      }
      if (hepatitisC) {
        bloodUnit.testResults.hepatitisC = {
          ...bloodUnit.testResults.hepatitisC,
          ...hepatitisC,
          testedAt: new Date(),
          testedBy: req.user._id,
        };
      }
      if (syphilis) {
        bloodUnit.testResults.syphilis = {
          ...bloodUnit.testResults.syphilis,
          ...syphilis,
          testedAt: new Date(),
          testedBy: req.user._id,
        };
      }

      // Auto-update status to 'tested' if all tests are done
      const allTests = [
        bloodUnit.testResults.hiv,
        bloodUnit.testResults.hepatitisB,
        bloodUnit.testResults.hepatitisC,
        bloodUnit.testResults.syphilis,
      ];

      const allTestsDone = allTests.every(
        (test) => test.status !== 'pending'
      );

      if (allTestsDone) {
        const allNegative = allTests.every((test) => test.status === 'negative');
        bloodUnit.status = allNegative ? 'available' : 'disposed';
      }

      await bloodUnit.save();

      await logAction('BLOOD_UNIT_TEST_UPDATED', 'BloodUnit', bloodUnit._id, req.user._id, req.user.hospitalId, {
        testResults: bloodUnit.testResults,
      }, req);

      res.json({
        success: true,
        data: bloodUnit,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/blood-units/:id/storage
// @desc    Update storage location
// @access  Private
router.put(
  '/:id/storage',
  authorize('hospital_admin', 'staff'),
  async (req, res, next) => {
    try {
      const filter = { _id: req.params.id };
      
      if (req.user.role !== 'super_admin') {
        filter.hospitalId = req.user.hospitalId;
      }

      const bloodUnit = await BloodUnit.findOne(filter);

      if (!bloodUnit) {
        return res.status(404).json({
          success: false,
          message: 'Blood unit not found',
        });
      }

      const { location, temperature, shelf } = req.body;

      const oldStorage = { ...bloodUnit.storage.toObject() };
      bloodUnit.storage = {
        location: location || bloodUnit.storage.location,
        temperature: temperature || bloodUnit.storage.temperature,
        shelf: shelf || bloodUnit.storage.shelf,
      };

      // Add to movement history
      bloodUnit.movementHistory.push({
        from: oldStorage.location || 'Unknown',
        to: bloodUnit.storage.location,
        movedBy: req.user._id,
        notes: req.body.notes,
      });

      await bloodUnit.save();

      await logAction('BLOOD_UNIT_STORAGE_UPDATED', 'BloodUnit', bloodUnit._id, req.user._id, req.user.hospitalId, {
        oldStorage,
        newStorage: bloodUnit.storage,
      }, req);

      res.json({
        success: true,
        data: bloodUnit,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

