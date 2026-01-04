
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
  onExpire?: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete, onEdit, onToggleSubTask, onClarificationSubmit, onExpire }) => {
  const [isExpanded, setIsExpanded] = useState(task.isClarifying || false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [victoryAnim, setVictoryAnim] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const startX = useRef(0);
  const threshold = 100;

  // Timer Logic
  useEffect(() => {
    if (task.timeLimitMinutes && task.startTime && !task.isCompleted && !task.isExpired) {
      const interval = setInterval(() => {
        const start = new Date(task.startTime!).getTime();
        const limit = task.timeLimitMinutes! * 60 * 1000;
        const end = start + limit;
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        
        setTimeLeft(diff);

        if (diff <= 0) {
          clearInterval(interval);
          onExpire?.(task.id);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task.startTime, task.timeLimitMinutes, task.isCompleted, task.isExpired]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || showConfirmDelete || showConfirmComplete) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    if (task.isCompleted) setSwipeOffset(diff * 0.2);
    else setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (showConfirmDelete || showConfirmComplete) return;
    setIsSwiping(false);
    if (swipeOffset > threshold && !task.isCompleted) setShowConfirmComplete(true);
    else if (swipeOffset < -threshold) setShowConfirmDelete(true);
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

  return (
    <div className={`relative overflow-hidden rounded-2xl select-none group ${victoryAnim ? 'animate-victory' : ''}`}>
      <div className={`glass-card rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col z-10 ${
        task.isCompleted ? 'opacity-60 bg-slate-900/40' : task.isExpired ? 'border-rose-500/50 bg-rose-500/5' : 'hover:border-primary/50'
      }`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => !task.isClarifying && onToggle(task.id)}
            className={`w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
              task.isCompleted ? 'bg-primary border-primary' : task.isExpired ? 'border-rose-500 text-rose-500' : 'border-slate-700'
            }`}
          >
            {task.isCompleted && <span className="text-white text-xs font-black">✓</span>}
            {task.isExpired && !task.isCompleted && <span className="text-[10px] font-black">!</span>}
          </button>

          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center justify-between gap-2">
              <h3 onClick={() => setIsExpanded(!isExpanded)} className={`font-bold text-sm truncate cursor-pointer ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                {task.title}
              </h3>
              {timeLeft !== null && !task.isCompleted && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${timeLeft < 60 ? 'animate-pulse text-rose-400 border-rose-400/30' : 'text-primary border-primary/30'}`}>
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${getDifficultyColor()}`}>{task.difficulty}</span>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tight">+{task.xpValue} RP</p>
              {task.isExpired && <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">TIMEOUT</span>}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 pb-5 animate-fadeIn border-t border-slate-800/50 pt-4">
             <p className="text-sm text-slate-400 italic mb-4">{task.description || "No mission notes available."}</p>
             <button onClick={() => onEdit(task)} className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Edit Mission</button>
          </div>
        )}
      </div>

      {showConfirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <button onClick={() => onDelete(task.id)} className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase">Confirm Abort</button>
          <button onClick={() => setShowConfirmDelete(false)} className="px-6 py-3 text-slate-400 text-[10px] font-black uppercase">Cancel</button>
        </div>
      )}

      {showConfirmComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <button onClick={() => { setVictoryAnim(true); onToggle(task.id); setShowConfirmComplete(false); }} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase">Yes, Victory!</button>
          <button onClick={() => setShowConfirmComplete(false)} className="px-6 py-3 text-slate-400 text-[10px] font-black uppercase">Wait</button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
