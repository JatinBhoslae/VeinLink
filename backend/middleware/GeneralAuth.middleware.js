import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import PublicUser from '../models/PublicUser.model.js';

/**
 * Middleware to protect routes that can be accessed by either 
 * standard Users (Hospital/Staff) or Public Users (Donors).
 */
export const protectAny = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Try finding in standard User model first
      let user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
        req.userType = 'hospital';
        return next();
      }

      // If not found, try PublicUser model
      user = await PublicUser.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.publicUser = user;
        req.userType = 'public';
        return next();
      }

      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } catch (error) {
    next(error);
  }
};
