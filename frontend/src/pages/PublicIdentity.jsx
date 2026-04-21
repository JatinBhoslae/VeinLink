import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicApi from '../lib/publicApi';
import { 
    ShieldCheck, 
    Droplet, 
    BadgeCheck, 
    Trophy, 
    History, 
    Heart, 
    Zap,
    Loader2,
    Calendar,
    Clock,
    MapPin,
    Compass,
    Medal,
    Flame,
    TrendingUp,
    Activity,
    Building2,
    ChevronDown,
    ChevronUp,
    User
} from 'lucide-react';
import { format } from 'date-fns';

export const PublicIdentity = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedSection, setExpandedSection] = useState('');

    useEffect(() => {
        const fetchIdentity = async () => {
            try {
                const res = await publicApi.get(`/donor-profile/public-profile/${id}`);
                setData(res.data.data);
            } catch (err) {
                setError('Identity could not be verified. This donor profile may not exist.');
            } finally {
                setLoading(false);
            }
        };
        fetchIdentity();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="text-primary-600 animate-spin" size={48} />
            <p className="text-primary-500 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Loading Donor Profile...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-24 h-24 bg-rose-500/10 rounded-[2rem] flex items-center justify-center text-rose-500">
                <ShieldCheck size={48} />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Profile Not Found</h2>
            <p className="max-w-xs text-slate-400 font-medium">{error}</p>
            <button onClick={() => navigate('/')} className="px-10 py-4 bg-slate-900 text-white rounded-2xl border border-slate-800 font-black uppercase text-xs tracking-widest">Return Home</button>
        </div>
    );

    const stats = data.stats || {};
    const isEligible = data.eligibility?.isEligible;
    const daysWait = data.eligibility?.daysUntilEligible || 0;
    const cycleProgress = Math.round(((90 - daysWait) / 90) * 100);
    const donationHistory = data.donationHistory || [];
    const upcomingAppointments = data.upcomingAppointments || [];
    const badges = data.badges || [];
    const earnedBadges = badges.filter(b => b.earned);
    const unearnedBadges = badges.filter(b => !b.earned);

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? '' : section);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans selection:bg-primary-500/30">
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* ═══════════════════════════════════════════════ */}
                {/* Profile Header Card */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-primary-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2rem] bg-gradient-to-br from-rose-600 to-rose-800 flex flex-col items-center justify-center text-white shadow-2xl shadow-rose-600/30 border-4 border-slate-800/50">
                                <Droplet size={20} className="mb-0.5 opacity-50" />
                                <span className="text-3xl md:text-4xl font-black leading-none">{data.bloodGroup}</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-slate-900">
                                <BadgeCheck size={16} />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                <span className="text-emerald-500 font-black uppercase text-[8px] tracking-[0.15em] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Verified Donor
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none truncate">
                                {data.firstName} <span className="text-primary-500">{data.lastName}</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {data.gender && <span className="capitalize">{data.gender}</span>}
                                {data.city && <><span>•</span><span>{data.city}{data.state ? `, ${data.state}` : ''}</span></>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════ */}
                {/* Quick Stats Grid */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
                        <Heart size={18} className="text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-black text-white">{stats.totalDonations || 0}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Donations</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
                        <Activity size={18} className="text-emerald-500 mx-auto mb-2" />
                        <p className="text-2xl font-black text-white">{stats.livesSaved || 0}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lives Saved</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
                        <Flame size={18} className="text-amber-500 mx-auto mb-2" />
                        <p className="text-2xl font-black text-white">{stats.streak || 0}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Streak</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
                        <Zap size={18} className="text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-black text-white">{stats.rewardPoints || 0}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Points</p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════ */}
                {/* 90-Day Cooldown Cycle */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-5 flex items-center gap-2">
                        <Clock size={14} className="text-primary-500" />
                        90-Day Donation Cooldown
                    </h3>
                    
                    <div className="flex items-end justify-between mb-4">
                        <div>
                            <p className="text-2xl font-black text-white uppercase tracking-tighter">
                                {isEligible ? '✅ Eligible Now' : `${daysWait} Days Remaining`}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">
                                {isEligible 
                                    ? 'This donor is cleared for their next donation' 
                                    : 'Biological restoration in progress'
                                }
                            </p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${isEligible ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary-500/10 text-primary-500'}`}>
                            {cycleProgress}%
                        </div>
                    </div>

                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${isEligible ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-primary-600 to-rose-500'}`}
                            style={{ width: `${cycleProgress}%` }}
                        ></div>
                    </div>

                    {stats.lastDonationDate && (
                        <div className="flex justify-between mt-4 text-[10px] text-slate-500 font-bold">
                            <span>Last: {format(new Date(stats.lastDonationDate), 'dd MMM yyyy')}</span>
                            {stats.nextEligibleDate && (
                                <span>Next Eligible: {format(new Date(stats.nextEligibleDate), 'dd MMM yyyy')}</span>
                            )}
                        </div>
                    )}

                    {/* Eligibility checks */}
                    {data.eligibility?.checks?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
                            {data.eligibility.checks.slice(0, 4).map((check, idx) => (
                                <div key={idx} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center space-y-1">
                                    <span className="text-lg">{check.icon}</span>
                                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider truncate">{check.name}</p>
                                    <div className={`h-1 w-1 rounded-full mx-auto ${check.passed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════ */}
                {/* Badges & Rewards */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                    
                    <button 
                        onClick={() => toggleSection('badges')} 
                        className="w-full flex items-center justify-between mb-4"
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                            <Medal size={14} className="text-amber-500" />
                            Badges & Rewards ({earnedBadges.length}/{badges.length})
                        </h3>
                        {expandedSection === 'badges' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </button>

                    {/* Always show earned badges */}
                    {earnedBadges.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                            {earnedBadges.map((badge, idx) => (
                                <div key={idx} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center space-y-2 hover:scale-105 transition-transform">
                                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl shadow-xl">
                                        {badge.emoji}
                                    </div>
                                    <p className="text-[9px] font-black text-white uppercase tracking-tighter leading-tight">{badge.name}</p>
                                    {badge.earnedAt && (
                                        <p className="text-[8px] text-slate-500">{format(new Date(badge.earnedAt), 'MMM yyyy')}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No badges earned yet</p>
                        </div>
                    )}

                    {/* Expandable: Unearned badges with progress */}
                    {expandedSection === 'badges' && unearnedBadges.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Upcoming Milestones</p>
                            {unearnedBadges.map((badge, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/30 rounded-xl border border-slate-800/50">
                                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl opacity-40 grayscale">
                                        {badge.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-tight">{badge.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary-600/50 rounded-full" style={{ width: `${badge.progress}%` }}></div>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-600">{badge.remaining} more</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-5 pt-5 border-t border-slate-800/50 text-center">
                        <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em]">Service Impact</p>
                        <p className="text-xs text-slate-400 mt-1">This donor has helped save <strong className="text-white">{stats.livesSaved || 0} lives</strong> across <strong className="text-white">{stats.hospitalsHelped || 0}</strong> locations.</p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════ */}
                {/* Donation History */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-xl">
                    <button 
                        onClick={() => toggleSection('history')} 
                        className="w-full flex items-center justify-between mb-4"
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                            <History size={14} className="text-primary-500" />
                            Past Donations ({donationHistory.length})
                        </h3>
                        {expandedSection === 'history' ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </button>

                    {donationHistory.length === 0 ? (
                        <div className="py-8 text-center space-y-3">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                                <Compass size={28} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No donation records yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {donationHistory.slice(0, expandedSection === 'history' ? donationHistory.length : 3).map((donation, idx) => (
                                <div key={donation._id || idx} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 group hover:border-primary-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                            <BadgeCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">
                                                {donation.hospital || donation.camp || 'Blood Bank'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-500">
                                                {format(new Date(donation.date), 'dd MMM yyyy')}
                                                {donation.hospitalCity && ` • ${donation.hospitalCity}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black">
                                            +{donation.rewardPoints} pts
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {donationHistory.length > 3 && expandedSection !== 'history' && (
                                <button onClick={() => toggleSection('history')} className="w-full text-center py-2 text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-400 transition-colors">
                                    View All {donationHistory.length} Donations
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════ */}
                {/* Upcoming Appointments */}
                {/* ═══════════════════════════════════════════════ */}
                {upcomingAppointments.length > 0 && (
                    <div className="bg-slate-900 rounded-[2rem] p-6 border border-blue-500/20 shadow-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4 flex items-center gap-2">
                            <Calendar size={14} className="text-blue-500" />
                            Upcoming Appointments ({upcomingAppointments.length})
                        </h3>

                        <div className="space-y-3">
                            {upcomingAppointments.map((appt, idx) => (
                                <div key={appt._id || idx} className="flex items-center justify-between p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">
                                                {appt.hospital || appt.camp || 'Blood Bank'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-500">
                                                {format(new Date(appt.date), 'dd MMM yyyy, hh:mm a')}
                                                {appt.hospitalCity && ` • ${appt.hospitalCity}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                        appt.status === 'confirmed' 
                                            ? 'bg-emerald-500/10 text-emerald-500' 
                                            : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        {appt.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════ */}
                {/* Hospital Breakdown */}
                {/* ═══════════════════════════════════════════════ */}
                {data.hospitalBreakdown && Object.keys(data.hospitalBreakdown).length > 0 && (
                    <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4 flex items-center gap-2">
                            <Building2 size={14} className="text-violet-500" />
                            Donation Locations
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(data.hospitalBreakdown).map(([name, count], idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                    <div className="flex items-center gap-3">
                                        <MapPin size={14} className="text-violet-400 flex-shrink-0" />
                                        <span className="text-xs font-bold text-white truncate">{name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg">{count}x</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════ */}
                {/* Vein Link CTA */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-[2rem] p-6 text-white shadow-2xl shadow-rose-600/20 relative overflow-hidden">
                    <Droplet size={50} className="absolute -bottom-3 -right-3 opacity-20 rotate-12" />
                    <h4 className="text-lg font-black uppercase tracking-tight mb-1.5">Vein Link</h4>
                    <p className="text-xs font-bold opacity-80 leading-relaxed mb-4">This is a verified donor profile on the Vein Link blood donation network. Every donation saves up to 3 lives.</p>
                    <button 
                        onClick={() => navigate('/user/signup')}
                        className="w-full py-3 bg-white text-rose-600 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Become a Donor
                    </button>
                </div>

                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.4em] text-center pt-4 pb-8">
                    Vein Link • Verified Donor Identity
                </p>
            </div>
        </div>
    );
};
