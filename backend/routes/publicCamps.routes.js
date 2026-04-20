import express from 'express';
import BloodCamp from '../models/BloodCamp.model.js';

const router = express.Router();

// Public list of upcoming camps (optionally filtered by city/pinCode and date)
router.get('/', async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.city) {
      filter['location.city'] = req.query.city;
    }
    if (req.query.pinCode) {
      filter['location.zipCode'] = req.query.pinCode;
    }

    // Only upcoming
    filter.endDate = { $gte: new Date() };

    const camps = await BloodCamp.find(filter).sort({ startDate: 1 }).limit(100);

    res.json({ success: true, data: camps });
  } catch (error) {
    next(error);
  }
});

export default router;
