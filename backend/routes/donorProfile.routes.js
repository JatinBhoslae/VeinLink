import express from 'express';
// Heartbeat: Synchronizing Bio-Telemetry Protocols v1.1
import DonationAppointment from '../models/DonationAppointment.model.js';
import PublicUser from '../models/PublicUser.model.js';
import { protectPublic } from '../middleware/publicAuth.middleware.js';
import { calculateNextEligibleDate } from '../utils/eligibility.js';

const router = express.Router();

// ============================================================
// GET /api/donor-profile/me — Get current user profile
// ============================================================
router.get('/me', protectPublic, async (req, res) => {
    console.log(`📡 Mission-Sync: Retrieving Bio-Telemetry for Operative ${req.publicUser._id}`);
    try {
        const user = await PublicUser.findById(req.publicUser._id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Operative not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// Badge Definitions
// ============================================================
const BADGE_DEFINITIONS = [
    {
        id: 'first_donation',
        name: 'First Donation',
        emoji: '🥉',
        description: 'Completed your very first blood donation',
        threshold: 1,
        category: 'milestone',
        color: '#CD7F32',
    },
    {
        id: 'regular_donor',
        name: 'Regular Donor',
        emoji: '💉',
        description: 'Donated blood 3 times',
        threshold: 3,
        category: 'milestone',
        color: '#3B82F6',
    },
    {
        id: 'life_saver',
        name: 'Life Saver',
        emoji: '🥈',
        description: 'Saved 5 lives through blood donation',
        threshold: 5,
        category: 'milestone',
        color: '#C0C0C0',
    },
    {
        id: 'hero_donor',
        name: 'Hero Donor',
        emoji: '🥇',
        description: 'Donated blood 10 times — a true hero',
        threshold: 10,
        category: 'milestone',
        color: '#FFD700',
    },
    {
        id: 'super_hero',
        name: 'Super Hero',
        emoji: '🦸',
        description: 'Donated blood 25 times — superhuman generosity',
        threshold: 25,
        category: 'milestone',
        color: '#8B5CF6',
    },
    {
        id: 'legend',
        name: 'Living Legend',
        emoji: '👑',
        description: 'Donated blood 50 times — legendary donor',
        threshold: 50,
        category: 'milestone',
        color: '#DC2626',
    },
    {
        id: 'century_donor',
        name: 'Century Donor',
        emoji: '💯',
        description: 'Donated blood 100 times — a century of life-saving',
        threshold: 100,
        category: 'milestone',
        color: '#059669',
    },
];

const POINTS_PER_DONATION = 50;
const LIVES_SAVED_PER_DONATION = 3; // Each donation can save up to 3 lives

// ============================================================
// Eligibility criteria
// ============================================================
const MIN_DONATION_GAP_DAYS = 90;
const MIN_AGE = 18;
const MAX_AGE = 65;
const MIN_WEIGHT_KG = 45;

function checkEligibility(user, lastDonationDate) {
    const checks = [];
    let isEligible = true;

    // 1. Last donation date (90 days gap)
    if (lastDonationDate) {
        const daysSinceLastDonation = Math.floor(
            (Date.now() - new Date(lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const meetsGap = daysSinceLastDonation >= MIN_DONATION_GAP_DAYS;
        const daysRemaining = meetsGap ? 0 : MIN_DONATION_GAP_DAYS - daysSinceLastDonation;
        checks.push({
            name: 'Donation Gap',
            description: `Minimum ${MIN_DONATION_GAP_DAYS} days since last donation`,
            passed: meetsGap,
            detail: meetsGap
                ? `Last donated ${daysSinceLastDonation} days ago — eligible`
                : `Last donated ${daysSinceLastDonation} days ago — ${daysRemaining} days remaining`,
            icon: '📅',
        });
        if (!meetsGap) isEligible = false;
    } else {
        checks.push({
            name: 'Donation Gap',
            description: `Minimum ${MIN_DONATION_GAP_DAYS} days since last donation`,
            passed: true,
            detail: 'No previous donation on record — eligible',
            icon: '📅',
        });
    }

    // 2. Age limit
    if (user.dateOfBirth) {
        const today = new Date();
        let age = today.getFullYear() - new Date(user.dateOfBirth).getFullYear();
        const m = today.getMonth() - new Date(user.dateOfBirth).getMonth();
        if (m < 0 || (m === 0 && today.getDate() < new Date(user.dateOfBirth).getDate())) {
            age--;
        }
        const ageOk = age >= MIN_AGE && age <= MAX_AGE;
        checks.push({
            name: 'Age Requirement',
            description: `Must be between ${MIN_AGE} and ${MAX_AGE} years old`,
            passed: ageOk,
            detail: ageOk ? `Age ${age} — within eligible range` : `Age ${age} — outside eligible range (${MIN_AGE}-${MAX_AGE})`,
            icon: '🎂',
        });
        if (!ageOk) isEligible = false;
    } else {
        checks.push({
            name: 'Age Requirement',
            description: `Must be between ${MIN_AGE} and ${MAX_AGE} years old`,
            passed: null, // unknown
            detail: 'Date of birth not provided — cannot verify',
            icon: '🎂',
        });
    }

    // 3. Health status — underlying disease
    const hasDisease = user.hasUnderlyingDisease === true;
    checks.push({
        name: 'Health Status',
        description: 'No serious underlying diseases',
        passed: !hasDisease,
        detail: hasDisease
            ? `Has underlying condition: ${user.diseaseDetails || 'unspecified'} — may not be eligible`
            : 'No underlying diseases reported',
        icon: '🏥',
    });
    if (hasDisease) isEligible = false;

    // 4. Medication check
    const onMeds = user.onMedication === true;
    checks.push({
        name: 'Medication Status',
        description: 'Not currently on incompatible medication',
        passed: !onMeds,
        detail: onMeds
            ? `Currently on medication: ${user.medicationDetails || 'unspecified'} — consult a doctor`
            : 'Not on any medication',
        icon: '💊',
    });
    if (onMeds) isEligible = false;

    // 5. Weight (if available — donors have it, public users may not)
    if (user.weight) {
        const weightOk = user.weight >= MIN_WEIGHT_KG;
        checks.push({
            name: 'Minimum Weight',
            description: `Must weigh at least ${MIN_WEIGHT_KG} kg`,
            passed: weightOk,
            detail: weightOk
                ? `Weight: ${user.weight} kg — meets minimum`
                : `Weight: ${user.weight} kg — below minimum (${MIN_WEIGHT_KG} kg)`,
            icon: '⚖️',
        });
        if (!weightOk) isEligible = false;
    }
    
    // Calculate days until eligible (global)
    let daysUntilEligible = 0;
    if (lastDonationDate) {
        const daysSince = Math.floor((Date.now() - new Date(lastDonationDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < MIN_DONATION_GAP_DAYS) {
            daysUntilEligible = MIN_DONATION_GAP_DAYS - daysSince;
        }
    }

    return {
        isEligible,
        daysUntilEligible,
        checks,
        totalChecks: checks.length,
        passedChecks: checks.filter((c) => c.passed === true).length,
        failedChecks: checks.filter((c) => c.passed === false).length,
    };
}

// ============================================================
// Compute new badges based on donation count
// ============================================================
function computeNewBadges(currentBadges, totalDonations) {
    const existingBadgeNames = currentBadges.map((b) => b.name);
    const newBadges = [];

    for (const badge of BADGE_DEFINITIONS) {
        if (totalDonations >= badge.threshold && !existingBadgeNames.includes(badge.name)) {
            newBadges.push({
                name: badge.name,
                description: `${badge.emoji} ${badge.description}`,
                earnedAt: new Date(),
            });
        }
    }

    return newBadges;
}

// ============================================================
// GET /api/donor-profile/dashboard — Full donation dashboard
// ============================================================
router.get('/dashboard', protectPublic, async (req, res) => {
    try {
        const userId = req.publicUser._id;
        const user = req.publicUser;

        // Fetch all completed appointments
        const completedAppointments = await DonationAppointment.find({
            userId,
            status: 'completed',
        })
            .populate('hospitalId', 'name address city')
            .populate('campId', 'name location')
            .sort({ updatedAt: -1 });

        const allAppointments = await DonationAppointment.find({ userId })
            .populate('hospitalId', 'name address city')
            .populate('campId', 'name location')
            .sort({ createdAt: -1 });

        // Calculate stats
        const totalDonations = completedAppointments.length;
        const livesSaved = totalDonations * LIVES_SAVED_PER_DONATION;
        const lastDonation = completedAppointments.length > 0 ? completedAppointments[0] : null;
        const lastDonationDate = lastDonation?.updatedAt || lastDonation?.createdAt || null;

        // Unique hospitals helped
        const hospitalSet = new Set();
        completedAppointments.forEach((a) => {
            if (a.hospitalId?._id) hospitalSet.add(a.hospitalId._id.toString());
            if (a.campId?._id) hospitalSet.add(`camp_${a.campId._id.toString()}`);
        });
        const hospitalsHelped = hospitalSet.size;

        // Donation timeline (grouped by month)
        const donationsByMonth = {};
        completedAppointments.forEach((a) => {
            const date = a.updatedAt || a.createdAt;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            donationsByMonth[monthKey] = (donationsByMonth[monthKey] || 0) + 1;
        });

        // Hospital breakdown
        const hospitalBreakdown = {};
        completedAppointments.forEach((a) => {
            const name = a.hospitalId?.name || a.campId?.name || 'Unknown';
            hospitalBreakdown[name] = (hospitalBreakdown[name] || 0) + 1;
        });

        // Eligibility check
        const eligibility = checkEligibility(user, lastDonationDate);

        // Compute donation streak (consecutive 90-day windows)
        let streak = 0;
        if (completedAppointments.length > 0) {
            streak = 1;
            for (let i = 1; i < completedAppointments.length; i++) {
                const prev = new Date(completedAppointments[i - 1].updatedAt || completedAppointments[i - 1].createdAt);
                const curr = new Date(completedAppointments[i].updatedAt || completedAppointments[i].createdAt);
                const diffDays = Math.abs((prev - curr) / (1000 * 60 * 60 * 24));
                if (diffDays <= 120) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Badge progress
        const earnedBadges = user.badges || [];
        const allBadgesWithProgress = BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedBadges.find((b) => b.name === badge.name);
            return {
                ...badge,
                earned: !!earned,
                earnedAt: earned?.earnedAt || null,
                progress: Math.min((totalDonations / badge.threshold) * 100, 100),
                remaining: Math.max(badge.threshold - totalDonations, 0),
            };
        });

        // Check & award new badges
        const newBadges = computeNewBadges(earnedBadges, totalDonations);
        if (newBadges.length > 0) {
            user.badges.push(...newBadges);
            user.rewardPoints = (user.rewardPoints || 0) + newBadges.length * POINTS_PER_DONATION;
            await user.save();
        }

        // Next eligible date
        let nextEligibleDate = null;
        if (lastDonationDate) {
            const nextDate = new Date(lastDonationDate);
            nextDate.setDate(nextDate.getDate() + MIN_DONATION_GAP_DAYS);
            if (nextDate > new Date()) {
                nextEligibleDate = nextDate;
            }
        }

        res.json({
            success: true,
            data: {
                stats: {
                    totalDonations,
                    livesSaved,
                    hospitalsHelped,
                    rewardPoints: user.rewardPoints || 0,
                    streak,
                    lastDonationDate,
                    nextEligibleDate,
                },
                eligibility,
                badges: allBadgesWithProgress,
                newBadgesEarned: newBadges.length > 0 ? newBadges : null,
                donationHistory: completedAppointments.map((a) => ({
                    _id: a._id,
                    date: a.updatedAt || a.createdAt,
                    hospital: a.hospitalId?.name || null,
                    camp: a.campId?.name || null,
                    certificate: a.certificateUrl || null,
                    rewardPoints: a.rewardPointsEarned || POINTS_PER_DONATION,
                })),
                allAppointments: allAppointments.map((a) => ({
                    _id: a._id,
                    date: a.timeSlot || a.createdAt,
                    hospital: a.hospitalId?.name || null,
                    camp: a.campId?.name || null,
                    status: a.status,
                })),
                donationsByMonth,
                hospitalBreakdown,
            },
        });
    } catch (error) {
        console.error('Donor dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/donor-profile/eligibility — Quick eligibility check
// ============================================================
router.get('/eligibility', protectPublic, async (req, res) => {
    try {
        const userId = req.publicUser._id;

        const lastCompleted = await DonationAppointment.findOne({
            userId,
            status: 'completed',
        }).sort({ updatedAt: -1 });

        const lastDonationDate = lastCompleted?.updatedAt || lastCompleted?.createdAt || null;
        const eligibility = checkEligibility(req.publicUser, lastDonationDate);

        res.json({ success: true, data: eligibility });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/donor-profile/badges — Get all badge definitions + user progress
// ============================================================
router.get('/badges', protectPublic, async (req, res) => {
    try {
        const user = req.publicUser;
        const completedCount = await DonationAppointment.countDocuments({
            userId: user._id,
            status: 'completed',
        });

        const earnedBadges = user.badges || [];

        const badges = BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedBadges.find((b) => b.name === badge.name);
            return {
                ...badge,
                earned: !!earned,
                earnedAt: earned?.earnedAt || null,
                progress: Math.min((completedCount / badge.threshold) * 100, 100),
                remaining: Math.max(badge.threshold - completedCount, 0),
            };
        });

        res.json({
            success: true,
            data: {
                badges,
                totalDonations: completedCount,
                totalBadgesEarned: earnedBadges.length,
                totalBadgesAvailable: BADGE_DEFINITIONS.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/donor-profile/public-profile/:id — Public identity verification (Full Profile)
// ============================================================
router.get('/public-profile/:id', async (req, res) => {
    try {
        const user = await PublicUser.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Identity not found' });
        }

        // Fetch all completed appointments
        const completedAppointments = await DonationAppointment.find({
            userId: user._id,
            status: 'completed',
        })
            .populate('hospitalId', 'name address city')
            .populate('campId', 'name location')
            .sort({ updatedAt: -1 });

        const allAppointments = await DonationAppointment.find({ userId: user._id })
            .populate('hospitalId', 'name address city')
            .populate('campId', 'name location')
            .sort({ createdAt: -1 });

        // Calculate stats
        const totalDonations = completedAppointments.length;
        const livesSaved = totalDonations * LIVES_SAVED_PER_DONATION;
        const lastDonation = completedAppointments.length > 0 ? completedAppointments[0] : null;
        const lastDonationDate = lastDonation?.updatedAt || lastDonation?.createdAt || null;

        // Unique hospitals helped
        const hospitalSet = new Set();
        completedAppointments.forEach((a) => {
            if (a.hospitalId?._id) hospitalSet.add(a.hospitalId._id.toString());
            if (a.campId?._id) hospitalSet.add(`camp_${a.campId._id.toString()}`);
        });
        const hospitalsHelped = hospitalSet.size;

        // Donation timeline (grouped by month)
        const donationsByMonth = {};
        completedAppointments.forEach((a) => {
            const date = a.updatedAt || a.createdAt;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            donationsByMonth[monthKey] = (donationsByMonth[monthKey] || 0) + 1;
        });

        // Hospital breakdown
        const hospitalBreakdown = {};
        completedAppointments.forEach((a) => {
            const name = a.hospitalId?.name || a.campId?.name || 'Unknown';
            hospitalBreakdown[name] = (hospitalBreakdown[name] || 0) + 1;
        });

        // Eligibility check
        const eligibility = checkEligibility(user, lastDonationDate);

        // Compute donation streak
        let streak = 0;
        if (completedAppointments.length > 0) {
            streak = 1;
            for (let i = 1; i < completedAppointments.length; i++) {
                const prev = new Date(completedAppointments[i - 1].updatedAt || completedAppointments[i - 1].createdAt);
                const curr = new Date(completedAppointments[i].updatedAt || completedAppointments[i].createdAt);
                const diffDays = Math.abs((prev - curr) / (1000 * 60 * 60 * 24));
                if (diffDays <= 120) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Badge progress
        const earnedBadges = user.badges || [];
        const allBadgesWithProgress = BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedBadges.find((b) => b.name === badge.name);
            return {
                ...badge,
                earned: !!earned,
                earnedAt: earned?.earnedAt || null,
                progress: Math.min((totalDonations / badge.threshold) * 100, 100),
                remaining: Math.max(badge.threshold - totalDonations, 0),
            };
        });

        // Next eligible date
        let nextEligibleDate = null;
        if (lastDonationDate) {
            const nextDate = new Date(lastDonationDate);
            nextDate.setDate(nextDate.getDate() + 90);
            if (nextDate > new Date()) {
                nextEligibleDate = nextDate;
            }
        }

        // Upcoming appointments
        const upcomingAppointments = allAppointments.filter(a => 
            ['pending', 'confirmed', 'scheduled'].includes(a.status)
        );

        res.json({
            success: true,
            data: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                bloodGroup: user.bloodGroup,
                gender: user.gender,
                city: user.city,
                state: user.state,
                verified: true,
                stats: {
                    totalDonations,
                    livesSaved,
                    hospitalsHelped,
                    rewardPoints: user.rewardPoints || 0,
                    streak,
                    lastDonationDate,
                    nextEligibleDate,
                },
                eligibility,
                badges: allBadgesWithProgress,
                donationHistory: completedAppointments.map((a) => ({
                    _id: a._id,
                    date: a.updatedAt || a.createdAt,
                    hospital: a.hospitalId?.name || null,
                    hospitalCity: a.hospitalId?.city || null,
                    camp: a.campId?.name || null,
                    status: a.status,
                    rewardPoints: a.rewardPointsEarned || POINTS_PER_DONATION,
                })),
                upcomingAppointments: upcomingAppointments.map((a) => ({
                    _id: a._id,
                    date: a.timeSlot || a.createdAt,
                    hospital: a.hospitalId?.name || null,
                    hospitalCity: a.hospitalId?.city || null,
                    camp: a.campId?.name || null,
                    status: a.status,
                })),
                donationsByMonth,
                hospitalBreakdown,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// GET /api/donor-profile/leaderboard — Top Donors Leaderboard
// ============================================================
router.get('/leaderboard', async (req, res) => {
    try {
        const topDonors = await PublicUser.find({ role: 'donor', rewardPoints: { $gt: 0 } })
            .select('firstName lastName rewardPoints badges bloodGroup')
            .sort({ rewardPoints: -1 })
            .limit(10);

        res.json({
            success: true,
            data: topDonors.map((donor, index) => ({
                rank: index + 1,
                id: donor._id,
                name: `${donor.firstName} ${donor.lastName.charAt(0)}.`,
                points: donor.rewardPoints,
                bloodGroup: donor.bloodGroup,
                badges: donor.badges?.length || 0,
                topBadge: donor.badges?.length > 0 ? donor.badges[donor.badges.length - 1].emoji : '🏅'
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// ============================================================
// POST /api/donor-profile/test-warp — Simulation: Fast forward time
// ============================================================
router.post('/test-warp', protectPublic, async (req, res) => {
    try {
        const user = await PublicUser.findById(req.publicUser._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const days = parseInt(req.body.days) || 30;
        
        let baseDate = user.lastDonationDate || new Date();
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() - days);
        
        user.lastDonationDate = newDate;
        user.nextEligibleDate = calculateNextEligibleDate(newDate, user.gender);
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: `T-Minus ${days} Days. Bio-Regen logic updated.`,
            data: {
                lastDonationDate: user.lastDonationDate,
                nextEligibleDate: user.nextEligibleDate
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
