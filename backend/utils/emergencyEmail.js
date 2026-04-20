import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || user === 'your_email@gmail.com') {
        console.warn('⚠️  Email not configured — skipping email notifications. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
    });

    // Verify connection on first use
    transporter.verify((err) => {
        if (err) {
            console.error('❌ Email transporter verification failed:', err.message);
            transporter = null;
        } else {
            console.log('✅ Email transporter ready');
        }
    });

    return transporter;
};

// ============================================================
// Send emergency alert email to a donor
// ============================================================
export const sendEmergencyAlertEmail = async (donor, emergencyRequest) => {
    const transport = getTransporter();
    if (!transport) return { success: false, reason: 'Email not configured' };

    const { bloodGroup, patientName, patientLocation, message, notes } = emergencyRequest;
    
    // Construct Tactical Navigation Link to Patient Sector
    // patientLocation.coordinates is [lng, lat]
    let lat = 0;
    let lng = 0;
    
    if (patientLocation?.coordinates && patientLocation.coordinates.length === 2) {
        lng = patientLocation.coordinates[0];
        lat = patientLocation.coordinates[1];
    } else {
        // Fallback or error
        return { success: false, reason: 'Invalid patient location coordinates' };
    }

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    
    const donorName = `${donor.firstName} ${donor.lastName}`;
    const donorLocation = donor.city ? `${donor.city} (${donor.pinCode})` : 'your current location';

    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:32px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.05);">
          
          <!-- Tactical Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);padding:50px 40px;text-align:center;">
              <div style="display:inline-block;padding:16px;background:rgba(0,0,0,0.2);border-radius:24px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:40px;">🚨</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:900;letter-spacing:-1.5px;text-transform:uppercase;line-height:1;">
                TACTICAL<br/>MOBILIZATION
              </h1>
              <p style="margin:12px 0 0;color:#fff1f2;font-size:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">
                Sector: High Priority Alert
              </p>
            </td>
          </tr>

          <!-- Signal Intel -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;font-size:18px;color:#f1f5f9;line-height:1.6;">
                Operative <strong>${donorName}</strong>,
              </p>
              
              <div style="background: rgba(225, 29, 72, 0.1); border: 1px solid rgba(225, 29, 72, 0.2); padding:24px;margin-bottom:32px;border-radius:24px;">
                <p style="margin:0;font-size:18px;color:#fda4af;line-height:1.6;font-weight:700;">
                  A critical blood extraction mission has been identified in your immediate sector. 
                  Target requires <span style="font-size:24px;color:#fb7185;">${bloodGroup}</span> blood.
                </p>
              </div>

              <!-- Briefing Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border-radius:24px;border:1px solid rgba(255,255,255,0.1);margin-bottom:32px;">
                <tr>
                  <td style="padding:28px;">
                    <table width="100%">
                      <tr>
                        <td style="padding:10px 0;color:#94a3b8;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;width:35%;">Target Operative:</td>
                        <td style="padding:10px 0;color:#ffffff;font-size:16px;font-weight:700;">${patientName || 'Anonymous Operative'}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#94a3b8;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Extraction Need:</td>
                        <td style="padding:10px 0;color:#f43f5e;font-size:18px;font-weight:900;">${bloodGroup} (CRITICAL)</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;color:#94a3b8;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">SitRep:</td>
                        <td style="padding:10px 0;color:#cbd5e1;font-size:14px;line-height:1.6;font-style:italic;">"${notes || 'Immediate assistance required for life-saving mobilization.'}"</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Navigation CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
                <tr>
                  <td align="center">
                    <a href="${googleMapsUrl}" style="display:inline-block;background-color:#e11d48;color:#ffffff;padding:22px 60px;border-radius:20px;text-decoration:none;font-weight:900;font-size:14px;box-shadow:0 15px 35px rgba(225,29,72,0.4);text-transform:uppercase;letter-spacing:2px;border:1px solid #fb7185;">
                      🛰️ Open Sector Navigation
                    </a>
                    <p style="margin:20px 0 0;font-size:12px;color:#64748b;font-weight:600;letter-spacing:0.5px;">
                      Direct bridge to patient coordinates from ${donorLocation}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Action Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(251, 191, 36, 0.05);border-radius:20px;border:1px solid rgba(251, 191, 36, 0.2);">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:13px;color:#fbbf24;line-height:1.6;text-align:center;font-weight:600;">
                      ⚡ <strong>STRATEGIC NOTICE:</strong> You have been identified as the closest compatible asset. Time-to-extraction is the priority. Mobilize immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tactical Footer -->
          <tr>
            <td style="background-color:#0f172a;padding:40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 12px;font-size:11px;color:#475569;font-weight:800;letter-spacing:3px;text-transform:uppercase;">
                VIENLINK EMERGENCY NETWORK // TACTICAL PULSE
              </p>
              <p style="margin:0;font-size:10px;color:#334155;">
                &copy; ${new Date().getFullYear()} VienLink. This signal is an encrypted priority mobilization link.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `🚨 TACTICAL MOBILIZATION ALERT

Operative ${donorName},

A critical blood extraction mission has been identified in your immediate sector.

TARGET: ${patientName || 'Anonymous Operative'}
NEED: ${bloodGroup} (CRITICAL)

🛰️ OPEN SECTOR NAVIGATION: ${googleMapsUrl}

SITREP: ${notes || 'Immediate assistance required.'}

You have been identified as the closest compatible asset. Mobilize immediately.

— VienLink Emergency Network`;

    try {
        const info = await transport.sendMail({
            from,
            to: donor.email,
            subject: `🚨 TACTICAL MOBILIZATION: ${bloodGroup} required in your sector`,
            text: textContent,
            html: htmlContent,
        });

        console.log(`📧 Emergency email sent to ${donor.email} — Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Failed to send emergency email to ${donor.email}:`, err.message);
        return { success: false, reason: err.message };
    }
};

// ============================================================
// Send email to patient when donor accepts
// ============================================================
export const sendDonorAcceptedEmail = async (patientEmail, patientName, donor, emergencyRequest) => {
    const transport = getTransporter();
    if (!transport) return { success: false, reason: 'Email not configured' };

    const donorName = `${donor.firstName} ${donor.lastName}`;
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);padding:30px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">
                ✅ DONOR FOUND!
              </h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">
                A donor has accepted your emergency blood request
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
                Dear <strong>${patientName}</strong>,
              </p>
              
              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
                Great news! A donor has accepted your emergency request for 
                <strong style="color:#dc2626;">${emergencyRequest.bloodGroup}</strong> blood.
              </p>

              <!-- Donor Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#166534;">Donor Details:</p>
                    <table width="100%">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;width:35%;">Name:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${donorName}</td>
                      </tr>
                      ${donor.phone ? `
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Phone:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">
                          <a href="tel:${donor.phone}" style="color:#16a34a;text-decoration:none;">${donor.phone}</a>
                        </td>
                      </tr>` : ''}
                      ${donor.email ? `
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Email:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;">
                          <a href="mailto:${donor.email}" style="color:#16a34a;text-decoration:none;">${donor.email}</a>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Blood Group:</td>
                        <td style="padding:6px 0;color:#dc2626;font-size:16px;font-weight:700;">${donor.bloodGroup}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                Please contact the donor as soon as possible to coordinate the blood donation.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f3f4f6;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                This is an automated notification from VienLink Blood Bank Management System.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} VienLink. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
        const info = await transport.sendMail({
            from,
            to: patientEmail,
            subject: `✅ Donor Found for ${emergencyRequest.bloodGroup} Blood — VienLink Emergency`,
            text: `Dear ${patientName},\n\nA donor has accepted your emergency request for ${emergencyRequest.bloodGroup} blood.\n\nDonor: ${donorName}\nPhone: ${donor.phone || 'N/A'}\nEmail: ${donor.email || 'N/A'}\nBlood Group: ${donor.bloodGroup}\n\nPlease contact the donor as soon as possible.\n\n— VienLink`,
            html: htmlContent,
        });

        console.log(`📧 Donor-accepted email sent to patient ${patientEmail} — Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Failed to send donor-accepted email to ${patientEmail}:`, err.message);
        return { success: false, reason: err.message };
    }
};

export default {
    sendEmergencyAlertEmail,
    sendDonorAcceptedEmail,
};
