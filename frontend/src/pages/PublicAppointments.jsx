import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import publicApi from '../lib/publicApi';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { usePublicAuth } from '../context/PublicAuthContext';
import { DonorLayout } from '../components/Layout/DonorLayout';
import { Calendar, Building2, QrCode, XCircle, CheckCircle2, Clock, Download, Loader2, MapPinned, Tent } from 'lucide-react';

export const PublicAppointments = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = usePublicAuth();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('upcoming'); 
  const [hospitals, setHospitals] = useState([]);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [hospitalSlots, setHospitalSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [qrModalAppt, setQrModalAppt] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [pinSearch, setPinSearch] = useState('');
  const { searchQuery, setSearchQuery } = useSearch();

  // Unified eligibility telemetry
  const nextEligibleDate = user?.nextEligibleDate ? new Date(user.nextEligibleDate) : null;
  const isEligible = !nextEligibleDate || nextEligibleDate <= new Date();
  const daysWait = nextEligibleDate ? Math.ceil((nextEligibleDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  useEffect(() => {
    const init = async () => {
      try {
        const [aRes, hRes] = await Promise.all([
          publicApi.get('/public-appointments'),
          publicApi.get('/hospitals/public/approved'),
        ]);
        setAppointments(aRes.data.data || aRes.data || []);
        setHospitals(hRes.data.data || []);
      } catch {
        toast.error('Failed to load appointments');
      }
    };
    init();
  }, []);

  const handleSelectHospital = async (e) => {
    const hospitalId = e.target.value;
    setSelectedHospitalId(hospitalId);
    setHospitalSlots([]);
    if (!hospitalId) return;

    setLoadingSlots(true);
    try {
      const res = await publicApi.get(`/public-appointments/hospital-slots/${hospitalId}`);
      setHospitalSlots(res.data.data || res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load hospital slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookSlot = async (slot) => {
    try {
      const res = await publicApi.post('/public-appointments/hospital-slot', {
        hospitalId: selectedHospitalId,
        slotId: slot._id,
      });
      toast.success('Appointment booked');
      setShowHospitalForm(false);
      setSelectedHospitalId('');
      setHospitalSlots([]);
      const aRes = await publicApi.get('/public-appointments');
      setAppointments(aRes.data.data || aRes.data || []);
      setQrModalAppt(res.data.data || res.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book slot');
    }
  };

  const downloadQR = async () => {
    const qrElement = document.getElementById('mission-qr-container');
    if (!qrElement) return;
    
    try {
      const canvas = await html2canvas(qrElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `VienLink-Mission-${qrModalAppt?._id?.slice(-6) || 'Signature'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Mission Signature Downloaded');
    } catch (error) {
      toast.error('Failed to export signature');
    }
  };

  return (
    <DonorLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary-600 rounded-3xl text-white shadow-xl shadow-primary-600/20">
              <Calendar size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mission Deployment</h1>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Scheduled Donation Slots & History</p>
            </div>
          </div>
            {authLoading ? (
              <div className="bg-slate-50 dark:bg-slate-800 px-8 h-14 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center animate-pulse min-w-[180px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Hub...</span>
              </div>
            ) : isEligible ? (
              <Button 
                onClick={() => setShowHospitalForm(true)}
                className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-600/20 transition-all"
              >
                Deploy at Hospital
              </Button>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Regeneration Phase</p>
                  <p className="text-xs font-black text-primary-500 uppercase tracking-tighter">{daysWait} Cycles Remaining</p>
              </div>
            )}
        </div>

        {showHospitalForm && (
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 p-8">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <Building2 className="text-primary-600" />
                Select Deployment Sector
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Sector (City)</label>
                  <input 
                    type="text" 
                    placeholder="Enter deployment city..." 
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm outline-none border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Postal Grid (PIN)</label>
                  <input 
                    type="text" 
                    placeholder="Enter area pin code..." 
                    value={pinSearch}
                    onChange={(e) => setPinSearch(e.target.value)}
                    className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm outline-none border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>

              <Select
                label="Available Hospital HUBs"
                value={selectedHospitalId}
                onChange={handleSelectHospital}
                required
                disabled={!isEligible}
                options={[
                  { value: '', label: isEligible ? 'Identify Hospital...' : `Extraction Locked: ${daysWait} Cycles Left` },
                  ...hospitals
                    .filter(h => {
                      const cityMatch = !citySearch || h.address?.city?.toLowerCase().includes(citySearch.toLowerCase());
                      const pinMatch = !pinSearch || h.address?.zipCode?.includes(pinSearch);
                      return cityMatch && pinMatch;
                    })
                    .map((h) => {
                      const isBooked = appointments.some(a => a.hospitalId?._id === h._id && a.status === 'booked');
                      return { 
                        value: h._id, 
                        label: `${h.name} (${h.address?.city || 'Sector Alpha'})${isBooked ? ' — ALREADY BOOKED' : ''}` 
                      };
                    }),
                ]}
                className="rounded-2xl h-14"
              />
              
              {!isEligible && (
                <div className="p-6 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-3xl flex flex-col items-center text-center space-y-2">
                    <Clock size={32} className="text-primary-600 animate-pulse" />
                    <h4 className="text-sm font-black uppercase text-primary-600 tracking-widest">Biological Recovery Protocol</h4>
                    <p className="text-xs font-medium text-slate-500 max-w-xs">Your system is currently in a 90-day tactical regeneration cycle. Mobilization authorization will be restored in {daysWait} days.</p>
                </div>
              )}

              {isEligible && selectedHospitalId && appointments.some(a => a.hospitalId?._id === selectedHospitalId && a.status === 'booked') && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex items-center gap-3">
                  <QrCode size={20} className="text-amber-600" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Active Deployment Detected: You already have a scheduled mission at this sector.
                  </p>
                </div>
              )}
              {isEligible && selectedHospitalId && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">
                    Available Extraction Slots:
                  </p>
                  {loadingSlots ? (
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 className="animate-spin" size={16} />
                        <span className="text-xs font-bold">Synchronizing Slots...</span>
                    </div>
                  ) : hospitalSlots.length === 0 ? (
                    <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 text-center">
                        <p className="text-sm font-bold text-red-600">No active extraction windows defined by this sector.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {hospitalSlots.map((slot) => {
                        const start = new Date(slot.startTime);
                        const end = new Date(slot.endTime);
                        const remaining = slot.remaining ?? Math.max(0, (slot.capacity || 0) - (slot.bookedCount || 0));
                        const isFull = remaining <= 0 || slot.status !== 'active';
                        return (
                          <div key={slot._id} className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-600 space-y-4 hover:border-primary-500/30 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                        {format(start, 'MMM dd, yyyy')}
                                    </p>
                                    <p className="text-xs font-bold text-slate-500">
                                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                    </p>
                                </div>
                                <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-600">
                                    <p className="text-[10px] font-black">{remaining} FREE</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                disabled={isFull || !isEligible}
                                onClick={() => handleBookSlot(slot)}
                                className={`w-full rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest transition-all ${isFull || !isEligible ? 'bg-slate-200 text-slate-400' : 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'}`}
                            >
                                {isFull ? 'Capacity Reached' : !isEligible ? 'Recovery Phase' : 'Secure Slot'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowHospitalForm(false)} className="rounded-2xl px-8 h-12 font-bold">
                  Abort Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
              <div className="flex items-center gap-2">
                  <Clock size={16} className="text-primary-600" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Deployment Missions</h2>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button 
                      onClick={() => setFilter('upcoming')}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'upcoming' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                      Live / Upcoming
                  </button>
                  <button 
                      onClick={() => setFilter('past')}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'past' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                      Past Records
                  </button>
              </div>
          </div>
          
          {(() => {
              const now = new Date();
              const filteredAppointments = appointments.filter(appt => {
                  const isPast = ['completed', 'cancelled', 'rejected'].includes(appt.status) || 
                                (appt.timeSlot && new Date(appt.timeSlot) < now);
                  
                  const baseFilter = filter === 'past' ? isPast : !isPast;
                  if (!baseFilter) return false;

                  if (!searchQuery) return true;
                  const term = searchQuery.toLowerCase();
                  return (
                      appt.hospitalId?.name?.toLowerCase().includes(term) ||
                      appt.campId?.name?.toLowerCase().includes(term) ||
                      appt.status?.toLowerCase().includes(term)
                  );
              });

              if (filteredAppointments.length === 0) {
                  return (
                      <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 p-20 flex flex-col items-center justify-center text-center space-y-8 shadow-sm">
                          <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                              <Calendar size={40} className="text-slate-200 dark:text-slate-500" />
                          </div>
                          <div className="space-y-1">
                              <h3 className="text-2xl font-black uppercase tracking-tight">No {filter === 'upcoming' ? 'Active' : 'Past'} Deployments</h3>
                              <p className="text-slate-400 font-medium">You have no {filter} extraction missions in any sector.</p>
                          </div>
                          {filter === 'upcoming' && (
                              <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
                                <Button 
                                  disabled={!isEligible}
                                  onClick={() => setShowHospitalForm(true)} 
                                  className={`flex-1 w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                                    !isEligible ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary-600 text-white shadow-xl shadow-primary-600/20 active:scale-95'
                                  }`}
                                >
                                  {isEligible ? 'Deploy at Hospital' : `Wait ${daysWait} Cycles`}
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => navigate('/user/camps')} 
                                  className="flex-1 w-full h-16 rounded-2xl border-slate-200 dark:border-slate-700 font-black uppercase tracking-widest text-xs hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <Tent size={16} />
                                  Explore Blood Camps
                                </Button>
                              </div>
                          )}
                      </div>
                  );
              }

              return (
                <div className="grid grid-cols-1 gap-4">
                    {filteredAppointments.map((appt) => {
                        const isLive = appt.timeSlot && new Date(appt.timeSlot).toDateString() === now.toDateString();
                        
                        return (
                        <div key={appt._id} className={`bg-white dark:bg-gray-800 rounded-[2rem] p-6 border ${isLive && filter === 'upcoming' ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-slate-100 dark:border-slate-700'} shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all group`}>
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                                        <QrCode size={32} />
                                    </div>
                                    {isLive && filter === 'upcoming' && (
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">
                                            {appt.hospitalId?.name || appt.campId?.name || 'Sector Alpha'}
                                        </h3>
                                        {isLive && filter === 'upcoming' && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase tracking-widest">LIVE</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                                            appt.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                            appt.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                            'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            {appt.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            ID: {appt._id.slice(-6)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                                {appt.timeSlot && (
                                    <div className="text-center md:text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{format(new Date(appt.timeSlot), 'MMMM dd, yyyy')}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(appt.timeSlot), 'HH:mm')} Zulu</p>
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {appt.status === 'booked' && (appt.hospitalId?.location || appt.campId?.location) && (
                                        <button
                                            onClick={() => {
                                                const loc = appt.hospitalId?.location || appt.campId?.location;
                                                if (loc?.coordinates) {
                                                    const [lng, lat] = loc.coordinates;
                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
                                                } else {
                                                    const address = appt.hospitalId?.address || appt.campId?.address;
                                                    const query = `${appt.hospitalId?.name || appt.campId?.name} ${address?.city || ''}`;
                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                                                }
                                            }}
                                            className="h-12 w-12 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group/nav"
                                            title="Navigate to Sector"
                                        >
                                            <MapPinned size={20} className="group-hover/nav:animate-bounce" />
                                        </button>
                                    )}
                                    {appt.status !== 'cancelled' && appt.status !== 'rejected' && (
                                        <button
                                            onClick={() => setQrModalAppt(appt)}
                                            className={`flex-1 md:flex-none h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${
                                                isLive ? 'bg-red-600 text-white hover:bg-red-700 pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white hover:bg-primary-600 hover:text-white'
                                            }`}
                                        >
                                            {isLive ? 'Sector Identity (QR)' : 'Identify (QR)'}
                                        </button>
                                    )}
                                    {appt.status === 'booked' && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    await publicApi.put(`/public-appointments/${appt._id}/cancel`);
                                                    toast.success('Mission Aborted');
                                                    const res = await publicApi.get('/public-appointments');
                                                    setAppointments(res.data.data || res.data || []);
                                                } catch {
                                                    toast.error('Abort signal failed');
                                                }
                                            }}
                                            className="h-12 w-12 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
                                            title="Abort Mission"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
              );
          })()}
        </div>
      </div>

      {/* Mission Intelligence Dossier (QR Modal) */}
      {qrModalAppt && (
        <div
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && setQrModalAppt(null)}
        >
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[3.5rem] p-8 md:p-12 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <QrCode size={32} />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Mission Briefing</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sector Signature & Extraction Intel</p>
              </div>
              
              <div className="space-y-6">
                <div id="mission-qr-container" className="p-8 bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-6">
                    <QRCode
                        value={JSON.stringify({
                            id: user?._id,
                            name: `${user?.firstName} ${user?.lastName}`,
                            appointmentId: qrModalAppt._id,
                            sector: qrModalAppt.hospitalId?.name || qrModalAppt.campId?.name,
                            type: qrModalAppt.campId ? 'camp' : 'hospital'
                        })}
                        size={220}
                        level="H"
                    />
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Dossier Signature</p>
                        <p className="text-[11px] font-bold text-slate-900 uppercase">ID: {qrModalAppt._id?.slice(-8)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="px-6 py-5 bg-slate-50 dark:bg-slate-700/50 rounded-[2rem] border border-slate-100 dark:border-slate-600">
                        <p className="text-[10px] font-black uppercase text-primary-600 tracking-widest leading-none mb-2">Target Sector</p>
                        <p className="text-sm font-black dark:text-white uppercase truncate">{qrModalAppt.hospitalId?.name || qrModalAppt.campId?.name || 'Sector Alpha'}</p>
                        {(qrModalAppt.hospitalId?.address || qrModalAppt.campId?.location || qrModalAppt.campId?.address) && (
                            <p className="text-[10px] font-medium text-slate-500 mt-1 truncate">
                                {qrModalAppt.hospitalId?.address?.city || qrModalAppt.campId?.location?.name || qrModalAppt.campId?.address?.city || 'Zone Verified'}
                            </p>
                        )}
                    </div>

                    {qrModalAppt.campId?.description && (
                        <div className="px-6 py-5 bg-primary-50 dark:bg-primary-900/10 rounded-[2rem] border border-primary-100 dark:border-primary-800">
                            <p className="text-[10px] font-black uppercase text-primary-600 tracking-widest leading-none mb-2">Mission Intelligence</p>
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                "{qrModalAppt.campId.description}"
                            </p>
                        </div>
                    )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                  <Button 
                    onClick={downloadQR}
                    className="w-full h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-600/20 flex items-center justify-center gap-3 transition-all"
                  >
                    <Download size={18} />
                    Download Sector Signature
                  </Button>
                  <button 
                    onClick={() => setQrModalAppt(null)}
                    className="w-full h-14 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white rounded-[2rem] font-black uppercase text-xs tracking-widest border border-transparent hover:border-slate-200"
                  >
                    Dismiss Briefing
                  </button>
              </div>
          </div>
        </div>
      )}
    </DonorLayout>
  );
};
