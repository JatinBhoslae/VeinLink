import { useState, useEffect, useRef, useCallback } from 'react';
import { usePublicAuth } from '../context/PublicAuthContext';
import publicApi from '../lib/publicApi';
import { useSocket } from '../utils/socket';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DonorLayout } from '../components/Layout/DonorLayout';
import {
    AlertTriangle,
    MapPin,
    Clock,
    CheckCircle,
    XCircle,
    Radio,
    Zap,
    Phone,
    Mail,
    User,
    Heart,
    Activity,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    Mic,
    MicOff,
} from 'lucide-react';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RADIUS_LEVELS = [1, 3, 5];
const EXPAND_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export const EmergencyBroadcast = () => {
    const { user } = usePublicAuth();
    const { socket } = useSocket();
    const [step, setStep] = useState('form'); // form | searching | result
    const [bloodGroup, setBloodGroup] = useState('');
    const [location, setLocation] = useState(() => {
        if (user?.location?.coordinates) {
            return {
                longitude: user.location.coordinates[0],
                latitude: user.location.coordinates[1]
            };
        }
        return null;
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [activeRequest, setActiveRequest] = useState(null);
    const [expanding, setExpanding] = useState(false);
    const [pastRequests, setPastRequests] = useState([]);
    const [expandedPast, setExpandedPast] = useState(null);
    const [loadingPast, setLoadingPast] = useState(true);

    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');

    const expandTimerRef = useRef(null);
    const pollTimerRef = useRef(null);

    // --- Load past requests ---
    const loadPastRequests = useCallback(async () => {
        try {
            const res = await publicApi.get('/emergency-broadcast/my');
            const requests = res.data.data || [];
            // Check if there's an active one
            const active = requests.find((r) => r.status === 'Active');
            if (active) {
                setActiveRequest(active);
                setStep('searching');
            }
            setPastRequests(requests);
        } catch (err) {
            console.error('Failed to load requests:', err);
        } finally {
            setLoadingPast(false);
        }
    }, []);

    useEffect(() => {
        loadPastRequests();
        return () => {
            if (expandTimerRef.current) clearInterval(expandTimerRef.current);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, [loadPastRequests]);

    // --- Socket listener for instant donor acceptance ---
    useEffect(() => {
        if (!socket) return;
        
        const handleDonorAccepted = async (data) => {
            console.log('🎉 Real-time donor acceptance:', data);
            toast.success('🎉 A donor has accepted your request!');
            
            // Fetch the fully updated request with all donor details
            try {
                const res = await publicApi.get(`/emergency-broadcast/${data.requestId}`);
                const updated = res.data.data;
                setActiveRequest(updated);
                setStep('result');
                clearInterval(expandTimerRef.current);
                clearInterval(pollTimerRef.current);
                loadPastRequests();
            } catch (err) {
                // Fallback: use the socket data directly
                if (activeRequest) {
                    setActiveRequest({ 
                        ...activeRequest, 
                        status: 'Accepted', 
                        acceptedDonor: data.donor 
                    });
                    setStep('result');
                    clearInterval(expandTimerRef.current);
                    clearInterval(pollTimerRef.current);
                }
            }
        };

        socket.on('emergency_donor_accepted', handleDonorAccepted);
        return () => socket.off('emergency_donor_accepted', handleDonorAccepted);
    }, [socket, activeRequest, loadPastRequests]);

    // --- Detect location ---
    const detectLocation = useCallback((isAuto = false) => {
        if (!isAuto) setLocationLoading(true);
        if (!isAuto) setLocationError('');
        if (!navigator.geolocation) {
            if (!isAuto) setLocationError('Geolocation is not supported by your browser');
            if (!isAuto) setLocationLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLocation({ latitude: lat, longitude: lng });
                if (!isAuto) setLocationLoading(false);
                if (!isAuto) toast.success('Location detected successfully');

                // Save to DB
                publicApi.put('/public-auth/profile', {
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    }
                }).catch(err => console.error("Failed to save location", err));
            },
            (err) => {
                if (!isAuto) {
                    if (user?.location?.coordinates) {
                        toast.success('Using saved location from profile');
                    } else {
                        setLocationError(`Location error: ${err.message}. Please enable location services.`);
                    }
                    setLocationLoading(false);
                }
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }, [user]);

    useEffect(() => {
        if (!location) {
            detectLocation(true);
        }
    }, [location, detectLocation]);

    // --- Auto-expand radius ---
    useEffect(() => {
        if (!activeRequest || activeRequest.status !== 'Active') return;

        const tryExpand = async () => {
            if (!activeRequest || activeRequest.status !== 'Active') return;
            const currentIdx = RADIUS_LEVELS.indexOf(activeRequest.currentSearchRadius);
            if (currentIdx >= RADIUS_LEVELS.length - 1) return;

            try {
                setExpanding(true);
                const res = await publicApi.post(`/emergency-broadcast/${activeRequest._id}/expand`);
                setActiveRequest(res.data.data.request);
                toast.success(`Search expanded to ${RADIUS_LEVELS[currentIdx + 1]}km — ${res.data.data.newDonorsNotified} new donors notified`);
            } catch (err) {
                console.error('Auto-expand failed:', err);
            } finally {
                setExpanding(false);
            }
        };

        expandTimerRef.current = setInterval(tryExpand, EXPAND_INTERVAL_MS);
        return () => clearInterval(expandTimerRef.current);
    }, [activeRequest]);

    // --- Poll for status updates ---
    useEffect(() => {
        if (!activeRequest || activeRequest.status !== 'Active') return;

        const poll = async () => {
            try {
                const res = await publicApi.get(`/emergency-broadcast/${activeRequest._id}`);
                const updated = res.data.data;
                setActiveRequest(updated);
                if (updated.status === 'Accepted') {
                    toast.success('🎉 A donor has accepted! Check details below.');
                    setStep('result');
                    clearInterval(expandTimerRef.current);
                    loadPastRequests();
                }
            } catch (err) {
                console.error('Poll failed:', err);
            }
        };

        pollTimerRef.current = setInterval(poll, 5000);
        return () => clearInterval(pollTimerRef.current);
    }, [activeRequest, loadPastRequests]);

    // --- Voice Recognition ---
    const handleVoiceCommand = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return toast.error('Browser does not support speech recognition');
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setVoiceTranscript('');
            toast.success('Listening... (e.g., "I need O positive blood")', { icon: '🎤' });
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            setVoiceTranscript(transcript);

            try {
                // Call backend API to parse
                const res = await publicApi.post('/chatbot/voice-parse', { transcript });
                if (res.data.data.bloodGroup) {
                    setBloodGroup(res.data.data.bloodGroup);
                    toast.success(res.data.data.message);
                    if (res.data.data.isUrgent) {
                        setNotes((prev) => prev ? prev + ' | URGENT voice request' : 'URGENT voice request');
                    }
                } else {
                    toast.error(res.data.data.message);
                }
            } catch (err) {
                toast.error('Failed to parse voice command');
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            toast.error(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    // --- Submit emergency request ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!bloodGroup) return toast.error('Please select a blood group');
        if (!location) return toast.error('Please detect your location first');

        setSubmitting(true);
        try {
            const res = await publicApi.post('/emergency-broadcast', {
                bloodGroup,
                latitude: location.latitude,
                longitude: location.longitude,
                notes,
            });
            setActiveRequest(res.data.data.request);
            setStep('searching');
            toast.success(res.data.message);
            loadPastRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create emergency request');
        } finally {
            setSubmitting(false);
        }
    };

    // --- Cancel request ---
    const handleCancel = async () => {
        if (!activeRequest) return;
        try {
            await publicApi.post(`/emergency-broadcast/${activeRequest._id}/cancel`);
            setActiveRequest(null);
            setStep('form');
            toast.success('Emergency request cancelled');
            loadPastRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        }
    };

    // --- Manual expand ---
    const handleManualExpand = async () => {
        if (!activeRequest) return;
        const currentIdx = RADIUS_LEVELS.indexOf(activeRequest.currentSearchRadius);
        if (currentIdx >= RADIUS_LEVELS.length - 1) return toast.error('Maximum radius reached');
        try {
            setExpanding(true);
            const res = await publicApi.post(`/emergency-broadcast/${activeRequest._id}/expand`);
            setActiveRequest(res.data.data.request);
            toast.success(res.data.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Expansion failed');
        } finally {
            setExpanding(false);
        }
    };

    // --- Format time ---
    const formatDuration = (ms) => {
        if (!ms) return '--';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case 'Accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loadingPast) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600" />
            </div>
        );
    }

    return (
        <DonorLayout>
            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                        <Zap className="w-7 h-7 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Blood Request</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Find nearby donors instantly using smart radius search
                        </p>
                    </div>
                </div>

                {/* ===== STEP 1: Form ===== */}
                {step === 'form' && (
                    <Card className="border-red-200 dark:border-red-800/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertTriangle className="w-5 h-5" />
                                Create Emergency Request
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Voice Input Mode */}
                                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-100 dark:border-red-800 rounded-lg flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            Voice Emergency Mode
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {voiceTranscript || 'Say something like: "I need O positive blood urgently"'}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant={isListening ? 'danger' : 'outline'}
                                        className={`rounded-full w-12 h-12 p-0 flex items-center justify-center shrink-0 ${isListening ? 'animate-pulse' : ''}`}
                                        onClick={handleVoiceCommand}
                                    >
                                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-red-600 dark:text-red-400" />}
                                    </Button>
                                </div>

                                {/* Blood Group */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Required Blood Group *
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {bloodGroups.map((bg) => (
                                            <button
                                                key={bg}
                                                type="button"
                                                onClick={() => setBloodGroup(bg)}
                                                className={`py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 border-2 ${bloodGroup === bg
                                                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500 shadow-md scale-105'
                                                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-900/10'
                                                    }`}
                                            >
                                                {bg}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Location Detection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Your Location *
                                    </label>
                                    {location ? (
                                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <MapPin className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium text-green-800 dark:text-green-300">Location Detected</p>
                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                    Lat: {location.latitude.toFixed(5)}, Lng: {location.longitude.toFixed(5)}
                                                </p>
                                            </div>
                                            <button type="button" onClick={() => detectLocation(false)} className="ml-auto text-green-600 hover:text-green-800">
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => detectLocation(false)}
                                                disabled={locationLoading}
                                                className="w-full flex items-center justify-center gap-2"
                                            >
                                                {locationLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Detecting Location...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MapPin className="w-4 h-4" />
                                                        Detect My Location
                                                    </>
                                                )}
                                            </Button>
                                            {locationError && (
                                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{locationError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Additional Notes (optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Surgery scheduled, accident victim..."
                                        rows={2}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                                    />
                                </div>

                                {/* How it works */}
                                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                                    <p className="text-xs font-semibold text-primary-800 dark:text-primary-300 mb-2">How Smart Radius Search Works:</p>
                                    <div className="flex items-center gap-6 text-xs text-primary-700 dark:text-primary-300">
                                        <span className="flex items-center gap-1">
                                            <Radio className="w-3 h-3" /> 1km first
                                        </span>
                                        <span>→ 2 min →</span>
                                        <span className="flex items-center gap-1">
                                            <Radio className="w-3 h-3" /> 3km
                                        </span>
                                        <span>→ 2 min →</span>
                                        <span className="flex items-center gap-1">
                                            <Radio className="w-3 h-3" /> 5km
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-base"
                                    disabled={submitting || !bloodGroup || !location}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Broadcasting...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Zap className="w-5 h-5" />
                                            Send Emergency Broadcast
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* ===== STEP 2: Searching / Active ===== */}
                {step === 'searching' && activeRequest && (
                    <div className="space-y-4">
                        {/* Pulse animation card */}
                        <Card className="border-2 border-red-400 dark:border-red-600 relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 animate-pulse" />
                            <CardContent className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                <Activity className="w-6 h-6 text-red-600 animate-pulse" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-ping" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                                Searching for {activeRequest.bloodGroup} Donors...
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Current radius: <strong>{activeRequest.currentSearchRadius}km</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(activeRequest.status)}`}>
                                        {activeRequest.status}
                                    </span>
                                </div>

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700">
                                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                            {activeRequest.totalDonorsNotified}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Donors Notified</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700">
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {activeRequest.acceptedCount}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Accepted</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700">
                                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            {activeRequest.rejectedCount}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Rejected</p>
                                    </div>
                                </div>

                                {/* Radius Progress */}
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Search Radius Progress</p>
                                    <div className="flex items-center gap-1">
                                        {RADIUS_LEVELS.map((r, i) => (
                                            <div key={r} className="flex items-center flex-1">
                                                <div
                                                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${r <= activeRequest.currentSearchRadius
                                                        ? 'bg-red-500'
                                                        : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}
                                                />
                                                <span
                                                    className={`ml-1 text-xs font-bold ${r <= activeRequest.currentSearchRadius
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-gray-400'
                                                        }`}
                                                >
                                                    {r}km
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Donor Responses list */}
                                {activeRequest.donorResponses?.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                            Donor Responses ({activeRequest.donorResponses.length})
                                        </p>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {activeRequest.donorResponses.map((dr, i) => (
                                                <div
                                                    key={dr._id || i}
                                                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {dr.donorId?.firstName
                                                                ? `${dr.donorId.firstName} ${dr.donorId.lastName}`
                                                                : `Donor #${i + 1}`}
                                                        </span>
                                                        {dr.distanceKm != null && (
                                                            <span className="text-xs text-gray-400">({dr.distanceKm}km)</span>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dr.status === 'Pending'
                                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                            : dr.status === 'Accepted'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                : dr.status === 'Rejected'
                                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                    >
                                                        {dr.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleManualExpand}
                                        disabled={
                                            expanding || activeRequest.currentSearchRadius >= 5
                                        }
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        {expanding ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Expanding...
                                            </span>
                                        ) : activeRequest.currentSearchRadius >= 5 ? (
                                            'Max Radius Reached'
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Radio className="w-4 h-4" /> Expand Radius Now
                                            </span>
                                        )}
                                    </Button>
                                    <Button onClick={handleCancel} variant="danger" className="flex-1">
                                        Cancel Request
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ===== STEP 3: Donor Accepted ===== */}
                {step === 'result' && activeRequest?.status === 'Accepted' && (
                    <Card className="border-2 border-green-400 dark:border-green-600">
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Donor Found!</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    A donor has accepted your emergency request. Here are their details:
                                </p>
                                {activeRequest.timeTakenToAcceptMs && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Time to find donor: {formatDuration(activeRequest.timeTakenToAcceptMs)}
                                    </p>
                                )}
                            </div>

                            {activeRequest.acceptedDonor && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800 space-y-4">
                                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">Donor Details</p>
                                    
                                    {/* Name */}
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-green-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {activeRequest.acceptedDonor.firstName} {activeRequest.acceptedDonor.lastName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    {(activeRequest.acceptedDonor.phone) && (
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                                                <a href={`tel:${activeRequest.acceptedDonor.phone}`} className="text-green-700 dark:text-green-300 hover:underline font-medium">
                                                    {activeRequest.acceptedDonor.phone}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Email */}
                                    {(activeRequest.acceptedDonor.email) && (
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Email Address</p>
                                                <a href={`mailto:${activeRequest.acceptedDonor.email}`} className="text-green-700 dark:text-green-300 hover:underline">
                                                    {activeRequest.acceptedDonor.email}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Blood Group */}
                                    <div className="flex items-center gap-3">
                                        <Heart className="w-5 h-5 text-green-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Blood Group</p>
                                            <p className="font-bold text-red-600 dark:text-red-400 text-lg">{activeRequest.acceptedDonor.bloodGroup}</p>
                                        </div>
                                    </div>

                                    {/* Gender */}
                                    {(activeRequest.acceptedDonor.gender) && (
                                        <div className="flex items-center gap-3">
                                            <User className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                                                <p className="font-medium text-gray-900 dark:text-white capitalize">{activeRequest.acceptedDonor.gender}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* City / State */}
                                    {(activeRequest.acceptedDonor.city || activeRequest.acceptedDonor.state) && (
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {[activeRequest.acceptedDonor.address, activeRequest.acceptedDonor.city, activeRequest.acceptedDonor.state].filter(Boolean).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-5 space-y-3">
                                {/* Navigate to Donor */}
                                {activeRequest.acceptedDonor?.location?.coordinates && (
                                    <Button
                                        onClick={() => {
                                            const [lng, lat] = activeRequest.acceptedDonor.location.coordinates;
                                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 flex items-center justify-center gap-2"
                                    >
                                        <MapPin className="w-5 h-5" />
                                        Navigate to Donor Location
                                    </Button>
                                )}

                                {/* Call Donor */}
                                {activeRequest.acceptedDonor?.phone && (
                                    <Button
                                        onClick={() => window.open(`tel:${activeRequest.acceptedDonor.phone}`)}
                                        variant="outline"
                                        className="w-full py-3 flex items-center justify-center gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                    >
                                        <Phone className="w-5 h-5" />
                                        Call Donor Now
                                    </Button>
                                )}

                                <Button
                                    onClick={() => {
                                        setActiveRequest(null);
                                        setStep('form');
                                        setBloodGroup('');
                                        setLocation(null);
                                        setNotes('');
                                        loadPastRequests();
                                    }}
                                    className="w-full"
                                    variant="outline"
                                >
                                    Create New Request
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ===== Past Requests ===== */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Request History
                    </h2>

                    {pastRequests.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                No emergency requests yet.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pastRequests.map((req) => (
                                <Card key={req._id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedPast(expandedPast === req._id ? null : req._id)}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-sm font-bold">
                                                    {req.bloodGroup}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {req.totalDonorsNotified} notified · Radius: {req.currentSearchRadius}km
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                                                    {req.status}
                                                </span>
                                                {expandedPast === req._id ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {expandedPast === req._id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs">Donors Notified</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{req.totalDonorsNotified}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs">Time to Accept</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {formatDuration(req.timeTakenToAcceptMs)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs">Accepted</p>
                                                        <p className="font-semibold text-green-600">{req.acceptedCount}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs">Rejected</p>
                                                        <p className="font-semibold text-red-600">{req.rejectedCount}</p>
                                                    </div>
                                                </div>

                                                {req.acceptedDonor && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                                        <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                                                            Accepted Donor
                                                        </p>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                                            {req.acceptedDonor.firstName} {req.acceptedDonor.lastName}
                                                            {req.acceptedDonor.phone && ` · ${req.acceptedDonor.phone}`}
                                                        </p>
                                                    </div>
                                                )}

                                                {req.notes && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                        Notes: {req.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DonorLayout>
    );
};
