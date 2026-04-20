import { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, Mail, Smartphone, Monitor, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    // Notification types
    bloodRequestUpdates: true,
    lowStockAlerts: true,
    emergencyBroadcasts: true,
    transferRequests: true,
    campUpdates: false,
    donorRegistrations: false,
    systemMaintenance: true,
    
    // Delivery methods
    inAppNotifications: true,
    browserNotifications: false,
    emailNotifications: false,
    
    // Sound settings
    notificationSound: true,
    
    // Priority filters
    showLowPriority: true,
    showMediumPriority: true,
    showHighPriority: true
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
    checkBrowserNotificationPermission();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/preferences');
      if (response.data.data) {
        setPreferences(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Use default preferences if API fails
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await api.put('/notifications/preferences', preferences);
      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const checkBrowserNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPreferences(prev => ({ ...prev, browserNotifications: true }));
      }
    }
  };

  const requestBrowserNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, browserNotifications: true }));
        toast.success('Browser notifications enabled');
      } else {
        setPreferences(prev => ({ ...prev, browserNotifications: false }));
        toast.error('Browser notifications denied');
      }
    } else {
      toast.error('Browser notifications not supported');
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setPreferences({
      bloodRequestUpdates: true,
      lowStockAlerts: true,
      emergencyBroadcasts: true,
      transferRequests: true,
      campUpdates: false,
      donorRegistrations: false,
      systemMaintenance: true,
      inAppNotifications: true,
      browserNotifications: false,
      emailNotifications: false,
      notificationSound: true,
      showLowPriority: true,
      showMediumPriority: true,
      showHighPriority: true
    });
    toast.success('Reset to default preferences');
  };

  const testNotification = async () => {
    try {
      await api.post('/notifications/test', {
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification to verify your settings are working correctly.'
      });
      toast.success('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notification Settings
        </h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={testNotification}
          >
            Test Notification
          </Button>
          <Button
            onClick={savePreferences}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'bloodRequestUpdates', label: 'Blood Request Updates', description: 'Get notified when blood requests are approved, rejected, or fulfilled' },
            { key: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Receive alerts when blood inventory is running low' },
            { key: 'emergencyBroadcasts', label: 'Emergency Broadcasts', description: 'Critical emergency notifications and alerts' },
            { key: 'transferRequests', label: 'Transfer Requests', description: 'Notifications about inter-hospital blood transfer requests' },
            { key: 'campUpdates', label: 'Blood Camp Updates', description: 'Updates about blood donation camps and events' },
            { key: 'donorRegistrations', label: 'New Donor Registrations', description: 'Get notified when new donors register (Hospital Admin only)' },
            { key: 'systemMaintenance', label: 'System Maintenance', description: 'Important system updates and maintenance notifications' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <div className="flex-1">
                <label className="font-medium text-gray-900 dark:text-white">
                  {label}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </div>

      {/* Delivery Methods */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Smartphone className="w-5 h-5" />
            Delivery Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                In-App Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Show notifications directly in the application interface
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.inAppNotifications}
                onChange={(e) => handlePreferenceChange('inAppNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <BellRing className="w-4 h-4" />
                Browser Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Receive notifications even when the app is in the background
              </p>
            </div>
            <div className="flex items-center gap-3">
              {preferences.browserNotifications ? (
                <span className="text-xs text-green-600 dark:text-green-400">Enabled</span>
              ) : (
                <Button
                  size="sm"
                  onClick={requestBrowserNotificationPermission}
                >
                  Enable
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Receive important notifications via email (Coming soon)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer opacity-50">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                className="sr-only peer"
                disabled
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </div>

      {/* Sound Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {preferences.notificationSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            Sound Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <label className="font-medium text-gray-900 dark:text-white">
                Notification Sound
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Play sound for incoming notifications
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notificationSound}
                onChange={(e) => handlePreferenceChange('notificationSound', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </div>

      {/* Priority Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            Priority Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'showHighPriority', label: 'High Priority', color: 'text-red-600 dark:text-red-400' },
            { key: 'showMediumPriority', label: 'Medium Priority', color: 'text-yellow-600 dark:text-yellow-400' },
            { key: 'showLowPriority', label: 'Low Priority', color: 'text-blue-600 dark:text-blue-400' }
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <div className="flex-1">
                <label className={`font-medium text-gray-900 dark:text-white ${color}`}>
                  {label} Notifications
                </label>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </div>

      {/* Reset Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={resetToDefaults}
        >
          Reset to Default Settings
        </Button>
      </div>
    </div>
  );
};
