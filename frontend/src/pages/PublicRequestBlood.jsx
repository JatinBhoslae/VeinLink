import { useEffect, useState, useMemo } from 'react';
import { useSearch } from '../context/SearchContext';
import publicApi from '../lib/publicApi';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DonorLayout } from '../components/Layout/DonorLayout';
import { Droplet, Plus, History, Activity, AlertCircle, Building2, Search, Zap, Map as MapIcon, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '2rem'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    // ... (Add more dark styles for tactical feel)
  ]
};

export const PublicRequestBlood = () => {
  const { searchQuery } = useSearch();
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [nearbyOperatives, setNearbyOperatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [form, setForm] = useState({
    hospitalId: '',
    bloodGroup: '',
    quantity: 1,
    urgency: 'medium',
    reason: '',
    requiredBy: '',
  });

  // Acquire Tactical Coordinates
  const acquireGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            toast.success('Satellite Lock Secured');
        },
        () => toast.error('📡 satellite handshake failed. Use Simulator.')
      );
    }
  };

  const simulateGPS = () => {
      // Mock coordinates (Mumbai Sector)
      setUserLocation({ lat: 19.0760, lng: 72.8777 });
      toast.success('Tactical GPS Simulator Active');
  };

  useEffect(() => {
    acquireGPS();
    const init = async () => {
      try {
        const [hRes, rRes] = await Promise.all([
          publicApi.get('/hospitals/public/approved'),
          publicApi.get('/public-blood-requests'),
        ]);
        setHospitals(hRes.data.data || []);
        setRequests(rRes.data.data || rRes.data || []);
      } catch (error) {
        toast.error('Failed to load blood request data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const startSectorScan = async () => {
    if (!userLocation) return toast.error('Identify your sector coordinates first');
    setIsScanning(true);
    setShowMap(true);
    
    // Simulate mission logic or fetch real donors if request exists
    setTimeout(() => {
        setIsScanning(false);
        if (nearbyOperatives.length === 0) {
            toast('No matching signatures in immediate sector', { icon: '📡' });
        }
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsScanning(true);
    setShowMap(true);
    try {
      const res = await publicApi.post('/public-blood-requests', form);
      
      setTimeout(async () => {
        setIsScanning(false);
        toast.success('Mission Broadcast Complete');
        
        if (res.data.nearbyOperatives?.length > 0) {
          setNearbyOperatives(res.data.nearbyOperatives);
          toast.success(`${res.data.nearbyOperatives.length} Operatives Triangulated`, { icon: '🚁' });
        } else {
          setNearbyOperatives([]);
          toast('Sector Clear: No matching donors found nearby', { icon: '🛡️' });
        }

        setShowForm(false);
        setForm({ hospitalId: '', bloodGroup: '', quantity: 1, urgency: 'medium', reason: '', requiredBy: '' });
        
        const refreshRes = await publicApi.get('/public-blood-requests');
        setRequests(refreshRes.data.data || refreshRes.data || []);
      }, 3000);

    } catch (error) {
      setIsScanning(false);
      toast.error(error.response?.data?.message || 'Failed to broadcast request');
    }
  };

  const handleTargetedRequest = async (op) => {
    try {
      await publicApi.post('/public-blood-requests', {
        ...form,
        targetDonorId: op._id,
        urgency: 'critical',
        specialInstructions: `Direct deployment requested from map for operative ${op.firstName}.`
      });
      toast.success(`Direct signal sent to ${op.firstName}`);
      setSelectedOp(null);
    } catch (error) {
      toast.error('Failed to initiate targeted deployment');
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <DonorLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary-600 rounded-3xl text-white shadow-xl shadow-primary-600/20">
              <Droplet size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Strategic Requests</h1>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Broadcast Emergency Signals & Triangulate Donors</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="outline"
                onClick={simulateGPS}
                className="rounded-2xl h-14 px-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <Navigation size={14} className="text-primary-600" />
                Satellite Simulator
              </Button>

              <Button 
                variant="outline"
                onClick={startSectorScan}
                className="rounded-2xl h-14 px-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <Search size={14} className="text-primary-600" />
                Scan Sector
              </Button>

              <Button 
                onClick={() => setShowForm(true)}
                className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-600/20 transition-all flex items-center gap-3"
              >
                <Plus size={18} />
                Initialize Broadcast
              </Button>
          </div>
        </div>

        {/* Tactical Scanning HUD */}
        {(showMap || isScanning || nearbyOperatives.length > 0) && (
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-slate-900 text-white shadow-2xl overflow-hidden relative border-4 border-slate-800 animate-in slide-in-from-top-10 duration-700">
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center animate-pulse">
                            <MapIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest">Sector Scanning HUD</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Geospatial Operative Triangulation</p>
                        </div>
                    </div>
                    {(isScanning) && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary-600 rounded-full animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Radar Infiltration Active...</span>
                      </div>
                    )}
                    <Button 
                        variant="ghost" 
                        onClick={() => { setShowMap(false); setNearbyOperatives([]); }}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
                    >
                        Deactivate HUD
                    </Button>
                </div>

                <div className="relative rounded-[2rem] overflow-hidden border border-slate-800 min-h-[400px] bg-slate-800 flex items-center justify-center">
                    {isScanning && (
                        <div className="absolute inset-0 z-10 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                            <div className="relative w-64 h-64 border-2 border-primary-600/30 rounded-full flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 border-r-4 border-primary-600 animate-spin-slow origin-center rounded-full" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary-600/0 via-primary-600/0 to-primary-600/20 animate-spin-slow" />
                                <Zap size={40} className="text-primary-600 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {isLoaded && userLocation ? (
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={userLocation}
                        zoom={13}
                        options={mapOptions}
                      >
                        <Marker 
                          position={userLocation}
                          icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                        />
                        {nearbyOperatives.map((op, idx) => {
                           const isLive = op.locationUpdatedAt && (new Date() - new Date(op.locationUpdatedAt)) < 5 * 60 * 1000;
                           return (
                             <Marker 
                                key={idx}
                                position={{ lat: op.location.coordinates[1], lng: op.location.coordinates[0] }}
                                onClick={() => setSelectedOp(op)}
                                icon={isLive ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png" : "http://maps.google.com/mapfiles/ms/icons/red-dot.png"}
                                options={{
                                  animation: isLive ? window.google.maps.Animation.BOUNCE : null,
                                }}
                             />
                           );
                        })}
                        {selectedOp && (
                          <InfoWindow
                            position={{ lat: selectedOp.location.coordinates[1], lng: selectedOp.location.coordinates[0] }}
                            onCloseClick={() => setSelectedOp(null)}
                          >
                            <div className="p-3 text-slate-900 min-w-[200px]">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-black text-xs uppercase">{selectedOp.firstName} {selectedOp.lastName}</h3>
                                  <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded-full">{selectedOp.bloodGroup}</span>
                                </div>
                                
                                <div className="space-y-1 mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedOp.locationUpdatedAt && (new Date() - new Date(selectedOp.locationUpdatedAt)) < 5 * 60 * 1000 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <p className="text-[9px] font-bold uppercase tracking-tight text-slate-500">
                                      Signal: {selectedOp.locationUpdatedAt && (new Date() - new Date(selectedOp.locationUpdatedAt)) < 5 * 60 * 1000 ? 'ACTIVE LIVE' : 'STATIC LOCATION'}
                                    </p>
                                  </div>
                                  <p className="text-[8px] font-medium text-slate-400 uppercase">
                                    Last Sync: {selectedOp.locationUpdatedAt ? format(new Date(selectedOp.locationUpdatedAt), 'HH:mm:ss') : 'N/A'}
                                  </p>
                                </div>

                                <Button 
                                  size="sm" 
                                  onClick={() => handleTargetedRequest(selectedOp)}
                                  className="w-full h-10 bg-primary-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary-600/20"
                                >
                                  Deploy Operative
                                </Button>
                            </div>
                          </InfoWindow>
                        )}
                      </GoogleMap>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <Activity className="text-slate-600 animate-pulse" size={48} />
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Waiting for Satellite Lock...</p>
                      </div>
                    )}
                </div>
            </div>
          </Card>
        )}

        {showForm && (
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl pointer-events-none" />
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-700">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <Zap className="text-primary-600 animate-pulse" />
                Resource Request Manifest
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Select
                  label="Target Hospital Sector"
                  value={form.hospitalId}
                  onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                  required
                  options={[
                    { value: '', label: hospitals.length ? 'Identify Hospital...' : 'No available sectors found' },
                    ...hospitals.map((h) => ({
                      value: h._id,
                      label: h.name,
                    })),
                  ]}
                  className="rounded-2xl h-14"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Select
                    label="Blood Signature"
                    value={form.bloodGroup}
                    onChange={handleChange('bloodGroup')}
                    required
                    options={[
                      { value: '', label: 'Select Group' },
                      ...bloodGroups.map((bg) => ({ value: bg, label: bg })),
                    ]}
                    className="rounded-2xl h-14"
                  />
                  <Input
                    label="Volume (Units)"
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={handleChange('quantity')}
                    required
                    className="rounded-2xl h-14"
                  />
                  <Select
                    label="Urgency Protocol"
                    value={form.urgency}
                    onChange={handleChange('urgency')}
                    options={[
                      { value: 'low', label: 'Protocol: Low' },
                      { value: 'medium', label: 'Protocol: Medium' },
                      { value: 'high', label: 'Protocol: High' },
                      { value: 'critical', label: 'Protocol: CRITICAL' },
                    ]}
                    required
                    className="rounded-2xl h-14"
                  />
                </div>
                <Input
                  label="Mission Rationale (Reason)"
                  value={form.reason}
                  onChange={handleChange('reason')}
                  required
                  placeholder="e.g. Surgery for family member..."
                  className="rounded-2xl h-14"
                />
                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-2xl h-14 px-8 font-bold">
                    Abort
                  </Button>
                  <Button type="submit" className="rounded-2xl h-14 px-10 bg-primary-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-600/20">
                    Broadcast Broadcast
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Requests Signal Log */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
               <History size={16} className="text-primary-600" />
               <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Signal Log: {requests.length} Requests</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {requests.filter(req => 
                (req.hospitalId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (req.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
            ).map((req) => (
                <div key={req._id} className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-[1.5rem] flex items-center justify-center text-primary-600 relative overflow-hidden group">
                            <Droplet size={32} className="relative z-10" />
                            <div className="absolute inset-0 bg-primary-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[250px]">
                                    {req.hospitalId?.name || 'Sector Alpha'}
                                </h3>
                                {req.targetDonorId && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full border border-primary-100 animate-pulse">
                                        <ShieldCheck size={10} />
                                        <span className="text-[8px] font-black uppercase">Direct Signal</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 truncate max-w-[250px] italic">
                                "{req.reason}"
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                                <Activity size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    {format(new Date(req.createdAt), 'dd MMMM yyyy HH:mm')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 w-full md:w-auto">
                        <div className="flex flex-col items-center justify-center min-w-[80px]">
                            <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg font-black text-sm mb-1">
                                {req.bloodGroup}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{req.quantity} UNITS</p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              {req.status === 'accepted' && (
                                <a 
                                  href={`tel:${req.targetDonorId?.phone}`} 
                                  className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg animate-bounce"
                                  title="Contact Donor"
                                >
                                  <Phone size={14} />
                                </a>
                              )}
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  req.status === 'pending' ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/20 dark:border-orange-900' :
                                  req.status === 'accepted' ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-900' :
                                  req.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-900' :
                                  'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                  {req.status}
                              </span>
                            </div>
                            <div className={`text-[8px] font-black uppercase tracking-widest ${
                                req.urgency === 'critical' ? 'text-red-500 animate-pulse' :
                                req.urgency === 'high' ? 'text-orange-500' :
                                'text-slate-400'
                            }`}>
                                Urgency: {req.urgency}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {requests.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 p-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                    <Search size={40} className="text-slate-200" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Signal History Clear</h3>
                    <p className="text-slate-400 font-medium">You have not initiated any resource requests on the network yet.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="bg-primary-600 text-white rounded-2xl px-10 h-14 font-black uppercase tracking-widest shadow-xl shadow-primary-600/20">Initialize Broadcast</Button>
            </div>
          )}
        </div>
      </div>
    </DonorLayout>
  );
};
