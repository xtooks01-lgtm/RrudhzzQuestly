
import React, { useState, useMemo } from 'react';
import { Task, TaskCategory, TaskDifficulty, MasteryChallenge, UserProfile } from '../types';
import { getClarifyingQuestions, getAITaskSuggestions, getMasteryChallenge } from '../services/geminiService';
import { soundService } from '../services/soundService';
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
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [masteryData, setMasteryData] = useState<MasteryChallenge | null>(null);
  const [showMastery, setShowMastery] = useState(false);
  const [masteryStep, setMasteryStep] = useState(0); 
  const [masteryAnswers, setMasteryAnswers] = useState<Record<number, string>>({});
  const [isMasteryLoading, setIsMasteryLoading] = useState(false);

  // Derive the "Focus Quest" (most difficult incomplete quest)
  const focusQuest = useMemo(() => {
    const incomplete = tasks.filter(t => !t.isCompleted);
    if (incomplete.length === 0) return null;
    return [...incomplete].sort((a, b) => {
      const diffOrder = { 'Extremely Hard': 3, 'Hard': 2, 'Easy': 1 };
      return diffOrder[b.difficulty] - diffOrder[a.difficulty];
    })[0];
  }, [tasks]);

  const toggleTask = async (id: string) => {
    const taskToComplete = tasks.find(t => t.id === id);
    if (!taskToComplete) return;

    const isCompleting = !taskToComplete.isCompleted;
    
    onTasksUpdate(prev => prev.map(t => {
      if (t.id === id) {
        const now = new Date().toISOString();
        if (isCompleting) {
          onComplete(t.xpValue, true);
          return { ...t, isCompleted: true, completedAt: now };
        } else {
          onComplete(-t.xpValue, true);
          return { ...t, isCompleted: false, completedAt: undefined };
        }
      }
      return t;
    }));

    if (isCompleting) {
      setShowMastery(true);
      setIsMasteryLoading(true);
      try {
        const data = await getMasteryChallenge(taskToComplete.title);
        if (data && data.questions && data.questions.length > 0) {
          setMasteryData(data);
        } else {
          setShowMastery(false);
        }
      } catch (e) {
        setShowMastery(false);
      } finally {
        setIsMasteryLoading(false);
      }
    }
  };

  const handleMasteryFinish = () => {
    if (!masteryData) return;
    onComplete(100, false);
    soundService.playBadge();
    const now = new Date().toISOString();
    const nextTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Next step: ${masteryData.nextQuest.title}`,
      description: masteryData.nextQuest.description,
      category: (masteryData.nextQuest.category as TaskCategory) || 'Study',
      difficulty: 'Hard',
      isCompleted: false,
      dueDate: now,
      createdAt: now,
      xpValue: 150,
      isAiGenerated: true
    };
    onTasksUpdate(prev => [nextTask, ...prev]);
    setShowMastery(false);
    setMasteryData(null);
    setMasteryStep(0);
    setMasteryAnswers({});
  };

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    onTasksUpdate(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        const subTask = t.subTasks.find(st => st.id === subTaskId);
        if (subTask) {
          if (!subTask.isCompleted) {
            onComplete(5, false);
            soundService.playComplete();
          } else {
            onComplete(-5, false);
          }
          const newSubTasks = t.subTasks.map(st => 
            st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
          );
          return { ...t, subTasks: newSubTasks };
        }
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    onTasksUpdate(prev => prev.filter(t => t.id !== id));
  };

  const handleClarificationSubmit = async (taskId: string, answers: Record<string, string>) => {
    onTasksUpdate(prev => prev.map(t => 
      t.id === taskId ? { ...t, isGeneratingSubTasks: true, isClarifying: false, clarificationAnswers: answers } : t
    ));

    try {
      const task = tasks.find(t => t.id === taskId);
      const suggestions = await getAITaskSuggestions(task?.title || '', answers);
      onTasksUpdate(prev => prev.map(t => 
        t.id === taskId ? {
          ...t,
          isGeneratingSubTasks: false,
          subTasks: (suggestions || []).map(s => ({
            id: Math.random().toString(36).substr(2, 5),
            title: s.title,
            isCompleted: false
          }))
        } : t
      ));
    } catch (e) {
      onTasksUpdate(prev => prev.map(t => t.id === taskId ? { ...t, isGeneratingSubTasks: false } : t));
    }
  };

  const handleCreateQuest = async () => {
    if (!newTitle.trim()) return;
    soundService.playAdd();
    
    const now = new Date().toISOString();
    const diffData = DIFFICULTIES.find(d => d.label === difficulty);
    const questId = Math.random().toString(36).substr(2, 9);
    
    const newTask: Task = {
      id: questId,
      title: newTitle,
      category,
      difficulty,
      isCompleted: false,
      dueDate: new Date(dueDate).toISOString(),
      createdAt: now,
      xpValue: (diffData?.xp || 50),
      isAiGenerated: true,
      isClarifying: true,
      subTasks: []
    };
    
    onTasksUpdate(prev => [newTask, ...prev]);
    resetForm(); 

    try {
      const questions = await getClarifyingQuestions(newTitle);
      onTasksUpdate(prev => prev.map(t => 
        t.id === questId ? { ...t, clarificationQuestions: questions } : t
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setCategory('Study');
    setDifficulty('Easy');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.isCompleted
  );

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <section className="glass-card rounded-3xl p-6 border-2 border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">{user.streak} DAY STREAK!</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">{progress}% COMPLETED TODAY</p>
          </div>
          <div className="text-3xl animate-bounce">🔥</div>
        </div>
      </section>

      {focusQuest && (
        <section className="px-2">
           <div className="flex items-center gap-2 mb-3">
             <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Current Focus</span>
             <div className="flex-1 h-px bg-slate-800" />
           </div>
           <TaskCard 
              task={focusQuest} 
              onToggle={toggleTask} 
              onDelete={deleteTask}
              onEdit={() => {}}
              onToggleSubTask={toggleSubTask}
              onClarificationSubmit={(answers) => handleClarificationSubmit(focusQuest.id, answers)}
            />
        </section>
      )}

      <section className="px-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Your <span className="gradient-text">Quests</span></h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{completedCount} OF {tasks.length} VICTORIES</p>
      </section>

      <div className="px-2">
        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-700/50">
          <span className="text-slate-500">🔍</span>
          <input 
            type="text" 
            placeholder="Search your quests..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="px-1">
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full glass-card p-4 rounded-3xl border-dashed border-2 border-slate-700 hover:border-violet-500/50 transition-all flex items-center justify-center gap-2 group"
        >
          <span className="text-lg font-bold group-hover:scale-125 transition-transform">+</span>
          <span className="font-bold text-xs uppercase tracking-widest text-slate-400 group-hover:text-violet-400">Start a new quest</span>
        </button>
      </div>

      {showMastery && (
        <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col items-center justify-center p-6 overflow-y-auto animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-violet-500/30 shadow-2xl relative">
            {isMasteryLoading ? (
               <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                  <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Reviewing Lessons...</h2>
               </div>
            ) : masteryData && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Question {masteryStep + 1} of {masteryData.questions.length}</span>
                    <button onClick={() => setShowMastery(false)} className="text-slate-500 font-bold text-[10px] uppercase">Skip</button>
                 </div>
                 <h3 className="text-lg font-bold text-slate-100 leading-tight">{masteryData.questions[masteryStep]?.question}</h3>
                 <div className="space-y-3">
                    {masteryData.questions[masteryStep]?.options.map((opt, i) => (
                      <button 
                        key={i} 
                        onClick={() => setMasteryAnswers({...masteryAnswers, [masteryStep]: opt})}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${masteryAnswers[masteryStep] === opt ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                      >
                        <span className="text-xs font-medium">{opt}</span>
                      </button>
                    ))}
                 </div>
                 <button 
                   disabled={!masteryAnswers[masteryStep]}
                   onClick={masteryStep < (masteryData.questions.length - 1) ? () => setMasteryStep(s => s + 1) : handleMasteryFinish}
                   className="w-full bg-white text-slate-950 p-4 rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-30"
                 >
                   {masteryStep < (masteryData.questions.length - 1) ? 'Next question' : 'Finish review'}
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-violet-500/30 shadow-2xl animate-scaleUp my-auto">
            <h2 className="text-2xl font-black mb-6 text-white uppercase tracking-tight">New Quest</h2>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">What's your goal?</p>
                <textarea 
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master React Hooks"
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-violet-500 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Category</p>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 appearance-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Deadline</p>
                  <input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button 
                onClick={handleCreateQuest}
                disabled={!newTitle.trim()}
                className="w-full bg-white text-slate-950 p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-30 shadow-xl"
              >
                Create Quest
              </button>
              <button onClick={resetForm} className="w-full py-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">Nevermind</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 px-1">
        {filteredTasks.length > 0 ? (
          filteredTasks.filter(t => t.id !== focusQuest?.id).map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggle={toggleTask} 
              onDelete={deleteTask}
              onEdit={() => {}}
              onToggleSubTask={toggleSubTask}
              onClarificationSubmit={(answers) => handleClarificationSubmit(task.id, answers)}
            />
          ))
        ) : !focusQuest && (
          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
            <div className="text-5xl">✨</div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">All caught up! Time to relax.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
