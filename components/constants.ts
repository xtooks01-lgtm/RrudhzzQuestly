
import { Badge, TaskCategory, TaskDifficulty, RankName, RankTier } from '../types';

export const INITIAL_BADGES: Badge[] = [
  { id: '1', name: 'Foundation', icon: '◈', description: 'Initiated your productivity journey', rewardXP: 50 },
  { id: '2', name: 'Consistency I', icon: '⌚', description: 'Maintained activity for 7 consecutive days', rewardXP: 200 },
  { id: '3', name: 'Consistency II', icon: '📅', description: 'Maintained activity for 30 consecutive days', rewardXP: 500 },
  { id: '4', name: 'Focus Specialist', icon: '🎯', description: 'Completed 10 difficult academic missions', rewardXP: 300 },
  { id: '5', name: 'Academic Scholar', icon: '📜', description: 'Completed 25 study-related tasks', rewardXP: 150 },
  { id: '6', name: 'Early Achiever', icon: '🌅', description: 'Completed a task before 8:00 AM', rewardXP: 50 },
  { id: '7', name: 'Late Diligence', icon: '🌙', description: 'Completed a task after 10:00 PM', rewardXP: 50 },
  { id: '8', name: 'Diverse Intellect', icon: '💠', description: 'Successfully finished tasks in 4 categories', rewardXP: 400 },
  { id: '9', name: 'Centurion', icon: '🏛', description: 'Achieved 100 total task completions', rewardXP: 1000 },
  { id: '10', name: 'Elite Mastery', icon: '⚛', description: 'Reached user level 10', rewardXP: 1000 },
];

export const CATEGORIES: TaskCategory[] = ['Study', 'Health', 'Coding', 'Creative', 'Other'];

export const DIFFICULTIES: { label: TaskDifficulty; xp: number; color: string }[] = [
  { label: 'Easy', xp: 25, color: 'emerald' },
  { label: 'Hard', xp: 100, color: 'orange' },
  { label: 'Extremely Hard', xp: 250, color: 'rose' },
];

export const RANKS: RankName[] = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Mythic'];
export const TIERS: RankTier[] = ['IV', 'III', 'II', 'I'];
export const XP_PER_TIER = 100;

export const XP_PER_LEVEL = 500;
