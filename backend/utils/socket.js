import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import PublicUser from '../models/PublicUser.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logSocket = (msg) => {
    const entry = `[${new Date().toISOString()}] 🔌 [SOCKET] ${msg}\n`;
    try {
      fs.appendFileSync(path.join(__dirname, '../mission_logs.txt'), entry);
    } catch (e) {}
    console.log(`🔌 [SOCKET] ${msg}`);
};

let io;

// Initialize Socket.IO server
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true // Support older engine.io protocols if necessary
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user (could be regular user or public user)
      let user = await User.findById(decoded.id).select('-password');
      if (!user) {
        user = await PublicUser.findById(decoded.id);
      }

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.userType = user.hospitalId ? 'hospital' : 'public';
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    logSocket(`Operative identified: ${socket.user.email} (${socket.userType})`);

    // Join user to their personal room
    socket.join(`user_${socket.user._id}`);

    // Join hospital room if hospital user
    if (socket.userType === 'hospital' && socket.user.hospitalId) {
      socket.join(`hospital_${socket.user.hospitalId}`);
      console.log(`🏥 Hospital user joined room: hospital_${socket.user.hospitalId}`);
    }

    // Join role-based room for broadcasts
    socket.join(`role_${socket.user.role}`);

    // Handle joining specific rooms
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      console.log(`📢 User ${socket.user.email} joined room: ${roomName}`);
    });

    // Handle leaving rooms
    socket.on('leave_room', (roomName) => {
      socket.leave(roomName);
      console.log(`📤 User ${socket.user.email} left room: ${roomName}`);
    });

    // Handle real-time location updates for donors
    socket.on('location_update', (locationData) => {
      if (socket.userType === 'public') {
        socket.to(`role_hospital_admin`).emit('donor_location_update', {
          userId: socket.user._id,
          email: socket.user.email,
          location: locationData,
          bloodGroup: socket.user.bloodGroup,
          timestamp: new Date()
        });
      }
    });

    // Handle typing indicators for chat
    socket.on('typing_start', (data) => {
      socket.to(data.room).emit('user_typing', {
        userId: socket.user._id,
        userName: socket.user.firstName,
        room: data.room
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.room).emit('user_stop_typing', {
        userId: socket.user._id,
        room: data.room
      });
    });

    // ---- Emergency Broadcast Events ----
    // Donors join the emergency broadcast room for receiving alerts
    socket.on('join_emergency_room', () => {
      socket.join('emergency_broadcast');
      console.log(`🚨 ${socket.user.email} joined emergency broadcast room`);
    });

    socket.on('leave_emergency_room', () => {
      socket.leave('emergency_broadcast');
      console.log(`🚨 ${socket.user.email} left emergency broadcast room`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.email}`);
    });
  });

  console.log('🚀 Socket.IO server initialized');
  return io;
};

// Get Socket.IO instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Notification types
export const NotificationTypes = {
  BLOOD_REQUEST_APPROVED: 'BLOOD_REQUEST_APPROVED',
  BLOOD_REQUEST_REJECTED: 'BLOOD_REQUEST_REJECTED',
  BLOOD_REQUEST_FULFILLED: 'BLOOD_REQUEST_FULFILLED',
  LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
  CRITICAL_STOCK_ALERT: 'CRITICAL_STOCK_ALERT',
  EMERGENCY_BROADCAST: 'EMERGENCY_BROADCAST',
  NEW_DONATION_REQUEST: 'NEW_DONATION_REQUEST',
  TRANSFER_REQUEST_CREATED: 'TRANSFER_REQUEST_CREATED',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  TRANSFER_REJECTED: 'TRANSFER_REJECTED',
  TRANSFER_COMPLETED: 'TRANSFER_COMPLETED',
  CAMP_CREATED: 'CAMP_CREATED',
  CAMP_UPDATED: 'CAMP_UPDATED',
  DONOR_REGISTERED: 'DONOR_REGISTERED',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  HOSPITAL_APPROVED: 'HOSPITAL_APPROVED',
  HOSPITAL_REJECTED: 'HOSPITAL_REJECTED'
};

// Send notification to specific user
export const sendNotificationToUser = (userId, notification) => {
  const io = getIO();
  io.to(`user_${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date(),
    id: generateNotificationId()
  });
};

// Send notification to hospital
export const sendNotificationToHospital = (hospitalId, notification) => {
  const io = getIO();
  io.to(`hospital_${hospitalId}`).emit('notification', {
    ...notification,
    timestamp: new Date(),
    id: generateNotificationId()
  });
};

// Send notification to role
export const sendNotificationToRole = (role, notification) => {
  const io = getIO();
  io.to(`role_${role}`).emit('notification', {
    ...notification,
    timestamp: new Date(),
    id: generateNotificationId()
  });
};

// Broadcast emergency notification
export const broadcastEmergencyNotification = (notification) => {
  const io = getIO();
  io.emit('emergency_notification', {
    ...notification,
    timestamp: new Date(),
    id: generateNotificationId(),
    priority: 'high'
  });
};

// Send low stock alert
export const sendLowStockAlert = (hospitalId, bloodGroup, currentStock, threshold) => {
  const notification = {
    type: NotificationTypes.LOW_STOCK_ALERT,
    title: 'Low Stock Alert',
    message: `Blood group ${bloodGroup} is running low. Current stock: ${currentStock} units (Threshold: ${threshold})`,
    data: {
      bloodGroup,
      currentStock,
      threshold,
      hospitalId
    },
    priority: 'medium'
  };

  sendNotificationToHospital(hospitalId, notification);

  // Also notify super admins
  sendNotificationToRole('super_admin', {
    ...notification,
    message: `Low stock alert at hospital: ${notification.message}`
  });
};

// Send critical stock alert
export const sendCriticalStockAlert = (hospitalId, bloodGroup, currentStock) => {
  const notification = {
    type: NotificationTypes.CRITICAL_STOCK_ALERT,
    title: 'Critical Stock Alert',
    message: `CRITICAL: Blood group ${bloodGroup} is critically low. Current stock: ${currentStock} units`,
    data: {
      bloodGroup,
      currentStock,
      hospitalId
    },
    priority: 'high'
  };

  sendNotificationToHospital(hospitalId, notification);

  // Broadcast to all hospitals for potential transfers
  sendNotificationToRole('hospital_admin', {
    ...notification,
    message: `Critical stock alert at partner hospital: ${notification.message}`
  });

  // Also notify super admins
  sendNotificationToRole('super_admin', notification);
};

// Generate unique notification ID
const generateNotificationId = () => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get connected users count
export const getConnectedUsersCount = () => {
  const io = getIO();
  return io.engine.clientsCount;
};

// Get connected users in room
export const getConnectedUsersInRoom = (room) => {
  const io = getIO();
  return io.sockets.adapter.rooms.get(room)?.size || 0;
};

export default {
  initializeSocket,
  getIO,
  sendNotificationToUser,
  sendNotificationToHospital,
  sendNotificationToRole,
  broadcastEmergencyNotification,
  sendLowStockAlert,
  sendCriticalStockAlert,
  NotificationTypes
};
