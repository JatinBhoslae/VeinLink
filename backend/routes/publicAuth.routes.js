import express from 'express';
import { body, validationResult } from 'express-validator';
import PublicUser from '../models/PublicUser.model.js';
import { generateToken } from '../utils/generateToken.js';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// Public user signup
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }).withMessage('Password must be at least 1 character long'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('hasUnderlyingDisease').isBoolean(),
    body('onMedication').isBoolean(),
  ],
  async (req, res, next) => {
    try {
      console.log('[DEBUG] Signup Request Body Received:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[DEBUG] Signup Validation Errors:', errors.array());
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email } = req.body;

      const existing = await PublicUser.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const user = await PublicUser.create(req.body);

      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Public user forgot password - generate verification code
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    console.log('Forgot Password request for:', email);
    const user = await PublicUser.findOne({ email });

    if (!user) {
      console.log('Registration check failed for:', email);
      return res.status(404).json({ success: false, message: 'This email is not registered.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Verification Code',
        message: `Your verification code for password reset is: ${code}. It expires in 30 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #d32f2f; text-align: center;">VienLink Verification Code</h2>
            <p>Hello ${user.firstName},</p>
            <p>You requested to reset your password. Please use the following verification code:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code is valid for 30 minutes. If you did not request this, please ignore this email.</p>
            <p style="color: #757575; font-size: 12px; margin-top: 30px; text-align: center;">&copy; 2026 VienLink Blood Management. All rights reserved.</p>
          </div>
        `,
      });

      res.json({
        success: true,
        message: 'Verification code sent to your email.',
      });
    } catch (error) {
      user.resetCode = undefined;
      user.resetCodeExpires = undefined;
      await user.save();
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
});

// Public user reset password with code
router.post(
  '/reset-password',
  [body('email').isEmail().normalizeEmail(), body('code').notEmpty(), body('newPassword').isLength({ min: 6 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, code, newPassword } = req.body;
      console.log(`Resetting password for: ${email} with code: ${code}`);
      
      const user = await PublicUser.findOne({ email });
      
      if (!user || String(user.resetCode) !== String(code) || user.resetCodeExpires < new Date()) {
        console.log(`Reset failed: User found? ${!!user}, Code match? ${user?.resetCode === String(code)}, Expired? ${user?.resetCodeExpires < new Date()}`);
        return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      }

      user.password = newPassword;
      user.resetCode = undefined;
      user.resetCodeExpires = undefined;
      await user.save();

      console.log('Password reset successful for:', email);
      res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
    } catch (error) {
      next(error);
    }
  }
);
// Public user login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await PublicUser.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account is inactive' });
      }

      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current public user
router.get('/me', protectPublic, async (req, res, next) => {
  try {
    res.json({ success: true, user: req.publicUser });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', protectPublic, async (req, res, next) => {
  try {
    const userId = req.publicUser._id;
    console.log(`[MISSION-SYNC] Profile update request for operative: ${userId}`);
    console.log('[DEBUG] Incoming Manifest:', req.body);

    const updateData = {};
    const updatable = [
      'firstName', 'lastName', 'phone', 'city', 'state', 'address', 
      'pincode', 'pinCode', 'emergencyContactName', 'emergencyContactPhone',
      'hasUnderlyingDisease', 'diseaseDetails', 'onMedication', 'medicationDetails',
      'bloodGroup', 'gender', 'preferences'
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'preferences') {
           updateData.preferences = { ...req.publicUser.preferences, ...req.body.preferences };
        } else if (field === 'pincode' || field === 'pinCode') {
          updateData.pinCode = req.body[field];
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle coordinates for GeoJSON update
    const { latitude, longitude } = req.body;
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        updateData.location = {
          type: 'Point',
          coordinates: [lng, lat]
        };
        updateData.locationUpdatedAt = new Date();
      }
    }

    const user = await PublicUser.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    console.log('[SYNC-COMPLETE] Identity dossier synchronized successfully');
    res.json({ success: true, user });
  } catch (error) {
    console.error('[CRITICAL-FAILURE] Profile synchronization aborted:', error);
    next(error);
  }
});

// Update JUST location (For Live Tracking)
router.patch('/location', protectPublic, async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;
        if (latitude == null || longitude == null) {
            return res.status(400).json({ success: false, message: 'Latitude and Longitude required' });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ success: false, message: 'Invalid coordinates' });
        }

        req.publicUser.location = {
            type: 'Point',
            coordinates: [lng, lat]
        };
        req.publicUser.locationUpdatedAt = new Date();
        
        await req.publicUser.save();
        res.json({ success: true, location: req.publicUser.location });
    } catch (error) {
        next(error);
    }
});

// Change password
router.put(
  '/change-password',
  protectPublic,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await PublicUser.findById(req.publicUser._id);
      if (!user || !(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Public user logout
router.post('/logout', protectPublic, async (req, res, next) => {
  try {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Update user's last logout time
    // 3. Clear any server-side session data

    // For now, just return success - client handles token removal
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
