# 🖥️ VienLink Backend - Strategic Command Center

This is the central engine of the VienLink mobilization system. It handles real-time socket synchronization, geospatial tracking, and the secure biometric verification core.

---

## 📡 1. Tactical Environment Configuration

Create a `.env` file in the `backend/` directory and populate it with the following tactical parameters:

```env
PORT=5000
NODE_ENV=development

# 🗄️ Database Hub
MONGODB_URI=your_mongodb_atlas_connection_string

# 🔐 Security Protocol
JWT_SECRET=your_secure_random_hash_key
JWT_EXPIRE=7d

# ☁️ Media Storage (Identity Images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 📧 Email Engine (Mission Briefings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 🛠️ 2. Core Initialisation

Execute the following commands to synchronize dependencies and prepare the grid:

```bash
# Install tactical dependencies
npm install

# Seed the first Super Admin dossier
npm run seed:admin
```

---

## 🔐 3. Access Credentials (Default)

After running the seed script, you can access the Command Center using these default credentials. **Change these immediately after first login.**

| Security Level | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@vienlink.com` | `admin123` |

---

## 🚀 4. Mission Execution

To launch the backend signal:

```bash
# Standard Launch
npm start

# Development (Live-Reload)
npm run dev
```

The signal will be broadcast on: `http://localhost:5000`

---

## 🛰️ 5. Automated Tactical Jobs
The backend runs several background cron jobs to maintain the sector:
*   **Notification Pulse**: Checks for upcoming donation windows.
*   **Stock Monitor**: Live monitoring of blood unit expiration dates.
*   **Geospatial Sync**: 3s heartbeat coordination via Socket.io.

---

*VienLink — Pulse of Humanity.*
