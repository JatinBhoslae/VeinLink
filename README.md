# 🏥 VienLink - Strategic Blood Mobilization System

![Status](https://img.shields.io/badge/Status-Tactical_Alpha-red)
![RealTime](https://img.shields.io/badge/RealTime-Active-emerald)
![License](https://img.shields.io/badge/license-MIT-black)

> **"Pulse of Humanity" — Bridging the gap between life and time with real-time tactical synchronization.**

VienLink is a next-generation Strategic Blood Mobilization System designed to neutralize blood shortages through high-frequency geospatial tracking, tactical identity verification, and AI-driven predictive logistics. It transforms traditional blood bank management into a real-time emergency response engine.

---

## 🔗 Command Center
- **🚀 Live Tactical HUD:** [https://veinlink.vercel.app](https://veinlink.vercel.app)
- **🛰️ Live Strategic API:** [https://veinlink.onrender.com](https://veinlink.onrender.com)
- **📂 GitHub Repository:** [github.com/JatinBhoslae/VienLink](https://github.com/JatinBhoslae/VienLink)

---

## ⚜️ Core Operational Modules

### 🚨 1. Emergency Mobilization (Panic Mode Alpha)
The flagship emergency response engine designed for zero-latency blood procurement.
*   **Tactical Broadcast:** Hospitals can trigger "Panic Mode" for specific blood groups. This initiates a 5km radius broadcast to all eligible donors.
*   **Geospatial Heartbeat:** Donors' devices maintain a 3-second heartbeat sync with the backend, allowing the system to target only the nearest available operatives.
*   **Mobilization Briefing:** Triggered donors receive a "Mission Alert" HUD on their dashboard with distance and critical patient info.
*   **The Data Bridge:** Upon mission acceptance, a secure bidirectional sync bridges contact details between the donor and requester, enabling instant coordination.

### 🛡️ 2. V-ID Tactical Identity HUD
A secure biometric-style verification system for hospitals and blood hubs.
*   **Dynamic QR Generation:** Donors carry a V-ID signature containing their blood group, extraction history, and eligibility status.
*   **Unified Scanner:** A dual-mode scanner (Camera/File Upload) used by hospital staff to verify identities instantly.
*   **Bio-Telemetry Retrieval:** Scanning a V-ID pulls the donor's full history, including past missions, saved lives count, and earned rewards, directly from the security core.
*   **Protocol Authorization:** Validates if the donor is within their 90-day recovery window before allowing extraction.

### 🧠 3. Strategic AI & Analytics
Data-driven logistics to stay ahead of the supply curve.
*   **Stock Forecasting:** Analyzes historical extraction and request patterns to predict inventory depletion dates.
*   **AI Insight HUD:** Displays "Smart Predictions" in the admin dashboard, warning about upcoming shortages of specific blood groups.
*   **Sector Heatmaps:** Real-time visibility into region-wide blood group distribution and hospital readiness.

### 🩸 4. Inventory & Hub Operations
Standardized management for high-volume blood banks.
*   **Real-time Stock Tracking:** Live monitoring of every unit from extraction to transfusion.
*   **Inter-Hub Transfers:** Secure protocol for intra-hospital blood unit mobilization during localized shortages.
*   **Camp Management:** Scheduling and tracking of public blood drives with automated donor notification.

---

## 🔄 Operational Workflows (How it works)

### A. The Emergency Mobilization Flow
1.  **Trigger:** Hospital Admin enables "Panic Mode" for B+ blood via the Dashboard.
2.  **Triangulation:** The system uses the 3s Location Heartbeat to find all B+ donors within 5km.
3.  **Alert:** Targeted donors receive a high-priority "Mission Card" on their dashboard via Socket.IO.
4.  **Authorization:** Donor clicks "Authorize Mission."
5.  **Synchronization:** The backend bridges the two parties. The donor sees the Patient's map location and phone; the Patient/Hospital sees the donor's ETA and contact details.
6.  **Navigation:** The donor uses the integrated "Navigate" action to reach the extraction hub.

### B. The V-ID Identity Verification Flow
1.  **Arrival:** Donor arrives at the hospital for their mission or appointment.
2.  **Extraction HUD:** Hospital staff opens the "Tactical Identity HUD."
3.  **Processing:** Staff scans the donor's V-ID (via mobile camera or uploaded screenshot).
4.  **Validation:** The system parses the protocol signature and retrieves the donor's "Tactical Dossier."
5.  **Verification:** Staff confirms the identity and clicks "Finalize Mission."
6.  **Reward:** The donor is instantly credited with Reward Points and their cooldown timer (90 days) begins.

### C. The Inventory Lifecycle
1.  **Ingestion:** A new unit is extracted and logged with its collection date.
2.  **Monitoring:** The "Sector Analytics" dashboard tracks the unit's age and blood group.
3.  **Fulfillment:** When a request is approved, the unit is marked as mobilized.
4.  **Forecasting:** Every extraction update is fed into the AI engine to refine the 30-day stock prediction.

---

## 🛠️ Tactical Stack

*   **Backend:** Node.js / Express.js / MongoDB (Aggregation Pipelines)
*   **Frontend:** React.js / Vite / Tailwind-Infused Vanilla CSS
*   **Real-time Real-time Engine:** Socket.IO for low-latency synchronization
*   **Location Tracking:** High-frequency navigator.geolocation (3s Heartbeat)
*   **Security:** JWT Multi-role Authorization (Admin, Staff, Public)
*   **Mailing:** Tactical Nodemailer templates with QR integration

---

## ⚙️ Grid Setup

### 1. Reacquire Source
```bash
git clone https://github.com/JatinBhoslae/VienLink.git
cd VienLink
```

### 2. Service Initialization

**Backend Command Center:**
```bash
cd backend
npm install
# Configure .env with tactical credentials
npm run dev
```

**Frontend Tactical HUD:**
```bash
cd frontend
npm install
# Ensure VITE_API_URL points to the backend signal
npm run dev
```

---

## 🤝 Protocol Contribution
1.  Fork the Grid
2.  Deploy Feature Branch (`git checkout -b protocol/YourFeature`)
3.  Commit Tactical Changes (`git commit -m 'Sync: Add YourFeature'`)
4.  Push to Sector Hub (`git push origin protocol/YourFeature`)
5.  Initiate Authorization (Pull Request)

---

## 📞 Strategic Contact

**Jatin Bhosale**  
*   GitHub: [@JatinBhoslae](https://github.com/JatinBhoslae)

**Hemant Jawale**  
*   GitHub: [@hemantjawale](https://github.com/hemantjawale)

---

*VienLink — Synchronizing the heartbeat of humanity.*
# VeinLink
