import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicAuth } from '../context/PublicAuthContext';
import publicApi from '../lib/publicApi';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { DonorLayout } from '../components/Layout/DonorLayout';
import { User, ShieldCheck, Lock, Settings, MapPin } from 'lucide-react';

export const UserProfile = () => {
  const { user, logout, updateUser } = usePublicAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await publicApi.get('/public-auth/me');
        const user = res.data.user;
        setProfile({
          ...user,
          state: user.state || '',
          gender: user.gender || 'male',
        });
      } catch (error) {
        toast.error('Failed to load profile');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field) => (e) => {
    setProfile({ ...profile, [field]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const body = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        pinCode: profile.pinCode,
        gender: profile.gender,
        preferences: profile.preferences,
      };

      console.log('📡 [MISSION-SYNC] Dispatching Manifest:', body);

      const res = await publicApi.put('/public-auth/profile', body);
      const updatedUser = res.data.user || profile;
      
      setProfile({
        ...updatedUser,
        state: updatedUser.state || '',
        gender: updatedUser.gender || 'male',
      });
      updateUser(updatedUser);
      toast.success('Identity Dossier Updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await publicApi.put('/public-auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Security Credentials Reset');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DonorLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-3xl text-white shadow-xl">
                    <User size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Security Profile</h1>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Manage Mission Identity & Access</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
                <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Settings className="text-primary-600" />
                            Personnel Metadata
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Given Name"
                                    value={profile.firstName || ''}
                                    onChange={handleChange('firstName')}
                                    className="rounded-2xl h-14"
                                    required
                                />
                                <Input
                                    label="Surname"
                                    value={profile.lastName || ''}
                                    onChange={handleChange('lastName')}
                                    className="rounded-2xl h-14"
                                    required
                                />
                            </div>
                            <Input
                                label="Primary Signal (Email)"
                                type="email"
                                value={profile.email || ''}
                                onChange={handleChange('email')}
                                className="rounded-2xl h-14"
                                required
                            />
                            <Input
                                label="Comms Frequency (Phone)"
                                value={profile.phone || ''}
                                onChange={handleChange('phone')}
                                className="rounded-2xl h-14"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Mission City"
                                    value={profile.city || ''}
                                    onChange={handleChange('city')}
                                    placeholder="Enter city..."
                                    className="rounded-2xl h-14"
                                />
                                <Input
                                    label="Operational State"
                                    value={profile.state || ''}
                                    onChange={handleChange('state')}
                                    placeholder="Enter state..."
                                    className="rounded-2xl h-14"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Postal Grid (PIN)"
                                    value={profile.pinCode || ''}
                                    onChange={handleChange('pinCode')}
                                    placeholder="Enter PIN..."
                                    className="rounded-2xl h-14"
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Biological Classification (Gender)</label>
                                    <select
                                        value={profile.gender || 'male'}
                                        onChange={handleChange('gender')}
                                        className="w-full rounded-2xl h-14 px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold appearance-none transition-all focus:ring-2 focus:ring-primary-600/20"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tracking Authorization Section */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                                            <Navigation size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-tight">Tactical Location Stream</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Always share live location for emergency readiness</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={profile.preferences?.liveTracking || false}
                                            onChange={async (e) => {
                                                const checked = e.target.checked;
                                                const updatePrefs = async (val) => {
                                                    try {
                                                        const newPrefs = { ...profile.preferences, liveTracking: val };
                                                        await publicApi.put('/public-auth/profile', { preferences: newPrefs });
                                                        setProfile(prev => ({ ...prev, preferences: newPrefs }));
                                                        updateUser({ ...profile, preferences: newPrefs });
                                                        return true;
                                                    } catch (err) {
                                                        return false;
                                                    }
                                                };

                                                if (checked) {
                                                    // Tactical Permission Handshake
                                                    if (!navigator.geolocation) {
                                                        toast.error('📡 [SIGNAL ERROR] Your terminal does not support geospatial tracking.');
                                                        return;
                                                    }
                                                    
                                                    toast.loading('Engaging Satellite Handshake...', { id: 'gps-sync' });
                                                    navigator.geolocation.getCurrentPosition(
                                                        async () => {
                                                            const success = await updatePrefs(true);
                                                            if (success) {
                                                                toast.success('🛰️ [SIGNAL AUTHORIZED] Geospatial link secured & persisted.', { id: 'gps-sync' });
                                                            } else {
                                                                toast.error('❌ [SYNC FAILED] Handshake aborted.', { id: 'gps-sync' });
                                                            }
                                                        },
                                                        (err) => {
                                                            console.error('GPS Denied:', err);
                                                            const msg = err.code === 1 ? 'Permission Denied' : 'Signal Timeout';
                                                            toast.error(`❌ [SIGNAL FAILURE] ${msg}. check terminal settings.`, { id: 'gps-sync' });
                                                        },
                                                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                                                    );
                                                } else {
                                                    const success = await updatePrefs(false);
                                                    if (success) {
                                                        toast.success('Signal Transceiver Deactivated');
                                                    }
                                                }
                                            }}
                                        />
                                        <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                                
                                {profile.preferences?.liveTracking && (
                                    <div className="flex items-center gap-3 px-4 py-2 bg-primary-600/10 rounded-2xl animate-in fade-in zoom-in-95">
                                        <div className="w-2 h-2 bg-primary-600 rounded-full animate-ping" />
                                        <span className="text-[10px] font-black uppercase text-primary-600 tracking-widest">Live Mission-Readiness Signal Authorized</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={saving} className="rounded-2xl h-14 px-10 bg-primary-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-600/20">
                                    {saving ? 'Syncing...' : 'Update Personnel File'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar Security */}
            <div className="space-y-8">
                <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-700">
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Lock className="text-primary-600" />
                            Access Reset
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <Input
                                label="Current Key"
                                type="password"
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                className="rounded-2xl h-12"
                                required
                            />
                            <Input
                                label="New Mission Key"
                                type="password"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                className="rounded-2xl h-12"
                                required
                            />
                            <Input
                                label="Confirm Key"
                                type="password"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                className="rounded-2xl h-12"
                                required
                            />
                            <Button type="submit" variant="outline" disabled={pwSaving} className="w-full rounded-2xl h-14 font-black uppercase text-xs tracking-widest mt-4">
                                {pwSaving ? 'Engaging...' : 'Reset Access Key'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="p-8 bg-primary-600 rounded-[2.5rem] text-white shadow-xl shadow-primary-600/20 space-y-4 relative overflow-hidden group">
                     <ShieldCheck size={120} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                     <h3 className="text-lg font-black uppercase tracking-tight">Verified Sector</h3>
                     <p className="text-xs font-medium text-primary-100 leading-relaxed">Your identity has been synchronized across the global health network for mission readiness.</p>
                </div>
            </div>
        </div>
      </div>
    </DonorLayout>
  );
};
