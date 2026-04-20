import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicAuth } from '../context/PublicAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import publicApi from '../lib/publicApi';

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

export const UserLogin = () => {
  const { login } = usePublicAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // DOM Reparenting for Global Translator Widget
    const gtElement = document.getElementById('google_translate_element');
    const container = document.getElementById('nav_translate_container_login');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Signed in successfully');
      navigate('/user/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    try {
      const response = await publicApi.post('/public-auth/forgot-password', { email: resetEmail || form.email });
      
      if (response.data.verificationCode) {
        toast.success(`Verification code: ${response.data.verificationCode}`);
      } else {
        toast.success('Verification code generated');
      }
      
      setResetStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate verification code');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await publicApi.post('/public-auth/reset-password', {
        email: resetEmail || form.email,
        code: resetCode,
        newPassword,
      });
      toast.success('Password reset successfully. You can now sign in.');
      setShowReset(false);
      setResetStep(1);
      setResetEmail('');
      setResetCode('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Language Selector HUD container */}
      <div className="fixed top-4 right-4 z-50">
        <div id="nav_translate_container_login" className="h-10 flex items-center scale-90"></div>
      </div>
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/20 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl p-8 text-white">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">Public User Sign In</h1>
            <p className="text-gray-200 mt-1 text-sm">
              Sign in to request blood, book donations, and view your rewards.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-primary-300 hover:underline"
                onClick={() => setShowReset(true)}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full bg-primary-600/80 hover:bg-primary-700/90" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-gray-200 mt-2">
              New here?{' '}
              <Link to="/user/signup" className="text-primary-300 font-medium">
                Create a public account
              </Link>
            </p>
          </form>

        {showReset && (
          <div className="mt-6 border-t border-white/20 pt-4">
            <h2 className="text-sm font-semibold text-white mb-2">
              {resetStep === 1 ? 'Reset password - send code' : 'Reset password - verify code'}
            </h2>
            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-3">
                <Input
                  label="Email"
                  type="email"
                  value={resetEmail || form.email}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReset(false);
                      setResetStep(1);
                      setResetEmail('');
                    }}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-primary-600/80 hover:bg-primary-700/90">
                    Send code
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <Input
                  label="Verification code"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
                />
                <Input
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-transparent border-white/40 text-white placeholder-gray-200/70"
                />
                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary-300 hover:underline"
                    onClick={() => setResetStep(1)}
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReset(false);
                        setResetStep(1);
                        setResetEmail('');
                        setResetCode('');
                        setNewPassword('');
                      }}
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="bg-primary-600/80 hover:bg-primary-700/90">
                      Reset password
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
