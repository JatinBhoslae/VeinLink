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
            { days: 0, title: 'MISSION READY: Authorization Granted', subject: '[URGENT] Mission Readiness Authorized', message: 'Tactical Status: ELIGIBLE. You are officially authorized for mobilization! The sector needs your life-saving contribution today. Check the HUD for active missions.' },
            { days: 1, title: 'T-Minus 24h: Readiness Pulse', subject: 'T-Minus 24h: Mission Readiness Window', message: 'Infiltration Window: 1 Day. Your regeneration cycle is 99% complete. Finalize hydration protocol and rest for peak deployment tomorrow.' },
            { days: 2, title: 'T-Minus 48h: Bio-Regen Pulse', subject: 'T-Minus 48h: Regeneration Synchronization', message: 'Tactical Alert: Your eligibility window opens in 2 days. Bio-telemetry reveals stable recovery. Optimal mission window approaching.' },
            { days: 3, title: 'T-Minus 72h: Countdown Initiated', subject: 'T-Minus 72h: Deployment Countdown', message: 'Strategic Alert: Your 3-day countdown to eligibility has begun. Stay mission-focused, operative.' }
        ];

        for (const milestone of milestones) {
            const targetDate = addDays(new Date(), milestone.days);
            const start = startOfDay(targetDate);
            const end = endOfDay(targetDate);

            console.log(`📡 [CRON] Sector Pulse [T+${milestone.days}]: Scanning window ${start.toISOString()} to ${end.toISOString()}`);

            // Find users whose nextEligibleDate falls in this window
            const users = await PublicUser.find({
                nextEligibleDate: { $gte: start, $lte: end },
                isActive: true
            });

            console.log(`📡 [CRON] Sector [T+${milestone.days}]: Identified ${users.length} operatives.`);

            for (const user of users) {
                // Tactical De-duplication: Check if this operative already received this pulse today
                const alreadyNotified = await NotificationLog.findOne({
                    userId: user._id,
                    type: milestone.days === 0 ? 'eligibility' : 'reminder',
                    createdAt: { $gte: startOfDay(new Date()) }
                });

                if (alreadyNotified) {
                    console.log(`📡 [CRON] Operative ${user.email} already has a logged signal for today. Skipping.`);
                    continue;
                }

                // Force email for these milestones if user hasn't explicitly disabled it
                await donorNotificationService.sendNotification(user, {
                    title: milestone.subject,
                    message: milestone.message,
                    type: milestone.days === 0 ? 'eligibility' : 'reminder',
                    metadata: { milestoneDays: milestone.days }
                });
                console.log(`✅ [CRON] Signal Dispatched to Operative ${user.email} [T+${milestone.days}]`);
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
