# 🏥 Vein Link - Strategic Blood Mobilization System

![Status](https://img.shields.io/badge/Status-Tactical_Stable-emerald)
![RealTime](https://img.shields.io/badge/RealTime-Active-emerald)
![License](https://img.shields.io/badge/license-MIT-black)

> **"Pulse of Humanity" — Bridging the gap between life and time with real-time tactical synchronization.**

Vein Link is a next-generation Strategic Blood Mobilization System designed to neutralize blood shortages through high-frequency geospatial tracking, tactical identity verification, and AI-driven predictive logistics. It transforms traditional blood bank management into a real-time emergency response engine.

---

## 🔗 Command Center
- **🚀 Live Tactical HUD:** [https://veinlink.vercel.app](https://veinlink.vercel.app)
- **🛰️ Live Strategic API:** [https://veinlink.onrender.com](https://veinlink.onrender.com)
- **📂 GitHub Repository:** [github.com/JatinBhoslae/VeinLink](https://github.com/JatinBhoslae/VeinLink)

---

## ⚜️ Comprehensive Feature Ecosystem

### 👤 1. Donor Operations (Operative HUD)
The central interface for blood donors to manage their service and recovery.
*   **Tactical Dashboard**: A high-impact HUD showing lives saved, reward points (XP), and current mission readiness.
*   **V-ID Identity Signature**: Dynamic QR code containing encrypted donor bio-telemetry, blood group, and historical service data.
*   **Bio-Regen Countdown**: Real-time recovery monitor showing the exact days remaining until the 90-day cooldown cycle is neutralized.
*   **Personnel Dossier**: Comprehensive management of medical history, underlying diseases, and active medications to ensure safe deployment.
*   **Mission Log (History)**: An indexed archive of all past donations with "Mission Success" status tracking.
*   **Honor Medal Extraction**: Export high-fidelity, PDF-formatted "Certificates of Honor" with unique VL-SEC verification IDs.
*   **Satellite Tracking Signal**: Authorize high-frequency geospatial broadcasts (3s heartbeat) for real-time emergency triangulation.
*   **Milestone Rewards**: Unlock unique digital badges (e.g., "Life Savior," "Platinum Donor") based on service milestones.
*   **Tactical Signals**: Granular control over communication channels (Email, SMS, Push, Life Tracking).

### 🏥 2. Hospital Command Center
The administrative engine for managing supply, demand, and donor verification.
*   **Emergency Broadcast (Panic Mode Alpha)**: Trigger localized radius-based broadcasts (5km) for critical blood group shortages.
*   **Tactical QR Scanner**: Dual-mode identity scanner to verify V-ID signatures and retrieve donor history at the point of extraction.
*   **Inventory Control HUD**: Real-time management of blood units, sub-types, and expiration cycles.
*   **Blood Camp Mobilization**: Create and schedule public donation drives with automated sector-wide alerts.
*   **Staff Coordination**: Secure role-based access for medical staff to manage extraction missions and verified donors.

### 🧠 3. Core Strategic Intelligence
Advanced technology suite driving the mobilization engine.
*   **AI Stock Forecasting**: Predictive analytic engine that forecasts blood inventory depletion dates based on historical mobilization patterns.
*   **Geospatial Triangulation**: Socket-driven real-time map synchronization that connects donors and hospitals during emergency deployments.
*   **Automated Pulse Job (Cron)**: Background engine performing daily scans for eligibility milestones (T-Minus 3, 2, 1 days).
*   **Tactical AI Chatbot**: Native intelligence interface ("Vein Link Intel") to provide operatives with immediate info on eligibility and site locations.

---

## 🔄 Deployment Workflows

### A. Emergency Extraction Protocol
1.  **Trigger**: Hospital triggers "Panic Mode" for a specific blood group.
2.  **Triangulation**: The system identifies all "Authorized" donors within 5km via their Satellite Tracking Signal.
3.  **Signal**: Target donors receive a high-priority Mission Alert via Socket.IO.
4.  **Deployment**: Upon acceptance, the donor receives the Hospital's map coordinates and contact signal.
5.  **Finalization**: Hospital staff scans the donor's V-ID to verify identity and finalize the mission.

---

## 🛠️ Tactical Technical Stack

*   **Engine**: Node.js / Express.js (High-concurrency architecture)
*   **Intelligence Base**: MongoDB with Geospatial Indexing (2dsphere)
*   **User Interface**: React.js / Vite / Tailwind-Infused Vanilla CSS
*   **Real-time Link**: Socket.IO (Optimized for low-latency emergency telemetry)
*   **Signal Dispatch**: Nodemailer (SMTP) with automated tactical templates
*   **Medal Export**: jsPDF + html2canvas for secure, offline-renderable honor certificates

---

## ⚙️ Sector Grid Setup

### 1. Backend Frequency Calibration
The backend is calibrated to **Port 5005** to ensure stability on macOS and production environments.

```bash
cd backend
npm install
# Configure .env as per backend/README_SETUP.md
npm run dev
```

### 2. Frontend HUD Calibration
```bash
cd frontend
npm install
# Ensure VITE_API_URL/VITE_SOCKET_URL point to the 5005 signal
npm run dev
```

---

##  Strategic Contact

**Jatin Bhosale**  
*   GitHub: [@JatinBhoslae](https://github.com/JatinBhoslae)

---

*Vein Link — Synchronizing the heartbeat of humanity.*
— Synchronizing the heartbeat of humanity.*
# VeinLink

admin email - admin@veinlink.com
admin pass - password123
