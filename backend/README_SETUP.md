# 🖥️ Vein Link Backend - Strategic Command Center

This is the central engine of the Vein Link mobilization system. It handles real-time socket synchronization, geospatial tracking, and the secure biometric verification core.

**🛰️ Live Operational Signal:** [https://veinlink.onrender.com](https://veinlink.onrender.com)

---

## 📡 1. Tactical Environment Configuration

Create a `.env` file in the `backend/` directory and populate it with the following tactical parameters. **Note:** Port 5005 is used to bypass macOS AirPlay conflicts.

```env
PORT=5005
NODE_ENV=development

# 🗄️ Database Hub
MONGODB_URI=your_mongodb_cluster_uri

# 🔐 Security Protocol
JWT_SECRET=your_secure_hash
JWT_EXPIRE=7d

# ☁️ Media Storage (V-ID Identity Signatures)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 📧 Email Engine (Tactical Mission Briefings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
FROM_EMAIL=your_email@gmail.com
FROM_NAME=Vein Link
```

---

## 🛠️ 2. Core Initialisation

Execute the following commands to synchronize dependencies and prepare the grid:

```bash
# Install tactical dependencies
npm install

# Seed the first Super Admin dossier
node scripts/seedSuperAdmin.js
```

---

## 🔐 3. Access Credentials (Default)

After running the seed script, you can access the Command Center using these default credentials.

| Security Level | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@veinlink.com` | `admin123` |

---

## 🚀 4. Mission Execution

To launch the backend signal:

```bash
# Standard Launch
npm start

# Development (Live-Reload)
npm run dev
```

The signal will be broadcast on: `http://localhost:5005`

---

## 🛰️ 5. Automated Tactical Jobs
The backend runs high-frequency background cron jobs:
*   **Bio-Regen Countdown**: Scans for donors at T-Minus 3, 2, and 1 days before eligibility. Dispatches automated recovery signals.
*   **Eligibility Authorization**: Notifies users instantly when their 90-day cooldown cycle is neutralized.
*   **Stock Monitor**: Real-time tracking of blood inventory health and expiration alerts.
*   **Geospatial Heartbeat**: 3-second tactical sync via Socket.io for emergency triangulation.

---

*Vein Link — Pulse of Humanity.*
