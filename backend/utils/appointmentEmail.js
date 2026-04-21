import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || user === 'your_email@gmail.com') {
        console.warn('⚠️  Email not configured — skipping appointment emails.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
    });

    return transporter;
};

export const sendAppointmentBookingEmail = async (user, appointment, details) => {
    const transport = getTransporter();
    if (!transport) return;

    console.log(`📡 Preparing Mission Briefing for ${user.email} at ${details.hospitalName}`);

    const { hospitalName, hospitalAddress, latitude, longitude, timeSlot } = details;
    
    // Improved Google Maps URL: Use coordinates if available, otherwise search by address
    let googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospitalAddress)}`;
    if (latitude && longitude && latitude !== 0 && longitude !== 0) {
        googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
    
    // Generate QR Code for the appointment
    const qrData = JSON.stringify({
        id: user._id,
        appointmentId: appointment._id,
        type: 'Vein Link-Mission',
        platform: 'Vein Link'
    });
    
    const qrImageBuffer = await QRCode.toBuffer(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#e11d48', light: '#ffffff' }
    });

    const formattedDate = new Date(timeSlot || appointment.createdAt).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const missionType = details.type === 'camp' ? 'Localized Sector' : 'Strategic Hub';
    const locationLabel = details.type === 'camp' ? 'Camp Deployment' : 'Hospital Extraction';

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #f1f5f9; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #e11d48; padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">Mission Confirmed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-weight: 600; font-size: 14px; letter-spacing: 0.2em;">PROTOCOL: ${details.type === 'camp' ? 'CAMP-DEPLOY-GAMMA' : 'LIFE-SAVER-ALPHA'}</p>
        </div>

        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">Greetings, <strong>${user.firstName}</strong>. Your deployment request for the <strong>${locationLabel}</strong> has been authorized and synchronized. Your contribution is critical to the survival of the sector.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 20px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 900; text-transform: uppercase;">Tactical Intel</h3>
                <p style="margin: 5px 0; font-size: 14px;"><strong>${missionType}:</strong> ${hospitalName}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Grid Address:</strong> ${hospitalAddress}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Time Slot:</strong> ${formattedDate}</p>
                
                <div style="margin-top: 20px; text-align: center;">
                    <a href="${googleMapsUrl}" style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 12px; display: inline-block; text-transform: uppercase; letter-spacing: 0.1em;">
                        📍 Navigate to Sector Hub
                    </a>
                </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <h3 style="color: #e11d48; margin-bottom: 5px; font-weight: 900; text-transform: uppercase; font-size: 14px;">Dossier Pass (Present on Arrival)</h3>
                <img src="cid:appointment-qr" alt="Vein Link QR" style="width: 200px; height: 200px; border: 10px solid #f8fafc; border-radius: 24px;" />
            </div>

            <div style="margin-top: 40px; border-top: 2px solid #f1f5f9; pt: 30px;">
                <h3 style="color: #1e293b; font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">Mission Protocols (Precautions)</h3>
                
                <div style="margin-bottom: 20px;">
                    <p style="font-weight: 900; color: #e11d48; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">Pre-Deployment (Before Donation)</p>
                    <ul style="font-size: 14px; color: #475569; padding-left: 20px;">
                        <li>Sync hydration: Drink at least 500ml of water 1 hour before arrival.</li>
                        <li>Energy Intake: Have a healthy, low-fat meal. Do not arrive on an empty stomach.</li>
                        <li>Rest Protocol: Ensure 7-8 hours of sleep the night before.</li>
                        <li>Avoid stimulants: No caffeine or smoking 3 hours before donation.</li>
                    </ul>
                </div>

                <div style="margin-bottom: 20px;">
                    <p style="font-weight: 900; color: #0284c7; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">Post-Deployment (After Donation)</p>
                    <ul style="font-size: 14px; color: #475569; padding-left: 20px;">
                        <li>Recovery Stall: Rest at the hub for 15 minutes after the procedure.</li>
                        <li>Fluids+: Drink plenty of fluids for the next 24-48 hours.</li>
                        <li>Avoid heavy exertion: No intense physical training for 24 hours.</li>
                        <li>Keep the bandage: Do not remove the bandage for at least 6 hours.</li>
                    </ul>
                </div>

                <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 25px; border-radius: 20px; text-align: center; margin-top: 30px;">
                    <p style="margin: 0 0 15px 0; font-size: 15px; font-weight: 900; color: #be123c; text-transform: uppercase; letter-spacing: 0.05em;">Master the Extraction (Video Briefing)</p>
                    <p style="font-size: 13px; color: #475569; margin-bottom: 20px;">Watch our latest clinical extraction guide to understand the procedure, neutralize fear, and master the precautions.</p>
                    <a href="https://www.youtube.com/watch?v=epBH_Xq24Rw" style="background-color: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 12px; display: inline-block; text-transform: uppercase; letter-spacing: 0.1em; border: 2px solid #be123c;">
                        🎥 Watch: Tactical Extraction Protocol
                    </a>
                    <p style="margin-top: 15px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">AUTHORIZED MEDIC VIDEO HUB</p>
                </div>
            </div>
        </div>

        <div style="background-color: #f8fafc; padding: 30px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0; font-weight: 700;">Vein Link — Pulse of Humanity</p>
            <p style="margin: 5px 0 0 0;">Sector Intelligence Unit • Protocol AlphaV</p>
        </div>
    </div>
    `;

    try {
        await transport.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: user.email,
            subject: `Mission Confirmed: Deploy to ${hospitalName}`,
            html: htmlContent,
            attachments: [{
                filename: 'mission-qr.png',
                content: qrImageBuffer,
                cid: 'appointment-qr'
            }]
        });
        console.log(`📧 Appointment email sent to ${user.email}`);
    } catch (err) {
        console.error('❌ Failed to send appointment email:', err.message);
    }
};

export const sendAppointmentCompletionEmail = async (user, appointment, details) => {
    const transport = getTransporter();
    if (!transport) return;

    console.log(`🎉 Preparing Mission Success Briefing for ${user.email}`);

    const { hospitalName, pointsEarned } = details;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #f1f5f9; border-radius: 24px; overflow: hidden; background-color: #ffffff; text-align: center;">
        <div style="background-color: #10b981; padding: 50px 20px; color: white;">
            <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">Mission Accomplished</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-weight: 600; font-size: 14px; letter-spacing: 0.2em;">HERO STATUS SYNCED</p>
        </div>

        <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #1e293b; font-weight: 700;">Spectacular work, Operative ${user.firstName}.</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">Your donation at <strong>${hospitalName}</strong> has been verified. You have officially neutralized the shortage threat and saved up to 3 lives.</p>
            
            <div style="margin: 40px 0; padding: 30px; background-color: #f0fdf4; border-radius: 24px; border: 3px dashed #10b981;">
                <p style="font-size: 12px; font-weight: 900; color: #065f46; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.1em;">Honor Rewards Earned</p>
                <p style="font-size: 32px; font-weight: 900; color: #059669; margin: 0;">+${pointsEarned} PTS</p>
            </div>

            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                Your rank and mission badges have been upgraded in the Strategic Command Center (Dashboard). 
                The sector thanks you for your service.
            </p>
        </div>

        <div style="background-color: #f8fafc; padding: 30px; text-align: center;">
             <p style="margin: 0; font-weight: 900; color: #e11d48; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em;">Vein Link — Pulse of Humanity</p>
        </div>
    </div>
    `;

    try {
        await transport.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: user.email,
            subject: `Mission Accomplished: Hero Token Awarded!`,
            html: htmlContent,
        });
    } catch (err) {
        console.error('❌ Failed to send completion email:', err.message);
    }
};
