import express from 'express';
import BloodUnit from '../models/BloodUnit.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import Donor from '../models/Donor.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { predictStockLevel } from '../utils/stockPrediction.js';
import PublicUser from '../models/PublicUser.model.js';
import Hospital from '../models/Hospital.model.js';

const router = express.Router();

// @route   GET /api/analytics/public-impact
// @desc    Get public impact statistics
// @access  Public
router.get('/public-impact', async (req, res, next) => {
  try {
    const totalDonations = await BloodUnit.countDocuments();
    const livesSaved = totalDonations * 3;

    // Active donors (PublicUsers with role 'donor')
    const activeDonors = await PublicUser.countDocuments({ role: 'donor', isActive: true });

    // Emergency requests solved percentage
    const emergencyRequests = await BloodRequest.countDocuments({ urgency: 'emergency' });
    const solvedEmergencyRequests = await BloodRequest.countDocuments({
      urgency: 'emergency',
      status: { $in: ['approved', 'completed'] }
    });

    const emergencyRequestsSolved = emergencyRequests > 0
      ? Math.round((solvedEmergencyRequests / emergencyRequests) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        totalDonations,
        livesSaved,
        activeDonors,
        emergencyRequestsSolved
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v-stats/live-map-data
// @desc    Get live demand map data for markers
// @access  Public (Used on landing/donor dashboard)
router.get('/live-map-data', async (req, res, next) => {
  try {
    // Fetch all hospitals (including pending ones for demo map visualization)
    const hospitals = await Hospital.find({
      'location.coordinates': { $exists: true, $ne: [] } // Must have coordinates
    });

    const liveStats = await Promise.all(hospitals.map(async (h) => {
      // Aggregate detailed blood inventory by group
      const inventoryRaw = await BloodUnit.aggregate([
        { $match: { hospitalId: h._id, status: 'available' } },
        { $group: { _id: "$bloodGroup", count: { $sum: 1 } } }
      ]);

      const bloodInventory = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      };
      
      let availableUnits = 0;
      inventoryRaw.forEach(item => {
        if (item._id && bloodInventory[item._id] !== undefined) {
          bloodInventory[item._id] = item.count;
        }
        availableUnits += item.count;
      });

      const pendingRequests = await BloodRequest.countDocuments({ 
        hospitalId: h._id, 
        status: 'pending' 
      });

      // Determine tactical signal (Color/Status)
      let status = 'sufficient';
      let color = '#22c55e'; // Green

      if (pendingRequests >= 5 || availableUnits === 0) {
        status = 'critical';
        color = '#ef4444'; // Red
      } else if (pendingRequests >= 2 || availableUnits < 5) {
        status = 'moderate';
        color = '#eab308'; // Yellow
      }

      return {
        id: h._id,
        name: h.name,
        address: `${h.address?.city || 'Unknown'}, ${h.address?.state || 'Unknown'}`,
        coordinates: h.location?.coordinates || null,
        status,
        color,
        availableUnits,
        pendingRequests,
        bloodInventory // Send the detailed matrix
      };
    }));

    // Filter out any anomalous hospitals without coordinates
    const validStats = liveStats.filter(s => s.coordinates && s.coordinates.length === 2);

    res.json({
      success: true,
      data: validStats
    });
  } catch (error) {
    next(error);
  }
});

router.use(protect);

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard', authorize('hospital_admin', 'staff', 'super_admin'), async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role !== 'super_admin') {
      filter.hospitalId = req.user.hospitalId;
    }

    // Blood inventory summary
    const inventorySummary = await BloodUnit.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$bloodGroup',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
          },
          reserved: {
            $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] },
          },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$expiryDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] },
                    { $gte: ['$expiryDate', new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Recent requests
    const recentRequests = await BloodRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('requestedBy', 'firstName lastName');

    // Total donors
    const totalDonors = await Donor.countDocuments(filter);

    // Upcoming camps
    const upcomingCamps = await BloodCamp.find({
      ...filter,
      startDate: { $gte: new Date() },
      status: 'upcoming',
    })
      .sort({ startDate: 1 })
      .limit(5);

    // Monthly collection trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await BloodUnit.aggregate([
      {
        $match: {
          ...filter,
          collectionDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$collectionDate' },
            month: { $month: '$collectionDate' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        inventorySummary,
        recentRequests,
        totalDonors,
        upcomingCamps,
        monthlyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/stock-prediction/:bloodGroup
// @desc    Get stock prediction for a blood group
// @access  Private
router.get('/stock-prediction/:bloodGroup', authorize('hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const { bloodGroup } = req.params;

    if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood group',
      });
    }

    const prediction = await predictStockLevel(
      BloodUnit,
      bloodGroup,
      req.user.hospitalId
    );

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/stock-predictions/all
// @desc    Get stock prediction for all blood groups
// @access  Private
router.get('/stock-predictions/all', authorize('hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const predictions = await Promise.all(
      bloodGroups.map(async (bg) => {
        const p = await predictStockLevel(BloodUnit, bg, req.user.hospitalId);
        return { bloodGroup: bg, ...p };
      })
    );

    // Filter to only those with critical or high risk, or low stock predicted
    const insights = predictions.filter(p => p.daysUntilLowStock !== null || p.riskLevel !== 'low');

    res.json({
      success: true,
      data: insights.sort((a, b) => (a.daysUntilLowStock || 999) - (b.daysUntilLowStock || 999)),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/camp/:campId
// @desc    Get blood camp analytics
// @access  Private
router.get('/camp/:campId', authorize('hospital_admin', 'staff'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.campId };

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

    // Calculate analytics
    const totalRegistrations = camp.totalRegistrations;
    const totalCheckIns = camp.checkIns.length;
    const attendanceRate = totalRegistrations > 0
      ? ((totalCheckIns / totalRegistrations) * 100).toFixed(2)
      : 0;

    // Time slot analysis
    const timeSlotAnalysis = camp.timeSlots.map((slot, index) => ({
      index,
      timeRange: `${slot.startTime} - ${slot.endTime}`,
      maxDonors: slot.maxDonors,
      registered: slot.registeredDonors.length,
      utilizationRate: ((slot.registeredDonors.length / slot.maxDonors) * 100).toFixed(2),
    }));

    res.json({
      success: true,
      data: {
        campId: camp._id,
        name: camp.name,
        totalRegistrations,
        totalCheckIns,
        attendanceRate: `${attendanceRate}%`,
        timeSlotAnalysis,
        status: camp.status,
      },
    });
  } catch (error) {
    next(error);
  }
});



export default router;

