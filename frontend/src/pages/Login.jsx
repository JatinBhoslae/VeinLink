import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Droplet, Moon, Sun, Activity } from 'lucide-react';
import Spline from '@splinetool/react-spline';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { login } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        // Error is already shown by toast in AuthContext
        console.error('Login failed:', result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/forgot-password', { email: resetEmail || email });

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
      await api.post('/auth/reset-password', {
        email: resetEmail || email,
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
      {/* 3D Model Background - Now in back */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Spline scene="https://prod.spline.design/H3KNk3yz8XLS22If/scene.splinecode" />
      </div>

      {/* Overlay Gradient (very subtle, so spline stays visible) */}
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

      {/* Content - In front */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/60 mb-4 shadow-lg backdrop-blur-sm">
              <Droplet className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white/90 mb-2">Vien Link</h1>
            <p className="text-gray-300/70">Blood Bank Management System</p>
          </div>

          <div className="rounded-xl bg-transparent backdrop-blur-xl border border-white/10 shadow-xl p-6">
            <CardHeader className="text-center">
              <CardTitle className="text-white/80">Sign in to your account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-transparent border border-white/10 text-white/85 placeholder-gray-300/70"
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-transparent border border-white/10 text-white/85 placeholder-gray-300/70"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-primary-200 hover:text-primary-100 underline"
                    onClick={() => setShowReset(true)}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary-600/40 hover:bg-primary-700/50 backdrop-blur-md text-white/90 border border-white/5"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-300/80 space-y-1">
                <p>
                  Don't have a hospital account?{' '}
                  <Link
                    to="/register"
                    className="text-primary-300/80 hover:text-primary-200/80 font-medium"
                  >
                    Register your hospital
                  </Link>
                </p>
                <p>
                  Want to donate or request blood as an individual?{' '}
                  <Link
                    to="/user/signup"
                    className="text-secondary-300/80 hover:text-secondary-200/80 font-medium"
                  >
                    Register as Donor
                  </Link>
                </p>
              </div>

              {/* AI ICU Telemetry Monitoring */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <a
                  href="https://ai-icu.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block w-full p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-400/20 hover:border-cyan-400/40 hover:from-cyan-500/20 hover:to-emerald-500/20 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-black/50 animate-pulse" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                        AI ICU Telemetry Monitoring
                      </p>
                      <p className="text-[11px] text-gray-400 group-hover:text-gray-300 transition-colors">
                        Real-time AI-powered patient monitoring system →
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </CardContent>
          </div>

          {showReset && (
            <div className="mt-4 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-white/80 text-sm">
                  {resetStep === 1 ? 'Reset password - send code' : 'Reset password - verify code'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resetStep === 1 ? (
                  <form onSubmit={handleRequestResetCode} className="space-y-3">
                    <Input
                      label="Email"
                      type="email"
                      value={resetEmail || email}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="bg-transparent border border-white/10 text-white/85 placeholder-gray-300/70"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/30 text-white/80"
                        onClick={() => {
                          setShowReset(false);
                          setResetStep(1);
                          setResetEmail('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary-600/60 hover:bg-primary-700/70 text-white/90 border border-white/10"
                      >
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
                      className="bg-transparent border border-white/10 text-white/85 placeholder-gray-300/70"
                    />
                    <Input
                      label="New password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-transparent border border-white/10 text-white/85 placeholder-gray-300/70"
                    />
                    <div className="flex justify-between items-center gap-2">
                      <button
                        type="button"
                        className="text-xs text-primary-200 hover:text-primary-100 underline"
                        onClick={() => setResetStep(1)}
                      >
                        Back
                      </button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/30 text-white/80"
                          onClick={() => {
                            setShowReset(false);
                            setResetStep(1);
                            setResetEmail('');
                            setResetCode('');
                            setNewPassword('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-primary-600/60 hover:bg-primary-700/70 text-white/90 border border-white/10"
                        >
                          Reset password
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </CardContent>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

