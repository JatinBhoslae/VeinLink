import express from 'express';
import { body, validationResult } from 'express-validator';
import Hospital from '../models/Hospital.model.js';
import User from '../models/User.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { logAction } from '../utils/auditLogger.js';
import { generateToken } from '../utils/generateToken.js';
import { uploadCertificate } from '../middleware/upload.middleware.js';
import { uploadOnCloudinary, deleteOnCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// @route   POST /api/hospitals/register
// @desc    Public hospital registration (creates hospital and admin)
// @access  Public
router.post(
  '/register',
  uploadCertificate,
  [
    body('hospitalName').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });

        // @route   GET /api/hospitals/approved-list
        // @desc    Get list of approved hospitals for inter-hospital requests
        // @access  Private (Hospital Admin, Staff, Super Admin)
        router.get('/approved-list', authorize('super_admin', 'hospital_admin', 'staff'), async (req, res, next) => {
          try {
            const filter = { isApproved: true };

            // Normal hospitals should not see themselves as targets
            const hospitals = await Hospital.find(filter)
              .select('name email status')
              .sort({ name: 1 });

            const filtered = req.user.hospitalId
              ? hospitals.filter((h) => h._id.toString() !== req.user.hospitalId.toString())
              : hospitals;

            res.json({
              success: true,
              data: filtered,
            });
          } catch (error) {
            next(error);
          }
        });
      }

      const {
        hospitalName,
        email,
        password,
        firstName,
        lastName,
        phone,
        address,
        licenseNumber,
      } = req.body;

      // Check if hospital email exists
      const existingHospital = await Hospital.findOne({ email });
      if (existingHospital) {
        return res.status(400).json({
          success: false,
          message: 'Hospital with this email already exists',
        });
      }

      // Check if user email exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Handle certificate upload if file is provided
      let certificateData = null;
      if (req.file) {
        const cloudinaryResponse = await uploadOnCloudinary(req.file.path, req.file.mimetype);
        if (!cloudinaryResponse) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload certificate to cloud storage',
          });
        }
        certificateData = {
          public_id: cloudinaryResponse.public_id,
          url: cloudinaryResponse.secure_url,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        };
      }

      // Create hospital
      const hospital = await Hospital.create({
        name: hospitalName,
        email,
        phone,
        address,
        licenseNumber,
        certificate: certificateData,
        isApproved: false, // Requires super admin approval
      });

      // Create hospital admin user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role: 'hospital_admin',
        hospitalId: hospital._id,
        phone,
      });

      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Hospital registered successfully. Waiting for approval.',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hospitalId: user.hospitalId,
        },
        hospital: {
          id: hospital._id,
          name: hospital.name,
          isApproved: hospital.isApproved,
          certificate: hospital.certificate,
        },
      });
    } catch (error) {
      // Handle multer errors specifically
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB.',
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded.',
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.',
        });
      }
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error('Registration error:', error);
      next(error);
    }
  }
);

// Public: list approved hospitals for common users
// @route   GET /api/hospitals/public/approved
// @access  Public
router.get('/public/approved', async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ isApproved: true })
      .select('name address phone status')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: hospitals,
    });
  } catch (error) {
    next(error);
  }
});

router.use(protect);

// @route   GET /api/hospitals/approved-list
// @desc    Get list of approved hospitals for inter-hospital requests
// @access  Private (Hospital Admin, Staff, Super Admin)
router.get('/approved-list', authorize('super_admin', 'hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const filter = { isApproved: true };

    const hospitals = await Hospital.find(filter)
      .select('name email status')
      .sort({ name: 1 });

    const filtered = req.user.hospitalId
      ? hospitals.filter((h) => h._id.toString() !== req.user.hospitalId.toString())
      : hospitals;

    res.json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/hospitals
// @desc    Get all hospitals
// @access  Private (Super Admin)
router.get('/', authorize('super_admin'), async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.isApproved !== undefined) {
      filter.isApproved = req.query.isApproved === 'true';
    }

    if (req.query.status !== undefined) {
      filter.status = req.query.status;
    }

    const hospitals = await Hospital.find(filter)
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .skip(parseInt(req.query.skip) || 0);

    const total = await Hospital.countDocuments(filter);

    res.json({
      success: true,
      count: hospitals.length,
      total,
      data: hospitals,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/hospitals/:id/reject
// @desc    Reject hospital
// @access  Private (Super Admin)
router.put('/:id/reject', authorize('super_admin'), async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    // Mark as rejected
    hospital.isApproved = false;
    hospital.status = 'rejected';
    hospital.rejectedBy = req.user._id;
    hospital.rejectedAt = new Date();
    hospital.rejectionReason = req.body.rejectionReason || 'Rejected by administrator';
    hospital.approvedBy = null;
    hospital.approvedAt = null;
    await hospital.save();

    await logAction('HOSPITAL_REJECTED', 'Hospital', hospital._id, req.user._id, null, {
      rejectionReason: hospital.rejectionReason
    }, req);

    res.json({
      success: true,
      message: 'Hospital rejected successfully',
      data: hospital,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/hospitals/:id
// @desc    Get single hospital
// @access  Private
router.get('/:id', authorize('super_admin', 'hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };

    // Hospital admins can only see their own hospital
    if (req.user.role === 'hospital_admin') {
      if (req.params.id !== req.user.hospitalId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this hospital',
        });
      }
    }

    const hospital = await Hospital.findOne(filter)
      .populate('approvedBy', 'firstName lastName');

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    res.json({
      success: true,
      data: hospital,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/hospitals/:id/approve
// @desc    Approve hospital
// @access  Private (Super Admin)
router.put('/:id/approve', authorize('super_admin'), async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    if (hospital.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Hospital is already approved',
      });
    }

    hospital.isApproved = true;
    hospital.status = 'approved';
    hospital.approvedBy = req.user._id;
    hospital.approvedAt = new Date();
    hospital.rejectedBy = null;
    hospital.rejectedAt = null;
    hospital.rejectionReason = null;
    await hospital.save();

    await logAction('HOSPITAL_APPROVED', 'Hospital', hospital._id, req.user._id, null, {}, req);

    res.json({
      success: true,
      message: 'Hospital approved successfully',
      data: hospital,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/hospitals/:id
// @desc    Update hospital
// @access  Private
router.put('/:id', authorize('super_admin', 'hospital_admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };

    if (req.user.role === 'hospital_admin') {
      if (req.params.id !== req.user.hospitalId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this hospital',
        });
      }
    }

    const hospital = await Hospital.findOne(filter);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    const oldData = hospital.toObject();
    Object.assign(hospital, req.body);
    await hospital.save();

    await logAction('HOSPITAL_UPDATED', 'Hospital', hospital._id, req.user._id, hospital._id, {
      old: oldData,
      new: hospital.toObject(),
    }, req);

    res.json({
      success: true,
      data: hospital,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/hospitals/:id/certificate
// @desc    Update hospital certificate
// @access  Private (Hospital Admin, Super Admin)
router.put('/:id/certificate',
  authorize('super_admin', 'hospital_admin'),
  uploadCertificate,
  async (req, res, next) => {
    try {
      const filter = { _id: req.params.id };

      // Hospital admins can only update their own hospital
      if (req.user.role === 'hospital_admin') {
        if (req.params.id !== req.user.hospitalId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this hospital',
          });
        }
      }

      const hospital = await Hospital.findOne(filter);

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No certificate file provided',
        });
      }

      // Delete old certificate if exists
      if (hospital.certificate && hospital.certificate.public_id) {
        const oldMime = hospital.certificate.mimeType;
        const deleteResourceType = oldMime && oldMime.startsWith('image/')
          ? 'image'
          : (oldMime === 'application/pdf' || oldMime === 'application/msword' || oldMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            ? 'raw'
            : 'image';
        await deleteOnCloudinary(hospital.certificate.public_id, deleteResourceType);
      }

      // Upload new certificate
      const cloudinaryResponse = await uploadOnCloudinary(req.file.path, req.file.mimetype);
      if (!cloudinaryResponse) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload certificate to cloud storage',
        });
      }

      const certificateData = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      hospital.certificate = certificateData;
      await hospital.save();

      await logAction('HOSPITAL_CERTIFICATE_UPDATED', 'Hospital', hospital._id, req.user._id, hospital._id, {
        new: certificateData,
      }, req);

      res.json({
        success: true,
        data: hospital,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/hospitals/:id
// @desc    Delete hospital
// @access  Private (Super Admin)
router.delete('/:id', authorize('super_admin'), async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    await logAction('HOSPITAL_DELETED', 'Hospital', hospital._id, req.user._id, null, {}, req);

    res.json({
      success: true,
      message: 'Hospital deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/hospitals/:id/like
// @desc    Toggle like/unlike a hospital
// @access  Private
router.put('/:id/like', async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const userId = req.user._id;
    const alreadyLiked = hospital.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // Unlike
      hospital.likes = hospital.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      hospital.likesCount = Math.max(0, hospital.likes.length);
      await hospital.save();

      res.json({
        success: true,
        message: 'Hospital unliked',
        data: {
          liked: false,
          likesCount: hospital.likesCount,
        },
      });
    } else {
      // Like
      hospital.likes.push(userId);
      hospital.likesCount = hospital.likes.length;
      await hospital.save();

      res.json({
        success: true,
        message: 'Hospital liked',
        data: {
          liked: true,
          likesCount: hospital.likesCount,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
