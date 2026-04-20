import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Calendar, Clock, Users, Plus, X, ArrowRight, Activity, ShieldCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const DonationSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointmentsModalSlot, setAppointmentsModalSlot] = useState(null);
  const [slotAppointments, setSlotAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    capacity: 10,
  });

  const fetchSlots = async () => {
    try {
      const res = await api.get('/hospital-slots');
      setSlots(res.data.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAppointments = async (slot) => {
    setAppointmentsModalSlot(slot);
    setSlotAppointments([]);
    setLoadingAppointments(true);
    try {
      const res = await api.get(`/hospital-slots/${slot._id}/appointments`);
      setSlotAppointments(res.data.data || res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime || !form.capacity) {
      toast.error('All fields are required');
      return;
    }

    const startTime = new Date(`${form.date}T${form.startTime}`);
    const endTime = new Date(`${form.date}T${form.endTime}`);

    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await api.post('/hospital-slots', {
        startTime,
        endTime,
        capacity: Number(form.capacity),
      });
      toast.success('Slot created successfully');
      setForm({ date: '', startTime: '', endTime: '', capacity: 10 });
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create slot');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCapacity = async (slotId, capacity) => {
    try {
      await api.put(`/hospital-slots/${slotId}`, { capacity });
      toast.success('Slot capacity updated');
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update slot');
    }
  };

  const handleCloseSlot = async (slotId) => {
    try {
      await api.put(`/hospital-slots/${slotId}`, { status: 'closed' });
      toast.success('Slot closed');
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close slot');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Slots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* Tactical Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-primary-600 rounded-[2rem] text-white shadow-xl shadow-primary-600/20">
                <Clock size={32} />
            </div>
            <div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Registration Ops</h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Donation Window Management
                </p>
            </div>
        </div>
      </div>

      {/* Main Grid Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Create Form */}
        <div className="xl:col-span-1 space-y-6">
            <Card className="rounded-[3rem] border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden bg-white dark:bg-slate-800/50 backdrop-blur-xl">
                <CardHeader className="border-b border-slate-50 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-3">
                        <Plus className="text-primary-600" size={20} />
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Deploy New Window</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    <form onSubmit={handleCreate} className="space-y-5">
                        <Input
                            label="Deployment Date"
                            type="date"
                            value={form.date}
                            onChange={handleChange('date')}
                            className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80"
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Window Start"
                                type="time"
                                value={form.startTime}
                                onChange={handleChange('startTime')}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80"
                                required
                            />
                            <Input
                                label="Window End"
                                type="time"
                                value={form.endTime}
                                onChange={handleChange('endTime')}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80"
                                required
                            />
                        </div>
                        <Input
                            label="Target Capacity (Donors)"
                            type="number"
                            min={1}
                            value={form.capacity}
                            onChange={handleChange('capacity')}
                            className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80"
                            required
                        />
                        <Button 
                            type="submit" 
                            disabled={saving}
                            className="w-full h-16 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
                        >
                            {saving ? 'Initializing...' : 'Authorize Window'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Quick Summary Widget */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity size={80} />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="inline-block bg-white/10 px-4 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest">Active Intel</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <h3 className="text-5xl font-black">{slots.filter(s => s.status === 'active').length}</h3>
                        <p className="text-xs font-black uppercase text-slate-400 mb-2">Live Gates</p>
                    </div>
                    <p className="text-xs font-medium text-slate-400">System is monitoring {slots.length} historical and live registration windows across all sectors.</p>
                </div>
            </div>
        </div>

        {/* Right Column: Existing Slots List */}
        <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Tactical Window Feed</h2>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{slots.length} Tracked</span>
                </div>
            </div>

            {slots.length === 0 ? (
                <div className="bg-white dark:bg-slate-800/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200">
                        <Calendar size={40} />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">No Scheduled Windows</h3>
                    <p className="text-sm text-slate-400 max-w-xs">Authorize your first registration window using the tactical form.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                    {slots.map((slot) => {
                        const remaining = slot.remaining ?? Math.max(0, (slot.capacity || 0) - (slot.bookedCount || 0));
                        const start = new Date(slot.startTime);
                        const end = new Date(slot.endTime);
                        const bookedPercent = Math.round(((slot.bookedCount || 0) / slot.capacity) * 100);

                        return (
                            <Card key={slot._id} className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden bg-white dark:bg-slate-800/50 backdrop-blur-xl">
                                <div className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                    
                                    {/* Slot Metadata */}
                                    <div className="flex items-start gap-6">
                                        <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner group-hover:bg-primary-600 transition-colors group-hover:text-white group-hover:border-primary-500">
                                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{format(start, 'MMM')}</span>
                                            <span className="text-2xl font-black leading-none">{format(start, 'dd')}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black uppercase tracking-tighter">{format(start, 'HH:mm')} — {format(end, 'HH:mm')}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    slot.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}>
                                                    {slot.status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} /> {format(start, 'EEEE, yyyy')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Capacity Intel */}
                                    <div className="flex-1 max-w-md space-y-3">
                                        <div className="flex justify-between items-end px-2">
                                            <div className="flex items-center gap-2">
                                                <Users size={16} className="text-primary-600" />
                                                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{slot.bookedCount || 0} <span className="text-slate-300 font-medium">/</span> {slot.capacity}</span>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${bookedPercent > 80 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                {remaining} Sectors Free
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                    bookedPercent >= 100 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 
                                                    bookedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                                }`}
                                                style={{ width: `${Math.min(100, bookedPercent)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Tactical Actions */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative group/input">
                                            <Input
                                                type="number"
                                                min={slot.bookedCount || 0}
                                                value={slot.capacity}
                                                onChange={(e) => handleUpdateCapacity(slot._id, Number(e.target.value) || slot.capacity)}
                                                className="w-24 h-12 rounded-xl text-center bg-slate-50 dark:bg-slate-800/80 font-black border-none focus:ring-2 focus:ring-primary-500 transition-all"
                                                title="Reconfig Capacity"
                                            />
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/input:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Update Cap</div>
                                        </div>
                                        
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewAppointments(slot)}
                                            className="h-12 rounded-xl px-6 border-slate-200 dark:border-slate-700 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm transition-all active:scale-95"
                                        >
                                            <Users size={14} /> Intel
                                            {(slot.bookedCount || 0) > 0 && (
                                                <span className="flex h-5 w-5 rounded-full bg-primary-600 text-white items-center justify-center text-[8px]">
                                                    {slot.bookedCount}
                                                </span>
                                            )}
                                        </Button>

                                        <button
                                            disabled={slot.status === 'closed'}
                                            onClick={() => handleCloseSlot(slot._id)}
                                            className={`p-3 rounded-xl transition-all shadow-sm active:scale-90 ${
                                                slot.status === 'closed' ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100'
                                            }`}
                                            title="Abort Window"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* Appointment Intel Modal */}
      {appointmentsModalSlot && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-4xl max-h-[85vh] rounded-[3.5rem] border-slate-800 shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-300">
                <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-primary-600/10 rounded-2xl text-primary-600">
                                <Users size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tighter">Mission Manifest</CardTitle>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    {format(new Date(appointmentsModalSlot.startTime), 'MMM dd')} • {format(new Date(appointmentsModalSlot.startTime), 'HH:mm')} - {format(new Date(appointmentsModalSlot.endTime), 'HH:mm')}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setAppointmentsModalSlot(null)} className="p-4 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all text-slate-400">
                            <X size={24} />
                        </button>
                    </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {loadingAppointments ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deciphering Personnel List...</p>
                        </div>
                    ) : slotAppointments.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-slate-300">
                                <Activity size={48} />
                            </div>
                            <h3 className="text-xl font-black uppercase">No Ground Signals</h3>
                            <p className="text-sm text-slate-400">Awaiting personnel deployment authorizations.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Deployments', value: slotAppointments.length, color: 'text-primary-600' },
                                    { label: 'Confirmed Locked', value: slotAppointments.filter(a => a.status === 'booked').length, color: 'text-blue-500' },
                                    { label: 'Mission Success', value: slotAppointments.filter(a => a.status === 'completed').length, color: 'text-emerald-500' },
                                    { label: 'Unallocated', value: appointmentsModalSlot.capacity - slotAppointments.length, color: 'text-slate-400' }
                                ].map((m, i) => (
                                    <div key={i} className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                                        <span className={`text-3xl font-black ${m.color} mb-1`}>{m.value}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{m.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">Sector Personnel Feed</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {slotAppointments.map((appt) => (
                                        <div key={appt._id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-105 transition-transform">
                                                <ShieldCheck size={80} />
                                            </div>
                                            <div className="flex items-start gap-4 mb-6 relative z-10">
                                                <div className="w-14 h-14 bg-slate-900 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:bg-primary-600 transition-colors">
                                                    {appt.userId?.bloodGroup || '??'}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">
                                                        {appt.userId?.firstName} {appt.userId?.lastName}
                                                    </h3>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <MapPin size={10} /> {appt.userId?.city || 'Unknown Sector'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-[10px] font-black relative z-10">
                                                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
                                                    <span className="truncate">{appt.userId?.phone}</span>
                                                </div>
                                                <div className={`p-2 rounded-xl flex items-center gap-2 border ${
                                                    appt.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${appt.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                                    <span className="uppercase">{appt.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                
                <CardHeader className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <Button 
                        variant="outline" 
                        onClick={() => setAppointmentsModalSlot(null)}
                        className="w-full h-14 rounded-2xl border-slate-200 dark:border-slate-700 font-black uppercase tracking-widest text-xs"
                    >
                        Secure Manifest
                    </Button>
                </CardHeader>
            </Card>
        </div>
      )}
    </div>
  );
};
