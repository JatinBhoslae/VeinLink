import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Lock, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const UpdatePassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: enter old password, 2: verify code, 3: success
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    
    if (!formData.oldPassword) {
      toast.error('Please enter your current password');
      return;
    }

    setLoading(true);

    try {
      // Verify old password and get verification code
      const response = await api.post('/auth/verify-old-password', {
        email: user.email,
        oldPassword: formData.oldPassword,
      });

      const { verificationCode } = response.data;
      
      toast.success(`Verification code: ${verificationCode}`);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeAndUpdatePassword = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/update-password-with-verification', {
        email: user.email,
        verificationCode: formData.verificationCode,
        newPassword: formData.newPassword,
      });

      toast.success('Password updated successfully');
      setStep(3);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    
    try {
      const response = await api.post('/auth/resend-verification-code', {
        email: user.email,
      });
      
      const { verificationCode } = response.data;
      toast.success(`New verification code: ${verificationCode}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={20} />
          Back to Profile
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Shield size={24} />
            Update Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={handleSendVerificationCode} className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                To update your password, first verify your current password. A verification code will be generated and shown to you.
              </div>

              <Input
                label="Current Password"
                name="oldPassword"
                type="password"
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                icon={<Lock size={16} />}
                required
              />

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The verification code will be displayed on screen (no email required for development).
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Verification Code'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCodeAndUpdatePassword} className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter the verification code that was displayed and set your new password.
              </div>

              <div className="relative">
                <Input
                  label="Verification Code"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  placeholder="Enter 6-digit code"
                  icon={<Shield size={16} />}
                  required
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="absolute right-2 top-8 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {loading ? 'Resending...' : 'Generate New Code'}
                </button>
              </div>

              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                icon={<Lock size={16} />}
                required
              />

              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                icon={<Lock size={16} />}
                required
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Password Updated Successfully!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your password has been updated. You will be redirected to the dashboard shortly.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
};
