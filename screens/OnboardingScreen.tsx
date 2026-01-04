
import React, { useState } from 'react';
import { UserProfile, Task } from '../types';

interface OnboardingScreenProps {
  onComplete: (user: UserProfile, initialTasks: Task[]) => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;
    setIsProcessing(true);

    // Fix: Added tutorialComplete property to satisfy UserProfile interface requirement
    const finalUser: UserProfile = {
      name: name.trim(),
      xp: 0,
      level: 1,
      streak: 0,
      totalCompleted: 0,
      badges: [],
      profilePicture: `https://picsum.photos/seed/${name}/200`,
      onboardingComplete: true,
      tutorialComplete: false,
      rankXP: 0,
      currentRank: 'Iron',
      currentTier: 'IV',
      highestRank: 'Iron IV',
      settings: {
        color: 'violet',
        isHighContrast: false,
        notificationsEnabled: true,
        rudhhPersonality: 'A warm, encouraging, and supportive mentor who believes in your potential.',
        modelPreference: 'fast',
        isRankedMode: true
      }
    };

    onComplete(finalUser, []);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
      <div className="relative w-full max-w-sm z-10">
        <div className="animate-slideIn">
          <h1 className="text-2xl font-bold mb-4 text-slate-100">Welcome to Questly</h1>
          <p className="text-slate-400 text-sm mb-12">I'm Dr. Rudhh, your personal guide. It's a pleasure to meet you. What should I call you?</p>
          
          <div className="relative">
            <input 
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleContinue()}
              placeholder="Your name"
              className="w-full bg-transparent border-b-2 border-slate-800 p-4 text-center text-xl font-medium focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-700"
            />
          </div>
        </div>

        <button 
          onClick={handleContinue}
          disabled={isProcessing || !name.trim()}
          className={`w-full mt-16 bg-white text-slate-950 p-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-10 ${isProcessing ? 'animate-pulse' : 'hover:bg-slate-200 active:scale-95'}`}
        >
          {isProcessing ? 'Setting things up...' : "Let's get started"}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}</style>
    </div>
  );
};

export default OnboardingScreen;
