import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/Card';
import { 
    BadgeCheck, 
    ShieldAlert, 
    ShieldCheck,
    User, 
    Droplet, 
    Heart, 
    Clock, 
    Gift, 
    Loader2, 
    Smartphone, 
    Mail, 
    MapPin, 
    Zap,
    History,
    Trophy,
    Activity,
    Calendar,
    Upload,
    FileDigit,
    CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

export const HospitalQRScanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [completing, setCompleting] = useState(false);
    const scannerRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        let html5QrCode = null;
        
        const startScanner = async () => {
            if (!isMountedRef.current) return;
            
            // Clean up any existing scanner first
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch (e) {}
            }

            try {
                html5QrCode = new Html5Qrcode('qr-reader');
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 280, height: 280 } },
                    onScanSuccess,
                    onScanError
                );
                if (isMountedRef.current) {
                    scannerRef.current = html5QrCode;
                } else {
                    html5QrCode.stop().catch(() => {});
                }
            } catch (err) {
                if (isMountedRef.current) {
                    console.error("Scanner Start Error:", err);
                    toast.error("Camera system offline. Check permissions.");
                }
            }
        };

        startScanner();

        return () => {
            isMountedRef.current = false;
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                scannerRef.current = null;
                // Important: wait for stop if possible or at least trigger it correctly
                if (scanner.isScanning) {
                    scanner.stop().catch(err => {
                        console.debug("Scanner stop suppressed on unmount:", err.message);
                    });
                }
            }
        };
    }, []);

    const onScanSuccess = async (decodedText) => {
        if (loading || scanResult) return;

        try {
            console.log("🔍 Scanned Text:", decodedText);
            let scanPayload = null;
            
            // 1. Check for Vein Link URL Protocol
            if (decodedText.includes('/v-id/')) {
                const parts = decodedText.split('/v-id/');
                let id = parts[parts.length - 1].split('?')[0].split('/')[0];
                if (id && id.length >= 12) { // Basic MongoDB ID length check
                    scanPayload = { id };
                }
            } 
            
            // 2. Check for Vein Link JSON Protocol
            if (!scanPayload) {
                try {
                    const parsed = JSON.parse(decodedText);
                    if (parsed.id || parsed.userId) {
                        scanPayload = { id: parsed.id || parsed.userId, appointmentId: parsed.appointmentId };
                    }
                } catch (e) {}
            }

            // 3. Fallback: Check if it's a raw MongoDB ID
            if (!scanPayload && /^[0-9a-fA-F]{24}$/.test(decodedText.trim())) {
                scanPayload = { id: decodedText.trim() };
            }

            // 4. Identity Check: Is this a Vein Link code or fake?
            if (!scanPayload) {
                console.warn("🛡️ Security Breach: Invalid Protocol Signature detected");
                setScanResult('error');
                setLoading(false); // Clear loading state on early return
                toast.error('Fake or Invalid Protocol Signature');
                return;
            }
            
            // Stop scanner once valid code is found
            if (scannerRef.current && scannerRef.current.isScanning) {
                try {
                    await scannerRef.current.stop();
                } catch (stopErr) {
                    console.warn("Scanner stop suppressed:", stopErr.message);
                }
            }

            setLoading(true);
            
            // Tactical watchdog timer (5s)
            const timeoutSignal = AbortController ? new AbortController() : null;
            const timeoutId = setTimeout(() => {
                if (timeoutSignal) timeoutSignal.abort();
            }, 5000);

            try {
                const response = await api.post('/donor-qr/scan', 
                    { qrData: scanPayload },
                    { signal: timeoutSignal?.signal }
                );
                clearTimeout(timeoutId);
                
                if (!isMountedRef.current) return;
                
                console.log("✅ Identity Authorized:", response.data);
                
                setScanResult('success');
                setParsedData({
                    ...response.data.data,
                    badges: response.data.data.badges || [],
                    platform: 'Vein Link',
                    verified: true
                });
                toast.success('Identity Synchronized');
            } catch (apiErr) {
                clearTimeout(timeoutId);
                if (isMountedRef.current) throw apiErr;
            }
        } catch (error) {
            if (!isMountedRef.current) return;
            console.error('Extraction Error:', error);
            setScanResult('error');
            setParsedData(null);
            
            if (error.name === 'AbortError') {
                toast.error('Sync Timeout: Protocol Signature Unresponsive');
            } else {
                toast.error(error.response?.data?.message || 'Invalid Protocol Signature');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("📂 Signature Upload Initiated:", file.name);
        const html5QrCode = new Html5Qrcode("qr-reader-hidden");
        // Only set loading if we're actually starting the scan
        try {
            const decodedText = await html5QrCode.scanFile(file, true);
            console.log("🔍 Signature Scanned Successfully");
            await onScanSuccess(decodedText);
        } catch (err) {
            console.error('Signature Scan Failure:', err);
            toast.error('Could not parse signature image');
            setScanResult('error');
        } finally {
            setLoading(false);
            if (html5QrCode) {
                try {
                    await html5QrCode.clear();
                } catch (e) {}
            }
            // Reset input so same file can be uploaded again
            e.target.value = '';
        }
    };

    const handleCompleteAppointment = async () => {
        if (!parsedData?.activeAppointment?._id) return;
        
        setCompleting(true);
        try {
            await api.post('/donor-qr/complete-appointment', { 
                appointmentId: parsedData.activeAppointment._id 
            });
            toast.success('Mission Accomplished. Dossier Upgraded.');
            // Refresh scan data
            await onScanSuccess(JSON.stringify({ 
                id: parsedData.id, 
                appointmentId: parsedData.activeAppointment._id 
            }));
        } catch (error) {
            toast.error('Failed to finalize mission');
        } finally {
            setCompleting(false);
        }
    };

    const onScanError = () => {};

    const resetScanner = async () => {
        setScanResult(null);
        setParsedData(null);
        if (scannerRef.current && !scannerRef.current.isScanning) {
            try {
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 280, height: 280 } },
                    onScanSuccess,
                    onScanError
                );
            } catch (err) {
                console.error("Scanner Restart Error:", err);
            }
        }
    };

    return (
        <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8 min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary-600 rounded-3xl shadow-lg shadow-primary-600/20 text-white">
                        <Zap className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Tactical Identity HUD</h1>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Protocol Version ALPHA-1</p>
                    </div>
                </div>
                <button 
                    onClick={resetScanner}
                    className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                    <Activity size={16} className="text-primary-600" />
                    Reacquire Target
                </button>
                <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        id="qr-upload" 
                    />
                    <label 
                        htmlFor="qr-upload"
                        className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-600/20"
                    >
                        <Upload size={16} />
                        Upload Signature
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                    <Card className="overflow-hidden border-none shadow-2xl rounded-3xl bg-slate-900">
                        <CardContent className="p-0 relative">
                            <div id="qr-reader" className="w-full h-[400px]"></div>
                            <div id="qr-reader-hidden" className="opacity-0 pointer-events-none absolute inset-0"></div>
                            {!scanResult && !loading && (
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                    <div className="w-64 h-64 border-2 border-primary-500/30 rounded-3xl animate-pulse" />
                                    <p className="mt-8 text-white/30 font-black uppercase text-[10px] tracking-[0.4em]">Awaiting Signal</p>
                                </div>
                            )}
                            {loading && (
                                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-20">
                                    <div className="text-center space-y-4">
                                        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto" />
                                        <p className="font-black text-white uppercase tracking-widest text-xs">Parsing Signature...</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-7">
                    {loading ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed border-primary-500/20 rounded-[3rem] bg-primary-50/5 p-12 text-center space-y-6 animate-pulse">
                            <Loader2 className="w-16 h-16 animate-spin text-primary-500" />
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Authorizing Protocol</h3>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Retrieving Dossier From Security Core...</p>
                            </div>
                        </div>
                    ) : !scanResult ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-slate-300 dark:text-slate-700 p-12 text-center space-y-4">
                            <ShieldCheck size={80} strokeWidth={1} />
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Awaiting Authorization</h3>
                            <p className="max-w-xs text-sm font-medium">Scan a verified Vein Link Protocol signature to display tactical data.</p>
                        </div>
                    ) : scanResult === 'error' ? (
                        <div className="h-full bg-red-50 dark:bg-red-900/10 border-4 border-red-100 dark:border-red-900/30 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="p-6 bg-red-600 rounded-[2rem] text-white">
                                <ShieldAlert size={64} />
                            </div>
                            <h3 className="text-3xl font-black text-red-600 uppercase tracking-tighter">Identity Null</h3>
                            <button onClick={resetScanner} className="px-10 py-4 bg-red-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest">Retry Scan</button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
                            <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-700 shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-red-600 to-red-800 flex flex-col items-center justify-center text-white shadow-2xl shadow-red-600/40 scale-110">
                                        <Droplet size={32} className="mb-1 opacity-50" />
                                        <span className="text-4xl font-black leading-none">{parsedData?.bloodGroup || '--'}</span>
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-2">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <BadgeCheck size={12} /> Verified Profile
                                            </span>
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase truncate max-w-sm">
                                            {parsedData?.name || 'Unknown Operative'}
                                        </h2>
                                        <div className="flex flex-col md:flex-row items-center gap-4 text-slate-500 font-bold">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                                <Mail size={16} className="text-primary-500" />
                                                <span className="text-xs">{parsedData?.email || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                                <Smartphone size={16} className="text-sky-500" />
                                                <span className="text-xs">{parsedData?.phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
                                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 text-center space-y-1">
                                        <History size={20} className="mx-auto text-blue-600 mb-2" />
                                        <p className="text-3xl font-black">{parsedData?.totalDonations || 0}</p>
                                        <p className="text-[8px] font-black uppercase text-blue-500 tracking-widest">Missions</p>
                                    </div>
                                    <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-[2rem] border border-red-100 dark:border-red-900/20 text-center space-y-1">
                                        <Heart size={20} className="mx-auto text-red-500 mb-2" />
                                        <p className="text-3xl font-black">{parsedData?.livesSaved || 0}</p>
                                        <p className="text-[8px] font-black uppercase text-red-500 tracking-widest">Secured</p>
                                    </div>
                                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-900/20 text-center space-y-1">
                                        <Trophy size={20} className="mx-auto text-amber-500 mb-2" />
                                        <p className="text-3xl font-black">{parsedData?.rewardPoints || 0}</p>
                                        <p className="text-[8px] font-black uppercase text-amber-600 tracking-widest">Honor</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/10 group">
                                        <BadgeCheck size={20} className="mx-auto text-emerald-500 mb-2" />
                                        <p className="text-3xl font-black">{parsedData?.badges?.length || 0}</p>
                                        <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Medals</p>
                                    </div>
                                </div>

                                <div className={`mt-8 p-6 rounded-[2rem] border-4 border-dashed transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${parsedData?.isEligible ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/30'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${parsedData?.isEligible ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                                            {parsedData?.isEligible ? <ShieldCheck size={28} /> : <Clock size={28} />}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-xl font-black uppercase leading-none tracking-tight ${parsedData?.isEligible ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                                {parsedData?.isEligible ? 'Authorized' : 'Locked'}
                                            </p>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                {parsedData?.isEligible ? 'Verification Complete' : `Wait ${parsedData?.daysUntilEligible || 0} days`}
                                            </p>
                                        </div>
                                    </div>
                                    {parsedData?.isEligible && (
                                        <div className="flex-1 w-full md:w-auto">
                                            {parsedData?.activeAppointment ? (
                                                <button 
                                                    onClick={handleCompleteAppointment}
                                                    disabled={completing}
                                                    className="w-full px-8 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                                                >
                                                    {completing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                    Finalize Mission
                                                </button>
                                            ) : (
                                                <button className="w-full px-8 h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:scale-[1.02]">
                                                    Verify Arrival
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Mission History Section */}
                                {parsedData?.recentAppointments && parsedData?.recentAppointments?.length > 0 && (
                                    <div className="mt-8 border-t border-slate-100 dark:border-slate-700/50 pt-8">
                                        <div className="flex items-center gap-2 mb-6">
                                            <History size={16} className="text-slate-400" />
                                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-widest">Mission History ({parsedData?.recentAppointments?.length})</h3>
                                        </div>
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {parsedData?.recentAppointments?.map((mission, idx) => (
                                                <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-xl font-black">
                                                            #{parsedData?.recentAppointments?.length - idx}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">Completed Mission</div>
                                                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
                                                                <Calendar size={10} />
                                                                {mission.appointmentDate ? format(new Date(mission.appointmentDate), 'dd MMM yyyy') : 'N/A'} • {mission.timeSlot || 'Standard'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 md:mt-0 px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                        {parsedData?.platform || 'Vein Link'} Verified
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
