
import React, { useState, useMemo } from 'react';
import { Task, TaskCategory, TaskDifficulty, MasteryChallenge, UserProfile, TimetableEntry } from '../types';
import { getClarifyingQuestions, getAITaskSuggestions, getMasteryChallenge } from '../services/geminiService';
import { soundService } from '../services/soundService';
import { api } from '../services/mockApi';
import TaskCard from '../components/TaskCard';
import { CATEGORIES, DIFFICULTIES } from '../components/constants';

interface HomeScreenProps {
  user: UserProfile;
  tasks: Task[];
  onTasksUpdate: (tasksOrUpdater: Task[] | ((prev: Task[]) => Task[])) => void;
  onComplete: (xp: number, isMajorQuest: boolean) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user, tasks, onTasksUpdate, onComplete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Study');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('Easy');
  const [timeLimit, setTimeLimit] = useState<string>('');
  
  const [timetable, setTimetable] = useState<TimetableEntry[]>(api.getData().timetable || []);
  const [isAddingTimetable, setIsAddingTimetable] = useState(false);
  const [ttTime, setTtTime] = useState('');
  const [ttActivity, setTtActivity] = useState('');

  const focusQuest = useMemo(() => {
    const incomplete = tasks.filter(t => !t.isCompleted);
    if (incomplete.length === 0) return null;
    return [...incomplete].sort((a, b) => {
      const diffOrder = { 'Extremely Hard': 3, 'Hard': 2, 'Easy': 1 };
      return diffOrder[b.difficulty] - diffOrder[a.difficulty];
    })[0];
  }, [tasks]);

  const handleCreateQuest = () => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const diffData = DIFFICULTIES.find(d => d.label === difficulty);
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      category,
      difficulty,
      isCompleted: false,
      dueDate: now,
      createdAt: now,
      startTime: timeLimit ? new Date().toISOString() : undefined,
      timeLimitMinutes: timeLimit ? parseInt(timeLimit) : undefined,
      xpValue: diffData?.xp || 50,
      subTasks: []
    };
    onTasksUpdate(prev => [newTask, ...prev]);
    setIsAdding(false);
    setNewTitle('');
    setTimeLimit('');
  };

  const handleExpire = (id: string) => {
    onTasksUpdate(prev => prev.map(t => {
      if (t.id === id && !t.isExpired) {
        onComplete(-Math.floor(t.xpValue / 2), false); // Penalty
        return { ...t, isExpired: true };
      }
      return t;
    }));
  };

  const addTimetableEntry = () => {
    if (!ttTime || !ttActivity) return;
    const newEntries = [...timetable, { id: Date.now().toString(), time: ttTime, activity: ttActivity }]
      .sort((a, b) => a.time.localeCompare(b.time));
    setTimetable(newEntries);
    api.updateTimetable(newEntries);
    setIsAddingTimetable(false);
    setTtTime('');
    setTtActivity('');
  };

  const deleteTimetableEntry = (id: string) => {
    const newEntries = timetable.filter(e => e.id !== id);
    setTimetable(newEntries);
    api.updateTimetable(newEntries);
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 animate-fadeIn pb-32">
      {/* HUD Header */}
      <section className="glass-card rounded-3xl p-6 border-2 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">{user.streak} DAY STREAK!</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{progress}% DAILY MISSION COMPLETE</p>
          </div>
          <div className="text-3xl">🔥</div>
        </div>
      </section>

      {/* Timetable Section */}
      <section className="px-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Timetable</h3>
          <button onClick={() => setIsAddingTimetable(true)} className="text-[10px] font-black text-primary uppercase">+ Add Slot</button>
        </div>
        <div className="space-y-2">
          {timetable.length === 0 ? (
            <div className="p-4 border-2 border-dashed border-slate-800 rounded-2xl text-center">
              <p className="text-[10px] text-slate-600 font-bold uppercase">Schedule Empty</p>
            </div>
          ) : timetable.map(entry => (
            <div key={entry.id} className="glass-card p-4 rounded-2xl flex items-center justify-between border border-slate-800/50">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-primary">{entry.time}</span>
                <span className="text-xs font-medium text-slate-300">{entry.activity}</span>
              </div>
              <button onClick={() => deleteTimetableEntry(entry.id)} className="text-slate-700 hover:text-rose-500">✕</button>
            </div>
          ))}
        </div>
      </section>

      {/* Active Quests */}
      <section className="px-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Active Quests</h3>
          <button onClick={() => setIsAdding(true)} className="text-[10px] font-black text-emerald-400 uppercase">New Quest</button>
        </div>
        <div className="space-y-4">
          {tasks.filter(t => !t.isCompleted).map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => onComplete(task.xpValue, true)} 
              onDelete={(id) => onTasksUpdate(prev => prev.filter(t => t.id !== id))}
              onEdit={() => {}}
              onExpire={handleExpire}
            />
          ))}
        </div>
      </section>

      {/* Timetable Modal */}
      {isAddingTimetable && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-slate-700">
            <h4 className="text-sm font-black text-white uppercase mb-6">Schedule Entry</h4>
            <div className="space-y-4">
              <input type="time" value={ttTime} onChange={e => setTtTime(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white" />
              <input type="text" placeholder="Activity name" value={ttActivity} onChange={e => setTtActivity(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white" />
            </div>
            <div className="flex flex-col gap-2 mt-8">
              <button onClick={addTimetableEntry} className="w-full bg-white text-slate-950 p-4 rounded-xl font-black text-xs uppercase">Save Slot</button>
              <button onClick={() => setIsAddingTimetable(false)} className="w-full p-2 text-slate-500 text-[10px] font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quest Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-violet-500/30">
            <h4 className="text-sm font-black text-white uppercase mb-6">Quest Objective</h4>
            <div className="space-y-4">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Objective name" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white" />
              <div className="flex gap-2">
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as TaskDifficulty)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white">
                  {DIFFICULTIES.map(d => <option key={d.label}>{d.label}</option>)}
                </select>
                <input type="number" placeholder="Timer (mins)" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="w-24 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-8">
              <button onClick={handleCreateQuest} className="w-full bg-violet-600 text-white p-4 rounded-xl font-black text-xs uppercase">Launch</button>
              <button onClick={() => setIsAdding(false)} className="w-full p-2 text-slate-500 text-[10px] font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
