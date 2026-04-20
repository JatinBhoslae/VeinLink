import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import publicApi from '../lib/publicApi';
import { Button } from '../components/ui/Button';
import Spline from '@splinetool/react-spline';
import {
  Droplet,
  Users,
  FileText,
  Calendar,
  QrCode,
  BarChart3,
  Shield,
  Zap,
  MapPin,
  CheckCircle,
  ArrowRight,
  Activity,
  Database,
  Moon,
  Sun,
  Heart
} from 'lucide-react';

export const Landing = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [impactStats, setImpactStats] = useState({
    totalDonations: 0,
    livesSaved: 0,
    activeDonors: 0,
    emergencyRequestsSolved: 100
  });

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const res = await publicApi.get('/v-stats/public-impact');
        if (res.data.success) {
          setImpactStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load impact stats:", err);
      }
    };
    fetchImpact();
    
    // Tactical Language HUD Sync
    if (window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Donor Management',
      description: 'Comprehensive donor database with eligibility tracking and donation history.',
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      icon: Droplet,
      title: 'Blood Inventory',
      description: 'Real-time inventory tracking with QR code integration for complete traceability.',
      color: 'text-danger-600',
      bgColor: 'bg-danger-50',
    },
    {
      icon: QrCode,
      title: 'QR Code Tracking',
      description: 'Every blood bag has a unique QR code with full movement history and test results.',
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50',
    },
    {
      icon: FileText,
      title: 'Blood Requests',
      description: 'Streamlined request system with approval workflow and automatic stock matching.',
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      icon: Calendar,
      title: 'Blood Camps',
      description: 'Organize and manage donation camps with time-slot booking and real-time analytics.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: BarChart3,
      title: 'AI Stock Prediction',
      description: 'Predict low stock scenarios using historical data and machine learning algorithms.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: MapPin,
      title: 'Smart Donor Matching',
      description: 'Find nearest eligible donors automatically when stock levels are low.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Secure multi-role system with Super Admin, Hospital Admin, and Staff roles.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  const benefits = [
    'Real-time inventory tracking',
    'Automated expiry alerts',
    'Complete audit trail',
    'Mobile-responsive design',
    'Cloud-based infrastructure',
    '24/7 system availability',
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Controls HUD */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        {/* Language selector */}
        <div id="google_translate_element" className="h-10 flex items-center scale-90"></div>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDarkMode();
          }}
          className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          type="button"
        >
          {darkMode ? <Sun className="text-yellow-500 dark:text-yellow-400" size={20} /> : <Moon className="text-gray-700 dark:text-gray-300" size={20} />}
        </button>
      </div>
      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-screen flex items-center justify-center">
        {/* 3D Model Background */}
        <div className="absolute inset-0 w-full h-full">
          <Spline scene="https://prod.spline.design/qdbsDTX9cHj2NG-L/scene.splinecode" />
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-600 mb-6 shadow-lg">
              <Droplet className="text-white" size={40} />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
              Vien Link
            </h1>
            <p className="text-2xl md:text-3xl mb-4 font-light" style={{ color: '#F1F5F9' }}>
              Blood Bank Management System
            </p>
            <p className="text-lg mb-10 max-w-xl" style={{ color: '#E2E8F0' }}>
              A comprehensive cloud-based solution for managing blood banks, donors, inventory,
              and donation camps with cutting-edge technology.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-4">
                  Register Hospital
                  <ArrowRight size={20} />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Hospital Sign In
                </Button>
              </Link>
              <Link to="/live-map">
                <Button
                  size="lg"
                  className="text-lg px-8 py-4 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white border-0"
                >
                  <MapPin className="mr-2" size={20} />
                  Live Blood Map
                </Button>
              </Link>
              <Link to="/user/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-4 bg-white/5 border-white/40 text-white hover:bg-white/15"
                >
                  Register as User
                </Button>
              </Link>
              <Link to="/user/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-4 bg-white/0 border-white/30 text-white/80 hover:bg-white/10"
                >
                  Login as User
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Life-Saving Impact Tracker Section */}
      <div className="bg-red-50 dark:bg-red-900/10 py-16 border-y border-red-100 dark:border-red-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">Platform Impact</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Live statistics on how our community is saving lives.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border px-4 flex flex-col items-center justify-center text-center">
              <Droplet className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1">{impactStats.totalDonations}</p>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Donations</p>
            </div>
            <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6 rounded-2xl shadow-md border-red-500 px-4 flex flex-col items-center justify-center text-center transform hover:-translate-y-1 transition duration-300">
              <Heart className="w-10 h-10 text-white mb-3" />
              <p className="text-4xl font-extrabold text-white mb-1">{impactStats.livesSaved}</p>
              <p className="text-sm font-semibold text-red-100 uppercase tracking-wide">Est. Lives Saved</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border px-4 flex flex-col items-center justify-center text-center">
              <Users className="w-10 h-10 text-primary-500 mb-3" />
              <p className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1">{impactStats.activeDonors}</p>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Donors</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border px-4 flex flex-col items-center justify-center text-center">
              <Activity className="w-10 h-10 text-green-500 mb-3" />
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{impactStats.emergencyRequestsSolved}%</p>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Emergencies Solved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to manage your blood bank efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all duration-300"
              >
                <div className={`${feature.bgColor} dark:opacity-80 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={feature.color} size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Benefits */}
      <div className="bg-gray-50 dark:bg-gray-800 py-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose Vien Link?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Built with modern technology and best practices, Vien Link provides a seamless
                experience for managing blood banks efficiently.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center">
                      <CheckCircle className="text-secondary-600" size={16} />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative h-96 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <iframe
                src="https://my.spline.design/juicebag-FMs8Su2CZt6x3NslWvhcewm5/"
                frameBorder="0"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 mb-6">
              <Droplet className="text-white" size={32} />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to Transform Your Blood Bank Management?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join hospitals, donors and recipients already using Vien Link to streamline their operations and save lives.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700">
                  Register Your Hospital
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link to="/user/signup">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-primary-400 text-primary-700 dark:text-primary-300 hover:bg-primary-50/40 dark:hover:bg-primary-900/30">
                  Register as User
                </Button>
              </Link>
              <Link to="/user/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-primary-200 text-primary-700 dark:text-primary-200 hover:bg-primary-50/30 dark:hover:bg-primary-900/20">
                  Login as User
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Hospital Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 dark:text-gray-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Droplet className="text-primary-500" size={24} />
              <span className="text-xl font-bold text-white">Vien Link</span>
            </div>
            <p className="mb-4">Blood Bank Management System</p>
            <p className="text-sm">© 2025 Vien Link. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

