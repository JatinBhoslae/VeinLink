import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicAuth } from '../context/PublicAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import toast from 'react-hot-toast';

// Beautiful animated background component
const AnimatedBackground = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 overflow-hidden">
    <div className="absolute inset-0 bg-black/20" />
    
    {/* Animated blood drops */}
    <div className="absolute top-10 left-10 w-4 h-4 bg-red-500 rounded-full opacity-60 animate-bounce" style={{ animationDuration: '2s' }} />
    <div className="absolute top-20 right-20 w-3 h-3 bg-red-400 rounded-full opacity-50 animate-bounce delay-300" style={{ animationDuration: '2.5s' }} />
    <div className="absolute bottom-20 left-20 w-5 h-5 bg-red-600 rounded-full opacity-70 animate-bounce delay-500" style={{ animationDuration: '1.8s' }} />
    
    {/* Floating medical symbols */}
    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
    <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" style={{ animationDuration: '5s' }} />
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-500" style={{ animationDuration: '3s' }} />
    
    {/* DNA helix animation */}
    <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-transparent via-red-500/30 to-transparent opacity-50 animate-spin" style={{ animationDuration: '20s' }} />
    
    {/* Pulse waves */}
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="w-96 h-96 border border-red-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
      <div className="absolute top-0 w-96 h-96 border border-blue-500/20 rounded-full animate-ping delay-1000" style={{ animationDuration: '3.5s' }} />
      <div className="absolute top-0 w-96 h-96 border border-purple-500/20 rounded-full animate-ping delay-2000" style={{ animationDuration: '4s' }} />
    </div>
    
    {/* Floating particles */}
    <div className="absolute top-10 left-1/3 w-2 h-2 bg-white rounded-full opacity-30 animate-pulse" style={{ animationDuration: '2s' }} />
    <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-white rounded-full opacity-40 animate-pulse delay-700" style={{ animationDuration: '2.5s' }} />
    <div className="absolute bottom-1/3 left-1/4 w-2 h-2 bg-white rounded-full opacity-30 animate-pulse delay-1200" style={{ animationDuration: '3s' }} />
    
    {/* Additional floating elements */}
    <div className="absolute top-1/4 right-1/3 w-6 h-6 bg-red-400/30 rounded-full animate-pulse delay-1500" style={{ animationDuration: '4s' }} />
    <div className="absolute bottom-1/3 right-1/3 w-4 h-4 bg-blue-400/30 rounded-full animate-pulse delay-800" style={{ animationDuration: '3.5s' }} />
    <div className="absolute top-3/4 left-1/3 w-5 h-5 bg-purple-400/30 rounded-full animate-pulse delay-1800" style={{ animationDuration: '4.5s' }} />
  </div>
);

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const UserSignup = () => {
  const { signup } = usePublicAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    bloodGroup: '',
    city: '',
    pinCode: '',
    hasUnderlyingDisease: false,
    diseaseDetails: '',
    onMedication: false,
    medicationDetails: '',
  });

  useEffect(() => {
    // DOM Reparenting for Global Translator Widget
    const gtElement = document.getElementById('google_translate_element');
    const container = document.getElementById('nav_translate_container_signup');
    if (gtElement && container) {
        container.appendChild(gtElement);
    }
    return () => {
        const wrapper = document.getElementById('google_translate_wrapper');
        if (wrapper && gtElement) wrapper.appendChild(gtElement);
    };
  }, []);



  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleBooleanChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      toast.success('Account created successfully');
      navigate('/user/dashboard');
    } catch (error) {
      console.error('Signup Error Details:', error.response?.data);
      const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Signup failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Language Selector HUD container */}
      <div className="fixed top-4 right-4 z-50">
        <div id="nav_translate_container_signup" className="h-10 flex items-center scale-90"></div>
      </div>
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/20 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl p-8 text-white">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">Join as a Donor / Recipient</h1>
            <p className="text-gray-200 mt-1 text-sm">
              Create a public account to request blood, book donations, and track your impact.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={form.firstName}
                onChange={handleChange('firstName')}
                required
                className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
              />
              <Input
                label="Last Name"
                value={form.lastName}
                onChange={handleChange('lastName')}
                required
                className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
              className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              required
              className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
            />

            <Input
              label="Mobile Number"
              value={form.phone}
              onChange={handleChange('phone')}
              required
              className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Blood Group (optional)"
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                options={[
                  { value: '', label: 'Select group' },
                  ...bloodGroups.map((bg) => ({ value: bg, label: bg })),
                ]}
              />
              <Input
                label="City"
                value={form.city}
                onChange={handleChange('city')}
                className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
              />
              <Input
                label="PIN Code"
                value={form.pinCode}
                onChange={handleChange('pinCode')}
                className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-200">
                Do you have any underlying disease (e.g. heart disease, diabetes, chronic illness)?
              </p>
              <div className="flex gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => handleBooleanChange('hasUnderlyingDisease', false)}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    !form.hasUnderlyingDisease
                      ? 'bg-green-200/80 border-green-500 text-green-900'
                      : 'border-white/40 text-gray-100'
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleBooleanChange('hasUnderlyingDisease', true)}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    form.hasUnderlyingDisease
                      ? 'bg-red-200/80 border-red-500 text-red-900'
                      : 'border-white/40 text-gray-100'
                  }`}
                >
                  Yes
                </button>
              </div>
              {form.hasUnderlyingDisease && (
                <Input
                  label="Please mention your condition"
                  value={form.diseaseDetails}
                  onChange={handleChange('diseaseDetails')}
                  required
                  className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
                />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-200">
                Are you currently on any regular medication?
              </p>
              <div className="flex gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => handleBooleanChange('onMedication', false)}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    !form.onMedication
                      ? 'bg-green-200/80 border-green-500 text-green-900'
                      : 'border-white/40 text-gray-100'
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleBooleanChange('onMedication', true)}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    form.onMedication
                      ? 'bg-red-200/80 border-red-500 text-red-900'
                      : 'border-white/40 text-gray-100'
                  }`}
                >
                  Yes
                </button>
              </div>
              {form.onMedication && (
                <Input
                  label="Please mention your medication"
                  value={form.medicationDetails}
                  onChange={handleChange('medicationDetails')}
                  required
                  className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
                />
              )}
            </div>

            <p className="text-[11px] text-gray-200/80">
              Your answers help hospitals decide if you are currently eligible to donate blood. They are kept
              confidential.
            </p>

            <Button
              type="submit"
              className="w-full bg-primary-600/80 hover:bg-primary-700/90"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-gray-200 mt-2">
              Already have a public account?{' '}
              <Link to="/user/login" className="text-primary-300 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserSignup;
