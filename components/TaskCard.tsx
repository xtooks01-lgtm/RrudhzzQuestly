
import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { soundService } from '../services/soundService';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleSubTask?: (taskId: string, subTaskId: string) => void;
  onClarificationSubmit?: (answers: Record<string, string>) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete, onEdit, onToggleSubTask, onClarificationSubmit }) => {
  const [isExpanded, setIsExpanded] = useState(task.isClarifying || false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [victoryAnim, setVictoryAnim] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const startX = useRef(0);
  const threshold = 100;

  useEffect(() => {
    if (task.isCompleted && victoryAnim) {
      const timer = setTimeout(() => setVictoryAnim(false), 800);
      return () => clearTimeout(timer);
    }
  }, [task.isCompleted, victoryAnim]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || showConfirmDelete || showConfirmComplete) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Elastic constraint for completed tasks
    if (task.isCompleted) {
      setSwipeOffset(diff * 0.2);
    } else {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (showConfirmDelete || showConfirmComplete) return;
    setIsSwiping(false);
    
    if (swipeOffset > threshold && !task.isCompleted) {
      setShowConfirmComplete(true);
    } else if (swipeOffset < -threshold) {
      setShowConfirmDelete(true);
    }
    setSwipeOffset(0);
  };

  const getDifficultyColor = () => {
    switch (task.difficulty) {
      case 'Easy': return 'text-emerald-400 bg-emerald-400/10';
      case 'Hard': return 'text-orange-400 bg-orange-400/10';
      case 'Extremely Hard': return 'text-rose-400 bg-rose-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const confirmCompletion = () => {
    setVictoryAnim(true);
    soundService.playComplete();
    setShowConfirmComplete(false);
    onToggle(task.id);
  };

  const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl select-none group ${victoryAnim ? 'animate-victory' : ''}`}>
      {/* Background Actions */}
      <div className={`absolute inset-0 flex items-center justify-between px-8 transition-opacity duration-300 ${swipeOffset !== 0 ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest ${swipeOffset > 20 ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'} transition-all`}>
          <span>✓</span>
          <span>Complete</span>
        </div>
        <div className={`flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-widest ${swipeOffset < -20 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'} transition-all`}>
          <span>Remove</span>
          <span>🗑</span>
        </div>
      </div>

      <div 
        className={`glass-card rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col z-10 ${
          task.isCompleted ? 'opacity-60 bg-slate-900/40' : 'hover:border-primary/50'
        } ${isSwiping ? 'transition-none' : 'ease-out'}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-4 p-4">
          <button
            disabled={task.isClarifying}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (task.isCompleted) onToggle(task.id); 
              else setShowConfirmComplete(true); 
            }}
            className={`w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-500 ${
              task.isCompleted 
                ? 'bg-primary border-primary scale-110 shadow-[0_0_20px_rgba(139,92,246,0.6)]' 
                : task.isClarifying ? 'border-slate-800 opacity-20' : 'border-slate-700 hover:border-primary group-hover:scale-105'
            }`}
          >
            {task.isCompleted && (
              <span className="text-white text-xs font-black animate-scaleUp">✓</span>
            )}
          </button>

          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center justify-between gap-2">
              <h3 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`font-bold text-sm truncate cursor-pointer transition-all ${task.isCompleted ? 'line-through text-slate-500 italic' : 'text-slate-100'}`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {formattedDueDate && !task.isCompleted && (
                  <span className="text-[9px] font-black text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full uppercase">
                    {formattedDueDate}
                  </span>
                )}
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`p-1.5 text-slate-600 hover:text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${getDifficultyColor()}`}>
                {task.difficulty}
              </span>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                {task.category}
              </span>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tight">
                +{task.xpValue} RP
              </p>
              {task.isClarifying && <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">Needs info...</span>}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 pb-5 animate-fadeIn border-t border-slate-800/50 pt-4 bg-slate-900/20">
            {task.isClarifying ? (
               <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/30 flex items-center justify-center text-violet-400 text-sm font-black border border-violet-500/20">DR</div>
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none">Quest Briefing</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Refine your objectives</p>
                    </div>
                  </div>
                  {task.clarificationQuestions ? (
                    <>
                      {task.clarificationQuestions.map((q, i) => (
                        <div key={i} className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">{q}</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-violet-500 focus:bg-slate-950 transition-all outline-none"
                            placeholder="Enter intel..."
                            value={answers[q] || ''}
                            onChange={(e) => setAnswers({...answers, [q]: e.target.value})}
                          />
                        </div>
                      ))}
                      <button 
                        disabled={Object.keys(answers).length < task.clarificationQuestions.length}
                        onClick={() => onClarificationSubmit?.(answers)}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black p-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-30 shadow-lg shadow-violet-900/20"
                      >
                        Plan Mission
                      </button>
                    </>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-3">
                       <div className="w-6 h-6 border-2 border-slate-800 border-t-violet-500 rounded-full animate-spin" />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analyzing Intel...</p>
                    </div>
                  )}
               </div>
            ) : task.isGeneratingSubTasks ? (
               <div className="flex flex-col items-center py-8 gap-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Mapping Strategy...</p>
               </div>
            ) : task.subTasks?.length ? (
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between mb-3">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tactical Steps</p>
                   <p className="text-[10px] text-violet-400 font-black">{task.subTasks.filter(s => s.isCompleted).length}/{task.subTasks.length}</p>
                </div>
                {task.subTasks.map(st => (
                  <div key={st.id} className="flex items-center gap-3 group/step">
                    <button 
                      onClick={() => onToggleSubTask?.(task.id, st.id)}
                      className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 transition-all flex items-center justify-center ${st.isCompleted ? 'bg-blue-600 border-blue-500' : 'border-slate-800 hover:border-blue-500/50'}`}
                    >
                      {st.isCompleted && <span className="text-white text-[10px] font-black">✓</span>}
                    </button>
                    <span className={`text-sm font-medium ${st.isCompleted ? 'line-through text-slate-500 italic' : 'text-slate-300'}`}>{st.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 leading-relaxed font-medium mb-5 italic border-l-2 border-slate-800 pl-4">
                {task.description || "Establish your criteria for success."}
              </p>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-800/50">
              <button 
                onClick={() => onEdit(task)}
                className="text-[10px] font-black uppercase text-slate-600 hover:text-slate-300 transition-all tracking-widest"
              >
                Modify Intel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Overlays */}
      {showConfirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-3xl">🗑️</div>
            <p className="text-sm font-black text-white uppercase tracking-tight">Abort this mission?</p>
            <div className="flex gap-3">
              <button onClick={() => { soundService.playDelete(); onDelete(task.id); }} className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/30">Confirm</button>
              <button onClick={() => setShowConfirmDelete(false)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Back</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-3xl animate-bounce">⚔️</div>
            <p className="text-sm font-black text-white uppercase tracking-tight">Victory Achieved?</p>
            <div className="flex gap-3">
              <button onClick={confirmCompletion} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/30">Yes, Victory!</button>
              <button onClick={() => setShowConfirmComplete(false)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">In Progress</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
