import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Droplet,
  FileText,
  Calendar,
  UserCog,
  Building2,
  BarChart3,
  LogOut,
  Menu,
  X,
  ArrowRightLeft,
  Zap,
  ScanLine,
  Sun,
  Moon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/api';

const menuItems = {
  super_admin: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/hospitals', label: 'Hospitals', icon: Building2 },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/emergency-dashboard', label: 'Emergency Broadcast', icon: Zap },
  ],
  hospital_admin: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/donors', label: 'Donors', icon: Users },
    { path: '/blood-units', label: 'Blood Inventory', icon: Droplet },
    { path: '/blood-requests', label: 'Blood Requests', icon: FileText },
    { path: '/inter-hospital-requests', label: 'Inter-Hospital Requests', icon: ArrowRightLeft },
    { path: '/blood-camps', label: 'Blood Camps', icon: Calendar },
    { path: '/donation-slots', label: 'Donation Slots', icon: Calendar },
    { path: '/staff', label: 'Staff', icon: UserCog },
    { path: '/qr-scanner', label: 'Donor QR Scanner', icon: ScanLine },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/emergency-dashboard', label: 'Emergency Broadcast', icon: Zap },
  ],
  staff: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/donors', label: 'Donors', icon: Users },
    { path: '/blood-units', label: 'Blood Inventory', icon: Droplet },
    { path: '/blood-requests', label: 'Blood Requests', icon: FileText },
    { path: '/inter-hospital-requests', label: 'Inter-Hospital Requests', icon: ArrowRightLeft },
    { path: '/blood-camps', label: 'Blood Camps', icon: Calendar },
    { path: '/donation-slots', label: 'Donation Slots', icon: Calendar },
    { path: '/qr-scanner', label: 'Donor QR Scanner', icon: ScanLine },
    { path: '/emergency-dashboard', label: 'Emergency Broadcast', icon: Zap },
  ],
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingHospitalsCount, setPendingHospitalsCount] = useState(0);

  const items = menuItems[user?.role] || [];

  // Fetch pending hospitals count for super admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      const fetchPendingCount = async () => {
        try {
          const response = await api.get('/hospitals', {
            params: { isApproved: 'false' },
          });
          setPendingHospitalsCount(response.data.count || 0);
        } catch (error) {
          // Silently fail - don't break the sidebar
        }
      };
      fetchPendingCount();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} className="text-gray-900 dark:text-white" /> : <Menu size={24} className="text-gray-900 dark:text-white" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-all duration-300 z-40
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Vein Link
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Blood Bank Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showBadge = item.path === '/hospitals' && pendingHospitalsCount > 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center justify-between gap-3 px-4 py-3 rounded-lg
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </div>
                  {showBadge && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500 text-white">
                      {pendingHospitalsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-3 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>

              <button
                onClick={toggleDarkMode}
                className="p-3 text-gray-500 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-100 dark:border-gray-700"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

