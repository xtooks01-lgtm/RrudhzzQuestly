
import React from 'react';
import { UserProfile, RankName, Badge } from '../types';
import { INITIAL_BADGES, XP_PER_TIER } from '../components/constants';

interface ProfileScreenProps {
  user: UserProfile;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user }) => {
  const getRankStyle = (rank: RankName) => {
    switch(rank) {
      case 'Iron': return 'from-slate-600 to-slate-400 text-slate-100 shadow-slate-900/50';
      case 'Bronze': return 'from-amber-800 to-amber-600 text-amber-100 shadow-amber-900/50';
      case 'Silver': return 'from-slate-400 to-slate-200 text-slate-900 shadow-slate-500/30';
      case 'Gold': return 'from-yellow-600 to-yellow-400 text-yellow-950 shadow-yellow-500/40';
      case 'Platinum': return 'from-teal-500 to-teal-300 text-teal-950 shadow-teal-500/40';
      case 'Diamond': return 'from-blue-600 to-indigo-400 text-white shadow-blue-500/50 animate-pulse';
      case 'Mythic': return 'from-purple-600 via-rose-500 to-indigo-600 text-white shadow-purple-500/60 animate-mythicGlow';
      default: return 'from-slate-800 to-slate-600';
    }
  };

  const currentTierXP = user.rankXP % XP_PER_TIER;
  const progressPercent = (currentTierXP / XP_PER_TIER) * 100;

  const getBadgeStatus = (badgeId: string) => {
    return user.badges.find(b => b.id === badgeId);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn pb-32">
      {/* Profile Header */}
      <section className="flex flex-col items-center pt-4">
        <div className="relative group">
          <div className="absolute -inset-1 gradient-bg rounded-full opacity-75 blur transition duration-1000 group-hover:opacity-100 animate-pulse" />
          <div className="relative w-32 h-32 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-800 flex items-center justify-center">
            <img 
              src={user.profilePicture || `https://picsum.photos/seed/${user.name}/200`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute bottom-1 right-1 bg-violet-500 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-950 font-black text-xs">
            {user.level}
          </div>
        </div>
        <h2 className="text-2xl font-black mt-6 uppercase tracking-widest">{user.name}</h2>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Academic Rank: Master</p>
      </section>

      {/* Rank Status Section */}
      <section className="glass-card p-6 rounded-3xl relative overflow-hidden">
        {user.currentRank === 'Mythic' && (
          <div className="absolute top-0 right-0 p-3">
             <div className="relative">
                <span className="text-xl text-yellow-400 font-black block">★</span>
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 animate-pulse" />
             </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Competitive Tier</h3>
          <div className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-br border border-white/20 shadow-lg ${getRankStyle(user.currentRank)}`}>
            {user.currentRank} {user.currentTier}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
             <div>
               <p className="text-3xl font-black tracking-tighter leading-none">{user.rankXP} <span className="text-xs text-slate-500 uppercase font-bold">RP</span></p>
               <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Goal: {XP_PER_TIER - currentTierXP} RP to Next Tier</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 opacity-50">Career Peak</p>
                <p className="text-xs font-black text-white">{user.highestRank}</p>
             </div>
          </div>
          
          <div className="w-full h-4 bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
            <div 
              className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)] ${
                user.currentRank === 'Mythic' ? 'bg-gradient-to-r from-purple-500 via-rose-500 to-indigo-500 animate-shimmer' : 'bg-primary'
              }`} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* Stats Summary */}
      <section className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Streak</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-orange-500">{user.streak} Days</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Victories</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-blue-500">{user.totalCompleted}</span>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section className="px-2">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Professional Achievements</h3>
        <div className="grid grid-cols-2 gap-4">
          {INITIAL_BADGES.map((badge) => {
            const unlockedBadge = getBadgeStatus(badge.id);
            const isUnlocked = !!unlockedBadge;
            
            return (
              <div 
                key={badge.id} 
                className={`glass-card p-4 rounded-2xl flex items-center gap-3 transition-all duration-500 border ${isUnlocked ? 'border-violet-500/30 opacity-100' : 'border-slate-800 opacity-40 grayscale'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${isUnlocked ? 'bg-violet-600/20 text-violet-400' : 'bg-slate-900 text-slate-700'}`}>
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black uppercase text-white truncate">{badge.name}</h4>
                  <p className="text-[8px] text-slate-500 font-bold leading-tight mt-1">{badge.description}</p>
                  {isUnlocked && unlockedBadge.unlockedAt && (
                    <p className="text-[7px] text-emerald-500/70 font-black uppercase mt-1">Unlocked {new Date(unlockedBadge.unlockedAt).toLocaleDateString()}</p>
                  )}
                  {!isUnlocked && (
                    <p className="text-[7px] text-slate-600 font-black uppercase mt-1">Reward: {badge.rewardXP} RP</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        @keyframes mythicGlow {
          0% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.6); }
          100% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.4); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-mythicGlow { animation: mythicGlow 3s ease-in-out infinite; }
        .animate-shimmer { background-size: 200% 100%; animation: shimmer 2s linear infinite; }
      `}</style>
    </div>
  );
};

export default ProfileScreen;
