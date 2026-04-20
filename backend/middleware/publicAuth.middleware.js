import jwt from 'jsonwebtoken';
import PublicUser from '../models/PublicUser.model.js';

export const protectPublic = async (req, res, next) => {
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
      const user = await PublicUser.findById(decoded.id).select('-password');

      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: 'User not found or inactive' });
      }

      req.publicUser = user;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
  } catch (error) {
    next(error);
  }
};
