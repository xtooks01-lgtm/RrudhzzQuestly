
import React, { useState } from 'react';
import { UserProfile, ThemeColor, ChatModel } from '../types';
import { api } from '../services/mockApi';

interface SettingsScreenProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
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

  const personalities = [
    { label: 'Friendly Mentor', value: 'Brilliant, supportive, and warm personal guide.' },
    { label: 'Academic Coach', value: 'Focused, disciplined, and results-oriented coach.' },
    { label: 'Creative Peer', value: 'Creative, inspiring, and approachable study partner.' }
  ];

  const updateSetting = <K extends keyof UserProfile['settings']>(key: K, value: UserProfile['settings'][K]) => {
    const updatedUser = {
      ...user,
      settings: { ...user.settings, [key]: value }
    };
    onUpdateUser(updatedUser);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await api.syncData();
    setIsSyncing(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <header className="px-2">
        <h1 className="text-3xl font-bold tracking-tight">Your <span className="gradient-text">Settings</span></h1>
        <p className="text-slate-400 text-sm mt-1">Make Questly feel just right for you</p>
      </header>

      <section className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <h3 className="font-bold text-slate-200">Ranked Mode</h3>
              <p className="text-xs text-slate-500">Track your progress through ranks</p>
            </div>
          </div>
          <button 
            onClick={() => updateSetting('isRankedMode', !user.settings.isRankedMode)}
            className={`w-12 h-6 rounded-full transition-all relative ${user.settings.isRankedMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.isRankedMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </section>

      <section className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg">💡</span>
          <h3 className="font-bold text-slate-200">AI Intelligence</h3>
        </div>
        <div className="flex gap-3">
          <button onClick={() => updateSetting('modelPreference', 'fast')} className={`flex-1 p-4 rounded-2xl border transition-all text-center ${user.settings.modelPreference === 'fast' ? 'bg-violet-600/20 border-violet-500' : 'bg-slate-800/40 border-slate-700'}`}>
            <p className="text-sm font-bold text-slate-200">Standard</p>
            <p className="text-[10px] text-slate-500 mt-1">Faster responses</p>
          </button>
          <button onClick={() => updateSetting('modelPreference', 'genius')} className={`flex-1 p-4 rounded-2xl border transition-all text-center ${user.settings.modelPreference === 'genius' ? 'bg-violet-600/20 border-violet-500' : 'bg-slate-800/40 border-slate-700'}`}>
            <p className="text-sm font-bold text-slate-200">Genius</p>
            <p className="text-[10px] text-slate-500 mt-1">Deeper logic</p>
          </button>
        </div>
      </section>

      <section className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg">🎓</span>
          <h3 className="font-bold text-slate-200">Dr. Rudhh's Style</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {personalities.map((p) => (
            <button key={p.label} onClick={() => updateSetting('rudhhPersonality', p.value)} className={`p-3 rounded-2xl text-left transition-all border ${user.settings.rudhhPersonality === p.value ? 'bg-violet-600/20 border-violet-500' : 'bg-slate-800/40 border-slate-700'}`}>
              <p className={`text-sm font-bold ${user.settings.rudhhPersonality === p.value ? 'text-violet-400' : 'text-slate-200'}`}>{p.label}</p>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{p.value}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card p-6 rounded-3xl space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-200 mb-4">Choose your Theme</h3>
          <div className="flex justify-between gap-2">
            {colors.map((c) => (
              <button key={c.id} onClick={() => updateSetting('color', c.id)} className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${user.settings.color === c.id ? 'bg-slate-800' : ''}`}>
                <div className={`w-8 h-8 rounded-full border-2 ${user.settings.color === c.id ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div>
            <h3 className="font-bold text-slate-200 text-sm">OLED Mode</h3>
            <p className="text-[10px] text-slate-500">Pure black background</p>
          </div>
          <button onClick={() => updateSetting('isHighContrast', !user.settings.isHighContrast)} className={`w-12 h-6 rounded-full transition-all relative ${user.settings.isHighContrast ? 'bg-violet-600' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.isHighContrast ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </section>

      <button onClick={handleSync} disabled={isSyncing} className="p-4 rounded-3xl border-dashed border-2 border-slate-800 text-slate-500 font-bold text-xs hover:text-slate-300 transition-all flex items-center justify-center gap-3">
        {isSyncing ? 'Syncing...' : 'Save data manually'}
      </button>

      <footer className="text-center opacity-30 mt-4">
        <p className="text-[10px] font-bold">Questly • Version 1.0.0</p>
      </footer>
    </div>
  );
};

export default SettingsScreen;
