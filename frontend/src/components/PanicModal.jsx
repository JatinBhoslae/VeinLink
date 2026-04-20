import React, { useState } from 'react';
import { Button } from './ui/Button';
import { AlertCircle, X, Check } from 'lucide-react';

export const PanicModal = ({ isOpen, onClose, onConfirm, loading, initialGroups = [] }) => {
  const [selectedGroups, setSelectedGroups] = useState(initialGroups);
  const [message, setMessage] = useState('');

  // Update selection if initialGroups changes while modal is open
  React.useEffect(() => {
    if (isOpen) {
      setSelectedGroups(initialGroups);
    }
  }, [isOpen, initialGroups]);
  
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const toggleGroup = (group) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter(g => g !== group));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleConfirm = () => {
    if (selectedGroups.length === 0) {
      alert('Please select at least one blood group.');
      return;
    }
    onConfirm({ bloodGroups: selectedGroups, message });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Panic Broadcast</h2>
              <p className="text-red-100 text-sm font-bold uppercase tracking-widest">Emergency Deployment Core</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Target Blood Cohorts</label>
            <div className="grid grid-cols-4 gap-3">
              {bloodGroups.map((bg) => (
                <button
                  key={bg}
                  onClick={() => toggleGroup(bg)}
                  className={`py-3 rounded-2xl font-black text-sm transition-all border-2 ${
                    selectedGroups.includes(bg)
                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-transparent border-gray-100 dark:border-gray-800 text-gray-500 hover:border-red-200'
                  }`}
                >
                  {bg}
                  {selectedGroups.includes(bg) && <Check size={12} className="inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Emergency Message (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="E.g., Urgent bypass surgery starting in 30 mins. Need 5 units."
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm focus:ring-2 ring-red-500 h-24 resize-none"
            />
          </div>

          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20 flex gap-3">
            <AlertCircle className="text-red-600 shrink-0" size={18} />
            <p className="text-[10px] text-red-800 dark:text-red-400 font-medium leading-relaxed">
              WARNING: This will immediately notify ALL matching donors and hospitals in the network. Use only for life-threatening situations.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="secondary" className="flex-1 rounded-2xl py-4" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              className="flex-[2] rounded-2xl py-4 font-black tracking-widest" 
              onClick={handleConfirm}
              loading={loading}
              disabled={selectedGroups.length === 0}
            >
              INITIALIZE BROADCAST
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
