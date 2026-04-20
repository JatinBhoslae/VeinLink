import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import { useSocket } from '../../utils/socket.jsx';

export const NotificationToast = () => {
  const { notifications } = useSocket();
  const [activeToasts, setActiveToasts] = useState([]);

  // Show new notifications as toasts
  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification) {
      showToast(latestNotification);
    }
  }, [notifications]);

  const showToast = (notification) => {
    const toastId = `toast_${notification.id || Date.now()}`;
    
    // Add toast to active toasts
    setActiveToasts(prev => [
      ...prev.filter(t => t.id !== toastId),
      {
        id: toastId,
        notification,
        timestamp: Date.now()
      }
    ]);

    // Auto remove after 5 seconds (or 10 seconds for high priority)
    const duration = notification.priority === 'high' ? 10000 : 5000;
    setTimeout(() => {
      removeToast(toastId);
    }, duration);
  };

  const removeToast = (toastId) => {
    setActiveToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const getToastIcon = (type, priority) => {
    if (priority === 'high' || type.includes('CRITICAL') || type.includes('EMERGENCY')) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else if (type.includes('ALERT') || type.includes('REJECTED')) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else if (type.includes('APPROVED') || type.includes('COMPLETED') || type.includes('FULFILLED')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getToastColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100';
    }
  };

  const handleToastClick = (notification) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    removeToast(`toast_${notification.id || notification.timestamp}`);
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            relative flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg backdrop-blur-sm
            transform transition-all duration-300 ease-in-out
            ${getToastColor(toast.notification.priority)}
            slide-in-right
          `}
          onClick={() => handleToastClick(toast.notification)}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {getToastIcon(toast.notification.type, toast.notification.priority)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {toast.notification.title}
            </p>
            <p className="text-sm opacity-90 mt-1">
              {toast.notification.message}
            </p>
            
            {toast.notification.actionRequired && (
              <p className="text-xs font-medium mt-2 underline">
                {toast.notification.actionText || 'Click to view'}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-black/20 rounded-b-lg animate-pulse" />
        </div>
      ))}

    </div>
  );
};

// Emergency notification banner
export const EmergencyBanner = () => {
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleEmergencyNotification = (notification) => {
      setEmergencyAlerts(prev => [
        ...prev.filter(alert => alert.id !== notification.id),
        {
          ...notification,
          timestamp: Date.now()
        }
      ]);

      // Auto remove after 30 seconds
      setTimeout(() => {
        setEmergencyAlerts(prev => prev.filter(alert => alert.id !== notification.id));
      }, 30000);
    };

    socket.on('emergency_notification', handleEmergencyNotification);

    return () => {
      socket.off('emergency_notification', handleEmergencyNotification);
    };
  }, [socket]);

  const dismissAlert = (alertId) => {
    setEmergencyAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  if (emergencyAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {emergencyAlerts.map((alert) => (
          <div key={alert.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 animate-pulse" />
              <div>
                <p className="font-semibold">{alert.title}</p>
                <p className="text-sm opacity-90">{alert.message}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {alert.actionUrl && (
                <button
                  onClick={() => window.location.href = alert.actionUrl}
                  className="px-4 py-2 bg-white text-red-600 rounded font-medium hover:bg-red-50 transition-colors"
                >
                  {alert.actionText || 'View Details'}
                </button>
              )}
              <button
                onClick={() => dismissAlert(alert.id)}
                className="p-1 hover:bg-red-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Connection status indicator
export const ConnectionStatus = () => {
  const { isConnected } = useSocket();

  // Don't show anything if not connected - this is normal for unauthenticated users
  return null;
};
