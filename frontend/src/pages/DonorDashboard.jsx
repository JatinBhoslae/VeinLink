import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { usePublicAuth } from '../context/PublicAuthContext';
import publicApi from '../lib/publicApi';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    Heart,
    Droplet,
    History,
    Loader2,
    ShieldCheck,
    ShieldX,
    AlertCircle,
    TrendingUp,
    MapPin,
    Zap,
    Calendar,
    Award,
    Flame,
    User,
    QrCode,
    X,
    FileText,
    Verified,
    BadgeCheck,
    Activity,
    Download,
    Lock,
    Clock,
    Phone
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useSocket } from '../utils/socket';
import { DonorLayout } from '../components/Layout/DonorLayout';

export const DonorDashboard = () => {
    const { user, updateUser } = usePublicAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { searchQuery } = useSearch();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [isEditing, setIsEditing] = useState(false);
    const [generatingCert, setGeneratingCert] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [eligibility, setEligibility] = useState({ isEligible: true, daysRemaining: 0 });
    const [prefForm, setPrefForm] = useState({ email: true, sms: false, push: true });
    const [activeMission, setActiveMission] = useState(null);
    const [showMissionModal, setShowMissionModal] = useState(false);

    const handleMissionResponse = async (action) => {
        if (!activeMission) return;
        
        const loadingToast = toast.loading(`${action === 'Accept' ? 'Authorizing Deployment...' : 'De-escalating Mission...'}`);
        try {
            const res = await publicApi.post(`/emergency-broadcast/${activeMission.requestId}/respond`, {
                donorId: user.id || user._id,
                action
            });
            
            if (res.data.success) {
                toast.success(action === 'Accept' ? '🛰️ [DEPLOYMENT AUTHORIZED] Mission coordinates secured.' : 'Signal de-escalated.', { id: loadingToast });
                if (action === 'Accept') {
                    console.log('✅ [MISSION] Full API response:', JSON.stringify(res.data.data, null, 2));
                    console.log('✅ [MISSION] Patient Details:', res.data.data.patientDetails);
                    console.log('✅ [MISSION] Donor Details:', res.data.data.donorDetails);
                    setActiveMission({ 
                        ...activeMission, 
                        status: 'Accepted', 
                        patientDetails: res.data.data.patientDetails,
                        donorDetails: res.data.data.donorDetails,
                    });
                } else {
                    setActiveMission(null);
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Signal failure', { id: loadingToast });
        }
    };

    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        bloodGroup: '',
        address: '',
        city: '',
        state: '',
        pinCode: '',
        gender: 'male',
        emergencyContactName: '',
        emergencyContactPhone: '',
        hasUnderlyingDisease: false,
        diseaseDetails: '',
        onMedication: false,
        medicationDetails: '',
        latitude: '',
        longitude: ''
    });

    const fetchDashboard = async () => {
        try {
            const res = await publicApi.get('/donor-profile/dashboard');
            setData(res.data.data);
            if (user) {
                setProfileForm({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    phone: user.phone || '',
                    email: user.email || '',
                    bloodGroup: user.bloodGroup || '',
                    address: user.address || '',
                    city: user.city || '',
                    state: user.state || '',
                    pinCode: user.pinCode || '',
                    gender: user.gender || 'male',
                    emergencyContactName: user.emergencyContactName || '',
                    emergencyContactPhone: user.emergencyContactPhone || '',
                    hasUnderlyingDisease: user.hasUnderlyingDisease || false,
                    diseaseDetails: user.diseaseDetails || '',
                    onMedication: user.onMedication || false,
                    medicationDetails: user.medicationDetails || '',
                    latitude: user.location?.coordinates ? user.location.coordinates[1] : '',
                    longitude: user.location?.coordinates ? user.location.coordinates[0] : '',
                    preferences: user.preferences || { email: true, sms: false, push: true, liveTracking: false }
                });
                setPrefForm(user.preferences || { email: true, sms: false, push: true, liveTracking: false });
            }

            // Pulse check for eligibility
            const eligRes = await publicApi.post('/notifications/check-eligibility');
            if (eligRes.data.success) {
                setEligibility(eligRes.data.data);
            }
        } catch (err) {
            toast.error('Mission data link failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [user]);

    useEffect(() => {
        if (socket) {
            console.log('📡 [DASHBOARD] Tactical socket link established');
            socket.on('emergency_broadcast_alert', (data) => {
                console.log('🚨 [DASHBOARD] EMERGENCY BROADCAST RECEIVED:', data);
                setActiveMission(data);
                setShowMissionModal(true);
                toast((t) => (
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Activity className="text-red-600 animate-pulse" />
                        </div>
                        <div>
                            <p className="font-bold text-red-600 uppercase text-[10px] tracking-widest">Critical Alert</p>
                            <p className="text-xs font-medium">{data.bloodGroup} deployment required nearby.</p>
                        </div>
                        <button 
                            onClick={() => {
                                handleTabChange('overview');
                                toast.dismiss(t.id);
                            }}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest"
                        >
                            VIEW
                        </button>
                    </div>
                ), { duration: 15000, position: 'top-right' });
            });

            // Listen for mission confirmation with full patient details
            socket.on('emergency_mission_confirmed', (data) => {
                console.log('✅ [DASHBOARD] Mission confirmed with full details:', data);
                setActiveMission(prev => prev ? {
                    ...prev,
                    status: 'Accepted',
                    patientDetails: data.patientDetails,
                    donorDetails: data.donorDetails,
                } : prev);
                toast.success('Mission confirmed! Patient details are now available.');
            });
            
            return () => {
                socket.off('emergency_broadcast_alert');
                socket.off('emergency_mission_confirmed');
            };
        }
    }, [socket]);

    useEffect(() => {
        const tab = searchParams.get('tab') || 'overview';
        if (tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        console.log('📡 [DASHBOARD-SYNC] Dispatching Manifest:', profileForm);
        try {
            const res = await publicApi.put('/public-auth/profile', profileForm);
            if (res.data.success) {
                toast.success('Identity Sync Complete');
                const updatedUser = res.data.user;
                updateUser(updatedUser);
                setIsEditing(false);
                handleTabChange('overview');
            }
        } catch (err) {
            console.error('❌ [DASHBOARD-SYNC-FAILED]:', err);
            toast.error(err.response?.data?.message || 'Reconfig failed');
        }
    };

    const handlePrefUpdate = async (field, value) => {
        try {
            const newPrefs = { ...prefForm, [field]: value };
            setPrefForm(newPrefs);
            const res = await publicApi.patch('/notifications/preferences', newPrefs);
            updateUser({ ...user, preferences: res.data.preferences });
            toast.success('Signal preferences updated');
            return true;
        } catch (err) {
            toast.error('Reconfig failed');
            return false;
        }
    };

    const downloadCertificate = async (donation) => {
        setGeneratingCert(donation._id);
        toast.loading('Exporting Medal...', { id: 'cert' });
        try {
            const el = document.getElementById(`certificate-${donation._id}`);
            const canvas = await html2canvas(el, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'px', [800, 600]);
            pdf.addImage(imgData, 'PNG', 0, 0, 800, 600);
            pdf.save(`VienLink_Honor_${donation._id}.pdf`);
            toast.success('Medal Exported', { id: 'cert' });
        } catch (err) {
            toast.error('Export failed', { id: 'cert' });
        } finally {
            setGeneratingCert(null);
        }
    };

    const downloadQR = async () => {
        const qrElement = document.getElementById('donor-qr-container');
        if (!qrElement) return;
        
        try {
            const canvas = await html2canvas(qrElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `VienLink_ID_${user?.firstName || 'Operative'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Identity Signature Downloaded');
        } catch (error) {
            toast.error('Export failed');
        }
    };

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="text-primary-600 animate-spin" size={48} />
                    <p className="text-primary-500 font-black uppercase text-xs tracking-widest animate-pulse">Syncing Mission Intel...</p>
                </div>
            </div>
        );
    }

    return (
        <DonorLayout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Header Profile Section */}
                        <div className="bg-slate-900 p-8 md:p-12 rounded-[3.5rem] relative overflow-hidden group border border-slate-800 shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            
                            <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-12">
                                <div className="flex-shrink-0 bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative group-hover:scale-105 transition-transform duration-500 self-center">
                                    <Droplet size={80} className="text-primary-600 animate-pulse" />
                                    <div className="absolute -top-3 -right-3 bg-primary-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-black border-4 border-slate-900 uppercase text-lg shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                        {user?.bloodGroup}
                                    </div>
                                </div>
                                
                                <div className="flex-1 w-full text-center lg:text-left flex flex-col justify-center space-y-6">
                                    <div className="space-y-1 mt-2">
                                        <div className="inline-block bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-full px-4 py-1.5 mb-3">
                                            <p className="text-primary-500 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                                                Tactical Status: Operational
                                            </p>
                                        </div>
                                        <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                                            {user?.firstName} <span className="text-primary-600">{user?.lastName}</span>
                                        </h2>
                                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.5em] mt-2">VienLink Verified Personnel</p>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                                        <div className="flex items-center gap-3 bg-slate-800/80 px-6 py-3 rounded-2xl border border-slate-700 shadow-xl">
                                            <ShieldCheck size={20} className="text-emerald-500" />
                                            <span className="text-xs font-black text-white uppercase tracking-widest">{user?.city}, {user?.state}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleTabChange('profile')}
                                            className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-700 px-6 py-3 rounded-2xl text-white transition-all shadow-lg hover:scale-105 border border-slate-700"
                                        >
                                            <User size={20} />
                                            <span className="text-xs font-black uppercase tracking-widest">Edit Profile</span>
                                        </button>
                                        <button 
                                            onClick={() => setShowQRModal(true)}
                                            className="flex items-center gap-3 bg-primary-600 hover:bg-primary-700 px-6 py-3 rounded-2xl text-white transition-all shadow-lg hover:scale-105"
                                        >
                                            <QrCode size={20} />
                                            <span className="text-xs font-black uppercase tracking-widest">Digital ID</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Mission Roadmap - Strategic Recovery Timeline */}
                        <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Operational Recovery Roadmap</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">90-Day Tactical Regeneration Cycle</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${eligibility?.isEligible ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${eligibility?.isEligible ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                        {eligibility?.isEligible ? 'Deployment Authorized' : 'Regeneration Phase'}
                                    </div>
                                    {!eligibility?.isEligible && (
                                        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                            {eligibility?.daysRemaining} Cycles Remaining
                                        </div>
                                    )}
                                    {/* Simulation Control (Testing Only) */}
                                    <button 
                                        onClick={async () => {
                                            const customDays = window.prompt("Enter days to warp (Simulation):", "30");
                                            if (customDays === null) return;
                                            
                                            const days = parseInt(customDays) || 30;
                                            try {
                                                const res = await publicApi.post('/donor-profile/test-warp', { days });
                                                if (res.data.success) {
                                                    toast.success(`Temporal Warp: -${days} Days. Refreshing Intel...`);
                                                    fetchDashboard();
                                                }
                                            } catch (err) {
                                                toast.error('Warp drive failed');
                                            }
                                        }}
                                        className="w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all group"
                                        title="Simulate +30 Days (Fast Forward)"
                                    >
                                        <Clock size={16} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative pt-12 pb-8 px-4">
                                {/* Connectivity Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700 -translate-y-1/2"></div>
                                <div 
                                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary-600 to-primary-400 -translate-y-1/2 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                    style={{ width: `${eligibility?.isEligible ? 100 : Math.max(5, (90 - (eligibility?.daysRemaining || 0)) / 90 * 100)}%` }}
                                ></div>

                                <div className="relative flex justify-between items-center z-10">
                                    {/* Milestone 1: Last Mission */}
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 border-4 border-primary-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                            <History size={20} className="text-primary-600" />
                                        </div>
                                        <div className="absolute top-full mt-4 text-center">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Initial Pulse</p>
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase mt-1">
                                                {eligibility?.lastDonationDate ? format(new Date(eligibility.lastDonationDate), 'dd MMM yy') : 'Pending'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Milestone 2: Transition (Mid Point) */}
                                    <div className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${!eligibility?.isEligible ? 'bg-primary-100 border-2 border-primary-300' : 'bg-emerald-100 border-2 border-emerald-300'}`}>
                                            <Activity size={18} className={!eligibility?.isEligible ? 'text-primary-600' : 'text-emerald-600'} />
                                        </div>
                                        <div className="absolute top-full mt-4 text-center hidden md:block">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Bio-Regen</p>
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase mt-1">45 Day Mark</p>
                                        </div>
                                    </div>

                                    {/* Milestone 3: Next window */}
                                    <div className="flex flex-col items-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all ${eligibility?.isEligible ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            <Zap size={24} />
                                        </div>
                                        <div className="absolute top-full mt-4 text-center">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Target Window</p>
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase mt-1">
                                                {eligibility?.nextEligibleDate ? format(new Date(eligibility.nextEligibleDate), 'dd MMM yy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Missions', value: data?.stats?.totalDonations || 0, icon: History, color: 'text-primary-500', bg: 'bg-primary-500/5' },
                                { label: 'Lives Saved', value: data?.stats?.livesSaved || 0, icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                                { label: 'Honor Points', value: data?.stats?.rewardPoints || 0, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                                { label: 'Streak Status', value: (data?.stats?.streakDays || 0) + ' Days', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/5' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                    <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} -mr-8 -mt-8 rounded-full blur-2xl group-hover:blur-xl transition-all`}></div>
                                    <stat.icon className={`${stat.color} mb-4 relative z-10`} size={32} />
                                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter relative z-10">{stat.value}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Mission Intelligence */}
                            <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group min-h-[400px]">
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary-600/10 to-transparent"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="space-y-1">
                                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Sector Intelligence</h3>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-Time Demand Analysis</p>
                                        </div>
                                        <TrendingUp className="text-primary-500" size={32} />
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
                                        <div className="w-full max-w-md space-y-4">
                                            {['O+', 'B+', 'AB-'].map(type => (
                                                <div key={type} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-primary-600/20 text-primary-500 rounded-xl flex items-center justify-center font-black">{type}</div>
                                                        <span className="text-sm font-bold text-white uppercase tracking-wider">Tactical Need</span>
                                                    </div>
                                                    <span className="text-xs font-black text-primary-500 uppercase tracking-widest">Critical Alert</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={() => navigate('/live-map')} className="mt-4 w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 hover:text-primary-700 transition-colors">
                                        Expand Demand Radar →
                                    </button>
                                </div>
                            </div>

                            {/* Eligibility Countdown Widget */}
                            <div className="space-y-6">
                                {!eligibility.isEligible && (
                                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                                            <Calendar size={80} />
                                        </div>
                                        <div className="relative z-10 space-y-4">
                                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1 inline-block">
                                                <p className="text-[10px] font-black uppercase tracking-widest">Recovery Protocol</p>
                                            </div>
                                            <h3 className="text-4xl font-black uppercase tracking-tighter leading-tight">Next Mission<br/>In <span className="text-primary-400">{eligibility.daysRemaining} Days</span></h3>
                                            <p className="text-xs font-medium text-indigo-100/80">Your vitals are currently in the recovery phase. Re-calibration complete on {eligibility.nextEligibleDate && format(new Date(eligibility.nextEligibleDate), 'MMM dd')}.</p>
                                        </div>
                                    </div>
                                )}

                                {activeMission ? (
                                    <div className={`p-8 rounded-[3rem] border shadow-2xl transition-all duration-500 animate-in zoom-in-95 ${activeMission.status === 'Accepted' ? 'bg-emerald-950 border-emerald-500/50' : 'bg-red-950 border-red-500/50'}`}>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${activeMission.status === 'Accepted' ? 'bg-emerald-500' : 'bg-red-600 animate-pulse'} text-white`}>
                                                    <Activity size={24} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-black uppercase text-sm tracking-tight text-white">{activeMission.status === 'Accepted' ? 'Mission Authorized' : 'Critical Briefing'}</h4>
                                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-relaxed">Emergency Sector Mobilization</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                                                <span className="text-xl font-black text-white">{activeMission.bloodGroup}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/40">
                                                    <span>Target Operative:</span>
                                                    <span className="text-white">{activeMission.patientName || 'Anonymous'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/40">
                                                    <span>Sector Distance:</span>
                                                    <span className="text-primary-400">{activeMission.distanceKm || '?'} KM</span>
                                                </div>
                                            </div>

                                            {activeMission.status === 'Accepted' ? (
                                                <div className="space-y-4 pt-4 border-t border-white/10 animate-in slide-in-from-top-4">
                                                    <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 space-y-4">
                                                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] mb-2">Patient Details</p>
                                                        
                                                        {/* Name */}
                                                        <div className="flex justify-between text-xs text-white/40">
                                                            <span className="font-black uppercase tracking-widest">Name:</span>
                                                            <span className="text-white font-bold">{activeMission.patientDetails?.name || activeMission.patientName || 'Anonymous'}</span>
                                                        </div>

                                                        {/* Phone */}
                                                        {activeMission.patientDetails?.phone && (
                                                            <div className="flex justify-between text-xs text-white/40">
                                                                <span className="font-black uppercase tracking-widest">Phone:</span>
                                                                <a href={`tel:${activeMission.patientDetails.phone}`} className="text-emerald-400 font-bold hover:underline">
                                                                    {activeMission.patientDetails.phone}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {/* Email */}
                                                        {activeMission.patientDetails?.email && (
                                                            <div className="flex justify-between text-xs text-white/40">
                                                                <span className="font-black uppercase tracking-widest">Email:</span>
                                                                <a href={`mailto:${activeMission.patientDetails.email}`} className="text-emerald-400 font-bold hover:underline">
                                                                    {activeMission.patientDetails.email}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {/* Blood Group */}
                                                        <div className="flex justify-between text-xs text-white/40">
                                                            <span className="font-black uppercase tracking-widest">Blood Group:</span>
                                                            <span className="text-red-400 font-black text-sm">{activeMission.patientDetails?.bloodGroup || activeMission.bloodGroup}</span>
                                                        </div>

                                                        {/* Gender */}
                                                        {activeMission.patientDetails?.gender && (
                                                            <div className="flex justify-between text-xs text-white/40">
                                                                <span className="font-black uppercase tracking-widest">Gender:</span>
                                                                <span className="text-white font-bold capitalize">{activeMission.patientDetails.gender}</span>
                                                            </div>
                                                        )}

                                                        {/* Location */}
                                                        {(activeMission.patientDetails?.city || activeMission.patientDetails?.state) && (
                                                            <div className="flex justify-between text-xs text-white/40">
                                                                <span className="font-black uppercase tracking-widest">Area:</span>
                                                                <span className="text-white font-bold">{[activeMission.patientDetails.city, activeMission.patientDetails.state].filter(Boolean).join(', ')}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <button 
                                                        onClick={() => {
                                                            const loc = activeMission.patientDetails?.location;
                                                            if (loc?.coordinates) {
                                                                const [lng, lat] = loc.coordinates;
                                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                                                            } else {
                                                                toast.error('Sector coordinates unavailable');
                                                            }
                                                        }}
                                                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
                                                    >
                                                        <MapPin size={16} />
                                                        Navigate to Patient
                                                    </button>

                                                    {activeMission.patientDetails?.phone && (
                                                        <button 
                                                            onClick={() => window.open(`tel:${activeMission.patientDetails.phone}`)}
                                                            className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all border border-white/10"
                                                        >
                                                            <Phone size={16} />
                                                            Call Patient
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-4 pt-4">
                                                    <Button 
                                                        onClick={() => handleMissionResponse('Accept')}
                                                        className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                                                    >
                                                        Authorize
                                                    </Button>
                                                    <button 
                                                        onClick={() => handleMissionResponse('Reject')}
                                                        className="px-6 h-14 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all duration-500">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-2xl">
                                                <AlertCircle className="text-primary-600" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-black uppercase text-sm tracking-tight">Rapid Response</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Extraction</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">System scan reveals urgent O-Negative requirement in neighboring sector.</p>
                                        <Button onClick={() => navigate('/user/emergency')} className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">
                                            Initiate Deployment
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Medals & Honors Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-primary-600 text-white rounded-3xl shadow-xl shadow-primary-600/20">
                                        <Award size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter">Honor Medals</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achieved Recognition Milestones</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {data?.badges?.map((badge, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedBadge(badge)}
                                        className={`bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center group cursor-pointer transition-all hover:scale-105 hover:shadow-xl ${!badge.earned ? 'opacity-50' : ''}`}
                                    >
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-4 transition-all group-hover:scale-110 ${badge.earned ? 'bg-slate-900 dark:bg-slate-700 shadow-xl' : 'bg-slate-50 dark:bg-slate-900 grayscale'}`}>
                                            {badge.emoji}
                                        </div>
                                        <h4 className="font-black uppercase text-xs tracking-tight mb-1">{badge.name}</h4>
                                        <div className="h-1 w-12 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                            <div className="h-full bg-primary-600" style={{ width: `${badge.progress}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="space-y-2">
                             <h2 className="text-4xl font-black uppercase tracking-tighter">Personnel Dossier</h2>
                             <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Coordinate Identity & Medical Protocol</p>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-5">
                                 <User size={120} />
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                                 {/* Primary Intel */}
                                 <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                     <h3 className="text-sm font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                                         <span className="w-8 h-px bg-primary-600/30"></span> Personnel Identity
                                     </h3>
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">First Name</label>
                                             <input value={profileForm.firstName} onChange={e => setProfileForm({...profileForm, firstName: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Last Name</label>
                                             <input value={profileForm.lastName} onChange={e => setProfileForm({...profileForm, lastName: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Protocol Email (Primary)</label>
                                             <input value={profileForm.email} readOnly className="w-full h-14 bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed rounded-2xl px-6 text-sm text-slate-500 outline-none" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Primary Signal (Phone)</label>
                                             <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Gender Profiling</label>
                                             <select 
                                                value={profileForm.gender} 
                                                onChange={e => setProfileForm({...profileForm, gender: e.target.value})}
                                                className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                             >
                                                 <option value="male">Male</option>
                                                 <option value="female">Female</option>
                                                 <option value="other">Other</option>
                                             </select>
                                         </div>
                                         <div className="space-y-1">
                                             <div className="flex items-center justify-between ml-1">
                                                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Blood Registry</label>
                                                 <span className="text-[8px] font-black text-primary-500 uppercase flex items-center gap-1">
                                                     <ShieldCheck size={10} /> Protocol Locked
                                                 </span>
                                             </div>
                                             <div className="relative group">
                                                 <input 
                                                    value={profileForm.bloodGroup} 
                                                    readOnly 
                                                    className="w-full h-14 bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed rounded-2xl px-6 text-sm font-black text-slate-500 outline-none border border-slate-200 dark:border-slate-700" 
                                                 />
                                                 <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                                                     <Lock size={16} />
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Deployment Coordinates */}
                                 <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                     <h3 className="text-sm font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                                         <span className="w-8 h-px bg-primary-600/30"></span> Sector Coordinates
                                     </h3>
                                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                         <div className="md:col-span-2 space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Street Address</label>
                                             <input value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">City</label>
                                             <input value={profileForm.city} onChange={e => setProfileForm({...profileForm, city: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">State Origin</label>
                                             <input value={profileForm.state} onChange={e => setProfileForm({...profileForm, state: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">PIN Code</label>
                                             <input value={profileForm.pinCode} onChange={e => setProfileForm({...profileForm, pinCode: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                     </div>
                                 </div>

                                 {/* Emergency Extraction */}
                                 <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                     <h3 className="text-sm font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                                         <span className="w-8 h-px bg-primary-600/30"></span> Emergency Contact
                                     </h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kin Name</label>
                                             <input value={profileForm.emergencyContactName} onChange={e => setProfileForm({...profileForm, emergencyContactName: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Emergency Signal (Phone)</label>
                                             <input value={profileForm.emergencyContactPhone} onChange={e => setProfileForm({...profileForm, emergencyContactPhone: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                         </div>
                                     </div>
                                 </div>

                                 {/* Medical Protocol */}
                                 <div className="space-y-6 md:col-span-2 lg:col-span-3">
                                     <h3 className="text-sm font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                                         <span className="w-8 h-px bg-primary-600/30"></span> Medical Bio-Data
                                     </h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                         <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl space-y-4">
                                             <div className="flex items-center justify-between">
                                                 <span className="text-xs font-bold uppercase tracking-wider">Underlying Conditions</span>
                                                 <button 
                                                    type="button"
                                                    onClick={() => setProfileForm({...profileForm, hasUnderlyingDisease: !profileForm.hasUnderlyingDisease})}
                                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${profileForm.hasUnderlyingDisease ? 'bg-red-600' : 'bg-slate-300'}`}
                                                 >
                                                     <div className={`w-4 h-4 bg-white rounded-full transition-transform ${profileForm.hasUnderlyingDisease ? 'translate-x-6' : 'translate-x-0'}`} />
                                                 </button>
                                             </div>
                                             {profileForm.hasUnderlyingDisease && (
                                                 <textarea 
                                                    value={profileForm.diseaseDetails} 
                                                    onChange={e => setProfileForm({...profileForm, diseaseDetails: e.target.value})}
                                                    placeholder="Specify medical conditions..."
                                                    className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 text-xs min-h-[80px] outline-none"
                                                 />
                                             )}
                                         </div>

                                         <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl space-y-4">
                                             <div className="flex items-center justify-between">
                                                 <span className="text-xs font-bold uppercase tracking-wider">Active Medication</span>
                                                 <button 
                                                    type="button"
                                                    onClick={() => setProfileForm({...profileForm, onMedication: !profileForm.onMedication})}
                                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${profileForm.onMedication ? 'bg-red-600' : 'bg-slate-300'}`}
                                                 >
                                                     <div className={`w-4 h-4 bg-white rounded-full transition-transform ${profileForm.onMedication ? 'translate-x-6' : 'translate-x-0'}`} />
                                                 </button>
                                             </div>
                                             {profileForm.onMedication && (
                                                 <textarea 
                                                    value={profileForm.medicationDetails} 
                                                    onChange={e => setProfileForm({...profileForm, medicationDetails: e.target.value})}
                                                    placeholder="Specify medications..."
                                                    className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 text-xs min-h-[80px] outline-none"
                                                 />
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Tactical Location Stream Authorization */}
                             <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-tight">Tactical Location Stream</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Authorize continuous signal tracking for emergency triangulation</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={async () => {
                                            const currentVal = profileForm.preferences?.liveTracking || false;
                                            const newVal = !currentVal;
                                            
                                            if (newVal) {
                                                if (!navigator.geolocation) {
                                                    toast.error('📡 [SIGNAL ERROR] Terminal does not support tracking.');
                                                    return;
                                                }
                                                
                                                toast.loading('Synchronizing Satellite Link...', { id: 'prof-gps' });
                                                navigator.geolocation.getCurrentPosition(
                                                    async () => {
                                                        const success = await handlePrefUpdate('liveTracking', true);
                                                        if (success) {
                                                            setProfileForm(prev => ({
                                                                ...prev,
                                                                preferences: { ...prev.preferences, liveTracking: true }
                                                            }));
                                                            toast.success('🛰️ [SIGNAL ACTIVE] Geospatial link secured.', { id: 'prof-gps' });
                                                        } else {
                                                            toast.error('❌ [SYNC FAILED] Handshake aborted.', { id: 'prof-gps' });
                                                        }
                                                    },
                                                    (err) => {
                                                        console.error('GPS Denied:', err);
                                                        const msg = err.code === 1 ? 'Permission Denied' : 'Signal Timeout';
                                                        toast.error(`❌ [SIGNAL FAILURE] ${msg}. check terminal settings.`, { id: 'prof-gps' });
                                                    },
                                                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                                                );
                                            } else {
                                                const success = await handlePrefUpdate('liveTracking', false);
                                                if (success) {
                                                    setProfileForm(prev => ({
                                                        ...prev,
                                                        preferences: { ...prev.preferences, liveTracking: false }
                                                    }));
                                                }
                                            }
                                        }}
                                        className={`w-20 h-10 rounded-full p-1.5 transition-all duration-300 relative ${profileForm.preferences?.liveTracking ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-7 h-7 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${profileForm.preferences?.liveTracking ? 'translate-x-10' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                {profileForm.preferences?.liveTracking && (
                                    <div className="flex items-center gap-3 px-4 py-2 bg-primary-600/10 rounded-2xl animate-in fade-in zoom-in-95">
                                        <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-ping" />
                                        <span className="text-[10px] font-black uppercase text-primary-600 tracking-widest">Active Mission-Readiness Signal Authorized</span>
                                    </div>
                                )}
                             </div>

                             <div className="mt-12 flex gap-4 relative z-10">
                                <Button type="submit" className="flex-1 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary-600/20">Initialize Sync</Button>
                             </div>
                        </form>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Mission Log</h2>
                        {data?.donationHistory?.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {data.donationHistory.filter(d => {
                                    if (!searchQuery) return true;
                                    const term = searchQuery.toLowerCase();
                                    return (
                                        d.hospital?.toLowerCase().includes(term) ||
                                        d.status?.toLowerCase().includes(term)
                                    );
                                }).map((d, i) => (
                                    <div key={d._id} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700">#{data.donationHistory.length - i}</div>
                                            <div>
                                                <h3 className="text-xl font-bold uppercase">{d.hospital}</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(d.date), 'MMMM dd, yyyy')}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => downloadCertificate(d)} className="px-10 py-4 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-lg">Extract Record</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-16 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                                <History size={48} className="mx-auto text-slate-200 dark:text-slate-600 mb-6" />
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">No Records Found</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting your first mission deployment.</p>
                                <Button onClick={() => navigate('/user/appointments')} className="mt-8 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl px-10 h-14 font-black uppercase tracking-widest shadow-xl shadow-primary-600/20">
                                    Deploy Now
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black uppercase tracking-tighter">Tactical Signals</h2>
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Communication Preferences & Mission Alerts</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { id: 'email', title: 'Email Intelligence', desc: 'Detailed mission reports, eligibility pulse, and honor recognitions.', icon: FileText, color: 'text-blue-500' },
                                { id: 'sms', title: 'SMS Direct Link', desc: 'Secure text alerts for critical emergency extraction missions near your sector.', icon: Zap, color: 'text-amber-500' },
                                { id: 'push', title: 'Terminal Push', desc: 'Real-time UI notifications for immediate mission availability updates.', icon: Activity, color: 'text-emerald-500' },
                                { id: 'liveTracking', title: 'Satellite Tracking Signal', desc: 'Broadcast live coordinates to the rescue network for instant geospatial triangulation.', icon: MapPin, color: 'text-primary-500' }
                            ].map((chan) => (
                                <div key={chan.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-primary-500/20 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl group-hover:scale-110 transition-transform">
                                            <chan.icon className={chan.color} size={30} />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black uppercase text-lg tracking-tight">{chan.title}</h3>
                                            <p className="text-xs text-slate-400 font-medium max-w-xs">{chan.desc}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newValue = !prefForm[chan.id];
                                            
                                            // Handle special Satellite tracking handshake
                                            if (chan.id === 'liveTracking' && newValue) {
                                                if (!navigator.geolocation) {
                                                    toast.error('📡 [SIGNAL ERROR] Your terminal does not support geospatial tracking.');
                                                    return;
                                                }
                                                
                                                toast.loading('Engaging Satellite Handshake...', { id: 'gps-dash-sync' });
                                                navigator.geolocation.getCurrentPosition(
                                                    () => {
                                                        handlePrefUpdate('liveTracking', true);
                                                        toast.success('🛰️ [SIGNAL AUTHORIZED] Geospatial link secured.', { id: 'gps-dash-sync' });
                                                    },
                                                    (err) => {
                                                        console.error('GPS Denied:', err);
                                                        toast.error('❌ [AUTHORIZATION DENIED] Enable location access in your terminal settings.', { id: 'gps-dash-sync' });
                                                    }
                                                );
                                            } else {
                                                handlePrefUpdate(chan.id, newValue);
                                            }
                                        }}
                                        className={`w-20 h-10 rounded-full p-1.5 transition-all duration-300 relative ${prefForm[chan.id] ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-7 h-7 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${prefForm[chan.id] ? 'translate-x-10' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-10">
                               <ShieldCheck size={100} />
                           </div>
                           <div className="relative z-10 space-y-4">
                               <h4 className="text-white font-black uppercase text-xs tracking-[0.2em]">Privacy Protocol</h4>
                               <p className="text-slate-400 text-sm leading-relaxed max-w-md">VienLink prioritizes data sovereignty. Your contact signals are only used for mission-critical alerts and are never shared with non-authorized tactical hubs.</p>
                           </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden">
                 {data?.donationHistory?.map(d => (
                    <div key={`cert-${d._id}`} id={`certificate-${d._id}`} className="w-[800px] h-[600px] bg-white p-20 border-[20px] border-primary-600/10 flex flex-col items-center justify-center text-black">
                        <Heart size={64} className="text-primary-600 mb-8" />
                        <h1 className="text-6xl font-black mb-4">VIENLINK</h1>
                        <h2 className="text-2xl font-bold uppercase tracking-widest mb-10">Record of Service</h2>
                        <p className="text-4xl font-black uppercase mb-10">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm font-bold uppercase">{d.hospital} | {format(new Date(d.date), 'dd.MM.yyyy')}</p>
                    </div>
                ))}
            </div>

            {showQRModal && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[3rem] p-10 border border-slate-200 dark:border-slate-700 shadow-2xl relative">
                        <button onClick={() => setShowQRModal(false)} className="absolute top-6 right-6 p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all">
                            <X size={24} />
                        </button>
                        <div className="text-center space-y-2 mb-8">
                            <h3 className="text-3xl font-black uppercase">VienLink ID</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Donor Profile QR</p>
                        </div>
                        <div id="donor-qr-container" className="bg-white p-6 rounded-[2.5rem] shadow-inner mb-2 flex items-center justify-center border border-slate-100">
                            <QRCode 
                                value={`${import.meta.env.VITE_APP_URL || window.location.origin}/v-id/${user?._id || user?.id}`}
                                size={200} 
                            />
                        </div>
                        <div className="flex flex-col items-center mb-6 gap-3">
                            <button 
                                onClick={downloadQR}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
                            >
                                <Download size={14} />
                                Download QR Code
                            </button>
                            
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center leading-tight max-w-[200px]">
                                Scan this QR to view full donor profile, donation history, and badges.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center font-black">{user?.bloodGroup}</div>
                                <p className="font-black uppercase text-sm truncate">{user?.firstName} {user?.lastName}</p>
                            </div>
                            <Button onClick={() => setShowQRModal(false)} className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase text-xs">Secure Hub</Button>
                        </div>
                    </div>
                </div>
            )}

            {selectedBadge && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3.5rem] p-10 border border-slate-200 dark:border-slate-700 shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button onClick={() => setSelectedBadge(null)} className="absolute top-8 right-8 p-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 rounded-full transition-all text-slate-400">
                            <X size={24} />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl ${selectedBadge.earned ? 'bg-slate-900 dark:bg-slate-700 shadow-primary-500/20' : 'bg-slate-100 dark:bg-slate-900 grayscale opacity-40'}`}>
                                {selectedBadge.emoji}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{selectedBadge.name}</h3>
                                <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em]">Honor Recognition Protocol</p>
                            </div>

                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">
                                {selectedBadge.description}
                            </p>

                            <div className="w-full space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-end px-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery Status</span>
                                    <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{selectedBadge.earned ? 'ACQUIRED' : `${selectedBadge.remaining} MORE MISSIONS`}</span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50 p-1">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-600 to-rose-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                        style={{ width: `${selectedBadge.progress}%` }}
                                    />
                                </div>
                            </div>

                            <Button onClick={() => setSelectedBadge(null)} className="w-full h-16 bg-slate-900 dark:bg-white dark:text-black text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl">
                                Secure Intel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* High-Intensity Mission Intercept Modal */}
            {showMissionModal && activeMission && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500"></div>
                    <div className="bg-slate-900 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[3.5rem] border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                        {/* Alert Bar */}
                        <div className={`${activeMission.status === 'Accepted' ? 'bg-emerald-600' : 'bg-red-600'} px-8 py-4 flex items-center justify-between sticky top-0 z-10`}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                                    {activeMission.status === 'Accepted' ? 'Mission Authorized — Contact Details' : 'Critical Mission Detected'}
                                </span>
                            </div>
                            <button onClick={() => { setShowMissionModal(false); if (activeMission.status === 'Accepted') setActiveMission(null); }} className="text-white hover:rotate-90 transition-transform">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            {activeMission.status === 'Accepted' ? (
                                <>
                                    <div className="text-center space-y-3">
                                        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <BadgeCheck className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Mission Accepted</h3>
                                        <p className="text-xs text-slate-400">Here are the patient's full contact details.</p>
                                    </div>

                                    <div className="bg-emerald-500/5 rounded-3xl border border-emerald-500/20 p-6 space-y-5">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Patient Details</p>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</span>
                                            <span className="text-sm font-bold text-white">{activeMission.patientDetails?.name || activeMission.patientName || 'N/A'}</span>
                                        </div>

                                        {(activeMission.patientDetails?.phone || activeMission.patientPhone) && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone</span>
                                                <a href={`tel:${activeMission.patientDetails?.phone || activeMission.patientPhone}`} className="text-sm font-bold text-emerald-400 hover:underline">
                                                    {activeMission.patientDetails?.phone || activeMission.patientPhone}
                                                </a>
                                            </div>
                                        )}

                                        {activeMission.patientDetails?.email && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</span>
                                                <a href={`mailto:${activeMission.patientDetails.email}`} className="text-sm font-bold text-emerald-400 hover:underline">
                                                    {activeMission.patientDetails.email}
                                                </a>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Blood Group</span>
                                            <span className="text-lg font-black text-red-500">{activeMission.patientDetails?.bloodGroup || activeMission.bloodGroup}</span>
                                        </div>

                                        {activeMission.patientDetails?.gender && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gender</span>
                                                <span className="text-sm font-bold text-white capitalize">{activeMission.patientDetails.gender}</span>
                                            </div>
                                        )}

                                        {(activeMission.patientDetails?.city || activeMission.patientDetails?.state) && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Area</span>
                                                <span className="text-sm font-bold text-white">{[activeMission.patientDetails.city, activeMission.patientDetails.state].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}

                                        {activeMission.patientDetails?.address && (
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">Address</span>
                                                <span className="text-xs font-bold text-white text-right ml-4 max-w-[250px]">{activeMission.patientDetails.address}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => {
                                                const loc = activeMission.patientDetails?.location;
                                                if (loc?.coordinates) {
                                                    const [lng, lat] = loc.coordinates;
                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                                                } else {
                                                    toast.error('Patient coordinates unavailable');
                                                }
                                            }}
                                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <MapPin size={18} />
                                            Navigate to Patient
                                        </button>

                                        {(activeMission.patientDetails?.phone || activeMission.patientPhone) && (
                                            <button 
                                                onClick={() => window.open(`tel:${activeMission.patientDetails?.phone || activeMission.patientPhone}`)}
                                                className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all border border-white/10"
                                            >
                                                <Phone size={18} />
                                                Call Patient
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => { setShowMissionModal(false); setActiveMission(null); }}
                                            className="w-full h-12 text-slate-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[9px] transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Emergency<br/><span className="text-red-500">Mobilization</span></h3>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector: {user?.city}, {user?.state}</p>
                                        </div>
                                        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                                            <span className="text-4xl font-black text-red-500">{activeMission.bloodGroup}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl">
                                                    <MapPin size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector Distance</p>
                                                    <p className="text-xl font-black text-white uppercase tracking-tight">{activeMission.distanceKm} KM</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</p>
                                                <p className="text-sm font-bold text-white mb-1 uppercase">{activeMission.patientName}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed bg-slate-800/30 p-4 rounded-2xl border border-slate-800 italic">
                                            "An emergency blood request for {activeMission.bloodGroup} has been detected near you. Accept to receive the patient's full contact details and navigation."
                                        </p>
                                        
                                        <div className="flex gap-4 pt-2">
                                            <Button 
                                                onClick={() => handleMissionResponse('Accept')}
                                                className="flex-1 h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/20"
                                            >
                                                Accept & View Details
                                            </Button>
                                            <button 
                                                onClick={() => {
                                                    handleMissionResponse('Reject');
                                                    setShowMissionModal(false);
                                                }}
                                                className="px-8 h-16 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DonorLayout>
    );
};

