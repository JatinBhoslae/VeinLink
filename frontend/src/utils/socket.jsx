import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { usePublicAuth } from '../context/PublicAuthContext';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  // Initialize socket connection
  initialize(token, userType = 'hospital') {
    // Don't connect if no token provided
    if (!token || token === 'test-token') {
      console.log('🔌 No valid token provided, skipping socket initialization');
      return null;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.userType = userType;

    let serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // Tactical Fix: Strip /api suffix to prevent 'Invalid namespace' socket error
    serverUrl = serverUrl.replace(/\/api\/?$/, '');
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      forceNew: false,
      autoConnect: true
    });

    this.setupEventListeners();
    return this.socket;
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to real-time server');
      this.connected = true;
      this.emit('connection_change', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from real-time server:', reason);
      this.connected = false;
      this.emit('connection_change', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
      this.connected = false;
      
      // If authentication error, don't try to reconnect
      if (error.message === 'Authentication token required' || error.message === 'jwt malformed' || error.message === 'invalid signature') {
        console.log('🔌 Authentication failed, stopping reconnection attempts');
        this.socket.disconnect();
        this.emit('connection_change', { connected: false, error: 'Authentication failed' });
      } else {
        this.emit('connection_change', { connected: false, error: error.message });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected to real-time server after', attemptNumber, 'attempts');
      this.connected = true;
      this.emit('connection_change', { connected: true });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 Failed to reconnect to real-time server');
    });

    // Notification events
    this.socket.on('notification', (data) => {
      console.log('📢 New notification received:', data);
      this.emit('notification', data);
      
      // Show browser notification if permitted
      this.showBrowserNotification(data);
    });

    this.socket.on('emergency_notification', (data) => {
      console.log('🚨 Emergency notification received:', data);
      this.emit('emergency_notification', data);
      
      // Always show browser notification for emergency
      this.showBrowserNotification(data, true);
    });

    // Donor location updates (for hospitals)
    this.socket.on('donor_location_update', (data) => {
      console.log('📍 Donor location update:', data);
      this.emit('donor_location_update', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stop_typing', (data) => {
      this.emit('user_stop_typing', data);
    });

    // System events
    this.socket.on('system_maintenance', (data) => {
      console.log('🔧 System maintenance notification:', data);
      this.emit('system_maintenance', data);
    });
  }

  // Show browser notification
  showBrowserNotification(data, isEmergency = false) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(data.title || 'New Notification', {
        body: data.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.id || 'notification',
        requireInteraction: isEmergency,
        silent: !isEmergency
      });

      // Handle notification click
      notification.onclick = () => {
        if (data.actionUrl) {
          window.location.href = data.actionUrl;
        }
        notification.close();
      };

      // Auto-close after 5 seconds for non-emergency
      if (!isEmergency) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showBrowserNotification(data, isEmergency);
        }
      });
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Join a room
  joinRoom(roomName) {
    if (this.socket && this.connected) {
      this.socket.emit('join_room', roomName);
      console.log(`📢 Joined room: ${roomName}`);
    }
  }

  // Leave a room
  leaveRoom(roomName) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_room', roomName);
      console.log(`📤 Left room: ${roomName}`);
    }
  }

  // Send location update (for public users)
  sendLocationUpdate(location) {
    if (this.socket && this.connected) {
      this.socket.emit('location_update', location);
    }
  }

  // Send typing indicator
  startTyping(roomName) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_start', { room: roomName });
    }
  }

  stopTyping(roomName) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_stop', { room: roomName });
    }
  }

  // Custom event listeners
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit custom event
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 Socket disconnected manually');
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

// React hook for using socket
export const useSocket = () => {
  // Ensure socketService exists
  if (!socketService) {
    console.error('🔌 SocketService not initialized');
    return {
      socket: null,
      isConnected: false,
      notifications: [],
      unreadCount: 0,
      clearNotifications: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      joinRoom: () => {},
      leaveRoom: () => {},
      sendLocationUpdate: () => {},
      startTyping: () => {},
      stopTyping: () => {},
      disconnect: () => {}
    };
  }

  // Safe access to auth contexts with fallbacks
  let token = null;
  let publicToken = null;
  
  try {
    const authContext = useAuth();
    token = authContext?.token;
  } catch (error) {
    // Auth context not available (likely in public-only area)
    console.log('🔌 Auth context not available');
  }
  
  try {
    const publicAuthContext = usePublicAuth();
    publicToken = publicAuthContext?.token;
  } catch (error) {
    // Public auth context not available (likely in hospital-only area)
    console.log('🔌 Public auth context not available');
  }
  
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentToken = token || publicToken;
    console.log('🔌 Socket token available:', !!currentToken);
    
    // If no token, disconnect socket and don't try to connect
    if (!currentToken) {
      console.log('🔌 No token available, disconnecting socket...');
      if (socketService && socketService.disconnect) {
        socketService.disconnect();
      }
      setIsConnected(false);
      return;
    }
    
    // Only connect with a real token
    console.log('🔌 Initializing socket connection with real token...');
    const socket = socketService && socketService.initialize 
      ? socketService.initialize(currentToken, token ? 'hospital' : 'public')
      : null;
    
    // Setup listeners
    const handleConnectionChange = ({ connected, error }) => {
      console.log('🔌 Connection status changed:', connected, error);
      setIsConnected(connected);
    };

    const handleNotification = (notification) => {
      console.log('🔌 Received notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      setUnreadCount(prev => prev + 1);
    };

    const handleEmergencyNotification = (notification) => {
      console.log('🔌 Received emergency notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
    };

    if (socketService) {
      socketService.on('connection_change', handleConnectionChange);
      socketService.on('notification', handleNotification);
      socketService.on('emergency_notification', handleEmergencyNotification);
      
      // Request notification permission
      if (socketService.requestNotificationPermission) {
        socketService.requestNotificationPermission();
      }
    }

    return () => {
      if (socketService) {
        socketService.off('connection_change', handleConnectionChange);
        socketService.off('notification', handleNotification);
        socketService.off('emergency_notification', handleEmergencyNotification);
      }
    };
  }, [token, publicToken]);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = (notificationId) => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return {
    socket: socketService.getSocket(),
    isConnected,
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,
    markAllAsRead,
    joinRoom: socketService.joinRoom?.bind(socketService) || (() => {}),
    leaveRoom: socketService.leaveRoom?.bind(socketService) || (() => {}),
    sendLocationUpdate: socketService.sendLocationUpdate?.bind(socketService) || (() => {}),
    startTyping: socketService.startTyping?.bind(socketService) || (() => {}),
    stopTyping: socketService.stopTyping?.bind(socketService) || (() => {}),
    disconnect: socketService.disconnect?.bind(socketService) || (() => {})
  };
};

export default socketService;
