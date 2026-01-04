
import React, { useState } from 'react';
import { UserProfile, ThemeColor, ChatModel } from '../types';
import { api } from '../services/mockApi';

interface SettingsScreenProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile | null) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onUpdateUser }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const colors: { id: ThemeColor; hex: string; label: string }[] = [
    { id: 'violet', hex: '#8b5cf6', label: 'Classic' },
    { id: 'emerald', hex: '#10b981', label: 'Green' },
    { id: 'blue', hex: '#3b82f6', label: 'Blue' },
    { id: 'rose', hex: '#f43f5e', label: 'Rose' },
    { id: 'amber', hex: '#f59e0b', label: 'Honey' },
  ];

  const updateSetting = <K extends keyof UserProfile['settings']>(key: K, value: UserProfile['settings'][K]) => {
    const updatedUser = {
      ...user,
      settings: { ...user.settings, [key]: value }
    };
    onUpdateUser(updatedUser);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out? All local progress will be reset.")) {
      api.logout();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <header className="px-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Control <span className="gradient-text">Panel</span></h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Configure your terminal</p>
      </header>

      <section className="glass-card p-6 rounded-3xl space-y-4 border border-slate-800">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interface Skin</h3>
        <div className="flex justify-between gap-2">
          {colors.map((c) => (
            <button key={c.id} onClick={() => updateSetting('color', c.id)} className={`w-10 h-10 rounded-full border-2 transition-all ${user.settings.color === c.id ? 'border-white scale-110' : 'border-transparent opacity-50'}`} style={{ backgroundColor: c.hex }} />
          ))}
        </div>
      </section>

      <section className="glass-card p-6 rounded-3xl space-y-6 border border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-white uppercase">Ranked Tracking</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase">Toggle competitive metrics</p>
          </div>
          <button onClick={() => updateSetting('isRankedMode', !user.settings.isRankedMode)} className={`w-12 h-6 rounded-full transition-all relative ${user.settings.isRankedMode ? 'bg-primary' : 'bg-slate-800'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.isRankedMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <div>
            <h4 className="text-xs font-black text-white uppercase">High Contrast</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase">Pure black background</p>
          </div>
          <button onClick={() => updateSetting('isHighContrast', !user.settings.isHighContrast)} className={`w-12 h-6 rounded-full transition-all relative ${user.settings.isHighContrast ? 'bg-violet-600' : 'bg-slate-800'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.isHighContrast ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <button onClick={() => setIsSyncing(true)} className="p-4 rounded-2xl border-2 border-dashed border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">
          {isSyncing ? 'Syncing...' : 'Force Sync Data'}
        </button>
        <button onClick={handleLogout} className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-900/30 transition-all">
          Logout & Reset
        </button>
      </div>

      <footer className="text-center opacity-30 mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Questly Core v1.1.2</p>
      </footer>
    </div>
  );
};

export default SettingsScreen;
