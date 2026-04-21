import nodemailer from 'nodemailer';
import NotificationLog from '../models/NotificationLog.model.js';
import PublicUser from '../models/PublicUser.model.js';
import { sendNotificationToUser, broadcastEmergencyNotification } from '../utils/socket.js';

// Transporter Config
const createTransporter = () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

class DonorNotificationService {
    /**
     * Core function to dispatch a notification across multiple channels
     */
    async sendNotification(user, { title, message, type, metadata = {} }) {
        const channels = [];
        if (user.preferences?.email) channels.push('email');
        if (user.preferences?.sms) channels.push('sms');
        if (user.preferences?.push) channels.push('push');

        const results = await Promise.all(
            channels.map(channel => this.dispatchToChannel(user, channel, { title, message, type, metadata }))
        );

        return results;
    }

    async dispatchToChannel(user, channel, { title, message, type, metadata }) {
        let status = 'sent';
        let error = null;

        try {
            switch (channel) {
                case 'email':
                    await this.sendEmail(user.email, title, message);
                    break;
                case 'sms':
                    await this.sendSMS(user.phone, message);
                    break;
                case 'push':
                    await this.sendPush(user._id, title, message);
                    // Emit real-time socket signal
                    sendNotificationToUser(user._id, { title, message, type });
                    break;
            }
        } catch (err) {
            status = 'failed';
            error = err.message;
            console.error(`Status Red: Notification failed on channel [${channel}] for user [${user.email}]:`, err.message);
        }

        // Log the mission communication
        await NotificationLog.create({
            userId: user._id,
            type,
            channel,
            message,
            status,
            error,
            metadata
        });

        return { channel, status, error };
    }

    // --- Channel Implementations ---

    async sendEmail(to, subject, body) {
        const transporter = createTransporter();
        if (!transporter) throw new Error('Email gateway offline: Credentials missing');
        
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #f1f5f9; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #e11d48; padding: 40px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">Tactical Briefing</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9; font-weight: 600; font-size: 12px; letter-spacing: 0.2em;">VEIN LINK PROTOCOL ALPHA</p>
                </div>

                <div style="padding: 40px 30px;">
                    <h2 style="color: #1e293b; font-size: 20px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px; letter-spacing: -0.02em;">${subject}</h2>
                    <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 30px;">
                        ${body}
                    </p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">Access your Operational HUD for more details.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/donor-dashboard" style="margin-top: 15px; background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 12px; display: inline-block; text-transform: uppercase; letter-spacing: 0.1em;">
                            🚀 Open Strategic Dashboard
                        </a>
                    </div>
                </div>

                <div style="background-color: #f8fafc; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8;">
                    <p style="margin: 0; font-weight: 700; color: #e11d48; text-transform: uppercase;">Vein Link — Pulse of Humanity</p>
                    <p style="margin: 5px 0 0 0;">Sector Intelligence Unit • Bio-Regen Monitor</p>
                </div>
            </div>
        `;

        return transporter.sendMail({
            from: `"${process.env.FROM_NAME || 'Vein Link'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html
        });
    }

    async sendSMS(phone, message) {
        if (!phone) return;
        // Placeholder for Twilio integration
        // const client = require('twilio')(sid, auth);
        // await client.messages.create({ body: message, from: '+123', to: phone });
        console.log(`📡 [SMS SIGNAL] To: ${phone} | MSG: ${message}`);
        // For production, implement Twilio here
        return true;
    }

    async sendPush(userId, title, message) {
        // Placeholder for Firebase Cloud Messaging (FCM)
        console.log(`📲 [PUSH SIGNAL] User: ${userId} | TITLE: ${title} | MSG: ${message}`);
        return true;
    }

    /**
     * Scalable Emergency Alert Engine
     * Finds matching donors within radius and notifies them
     */
    async notifyEmergency(bloodGroup, location, radiusKm = 10, urgencyText = "CRITICAL") {
        const meters = radiusKm * 1000;
        
        // Find suitable donors using Geospatial Index
        const donors = await PublicUser.find({
            isActive: true,
            bloodGroup: bloodGroup,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: location.coordinates // [lng, lat]
                    },
                    $maxDistance: meters
                }
            }
        });

        console.log(`🚨 [EMERGENCY ENGINE] Identified ${donors.length} matching donors within ${radiusKm}km sector.`);

        const notifications = donors.map(donor => 
            this.sendNotification(donor, {
                title: `🚨 EMERGENCY: ${bloodGroup} Required`,
                message: `URGENT: An extraction mission is required near your sector. ${urgencyText} Bedarf for Blood Group ${bloodGroup}. Can you deploy?`,
                type: 'emergency',
                metadata: { bloodGroup, radiusKm }
            })
        );

        // Broadcast to all active emergency listeners
        broadcastEmergencyNotification({
            title: `🚨 EMERGENCY BROADCAST`,
            message: `${bloodGroup} Required within ${radiusKm}km sector. Potential deployment window active.`,
            data: { bloodGroup, location, radiusKm }
        });

        return Promise.all(notifications);
    }
}

export default new DonorNotificationService();
