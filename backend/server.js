import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { appendFileSync } from 'fs';

// Socket
import { initializeSocket } from './utils/socket.js';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import donorRoutes from './routes/donor.routes.js';
import bloodUnitRoutes from './routes/bloodUnit.routes.js';
import bloodRequestRoutes from './routes/bloodRequest.routes.js';
import bloodCampRoutes from './routes/bloodCamp.routes.js';
import staffRoutes from './routes/staff.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import donorProfileRoutes from './routes/donorProfile.routes.js';
import publicAuthRoutes from './routes/publicAuth.routes.js';
import publicCampsRoutes from './routes/publicCamps.routes.js';
import publicBloodRequestRoutes from './routes/publicBloodRequest.routes.js';
import auditRoutes from './routes/audit.routes.js';
import donorQRRoutes from './routes/donorQR.routes.js';
import interHospitalRoutes from './routes/interHospitalRequest.routes.js';
import emergencyRoutes from './routes/emergencyBroadcast.routes.js';
import hospitalSlotRoutes from './routes/hospitalSlot.routes.js';
import publicAppointmentRoutes from './routes/publicAppointment.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import panicRoutes from './routes/panicButton.routes.js';

// Jobs
import { startNotificationJobs } from './jobs/notification.job.js';

// Load environment
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Tactical Logger - Redirect to persistent mission log
const logMutation = (msg) => {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    appendFileSync(join(__dirname, 'mission_logs.txt'), entry);
  } catch (e) {}
  console.log(msg); // Continue to terminal
};

// Initialize Socket.IO
initializeSocket(server);

// -------------------- Middleware --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '❌' : '✅';
    logMutation(`${color} [${req.method}] ${req.originalUrl} - ${status} (${duration}ms)`);
  });

  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  next();
});

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

// Static files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// -------------------- Routes --------------------
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/blood-units', bloodUnitRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/blood-camps', bloodCampRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v-stats', analyticsRoutes);
app.use('/api/donor-profile', donorProfileRoutes);
app.use('/api/public-auth', publicAuthRoutes);
app.use('/api/public-camps', publicCampsRoutes);
app.use('/api/public-blood-requests', publicBloodRequestRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/donor-qr', donorQRRoutes);
app.use('/api/inter-hospital-requests', interHospitalRoutes);
app.use('/api/emergency-broadcast', emergencyRoutes);
app.use('/api/hospital-slots', hospitalSlotRoutes);
app.use('/api/public-appointments', publicAppointmentRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/panic', panicRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Vein Link API Hub Online', status: 'Optimal' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logMutation(`❌ [ERROR] ${err.stack}`);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// -------------------- Initialize --------------------
const PORT = process.env.PORT || 5001;

const startServer = () => {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        logMutation('✅ MongoDB Connected Successfuly');
        
        // Start automated jobs
        startNotificationJobs();

        server.listen(PORT, '0.0.0.0', () => {
          logMutation(`🚀 Vein Link Server Initialized on Port ${PORT}`);
        });
      })
      .catch(err => {
        logMutation(`❌ MongoDB Connection Error: ${err.message}`);
        setTimeout(startServer, 5000); // Retry logic
      });
};

startServer();
