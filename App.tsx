
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, UserProfile, DailyProgress, RankName, RankTier, Badge } from './types';
import { api } from './services/mockApi';
import Navigation from './components/Navigation';
import HomeScreen from './screens/HomeScreen';
import ProgressScreen from './screens/ProgressScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import AiLabScreen from './screens/AiLabScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { XP_PER_LEVEL, RANKS, TIERS, XP_PER_TIER, INITIAL_BADGES } from './components/constants';
import { getProgressNudge } from './services/geminiService';
import { soundService } from './services/soundService';

const LogoQ = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="url(#logo-gradient)" strokeWidth="8" />
    <path d="M50 30V50L65 65" stroke="url(#logo-gradient)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--primary-color)" />
        <stop offset="1" stopColor="var(--secondary-color)" />
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [isSplashLoading, setIsSplashLoading] = useState(true);
  const [tutorialStep, setTutorialStep] = useState<number>(-1);

  useEffect(() => {
    const data = api.getData();
    setTasks(data.tasks || []);
    setUser(data.user);
    setHistory(data.history || []);
    
    if (data.user?.onboardingComplete && !data.user.tutorialComplete) {
      setTutorialStep(0);
    }
    
    const timer = setTimeout(() => setIsSplashLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) api.updateUser(user);
  }, [user]);

  useEffect(() => {
    api.updateTasks(tasks);
  }, [tasks]);

  const handleTaskXP = useCallback((xpValue: number, isMajorQuest: boolean = true) => {
    if (!user) return;
    setUser(prev => {
      if (!prev) return null;
      const newXP = Math.max(0, prev.xp + xpValue);
      const newRankXP = Math.max(0, prev.rankXP + xpValue);
      return { ...prev, xp: newXP, rankXP: newRankXP, totalCompleted: prev.totalCompleted + (xpValue > 0 ? 1 : 0) };
    });
  }, [user]);

  const completeTutorial = () => {
    if (user) {
      const updated = { ...user, tutorialComplete: true };
      setUser(updated);
      api.updateUser(updated);
    }
    setTutorialStep(-1);
  };

  const tutorialPages = [
    { title: "The Quest System", desc: "Break goals into Quests. Complete them before the timer runs out to avoid XP penalties." },
    { title: "Daily Timetable", desc: "Use the timetable to track your fixed schedule. It keeps your day structured." },
    { title: "Mastery & Ranks", desc: "Earn RP to level up from Iron to Mythic. Show your academic dominance!" }
  ];

  if (isSplashLoading) return (
    <div className="fixed inset-0 z-[2000] bg-[#0f172a] flex flex-col items-center justify-center animate-fadeIn">
      <LogoQ className="w-24 h-24 mb-6 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)] animate-scaleUp" />
      <h1 className="text-3xl font-black text-white italic">Questly</h1>
    </div>
  );

  if (!user) return null;
  if (!user.onboardingComplete) {
    return <OnboardingScreen onComplete={(u, t) => { setUser(u); setTasks(t); setTutorialStep(0); }} />;
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto relative overflow-x-hidden bg-[#0f172a] text-slate-100">
      {/* Tutorial Overlay */}
      {tutorialStep >= 0 && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-8 text-center animate-fadeIn">
          <div className="max-w-xs space-y-6">
            <h2 className="text-3xl font-black text-primary uppercase tracking-tighter italic">{tutorialPages[tutorialStep].title}</h2>
            <p className="text-slate-400 font-medium leading-relaxed">{tutorialPages[tutorialStep].desc}</p>
            <div className="flex flex-col gap-3 pt-6">
              <button 
                onClick={() => tutorialStep < 2 ? setTutorialStep(tutorialStep + 1) : completeTutorial()} 
                className="w-full bg-white text-slate-950 p-4 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                {tutorialStep < 2 ? 'Next intel' : 'Initiate Mission'}
              </button>
              <button onClick={completeTutorial} className="text-[10px] font-black text-slate-600 uppercase">Skip Tutorial</button>
            </div>
          </div>
        </div>
      )}

      <header className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-[#0f172a]/90 backdrop-blur-xl z-40 border-b border-white/5">
        <div className="flex items-center gap-2">
          <LogoQ className="w-8 h-8" />
          <span className="text-xl font-black tracking-tighter uppercase italic">Questly</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
             <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Lvl {user.level}</span>
             <div className="w-14 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden border border-white/5">
               <div className="h-full bg-primary" style={{ width: `${(user.xp % XP_PER_LEVEL) / (XP_PER_LEVEL/100)}%` }} />
             </div>
          </div>
        </div>
      </header>

      <main className="p-6 pt-4 pb-32">
        {activeTab === 'home' && <HomeScreen user={user} tasks={tasks} onTasksUpdate={setTasks} onComplete={handleTaskXP} />}
        {activeTab === 'chat' && <AiLabScreen user={user} tasks={tasks} />}
        {activeTab === 'progress' && <ProgressScreen user={user} history={history} tasks={tasks} />}
        {activeTab === 'profile' && <ProfileScreen user={user} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onUpdateUser={setUser} />}
      </main>

      <Navigation currentTab={activeTab} setTab={setActiveTab} />

      <style>{`
        :root { --primary-color: #8b5cf6; --secondary-color: #6366f1; }
        .text-primary { color: var(--primary-color); }
        .bg-primary { background-color: var(--primary-color); }
        .gradient-bg { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); }
        .gradient-text { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
