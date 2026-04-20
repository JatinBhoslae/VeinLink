import express from 'express';
import { body, validationResult } from 'express-validator';
import Donor from '../models/Donor.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';
import { findNearestEligibleDonors } from '../utils/donorMatching.js';
import Hospital from '../models/Hospital.model.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/donors
// @desc    Get all donors
// @access  Private (Hospital Admin, Staff)
router.get('/', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = {};
    
    // Hospital admins and staff can only see their hospital's donors
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    // Optional filters
    if (req.query.bloodGroup) {
      filter.bloodGroup = req.query.bloodGroup;
    }
    if (req.query.isEligible !== undefined) {
      filter.isEligible = req.query.isEligible === 'true';
    }

    const donors = await Donor.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .skip(parseInt(req.query.skip) || 0);

    const total = await Donor.countDocuments(filter);

    res.json({
      success: true,
      count: donors.length,
      total,
      data: donors,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/donors/:id
// @desc    Get single donor
// @access  Private
router.get('/:id', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const donor = await Donor.findOne(filter);

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found',
      });
    }

    res.json({
      success: true,
      data: donor,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/donors
// @desc    Create new donor
// @access  Private (Hospital Admin, Staff)
router.post(
  '/',
  authorize('hospital_admin', 'staff'),
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('dateOfBirth')
      .isISO8601()
      .custom((value) => {
        const dob = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 18) {
          throw new Error('Donor must be at least 18 years old');
        }
        return true;
      }),
    body('gender').isIn(['male', 'female', 'other']),
    body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('weight')
      .isFloat({ min: 40, max: 200 })
      .withMessage('Weight must be between 40 and 200 kg')
      .toFloat(),
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

      const donorData = {
        ...req.body,
        weight: parseFloat(req.body.weight), // Ensure weight is a number
        hospitalId: req.user.hospitalId,
        createdBy: req.user.id,
      };

      // Handle location field - only include if valid coordinates are provided
      // Remove location entirely if it's empty, incomplete, or invalid
      if (donorData.location) {
        const hasValidCoordinates = 
          donorData.location.coordinates && 
          Array.isArray(donorData.location.coordinates) && 
          donorData.location.coordinates.length === 2 &&
          typeof donorData.location.coordinates[0] === 'number' &&
          typeof donorData.location.coordinates[1] === 'number';

        if (hasValidCoordinates) {
          // Ensure location has proper GeoJSON format
          donorData.location = {
            type: 'Point',
            coordinates: donorData.location.coordinates,
          };
        } else {
          // Remove location if invalid or incomplete
          delete donorData.location;
        }
      }

      const donor = await Donor.create(donorData);

      await logAction('DONOR_CREATED', 'Donor', donor._id, req.user._id, req.user.hospitalId, donorData, req);

      res.status(201).json({
        success: true,
        data: donor,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/donors/:id
// @desc    Update donor
// @access  Private
router.put(
  '/:id',
  authorize('hospital_admin', 'staff'),
  [
    body('weight')
      .optional()
      .isFloat({ min: 40, max: 200 })
      .withMessage('Weight must be between 40 and 200 kg')
      .toFloat(),
  ],
  async (req, res, next) => {
    try {
      const filter = { _id: req.params.id };
      
      if (req.user.role !== 'super_admin') {
        filter.hospitalId = req.user.hospitalId;
      }

      const donor = await Donor.findOne(filter);

      if (!donor) {
        return res.status(404).json({
          success: false,
          message: 'Donor not found',
        });
      }

      const oldData = donor.toObject();
      
      // Handle update data
      const updateData = { ...req.body };
      
      // Convert weight to number if provided
      if (updateData.weight !== undefined) {
        updateData.weight = parseFloat(updateData.weight);
      }
      if (updateData.dateOfBirth) {
        const dob = new Date(updateData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 18) {
          return res.status(400).json({
            success: false,
            message: 'Donor must be at least 18 years old',
          });
        }
      }
      if (updateData.location) {
        // If location is provided but doesn't have coordinates, remove it
        if (!updateData.location.coordinates || !Array.isArray(updateData.location.coordinates) || updateData.location.coordinates.length !== 2) {
          delete updateData.location;
          // Set location to undefined to remove it
          donor.location = undefined;
        } else {
          // Ensure location has proper GeoJSON format
          updateData.location = {
            type: 'Point',
            coordinates: updateData.location.coordinates,
          };
        }
      }

      Object.assign(donor, updateData);
      await donor.save();

      const updatedDonorObj = donor.toObject();
      await logAction(req.user.id, 'update', 'Donor', donor._id, {
        old: oldData,
        new: updatedDonorObj,
      });

      res.json({
        success: true,
        data: donor,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/donors/:id
// @desc    Delete donor
// @access  Private (Hospital Admin only)
router.delete('/:id', authorize('hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    const donor = await Donor.findOneAndDelete(filter);

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found',
      });
    }

    await logAction('DONOR_DELETED', 'Donor', donor._id, req.user._id, req.user.hospitalId, {}, req);

    res.json({
      success: true,
      message: 'Donor deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/donors/match/nearest
// @desc    Find nearest eligible donors for a blood group
// @access  Private
router.get('/match/nearest', authorize('hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const { bloodGroup, radius } = req.query;

    if (!bloodGroup) {
      return res.status(400).json({
        success: false,
        message: 'Blood group is required',
      });
    }

    // Get hospital location
    const hospital = await Hospital.findById(req.user.hospitalId);
    if (!hospital || !hospital.location) {
      return res.status(400).json({
        success: false,
        message: 'Hospital location not set',
      });
    }

    const radiusKm = parseInt(radius) || 50;
    
    // Convert hospital location to GeoJSON if needed
    let hospitalLocation = hospital.location;
    if (hospital.location.latitude && hospital.location.longitude && !hospital.location.coordinates) {
      hospitalLocation = {
        type: 'Point',
        coordinates: [hospital.location.longitude, hospital.location.latitude],
      };
    }
    
    const donors = await findNearestEligibleDonors(
      Donor,
      bloodGroup,
      hospitalLocation,
      radiusKm
    );

    res.json({
      success: true,
      count: donors.length,
      data: donors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

