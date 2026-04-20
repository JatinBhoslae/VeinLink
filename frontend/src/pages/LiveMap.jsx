import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import publicApi from '../lib/publicApi';
import toast from 'react-hot-toast';
import { DonorLayout } from '../components/Layout/DonorLayout';

export const LiveMap = () => {
    const navigate = useNavigate();
    const [mapData, setMapData] = useState([]);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const layerGroupRef = useRef(null);

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const res = await publicApi.get('/v-stats/live-map-data');
                if (res.data.success) {
                    setMapData(res.data.data);
                }
            } catch (err) {
                toast.error('Failed to load live map data');
            } finally {
                setLoading(false);
            }
        };
        fetchMapData();
    }, []);

    useEffect(() => {
        if (loading || !window.L) return;

        // Initialize Map Tracker if not exists
        if (!mapRef.current) {
            const mapElement = document.getElementById('tactical-map');
            if (!mapElement) return;

            const map = window.L.map('tactical-map', {
                zoomControl: false,
                attributionControl: false
            }).setView([18.5204, 73.8567], 13);

            window.L.control.zoom({ position: 'topright' }).addTo(map);

            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © Carto',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            layerGroupRef.current = window.L.layerGroup().addTo(map);
            mapRef.current = map;
        }

        const map = mapRef.current;
        const layerGroup = layerGroupRef.current;

        // Clear existing tactical layers
        layerGroup.clearLayers();

        // Spawn Signals (Hospital Wise)
        mapData.forEach((h) => {
            const lat = h.coordinates?.[1] || 18.5204;
            const lng = h.coordinates?.[0] || 73.8567;

            const svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="${h.color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3" fill="white"></circle>
                </svg>
            `;
            
            const customIcon = window.L.divIcon({
                className: h.status === 'critical' ? 'animate-pulse cursor-pointer' : 'cursor-pointer',
                html: svgIcon,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });

            const marker = window.L.marker([lat, lng], { icon: customIcon });
            
            // Add Tactical Demand Circle (Region)
            const circle = window.L.circle([lat, lng], {
                color: h.color,
                fillColor: h.color,
                fillOpacity: 0.15,
                radius: 1200,
                weight: 1,
                className: h.status === 'critical' ? 'animate-pulse cursor-pointer' : 'cursor-pointer'
            });

            // Build Dynamic Popup Payload
            const inventory = h.bloodInventory || { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 };
            const invHTML = Object.entries(inventory).map(([group, count]) => `
                <div class="flex flex-col items-center py-1 px-0.5 bg-slate-100 rounded-md">
                    <span class="text-[8px] font-black w-full text-center ${count === 0 ? 'text-red-500' : 'text-emerald-600'}">${group}</span>
                    <span class="text-[10px] font-bold text-slate-800">${count}</span>
                </div>
            `).join('');

            const popupContent = `
                <div class="p-3 w-64 font-sans text-left">
                    <div class="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                        <div>
                            <h3 class="text-[13px] font-black uppercase text-gray-900 tracking-tight m-0 p-0">${h.name}</h3>
                            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate w-48 m-0 p-0">${h.address}</p>
                        </div>
                    </div>
                    <div class="mb-3">
                        <span class="text-[8px] uppercase tracking-widest text-slate-400 font-black mb-1 block">Blood Reserve Matrix</span>
                        <div class="grid grid-cols-4 gap-1">
                            ${invHTML}
                        </div>
                    </div>
                    <div class="flex gap-2 mb-3">
                        <div class="flex-1 bg-gray-50 p-2 rounded-xl flex flex-col items-center justify-center text-center">
                            <span class="text-lg font-black text-gray-900 leading-none">${h.availableUnits}</span>
                            <span class="text-[8px] text-gray-400 uppercase font-black tracking-widest mt-1">Total Supply</span>
                        </div>
                        <div class="flex-1 bg-gray-50 p-2 rounded-xl flex flex-col items-center justify-center text-center">
                            <span class="text-lg font-black ${h.pendingRequests > 0 ? 'text-red-500' : 'text-gray-900'} leading-none">${h.pendingRequests}</span>
                            <span class="text-[8px] text-gray-400 uppercase font-black tracking-widest mt-1">SOS Requests</span>
                        </div>
                    </div>
                    <button id="infiltrate-btn-${h.id}" class="w-full bg-slate-900 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest shadow-xl cursor-pointer hover:bg-slate-800 border-none transition-all">Support Hospital</button>
                </div>
            `;

            const popupOptions = { className: 'tactical-popup border-none p-0 focus:outline-none' };
            marker.bindPopup(popupContent, popupOptions);
            circle.bindPopup(popupContent, popupOptions);

            const syncButtons = () => {
                const btn = document.getElementById(`infiltrate-btn-${h.id}`);
                if (btn) btn.onclick = () => window.location.href = '/user/appointments';
            };

            marker.on('popupopen', syncButtons);
            circle.on('popupopen', syncButtons);

            marker.addTo(layerGroup);
            circle.addTo(layerGroup);
        });

        // Frame target
        if (mapData.length > 0) {
            const bounds = window.L.latLngBounds(mapData.map(h => [
                h.coordinates?.[1] || 18.5204,
                h.coordinates?.[0] || 73.8567
            ]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        return () => {
            // Cleanup on final unmount or dependency change? 
            // In React 18 strict mode, this will run, so we need to be careful.
            // But since we use mapRef.current, we can just keep the map alive.
        };
    }, [loading, mapData]);

    return (
        <DonorLayout>
            <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative" style={{ minHeight: 'calc(100vh - 80px)' }}>
                <style dangerouslySetInnerHTML={{__html: `
                    .tactical-popup .leaflet-popup-content-wrapper { background: white; border-radius: 1.5rem; padding: 0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); overflow: hidden; }
                    .tactical-popup .leaflet-popup-content { margin: 12px; line-height: inherit; }
                    .tactical-popup .leaflet-popup-tip { background: white; }
                    .leaflet-container { font-family: inherit; background: #0f172a; }
                    .cursor-pointer { cursor: pointer !important; }
                `}} />

                <div className="absolute top-6 left-6 z-[1000] hidden md:flex flex-col gap-3 p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl animate-in slide-in-from-left-4 duration-700">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-1">
                        <Zap size={18} className="text-primary-600 animate-pulse" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Demand Radar HUD</h3>
                    </div>
                    <div className="flex items-center gap-4"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sufficient Units</span></div>
                    <div className="flex items-center gap-4"><span className="w-3 h-3 rounded-full bg-yellow-500"></span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moderate Signal</span></div>
                    <div className="flex items-center gap-4"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Alert</span></div>
                </div>

                <div className="flex-1 w-full h-full relative z-[1]">
                    {loading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 space-y-4">
                            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Calibrating Demand Satellite...</p>
                        </div>
                    ) : (
                        <div id="tactical-map" className="w-full h-full min-h-[500px]"></div>
                    )}
                </div>

                <div className="md:hidden absolute bottom-6 left-6 right-6 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-[2rem] shadow-2xl flex justify-around">
                    <div className="flex flex-col items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Sufficient</span></div>
                    <div className="flex flex-col items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span><span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Moderate</span></div>
                    <div className="flex flex-col items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span><span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Critical</span></div>
                </div>
            </div>
        </DonorLayout>
    );
};
