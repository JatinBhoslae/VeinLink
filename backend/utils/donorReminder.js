import cron from 'node-cron';
import PublicUser from '../models/PublicUser.model.js';
import DonationAppointment from '../models/DonationAppointment.model.js';
import { sendEmergencyAlertEmail } from './emergencyEmail.js';
import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const sendReminderEmail = async (user) => {
    const transporter = createTransporter();
    if (!transporter) {
        console.log(`📧 [Reminder] Would remind ${user.email} but email not configured`);
        return;
    }

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🩸 Time to Donate Again!</h1>
        <p style="color: #fecaca; margin: 10px 0 0; font-size: 14px;">VienLink Blood Bank Management</p>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; color: #374151;">Hi <strong>${user.firstName}</strong>,</p>
        <p style="color: #6b7280; line-height: 1.6;">
          It's been <strong>90 days</strong> since your last blood donation. You are now eligible to donate again! 🎉
        </p>
        <p style="color: #6b7280; line-height: 1.6;">
          Each donation can save up to <strong>3 lives</strong>. Your previous donations have already made a huge impact. Let's keep the streak going!
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; display: inline-block;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">Your Reward Points</p>
            <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #dc2626;">${user.rewardPoints || 0} ⭐</p>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Book your next appointment on VienLink and earn more reward points + badges!
        </p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          VienLink — Making every drop count ❤️
        </p>
      </div>
    </div>
  `;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"VienLink" <noreply@vienlink.com>',
            to: user.email,
            subject: '🩸 You are eligible to donate blood again! — VienLink',
            html: htmlContent,
        });
        console.log(`📧 [Reminder] Sent to ${user.email}`);
    } catch (err) {
        console.error(`📧 [Reminder] Failed for ${user.email}:`, err.message);
    }
};

export const startDonorReminderCron = () => {
    // Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('📧 [Cron] Running donor reminder check...');
        try {
            // Find all public users
            const users = await PublicUser.find({});
            let remindedCount = 0;

            for (const user of users) {
                // Get their last completed donation
                const lastDonation = await DonationAppointment.findOne({
                    userId: user._id,
                    status: 'completed',
                }).sort({ appointmentDate: -1 });

                if (!lastDonation) continue;

                const daysSince = Math.floor(
                    (Date.now() - new Date(lastDonation.appointmentDate)) / (1000 * 60 * 60 * 24)
                );

                // Remind at 90 days (exactly, to avoid spamming)
                if (daysSince >= 90 && daysSince <= 92) {
                    await sendReminderEmail(user);
                    remindedCount++;
                }
            }

            console.log(`📧 [Cron] Reminded ${remindedCount} donors`);
        } catch (err) {
            console.error('📧 [Cron] Error:', err.message);
        }
    });

    console.log('⏰ Donor reminder cron job scheduled (daily at 9:00 AM)');
};
