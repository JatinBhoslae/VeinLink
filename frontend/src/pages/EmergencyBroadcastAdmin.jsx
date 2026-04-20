import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
    AlertTriangle,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    Radio,
    Zap,
    BarChart3,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    User,
    Phone,
    Timer,
    TrendingUp,
    Search,
    MapPin,
    Calendar,
} from 'lucide-react';

const bloodGroups = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const statusFilters = ['', 'Active', 'Accepted', 'Expired', 'Cancelled'];

export const EmergencyBroadcastAdmin = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterBloodGroup, setFilterBloodGroup] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [respondingDonor, setRespondingDonor] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterBloodGroup) params.append('bloodGroup', filterBloodGroup);
            params.append('page', page);
            params.append('limit', 15);

            const res = await api.get(`/emergency-broadcast/admin/all?${params.toString()}`);
            setRequests(res.data.data || []);
            setStats(res.data.stats || null);
            setPagination(res.data.pagination || null);
        } catch (err) {
            toast.error('Failed to load emergency requests');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterBloodGroup, page]);

    useEffect(() => {
        fetchData();
        // Poll every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleDonorResponse = async (requestId, donorId, action) => {
        try {
            setRespondingDonor(donorId);
            const res = await api.post(`/emergency-broadcast/${requestId}/respond`, {
                donorId,
                action,
            });
            toast.success(res.data.message);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to respond');
        } finally {
            setRespondingDonor(null);
        }
    };

    const formatDuration = (ms) => {
        if (!ms) return '--';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (minutes < 60) return `${minutes}m ${secs}s`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Active': return <Activity className="w-4 h-4 text-amber-500 animate-pulse" />;
            case 'Accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'Expired': return <Clock className="w-4 h-4 text-gray-400" />;
            case 'Cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return null;
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Active': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700';
            case 'Accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700';
            case 'Expired': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600';
            case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700';
            default: return '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Broadcast Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Monitor and manage emergency blood requests in real-time
                        </p>
                    </div>
                </div>
                <Button onClick={fetchData} variant="outline" className="hidden md:flex items-center gap-2" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Response Command Radar & Stats */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 md:p-8 border border-white/10 shadow-2xl">
                {/* Tactical Radar Background Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-20">
                    <div className="absolute inset-0 border border-red-500/30 rounded-full animate-[ping_3s_linear_infinite]" />
                    <div className="absolute inset-[100px] border border-red-500/20 rounded-full animate-[ping_4s_linear_infinite]" />
                    <div className="absolute inset-[200px] border border-red-500/10 rounded-full animate-[ping_5s_linear_infinite]" />
                </div>

                <div className="relative z-10 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl group hover:border-amber-500/50 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <Activity className="w-5 h-5 text-amber-500 group-hover:animate-pulse" />
                                <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest">Active</span>
                            </div>
                            <p className="text-4xl font-black text-white tracking-tighter">{stats?.active || '0'}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Live Crisis Feed</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl group hover:border-green-500/50 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-[10px] font-black text-green-500/50 uppercase tracking-widest">Resolved</span>
                            </div>
                            <p className="text-4xl font-black text-white tracking-tighter">{stats?.accepted || '0'}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Donors Secured</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl group hover:border-blue-500/50 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest">Reach</span>
                            </div>
                            <p className="text-4xl font-black text-white tracking-tighter">{stats?.totalDonorsNotified || '0'}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Alerts Dispatched</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl group hover:border-purple-500/50 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                                <span className="text-[10px] font-black text-purple-500/50 uppercase tracking-widest">History</span>
                            </div>
                            <p className="text-4xl font-black text-white tracking-tighter">{stats?.total || '0'}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Total Missions</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl group hover:border-rose-500/50 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <Timer className="w-5 h-5 text-rose-500" />
                                <span className="text-[10px] font-black text-rose-500/50 uppercase tracking-widest">Velocity</span>
                            </div>
                            <p className="text-3xl font-black text-white tracking-tighter">{formatDuration(stats?.avgTimeTakenMs)}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Avg Response</p>
                        </div>
                    </div>

                    {/* Response Rate Intelligence */}
                    {stats && stats.totalDonorsNotified > 0 && (
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Network Response Analytics</span>
                                </div>
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 uppercase">Real-Time Data</span>
                            </div>
                            <div className="flex h-3 rounded-full overflow-hidden bg-white/5 gap-0.5">
                                <div
                                    className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000"
                                    style={{ width: `${(stats.totalAccepted / stats.totalDonorsNotified) * 100}%` }}
                                />
                                <div
                                    className="bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000"
                                    style={{ width: `${(stats.totalRejected / stats.totalDonorsNotified) * 100}%` }}
                                />
                                <div
                                    className="bg-amber-500/50 transition-all duration-1000"
                                    style={{
                                        width: `${((stats.totalDonorsNotified - stats.totalAccepted - stats.totalRejected) / stats.totalDonorsNotified) * 100}%`,
                                    }}
                                />
                            </div>
                            <div className="flex gap-6 mt-4 justify-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Accepted: {stats.totalAccepted}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Rejected: {stats.totalRejected}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Pending: {stats.totalDonorsNotified - stats.totalAccepted - stats.totalRejected}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tactical intelligence Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                        <Search className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-white uppercase tracking-wider">Mission Intelligence</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Filter tactical data stream</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                        options={statusFilters.map((s) => ({ value: s, label: s || 'All Statuses' }))}
                        className="!mb-0 bg-white/5 border-white/10 text-xs font-bold uppercase tracking-tight h-10 min-w-[140px]"
                    />
                    <Select
                        value={filterBloodGroup}
                        onChange={(e) => { setFilterBloodGroup(e.target.value); setPage(1); }}
                        options={bloodGroups.map((bg) => ({ value: bg, label: bg || 'All Blood Groups' }))}
                        className="!mb-0 bg-white/5 border-white/10 text-xs font-bold uppercase tracking-tight h-10 min-w-[140px]"
                    />
                </div>
            </div>

            {/* Requests List */}
            {loading && requests.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500" />
                </div>
            ) : requests.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No emergency requests found for the selected filters.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div
                            key={req._id}
                            className={`relative overflow-hidden rounded-2xl bg-slate-900 border transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] ${
                                req.status === 'Active' 
                                ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] bg-gradient-to-r from-amber-500/5 to-transparent' 
                                : 'border-white/5 hover:border-white/20'
                            }`}
                        >
                            {/* Mission File Header */}
                            <div
                                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === req._id ? null : req._id)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Blood Group Badge (Glow) */}
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black shadow-lg border-2 ${
                                        req.status === 'Active'
                                        ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-amber-500/20'
                                        : req.status === 'Accepted'
                                        ? 'bg-green-500/20 border-green-500 text-green-500'
                                        : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}>
                                        {req.bloodGroup}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusIcon(req.status)}
                                            <p className="text-sm font-black text-white uppercase tracking-tight">
                                                MISSION ID: {req._id.substring(req._id.length - 6).toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(req.createdAt), 'MMM dd, HH:mm')}
                                            <span className="text-gray-700 mx-1">|</span>
                                            <MapPin className="w-3 h-3" />
                                            {req.currentSearchRadius}km Radius
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-center">
                                            <p className="text-[10px] font-black text-blue-400 uppercase leading-none mb-0.5">{req.totalDonorsNotified}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase leading-none">Pings</p>
                                        </div>
                                        <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-center">
                                            <p className="text-[10px] font-black text-green-500 uppercase leading-none mb-0.5">{req.acceptedCount}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase leading-none">Accepted</p>
                                        </div>
                                    </div>
                                    
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${getStatusBadgeClass(req.status)}`}>
                                        {req.status}
                                    </span>

                                    <div className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                        {expandedId === req._id ? (
                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                        )}
                                    </div>
                                </div>
                            </div>


                                {/* Expanded Tactical Intelligence */}
                                {expandedId === req._id && (
                                    <div className="p-5 pt-0 border-t border-white/5 space-y-6">
                                        {/* Dossier Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Patient Dossier */}
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                                                        <Search size={14} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Patient Dossier</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-xl font-black text-white">{req.patientId?.firstName} {req.patientId?.lastName}</p>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-gray-400 flex items-center gap-2">
                                                            <Phone size={12} /> {req.patientId?.phone || 'NO CONTACT RECORD'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-medium italic">
                                                            "{req.notes || "No additional tactical notes provided."}"
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Donor Security Record */}
                                            <div className={`rounded-2xl p-4 border backdrop-blur-md ${
                                                req.acceptedDonor 
                                                ? 'bg-green-500/5 border-green-500/20' 
                                                : 'bg-white/5 border-white/5'
                                            }`}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={`p-1.5 rounded-lg ${req.acceptedDonor ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                                        <User size={14} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Responder Record</span>
                                                </div>
                                                {req.acceptedDonor ? (
                                                    <div className="space-y-2">
                                                        <p className="text-xl font-black text-green-400">{req.acceptedDonor.firstName} {req.acceptedDonor.lastName}</p>
                                                        <p className="text-xs text-green-500/70 font-bold uppercase tracking-tight">Verified Responder Positioned</p>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center py-4">
                                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Awaiting Validated Response...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tactical Deployment Timeline */}
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Timer size={14} className="text-purple-400" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Radius Expansion Protocol</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Live Operations</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {req.radiusExpandedAt?.length > 0 ? (
                                                    req.radiusExpandedAt.map((re, i) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="flex flex-col items-center">
                                                                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-black">
                                                                    {re.radius}KM
                                                                </div>
                                                                <span className="text-[8px] font-bold text-gray-600 mt-1">{format(new Date(re.expandedAt), 'HH:mm:ss')}</span>
                                                            </div>
                                                            {i < req.radiusExpandedAt.length - 1 && (
                                                                <div className="h-px w-8 bg-white/10" />
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-black">
                                                        INITIALIZING 1KM SCAN...
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Donor Response Vector List */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                <Radio size={14} className="text-amber-500" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Response Vector Stream</span>
                                            </div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {req.donorResponses?.map((dr, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 border border-white/5">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-white uppercase">
                                                                    {dr.donorId?.firstName ? `${dr.donorId.firstName} ${dr.donorId.lastName}` : "ENCRYPTED_DONOR"}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                                                                    <span>{dr.distanceKm?.toFixed(1)}KM DISTANCE</span>
                                                                    <span className="text-gray-700">|</span>
                                                                    <span>PINNED @{dr.notifiedAtRadius}KM</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                                            dr.status === 'Accepted' ? 'bg-green-500/20 text-green-500' : 
                                                            dr.status === 'Rejected' ? 'bg-red-500/20 text-red-500' :
                                                            'bg-amber-500/20 text-amber-500'
                                                        }`}>
                                                            {dr.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pagination.pages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};
