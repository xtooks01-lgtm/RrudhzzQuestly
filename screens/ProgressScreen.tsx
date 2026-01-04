import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { DailyProgress, UserProfile, Task, RankName } from '../types';
import { XP_PER_TIER } from '../components/constants';

interface ProgressScreenProps {
  user: UserProfile;
  history: DailyProgress[];
  tasks: Task[];
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ user, history, tasks }) => {
  const averageTime = useMemo(() => {
    const completedTasks = tasks.filter(t => t.isCompleted && t.completedAt);
    if (completedTasks.length === 0) return '0m';
    
    const totalMs = completedTasks.reduce((acc, t) => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.completedAt!).getTime();
      return acc + (end - start);
    }, 0);
    
    const avgMs = totalMs / completedTasks.length;
    const mins = Math.floor(avgMs / 60000);
    const hours = Math.floor(mins / 60);
    
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }, [tasks]);

  const getRankBadgeColor = (rank: RankName) => {
    switch(rank) {
      case 'Iron': return 'bg-slate-500';
      case 'Bronze': return 'bg-amber-700';
      case 'Silver': return 'bg-slate-300 text-slate-900';
      case 'Gold': return 'bg-yellow-500 text-yellow-950';
      case 'Platinum': return 'bg-teal-400 text-teal-950';
      case 'Diamond': return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      case 'Mythic': return 'bg-gradient-to-r from-purple-500 via-rose-500 to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]';
      default: return 'bg-slate-700';
    }
  };

  const currentTierXP = user.rankXP % XP_PER_TIER;
  const progressPercent = (currentTierXP / XP_PER_TIER) * 100;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <header className="px-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Mastery <span className="gradient-text">Stats</span></h1>
        <p className="text-slate-400 text-sm mt-1">Consistency is the key to total mastery</p>
      </header>

      {/* Rank Visualization */}
      <div className="glass-card p-6 rounded-3xl border-2 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${getRankBadgeColor(user.currentRank)}`}>
               {user.currentRank[0]}
             </div>
             <div>
               <h3 className="font-black text-white text-lg leading-none uppercase tracking-widest">{user.currentRank} {user.currentTier}</h3>
               <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Division Progress</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xl font-black text-primary">{user.rankXP}</p>
             <p className="text-[9px] text-slate-500 font-bold uppercase">Total RP</p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
           <div 
             className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000" 
             style={{ width: `${progressPercent}%` }}
           />
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg. Quest Time</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-orange-500">{averageTime}</span>
            <span className="text-xl font-black text-slate-700">⧖</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Completed</p>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-black text-blue-500">{user.totalCompleted}</span>
            <span className="text-xl font-black text-slate-700">✓</span>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="glass-card p-6 rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-xs uppercase tracking-widest text-slate-300">Weekly Activity</h2>
          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">7 Day Overview</span>
        </div>
        <div className="h-48 w-full min-h-[200px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                {history.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.count > 3 ? '#8b5cf6' : '#3b82f6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Level Progress */}
      <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-indigo-900/10 to-slate-900/40">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center text-xl font-black shadow-xl shadow-violet-900/40">
            {user.level}
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest">Mastery Level {user.level}</h3>
            <p className="text-[10px] text-slate-400 font-bold">Progress toward next tier</p>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className="h-full gradient-bg shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
            style={{ width: `${(user.xp % 500) / 5}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;