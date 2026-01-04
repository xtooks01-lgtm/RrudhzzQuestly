
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
    <path 
      d="M50 30V50L65 65" 
      stroke="url(#logo-gradient)" 
      strokeWidth="8" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
  const [nudge, setNudge] = useState<string>('');
  const [lastXPChange, setLastXPChange] = useState<{ amount: number; isGain: boolean } | null>(null);
  const [rankTransition, setRankTransition] = useState<{ type: 'up' | 'down'; rank: string } | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [isSplashLoading, setIsSplashLoading] = useState(true);
  const [tutorialStep, setTutorialStep] = useState<number>(-1);

  // Initial load
  useEffect(() => {
    const data = api.getData();
    setTasks(data.tasks || []);
    setUser(data.user);
    setHistory(data.history || []);

    if (data.user?.onboardingComplete) {
      if (!data.user.tutorialComplete) {
        setTutorialStep(0);
      }
      // Nudge moved to its own effect based on task changes
    }
    
    const timer = setTimeout(() => setIsSplashLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Persistent storage effects
  useEffect(() => {
    if (user) api.updateUser(user);
  }, [user]);

  useEffect(() => {
    api.updateTasks(tasks);
    if (user?.onboardingComplete) {
      const completed = tasks.filter(t => t.isCompleted).length;
      getProgressNudge(completed, tasks.length).then(setNudge).catch(() => {});
    }
  }, [tasks]);

  useEffect(() => {
    if (history.length > 0) api.updateHistory(history);
  }, [history]);

  const calculateRankAndTier = (xp: number): { rank: RankName; tier: RankTier; absoluteRankValue: number } => {
    const totalTiers = Math.floor(xp / XP_PER_TIER);
    const rankIndex = Math.min(Math.floor(totalTiers / TIERS.length), RANKS.length - 1);
    const tierIndex = totalTiers % TIERS.length;
    return {
      rank: RANKS[rankIndex],
      tier: TIERS[tierIndex],
      absoluteRankValue: totalTiers
    };
  };

  const getAbsoluteRankValueFromLabel = (label: string) => {
    const parts = label.split(' ');
    if (parts.length < 2) return 0;
    const rIdx = RANKS.indexOf(parts[0] as RankName);
    const tIdx = TIERS.indexOf(parts[1] as RankTier);
    return (rIdx * TIERS.length) + tIdx;
  };

  const checkAndAwardBadges = (updatedUser: UserProfile, currentTasks: Task[]): UserProfile => {
    const newBadges: Badge[] = [...updatedUser.badges];
    const newlyUnlocked: Badge[] = [];
    const isUnlocked = (id: string) => newBadges.some(b => b.id === id);

    if (updatedUser.totalCompleted >= 1 && !isUnlocked('1')) newlyUnlocked.push(INITIAL_BADGES.find(b => b.id === '1')!);
    if (updatedUser.streak >= 7 && !isUnlocked('2')) newlyUnlocked.push(INITIAL_BADGES.find(b => b.id === '2')!);
    
    if (newlyUnlocked.length > 0) {
      soundService.playBadge();
      const timestamp = new Date().toISOString();
      const badgesToAdd = newlyUnlocked.map(b => ({ ...b, unlockedAt: timestamp }));
      newBadges.push(...badgesToAdd);
      
      const totalBonusXP = badgesToAdd.reduce((sum, b) => sum + b.rewardXP, 0);
      setNewBadge(badgesToAdd[badgesToAdd.length - 1]);
      setTimeout(() => setNewBadge(null), 5000);

      const finalXP = updatedUser.xp + totalBonusXP;
      const finalLevel = Math.floor(finalXP / XP_PER_LEVEL) + 1;
      const finalRankXP = updatedUser.rankXP + totalBonusXP;

      return { 
        ...updatedUser, 
        badges: newBadges, 
        xp: finalXP, 
        level: finalLevel, 
        rankXP: finalRankXP 
      };
    }
    return updatedUser;
  };

  const handleTaskXP = useCallback((xpValue: number, isMajorQuest: boolean = true) => {
    if (!user) return;

    setUser(prevUser => {
      if (!prevUser) return null;

      const newXP = Math.max(0, prevUser.xp + xpValue);
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      
      let newRankXP = prevUser.rankXP;
      let newCurrentRank = prevUser.currentRank;
      let newCurrentTier = prevUser.currentTier;
      let newHighestRank = prevUser.highestRank;
      let newStreak = prevUser.streak;

      if (prevUser.settings.isRankedMode) {
        newRankXP = Math.max(0, prevUser.rankXP + xpValue);
        const oldStatus = calculateRankAndTier(prevUser.rankXP);
        const newStatus = calculateRankAndTier(newRankXP);
        
        setLastXPChange({ amount: Math.abs(xpValue), isGain: xpValue > 0 });
        setTimeout(() => setLastXPChange(null), 3000);

        if (newStatus.absoluteRankValue !== oldStatus.absoluteRankValue) {
          setRankTransition({ 
            type: newRankXP > prevUser.rankXP ? 'up' : 'down', 
            rank: `${newStatus.rank} ${newStatus.tier}` 
          });
          setTimeout(() => setRankTransition(null), 4000);
        }
        
        newCurrentRank = newStatus.rank;
        newCurrentTier = newStatus.tier;
        const currentHighestVal = getAbsoluteRankValueFromLabel(prevUser.highestRank);
        if (newStatus.absoluteRankValue > currentHighestVal) {
          newHighestRank = `${newStatus.rank} ${newStatus.tier}`;
        }
      }

      if (isMajorQuest && xpValue > 0) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayLabel = days[new Date().getDay()];
        const todayStat = history.find(h => h.date === todayLabel);
        
        if (todayStat && todayStat.count === 0) {
          newStreak += 1;
        }

        setHistory(prevH => prevH.map(h => 
          h.date === todayLabel ? { ...h, count: h.count + 1 } : h
        ));
      }

      const totalCompletedChange = isMajorQuest ? (xpValue > 0 ? 1 : -1) : 0;

      let updatedUser: UserProfile = { 
        ...prevUser, 
        xp: newXP, 
        level: newLevel,
        rankXP: newRankXP,
        currentRank: newCurrentRank,
        currentTier: newCurrentTier,
        highestRank: newHighestRank,
        streak: newStreak,
        totalCompleted: Math.max(0, prevUser.totalCompleted + totalCompletedChange)
      };

      return checkAndAwardBadges(updatedUser, tasks);
    });
  }, [tasks, history]);

  const themeStyles = useMemo(() => {
    if (!user) return {};
    const colorMap: Record<string, { p: string; s: string; rgb: string }> = { 
      violet: { p: '#8b5cf6', s: '#6366f1', rgb: '139, 92, 246' }, 
      emerald: { p: '#10b981', s: '#059669', rgb: '16, 185, 129' }, 
      blue: { p: '#3b82f6', s: '#2563eb', rgb: '59, 130, 246' }, 
      rose: { p: '#f43f5e', s: '#e11d48', rgb: '244, 63, 94' }, 
      amber: { p: '#f59e0b', s: '#d97706', rgb: '245, 158, 11' } 
    };
    const currentTheme = colorMap[user.settings.color] || colorMap.violet;
    return {
      '--primary-color': currentTheme.p,
      '--secondary-color': currentTheme.s,
      '--primary-rgb': currentTheme.rgb,
      '--bg-main': user.settings.isHighContrast ? '#000000' : '#0f172a',
    };
  }, [user]);

  if (isSplashLoading) {
    return (
      <div className="fixed inset-0 z-[2000] bg-[#0f172a] flex flex-col items-center justify-center animate-fadeIn">
        <LogoQ className="w-24 h-24 mb-6 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)] animate-scaleUp" />
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Questly</h1>
        <div className="w-16 h-1 bg-slate-800 rounded-full mt-6 overflow-hidden">
           <div className="h-full bg-primary animate-progress" />
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (!user.onboardingComplete) {
    return <OnboardingScreen onComplete={(u, t) => { setUser(u); setTasks(t); setTutorialStep(0); }} />;
  }

  return (
    <div 
      className="min-h-screen max-w-lg mx-auto relative transition-colors duration-500 overflow-x-hidden"
      style={{ ...themeStyles, backgroundColor: 'var(--bg-main)', color: '#f8fafc' } as any}
    >
      {/* HUD Notifications */}
      {newBadge && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] w-[90%] glass-card p-4 rounded-3xl border-violet-500/50 shadow-2xl animate-scaleUp flex items-center gap-4">
          <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/20">
            {newBadge.icon}
          </div>
          <div>
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Mastery Unlocked!</p>
            <h4 className="text-white font-black text-sm uppercase">{newBadge.name}</h4>
            <p className="text-[9px] text-emerald-400 font-bold">+{newBadge.rewardXP} RP Granted</p>
          </div>
        </div>
      )}

      {rankTransition && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-fadeIn p-8 text-center">
          <div className={`w-40 h-40 rounded-3xl mb-10 flex items-center justify-center text-6xl shadow-2xl animate-scaleUp ${rankTransition.type === 'up' ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-rose-500 shadow-rose-500/40'}`}>
            {rankTransition.type === 'up' ? '🎖️' : '📉'}
          </div>
          <h2 className={`text-5xl font-black mb-4 tracking-tighter uppercase ${rankTransition.type === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {rankTransition.type === 'up' ? 'Rank Up!' : 'Rank Shifted'}
          </h2>
          <p className="text-2xl font-black text-white tracking-[0.2em] uppercase italic opacity-80">
            {rankTransition.rank}
          </p>
        </div>
      )}

      {lastXPChange && (
        <div className={`fixed top-28 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 rounded-full font-black text-xs animate-bounce shadow-xl ${lastXPChange.isGain ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {lastXPChange.isGain ? '+' : '-'}{lastXPChange.amount} RP
        </div>
      )}

      <header className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl z-40 border-b border-white/5">
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
          <div className="w-10 h-10 rounded-2xl border-2 border-primary/40 overflow-hidden bg-slate-800 shadow-lg">
            <img src={user.profilePicture} className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <main className="p-6 pt-4 pb-32">
        {activeTab === 'home' && (
          <>
            {nudge && (
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-3xl mb-8 flex gap-4 items-center animate-slideIn shadow-xl">
                <span className="text-2xl">🎓</span>
                <p className="text-xs text-slate-300 font-medium italic">"{nudge}"</p>
              </div>
            )}
            <HomeScreen user={user} tasks={tasks} onTasksUpdate={setTasks} onComplete={handleTaskXP} />
          </>
        )}
        {activeTab === 'chat' && <AiLabScreen user={user} tasks={tasks} />}
        {activeTab === 'progress' && <ProgressScreen user={user} history={history} tasks={tasks} />}
        {activeTab === 'profile' && <ProfileScreen user={user} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onUpdateUser={setUser} />}
      </main>

      <Navigation currentTab={activeTab} setTab={setActiveTab} />

      <style>{`
        :root { --primary-color: #8b5cf6; --secondary-color: #6366f1; --bg-main: #0f172a; --primary-rgb: 139, 92, 246; }
        .text-primary { color: var(--primary-color); }
        .bg-primary { background-color: var(--primary-color); }
        .gradient-bg { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); }
        .gradient-text {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        @keyframes bounce { 0%, 100% { transform: translateY(-10%) translateX(-50%); } 50% { transform: translateY(0) translateX(-50%); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.5s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-progress { animation: progress 2s linear forwards; }
        .animate-bounce { animation: bounce 1.5s infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
