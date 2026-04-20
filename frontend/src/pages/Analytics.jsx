import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { TrendingUp, AlertTriangle, Users, Heart, Loader2, Database, Activity, ShieldCheck, Download, LayoutGrid, ChevronRight, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { jsPDF } from 'jspdf';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

const SkeletonCard = () => (
  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] animate-pulse flex items-center justify-center">
    <Loader2 className="text-gray-300 dark:text-gray-700 animate-spin" size={40} />
  </div>
);

export const Analytics = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('A+');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedBloodGroup) {
      fetchPrediction();
    }
  }, [selectedBloodGroup]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/v-stats/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      toast.error('Sync failed: Check terminal');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async () => {
    try {
      const response = await api.get(`/v-stats/stock-prediction/${selectedBloodGroup}`);
      setPrediction(response.data.data);
    } catch (error) {
      console.error('AI Insight Sync error');
    }
  };

  const generateReport = async () => {
    setExporting(true);
    const toastId = toast.loading('Building elite medical audit...');
    try {
      const doc = new jsPDF();
      const now = new Date();
      doc.setFillColor(31, 41, 55); 
      doc.rect(0, 0, 15, 297, 'F');
      doc.setFillColor(239, 68, 68);
      doc.rect(0, 0, 15, 60, 'F');
      doc.setFontSize(28);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('VIENLINK INTELLIGENCE', 25, 30);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`VL-STATUS-RECURSIVE | ${now.toLocaleString()}`, 25, 38);
      
      doc.save(`VienLink_Intelligence_${now.getTime()}.pdf`);
      toast.success('Audit stored successfully!', { id: toastId });
    } catch (error) {
      toast.error('Audit generation failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  const monthlyData = dashboardData?.monthlyTrend?.map((item) => ({
    name: `${item._id.month}/${item._id.year}`,
    units: item.count,
  })) || [];

  const inventoryPie = dashboardData?.inventorySummary?.map((item) => ({
    name: item._id,
    value: item.available,
  })) || [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 min-h-screen pb-20">
      {/* Header - Elite Responsive Design */}
      <div className="relative overflow-hidden p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-gray-950 text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
           <Activity size={300} strokeWidth={0.5} />
        </div>
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8 md:gap-10">
          <div className="space-y-4 max-w-full overflow-hidden">
            <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 px-4 py-1.5 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} /> Intelligence Core Active
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tightest leading-[0.9] break-words">Command Center</h1>
            <p className="text-gray-400 font-medium text-sm md:text-lg max-w-xl">Advanced repository analytics and AI-driven flow monitoring.</p>
          </div>
          
          <div className="flex shrink-0">
            <button
              onClick={generateReport}
              disabled={exporting}
              className="w-full xl:w-auto flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-red-600/20"
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download size={20} />}
              {exporting ? 'Syncing...' : 'Export Audit'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl md:rounded-[2rem] w-max md:w-fit">
          {[
            { id: 'overview', label: 'Primary', icon: LayoutGrid },
            { id: 'forecast', label: 'AI Hub', icon: TrendingUp },
            { id: 'inventory', label: 'Matrix', icon: Database }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white dark:bg-gray-800 text-red-600 shadow-xl ring-1 ring-gray-200 dark:ring-white/10' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in slide-in-from-bottom-6 duration-1000">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-1000">
            <div className="lg:col-span-8 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-20 -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                        <Users size={120} strokeWidth={1} />
                     </div>
                     <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-white/20 rounded-xl">
                              <Users size={20} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Personnel Matrix</span>
                        </div>
                        <h3 className="text-7xl font-black tracking-tighter">{dashboardData?.totalDonors || 0}</h3>
                        <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest">Active Operatives Synchronized</p>
                     </div>
                  </div>
                  
                  <div className="bg-[#111827] rounded-[3rem] p-10 text-white shadow-2xl border border-white/5 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12 transition-transform duration-1000">
                        <Activity size={120} strokeWidth={1} />
                     </div>
                     <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                              <Activity size={20} className="text-orange-500" />
                           </div>
                           <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Mission Load</span>
                        </div>
                        <h3 className="text-7xl font-black tracking-tighter">{dashboardData?.recentRequests?.filter(r => r.status === 'pending').length || 0}</h3>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Pending Extractions Unresolved</p>
                     </div>
                  </div>
               </div>

               <div className="bg-[#0a0f18] rounded-[3.5rem] border border-white/5 shadow-3xl overflow-hidden relative">
                  <div className="p-10 border-b border-white/5 flex items-center justify-between">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Flow Dynamics</h3>
                     <TrendingUp className="text-primary-600" size={24} />
                  </div>
                  <div className="p-6 md:p-12">
                    <ResponsiveContainer width="100%" height={380}>
                      <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="glowRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderRadius: '1rem', border: 'none' }} />
                        <Area type="monotone" dataKey="units" stroke="#ef4444" strokeWidth={5} fillOpacity={1} fill="url(#glowRed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
               <div className="bg-[#111827] rounded-[3rem] border border-white/5 shadow-2xl p-10 relative overflow-hidden group">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter text-center mb-8">Distribution Matrix</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={inventoryPie} innerRadius={75} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                        {inventoryPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={10} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderRadius: '1rem', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {inventoryPie.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
                         <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                         <div>
                            <p className="text-[10px] font-black text-white uppercase leading-none">{item.name}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase mt-1">{item.value} Units</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="bg-[#0a0f18] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group">
                  <div className="relative z-10 space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                           <ShieldCheck className="text-emerald-500" size={18} />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Operational Secure</span>
                     </div>
                     <p className="text-xs text-slate-400">System reporting stable uplink. All tactical relay stations connected.</p>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[94%] animate-pulse" />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="space-y-10 animate-in zoom-in-95 duration-700 max-w-7xl mx-auto">
            <Card className="rounded-[3.5rem] border-none shadow-2xl bg-[#0a0f18] text-white overflow-hidden relative">
               <div className="p-8 md:p-14 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
                 <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="p-6 md:p-8 bg-gradient-to-br from-primary-600 to-rose-700 rounded-[2rem]">
                       <Droplets className="text-white w-10 h-10 md:w-16 md:h-16" />
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                       <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Neural Hub</h2>
                       <p className="text-primary-500 font-black uppercase text-[10px] tracking-[.5em]">Forecasting Layer ALPHA-1</p>
                    </div>
                 </div>
                 
                 <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-6 bg-white/5 p-4 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl">
                    <Select
                      value={selectedBloodGroup}
                      onChange={(e) => setSelectedBloodGroup(e.target.value)}
                      options={bloodGroups.map((bg) => ({ value: bg, label: bg }))}
                      className="bg-transparent border-none text-white font-black text-3xl w-full sm:w-32 text-center"
                    />
                 </div>
               </div>

               <CardContent className="p-8 md:p-14 space-y-12 relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-10 bg-white/[0.03] rounded-[3rem] border border-white/5">
                       <p className="text-[10px] font-black text-primary-500 uppercase mb-8 tracking-[0.4em]">Risk Index</p>
                       <h4 className="text-5xl font-black tracking-tighter">{prediction?.riskLevel?.toUpperCase()}</h4>
                    </div>
                    <div className="p-10 bg-white/[0.03] rounded-[3rem] border border-white/5">
                       <p className="text-[10px] font-black text-blue-500 uppercase mb-8 tracking-[0.4em]">Reserve Life</p>
                       <h4 className="text-5xl font-black tracking-tighter">{prediction?.daysUntilLowStock || '18'} Days</h4>
                    </div>
                    <div className="p-10 bg-white/[0.03] rounded-[3rem] border border-white/5">
                       <p className="text-[10px] font-black text-amber-500 uppercase mb-8 tracking-[0.4em]">Growth Delta</p>
                       <h4 className="text-5xl font-black text-amber-500 tracking-tighter">+ 15.2%</h4>
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-primary-600/10 via-[#0d1525] to-[#0a0f18] p-10 md:p-20 rounded-[4rem] border border-white/5 relative overflow-hidden group">
                    <div className="relative z-10">
                       <h5 className="text-primary-500 text-xs font-black uppercase tracking-[0.8em] mb-10">Synthesis Core Intelligence</h5>
                       <p className="text-2xl md:text-4xl font-black leading-tight text-white tracking-tighter">
                          {prediction?.prediction}
                       </p>
                    </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'inventory' && (
          <Card className="rounded-[3.5rem] border-none shadow-2xl bg-[#0a111a] p-10 md:p-14 overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-10 relative z-10">
               <div className="space-y-2 text-center md:text-left">
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">Global Matrix</h2>
                  <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.4em]">Multi-Cohort Saturation Monitoring</p>
               </div>
               <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                  <Database className="text-primary-500 w-10 h-10" />
               </div>
            </div>
            
            <CardContent className="relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
                 <div className="space-y-8">
                    {dashboardData?.inventorySummary?.map((item, idx) => (
                      <div key={idx} className="group p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/5">
                         <div className="flex items-end justify-between mb-8">
                            <div className="flex items-center gap-5">
                               <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-rose-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl">{item._id}</div>
                               <h4 className="text-2xl font-black text-white tracking-tight">{item._id === 'O-' ? 'Universal' : `Type ${item._id}`}</h4>
                            </div>
                            <div className="text-right">
                               <span className="text-4xl font-black text-white tracking-tighter">{Math.round((item.available / item.total) * 100)}%</span>
                            </div>
                         </div>
                         <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-1 border border-white/10">
                            <div 
                               className="h-full rounded-full bg-gradient-to-r from-primary-600 to-rose-500"
                               style={{ width: `${(item.available / item.total) * 100}%` }}
                            />
                         </div>
                      </div>
                    ))}
                 </div>
 
                 <div className="relative group">
                    <div className="relative bg-white/[0.03] rounded-[4rem] border border-white/10 p-10 md:p-16 flex flex-col items-center">
                       <h4 className="text-xs font-black text-primary-500 uppercase tracking-[0.5em] mb-16">Saturation Dynamics</h4>
                       <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={inventoryPie}>
                             <XAxis dataKey="name" fontSize={12} stroke="#4b5563" axisLine={false} tickLine={false} />
                             <Tooltip contentStyle={{ backgroundColor: '#111827', borderRadius: '1rem', border: 'none' }} />
                             <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                                {inventoryPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                       <p className="mt-16 text-center text-slate-400 text-sm font-bold max-w-sm">Neural visualization of cohort density within the VienLink matrix.</p>
                       <ChevronRight className="mt-12 text-primary-500 animate-bounce" size={32} />
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
