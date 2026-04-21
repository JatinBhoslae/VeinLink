import cron from 'node-cron';
import PublicUser from '../models/PublicUser.model.js';
import NotificationLog from '../models/NotificationLog.model.js';
import donorNotificationService from '../services/donorNotification.service.js';
import { addDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Scan for donors who have eligibility milestones coming up.
 * Milestones: Today, 1 day before, 3 days before.
 */
const runEligibilityCheck = async () => {
    console.log('📡 [CRON] Starting tactical eligibility scan...');
    
    try {
        const milestones = [
            { days: 0, type: 'eligibility_ready', subject: '[URGENT] Mission Readiness Authorized', message: 'Tactical Status: ELIGIBLE. Your regeneration cycle is complete. You are officially authorized for mobilization! The sector needs your life-saving contribution today.' },
            { days: 1, type: 'eligibility_countdown', subject: 'T-Minus 24h: Mission Readiness Window', message: 'Infiltration Window: 1 Day. Your regeneration cycle is 99% complete. Finalize hydration protocol and rest for peak deployment tomorrow.' },
            { days: 2, type: 'eligibility_countdown', subject: 'T-Minus 48h: Bio-Regen Pulse', message: 'Tactical Alert: Your eligibility window opens in 2 days. Bio-telemetry reveals stable recovery. Optimal mission window approaching.' },
            { days: 3, type: 'eligibility_countdown', subject: 'T-Minus 72h: Countdown Initiated', message: 'Strategic Alert: Your 3-day countdown to eligibility has begun. Stay mission-focused, operative.' }
        ];

        const today = startOfDay(new Date());

        for (const milestone of milestones) {
            const targetDate = addDays(today, milestone.days);
            const start = startOfDay(targetDate);
            const end = endOfDay(targetDate);

            console.log(`📡 [CRON] Sector Pulse [T+${milestone.days}]: Scanning targets for ${start.toDateString()}`);

            const users = await PublicUser.find({
                nextEligibleDate: { $gte: start, $lte: end },
                isActive: true
            });

            for (const user of users) {
                // Check if already notified for THIS specific milestone in the last 24 hours
                const alreadyNotified = await NotificationLog.findOne({
                    userId: user._id,
                    type: milestone.type,
                    'metadata.milestoneDays': milestone.days,
                    createdAt: { $gte: today }
                });

                if (alreadyNotified) continue;

                await donorNotificationService.sendNotification(user, {
                    title: milestone.subject,
                    message: milestone.message,
                    type: milestone.type,
                    metadata: { milestoneDays: milestone.days }
                });
                
                console.log(`✅ [CRON] Signal Dispatched: ${user.email} -> T-${milestone.days} days`);
            }
        }
    } catch (err) {
        console.error('📡 [CRON] Critical Failure in scan protocol:', err.message);
    }
};

export const startNotificationJobs = () => {
    // Run daily at 10:00 AM
    cron.schedule('0 10 * * *', () => {
        runEligibilityCheck();
    });

    // Immediate tactical scan on hub initialization
    runEligibilityCheck();

    console.log('⏰ Tactical Notification HUD: Cron Scheduled (10:00 AM Daily) & Initial Scan Executed');
};
