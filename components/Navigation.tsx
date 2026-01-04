import React from 'react';

interface NavigationProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentTab, setTab }) => {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'chat', label: 'Mentor' },
    { id: 'progress', label: 'Stats' },
    { id: 'profile', label: 'Hero' },
    { id: 'settings', label: 'Setup' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-slate-700/50 pb-8 pt-4 px-6 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              currentTab === tab.id ? 'scale-110' : 'opacity-40'
            }`}
          >
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              currentTab === tab.id ? 'text-primary' : 'text-slate-400'
            }`}>
              {tab.label}
            </span>
            {currentTab === tab.id && (
              <div className="w-1 h-1 bg-primary rounded-full mt-1" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;