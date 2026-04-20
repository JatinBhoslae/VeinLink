import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Droplet, Moon, Sun, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import Spline from '@splinetool/react-spline';

export const Register = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    hospitalName: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    },
    latitude: '',
    longitude: '',
    licenseNumber: '',
  });

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setLoading(false);
        toast.success('Precise GPS Location Captured!');
      },
      (error) => {
        setLoading(false);
        toast.error('Unable to fetch location. Please enter coordinates manually.');
      }
    );
  };

  const [certificateFile, setCertificateFile] = useState(null);

  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    if (window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('hospitalName', formData.hospitalName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('licenseNumber', formData.licenseNumber);
      
      // Add address fields
      if (formData.address.street) formDataToSend.append('address.street', formData.address.street);
      if (formData.address.city) formDataToSend.append('address.city', formData.address.city);
      if (formData.address.state) formDataToSend.append('address.state', formData.address.state);
      if (formData.address.zipCode) formDataToSend.append('address.zipCode', formData.address.zipCode);
      if (formData.address.country) formDataToSend.append('address.country', formData.address.country);
      
      // Add navigation coordinates
      if (formData.latitude) formDataToSend.append('latitude', formData.latitude);
      if (formData.longitude) formDataToSend.append('longitude', formData.longitude);
      
      // Add certificate file if selected
      if (certificateFile) {
        formDataToSend.append('certificate', certificateFile);
      }

      const response = await api.post('/hospitals/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Store token and user
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        toast.success('Hospital registered successfully! Waiting for approval.');
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Model Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Spline scene="https://prod.spline.design/H3KNk3yz8XLS22If/scene.splinecode" />
      </div>

      {/* Overlay Gradient (subtle to keep spline visible) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/5 to-transparent z-10"></div>

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
          className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg hover:bg-white/20 transition-colors"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          type="button"
        >
          {darkMode ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-white" size={20} />}
        </button>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/80 mb-4 shadow-lg backdrop-blur-sm">
              <Droplet className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Register Your Hospital</h1>
            <p className="text-gray-200">Join Vien Link to manage your blood bank efficiently</p>
          </div>

          <div className="rounded-xl bg-transparent backdrop-blur-xl border border-white/10 shadow-xl p-6">
            <CardHeader>
              <CardTitle className="text-white/85">Hospital Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Hospital Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-white/20 pb-2">
                    Hospital Information
                  </h3>
                <Input
                  label="Hospital Name"
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  placeholder="Enter hospital name"
                  required
                />
                <Input
                  label="License Number (Optional)"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="Enter license number"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hospital Certificate (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setCertificateFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        hover:file:bg-primary-100
                        cursor-pointer"
                    />
                  </div>
                  {certificateFile && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Selected: {certificateFile.name}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Upload hospital certificate or registration document (PDF, DOC, DOCX, JPG, PNG - Max 5MB)
                  </p>
                </div>
              </div>

                {/* Admin Information */}
                <div className="space-y-4 pt-4 border-t border-white/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-white/20 pb-2">
                    Administrator Information
                  </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@hospital.com"
                  required
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                  required
                />
              </div>

                {/* Password */}
                <div className="space-y-4 pt-4 border-t border-white/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-white/20 pb-2">
                    Account Security
                  </h3>
                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  required
                />
              </div>

                {/* Address */}
                <div className="space-y-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between border-b border-white/20 pb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Hospital Address
                    </h3>
                    <span className="text-xs text-primary-300 bg-primary-900/30 px-2 py-1 rounded">Required for Emergency Mapping</span>
                  </div>
                <Input
                  label="Street Address"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  required
                />
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="City"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    required
                  />
                  <Input
                    label="State"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    required
                  />
                  <Input
                    label="ZIP Code"
                    value={formData.address.zipCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zipCode: e.target.value },
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* GPS Location */}
              <div className="space-y-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Emergency Navigation Data
                  </h3>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="secondary"
                    onClick={fetchLocation}
                    className="h-8 text-xs gap-1"
                  >
                    <MapPin size={14} />
                    Fetch Precise GPS
                  </Button>
                </div>
                <p className="text-xs text-gray-300/80">
                  Capturing your coordinates ensures donors can navigate directly to your hospital during a Panic Mode broadcast.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g. 19.1458"
                    required
                  />
                  <Input
                    label="Longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g. 72.9928"
                    required
                  />
                </div>
              </div>

                <div className="bg-blue-50/90 dark:bg-blue-900/40 border border-blue-200/80 dark:border-blue-500/60 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-800 dark:text-blue-100">
                    <strong>Note:</strong> Your hospital registration will be reviewed by our team.
                    You'll be notified once your account is approved.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Link to="/">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Hospital'}
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-300/80 pt-4 border-t border-white/10">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-300/80 hover:text-primary-200/90 font-medium">
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
};

