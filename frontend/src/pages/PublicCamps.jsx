import { useEffect, useState } from 'react';
import { useSearch } from '../context/SearchContext';
import publicApi from '../lib/publicApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DonorLayout } from '../components/Layout/DonorLayout';
import { Users, MapPin, Calendar, Search, Filter, Layers, Navigation } from 'lucide-react';
import { usePublicAuth } from '../context/PublicAuthContext';
import QRCode from 'react-qr-code';

export const PublicCamps = () => {
  console.log('📡 Tactical Hub: PublicCamps Sector Initializing...');
  const { user, loading: authLoading } = usePublicAuth();
  const [camps, setCamps] = useState([]);
  const [filters, setFilters] = useState({ city: '', pinCode: '' });
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [qrModalAppt, setQrModalAppt] = useState(null);
  const { searchQuery } = useSearch();

  const fetchCamps = async () => {
    setLoading(true);
    try {
      const response = await publicApi.get('/public-camps');
      setCamps(response.data.data);
    } catch (error) {
      toast.error('Failed to load camp operations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await publicApi.get('/public-appointments');
      setAppointments(response.data.data || []);
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    fetchCamps();
    fetchAppointments();
  }, []);

  const downloadQR = async () => {
    const qrElement = document.getElementById('mission-qr-container');
    if (!qrElement) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(qrElement, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `VienLink-Mission-Sig.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast.error('Failed to capture signature');
    }
  };

  const handleBook = async (campId) => {
    try {
      const alreadyBooked = appointments.find(a => a.campId?._id === campId && a.status !== 'cancelled');
      if (alreadyBooked) {
        setQrModalAppt(alreadyBooked);
        return;
      }

      const res = await publicApi.post('/public-appointments/camp', {
        campId,
        timeSlotIndex: 0 
      });
      toast.success('Mission Lock: Deployment scheduled successfully');
      setQrModalAppt(res.data.data);
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initialize deployment');
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary-600 rounded-3xl text-white shadow-xl shadow-primary-600/20">
              <Layers size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tactical Deployments</h1>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Active Blood Collection Missions</p>
            </div>
          </div>
        </div>

        {/* Global Intel Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Input
                    label="Target Sector (City)"
                    placeholder="Enter deployment city..."
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="rounded-2xl h-14"
                    icon={<MapPin size={18} className="text-slate-400" />}
                />
            </div>
            <div className="lg:col-span-1">
                <Input
                    label="Postal Grid (PIN)"
                    placeholder="Sector PIN..."
                    value={filters.pinCode}
                    onChange={(e) => setFilters({...filters, pinCode: e.target.value})}
                    className="rounded-2xl h-14"
                    icon={<Search size={18} className="text-slate-400" />}
                />
            </div>
            <div className="flex items-end">
                <Button className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs">
                    Synthesize Intel
                </Button>
            </div>
        </div>

        {/* Deployment Feed */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <Filter size={16} className="text-primary-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Mission Feed: {camps.length} Sectors Active</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {camps
                .filter(camp => {
                    if (!searchQuery) return true;
                    const term = searchQuery.toLowerCase();
                    return (
                      camp.name.toLowerCase().includes(term) ||
                      camp.location?.city?.toLowerCase().includes(term) ||
                      camp.location?.address?.toLowerCase().includes(term)
                    );
                })
                .filter(camp => {
                    const matchesCity = camp.location?.city?.toLowerCase().includes(filters.city.toLowerCase());
                    const matchesPin = camp.location?.zipCode?.includes(filters.pinCode);
                    return matchesCity && matchesPin;
                })
                .map((camp) => {
                const bookedAppt = appointments.find(a => a.campId?._id === camp._id && a.status !== 'cancelled');
                const isBooked = !!bookedAppt;
                
                return (
                  <Card 
                    key={camp._id} 
                    onClick={() => isBooked && setQrModalAppt(bookedAppt)}
                    className={`rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 cursor-pointer ${isBooked ? 'ring-2 ring-primary-500/20' : ''}`}
                  >
                    <div className="p-8 space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    isBooked ? 'bg-green-50 border-green-200 text-green-600' : 'bg-primary-50 border-primary-100 text-primary-600'
                                }`}>
                                    {isBooked ? 'Mission Locked' : 'Active Deployment'}
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight pt-2">{camp.name}</h3>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform ${isBooked ? 'bg-green-500 text-white' : 'bg-slate-50 dark:bg-slate-700 text-primary-600'}`}>
                                {isBooked ? <Users size={24} /> : <Navigation size={24} />}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {camp.description && (
                                <p className="text-xs font-medium text-slate-500 leading-relaxed italic line-clamp-2">"{camp.description}"</p>
                            )}
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl">
                                    <MapPin size={18} />
                                </div>
                                <div className="truncate">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Sector Origin</p>
                                    <p className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-300 truncate">{camp.location?.address}, {camp.location?.city}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Mission Window</p>
                                    <p className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-300">
                                        {format(new Date(camp.startDate), 'dd MMM')} - {format(new Date(camp.endDate), 'dd MMM, yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            {(() => {
                                if (authLoading) return (
                                    <div className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center animate-pulse border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Bio-Data...</span>
                                    </div>
                                );
                                const nextEligibleDate = user?.nextEligibleDate ? new Date(user.nextEligibleDate) : null;
                                const isEligible = !nextEligibleDate || nextEligibleDate <= new Date();
                                const daysWait = nextEligibleDate ? Math.ceil((nextEligibleDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                                if (!isEligible) {
                                    return (
                                        <div className="w-full h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Regeneration Phase</p>
                                            <p className="text-xs font-black text-primary-500 uppercase tracking-tighter">{daysWait} Cycles Remaining</p>
                                        </div>
                                    );
                                }

                                return (
                                    <Button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBook(camp._id);
                                        }}
                                        className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                                            isBooked 
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                                            : 'bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-600/20 active:scale-95'
                                        }`}
                                    >
                                        {isBooked ? 'Review Mission Intel' : 'Authorize Deployment'}
                                    </Button>
                                );
                            })()}
                        </div>
                    </div>
                  </Card>
                );
            })}
          </div>

          {camps.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 p-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                    <Search size={40} className="text-slate-200" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Intelligence Vacuum</h3>
                    <p className="text-slate-400 font-medium">No active missions detected in the specified coordinates.</p>
                </div>
            </div>
          )}
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
                      <Layers size={32} />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Extraction Briefing</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protocol Version ALPHA-V</p>
              </div>
              
              <div className="space-y-6">
                <div id="mission-qr-container" className="p-8 bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-6">
                    <div className="p-4 bg-white">
                        <QRCode
                            value={JSON.stringify({
                                id: user?._id,
                                name: `${user?.firstName} ${user?.lastName}`,
                                appointmentId: qrModalAppt._id,
                                sector: qrModalAppt.campId?.name || 'Localized Sector',
                                type: 'camp'
                            })}
                            size={220}
                            level="H"
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Dossier Signature</p>
                        <p className="text-[11px] font-bold text-slate-900 uppercase">ID: {qrModalAppt._id?.slice(-8)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="px-6 py-5 bg-slate-50 dark:bg-slate-700/50 rounded-[2rem] border border-slate-100 dark:border-slate-600">
                        <p className="text-[10px] font-black uppercase text-primary-600 tracking-widest leading-none mb-2">Target Sector</p>
                        <p className="text-sm font-black dark:text-white uppercase truncate">{qrModalAppt.campId?.name || 'Sector Alpha'}</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1 truncate">
                            {qrModalAppt.campId?.location?.address || 'Zone Verified'}, {qrModalAppt.campId?.location?.city || ''}
                        </p>
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
                    <Navigation size={18} />
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
