import { useState, useEffect, useRef } from 'react';
import { usePublicAuth } from '../../context/PublicAuthContext';
import { useSearch } from '../../context/SearchContext';
import { useTheme } from '../../context/ThemeContext';
import { 
    LayoutDashboard, 
    Zap, 
    MapPin, 
    History, 
    Calendar, 
    Users, 
    Droplet, 
    LogOut, 
    Menu, 
    Search, 
    Bell, 
    ChevronDown, 
    User,
    Settings, 
    ShieldCheck,
    Sun,
    Moon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const DonorLayout = ({ children }) => {
    const { user, logout } = usePublicAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const { searchQuery, setSearchQuery } = useSearch();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        // DOM Reparenting for Global Translator Widget
        const targetContainer = document.getElementById('nav_translate_container');
        const gtElement = document.getElementById('google_translate_element');
        
        let timer = null;
        if (targetContainer && gtElement) {
            targetContainer.appendChild(gtElement);
        } else {
            // Give root a moment if racing
            timer = setTimeout(() => {
                const retryContainer = document.getElementById('nav_translate_container');
                const retryGt = document.getElementById('google_translate_element');
                if (retryContainer && retryGt) retryContainer.appendChild(retryGt);
            }, 300);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (timer) clearTimeout(timer);
            
            // Return to root wrapper on unmount
            const wrapper = document.getElementById('google_translate_wrapper');
            const gtRef = document.getElementById('google_translate_element');
            if (wrapper && gtRef) {
                wrapper.appendChild(gtRef);
            }
        };
    }, []);

    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/user/donor-dashboard' },
        { id: 'emergency', label: 'Emergency Help', icon: Zap, path: '/user/emergency' },
        { id: 'map', label: 'Live Demand Map', icon: MapPin, path: '/live-map' },
        { id: 'history', label: 'Mission Log', icon: History, path: '/user/donor-dashboard?tab=history' },
        { id: 'signals', label: 'Tactical Signals', icon: Bell, path: '/user/donor-dashboard?tab=notifications' },
        { id: 'appointments', label: 'Appointments', icon: Calendar, path: '/user/appointments' },
        { id: 'camps', label: 'Blood Camps', icon: Users, path: '/user/camps' },
        { id: 'request', label: 'Resource Request', icon: Droplet, path: '/user/request-blood' },
        { id: 'profile', label: 'Manage Profile', icon: Settings, path: '/user/donor-dashboard?tab=profile' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden relative">
            {/* Sidebar Backdrop */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
                transform transition-all duration-300 z-40 shadow-2xl lg:shadow-none
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center font-extrabold text-white shadow-xl shadow-primary-600/20 cursor-pointer hover:rotate-12 transition-transform" 
                                onClick={() => navigate('/user/donor-dashboard')}
                            >
                                V
                            </div>
                            <div>
                                <h1 className="text-2xl font-black bg-gradient-to-r from-primary-600 to-rose-500 bg-clip-text text-transparent tracking-tighter">Vein Link</h1>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] leading-none">Tactical Hub</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto custom-scrollbar pt-8">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const currentPath = location.pathname + location.search;
                            const isActive = currentPath === item.path || 
                                            (item.path === '/user/donor-dashboard' && (currentPath === '/user/donor-dashboard?tab=overview' || currentPath === '/user/donor-dashboard/'));
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        navigate(item.path);
                                        setSidebarOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative
                                        ${isActive 
                                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-black' 
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                        }
                                    `}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 w-1.5 h-6 bg-primary-600 rounded-r-full" />
                                    )}
                                    <Icon 
                                        size={22} 
                                        className={`${isActive ? 'text-primary-600' : 'group-hover:text-primary-600 transition-colors'}`} 
                                        strokeWidth={isActive ? 3 : 2} 
                                    />
                                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer / User Info */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-sm shadow-lg">
                                    {user?.bloodGroup}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <ShieldCheck size={12} className="text-emerald-500" />
                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Verified</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={logout}
                            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all font-black uppercase text-[10px] tracking-widest group"
                        >
                            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                            <span>Terminate Link</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-72 relative">
                
                {/* Header */}
                <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 flex-shrink-0 lg:hidden">
                    <div className="h-20 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(true)} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                                <Menu size={24} />
                            </button>
                            <h2 className="font-black uppercase tracking-tighter text-xl">Vien<span className="text-primary-600">Link</span></h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={toggleDarkMode}
                                className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-xs">
                                 {user?.bloodGroup}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tactical Search Bar (Hidden on Mobile) */}
                <div className="hidden lg:flex h-20 items-center justify-between px-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
                     <div className="relative flex-1 max-w-2xl">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                          <input 
                              type="text" 
                              placeholder="Synchronize tactical records..." 
                              value={searchQuery || ''}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-16 pr-8 py-4 bg-slate-100 dark:bg-slate-800/50 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder:text-slate-400 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                          />
                     </div>

                     <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-5 py-2.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                               <Users size={16} className="text-primary-600" />
                               <div id="nav_translate_container" className="h-6 flex items-center"></div>
                          </div>
                          
                          <button 
                               onClick={toggleDarkMode}
                               className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                           >
                               {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                           </button>

                           <button className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl relative transition-all">
                                <Bell size={24} />
                                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-600 rounded-full border-[3px] border-white dark:border-slate-900"></span>
                           </button>

                          <div className="relative group" ref={dropdownRef}>
                               <button 
                                   onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                   className="flex items-center gap-3 p-1.5 pr-4 rounded-[1.5rem] bg-slate-900 dark:bg-white transition-all shadow-xl"
                               >
                                   <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-sm">
                                       {user?.firstName?.[0]}{user?.lastName?.[0]}
                                   </div>
                                   <div className="text-left">
                                        <p className="text-[10px] font-black text-white dark:text-black uppercase leading-none truncate w-24">{user?.firstName}</p>
                                        <p className="text-[8px] font-black text-primary-500 uppercase tracking-widest leading-none mt-1">Operative</p>
                                   </div>
                                   <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                               </button>

                               {profileDropdownOpen && (
                                   <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                       <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700 mb-2">
                                           <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user?.email}</p>
                                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Verified Pulse Link</p>
                                       </div>
                                       <button 
                                           onClick={() => { navigate('/user/donor-dashboard?tab=profile'); setProfileDropdownOpen(false); }}
                                           className="w-full flex items-center gap-4 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                       >
                                           <User size={18} />
                                           <span>Manage Profile</span>
                                       </button>
                                       <div className="h-px bg-slate-50 dark:bg-slate-700 mx-4 my-2"></div>
                                       <button 
                                           onClick={logout}
                                           className="w-full flex items-center gap-4 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                       >
                                           <LogOut size={18} />
                                           <span>Terminate Link</span>
                                       </button>
                                   </div>
                               )}
                          </div>
                     </div>
                </div>

                <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 p-6 lg:p-10">
                    {children}
                </main>
            </div>
        </div>
    );
};
