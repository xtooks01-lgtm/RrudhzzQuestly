
export type TaskCategory = 'Study' | 'Health' | 'Coding' | 'Creative' | 'Other';
export type TaskDifficulty = 'Easy' | 'Hard' | 'Extremely Hard';
export type ThemeColor = 'violet' | 'emerald' | 'blue' | 'rose' | 'amber';
export type ChatModel = 'fast' | 'genius';

export type RankName = 'Iron' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Mythic';
export type RankTier = 'IV' | 'III' | 'II' | 'I';

export interface ThemeSettings {
  color: ThemeColor;
  isHighContrast: boolean;
  notificationsEnabled: boolean;
  rudhhPersonality: string;
  modelPreference: ChatModel;
  isRankedMode: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  isCompleted: boolean;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  xpValue: number;
  isAiGenerated?: boolean;
  isGeneratingSubTasks?: boolean;
  isClarifying?: boolean;
  clarificationQuestions?: string[];
  clarificationAnswers?: Record<string, string>;
  subTasks?: { id: string; title: string; isCompleted: boolean }[];
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface SuggestedTask {
  title: string;
  description: string;
  category: string;
}

export interface MasteryChallenge {
  questions: PracticeQuestion[];
  nextQuest: SuggestedTask;
}

export interface UserProfile {
  name: string;
  xp: number;
  level: number;
  streak: number;
  totalCompleted: number;
  badges: Badge[];
  settings: ThemeSettings;
  profilePicture?: string;
  onboardingComplete: boolean;
  tutorialComplete: boolean;
  rankXP: number;
  currentRank: RankName;
  currentTier: RankTier;
  highestRank: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt?: string;
  rewardXP: number;
}

export interface DailyProgress {
  date: string;
  count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  thinkingProcess?: string;
  modelUsed?: string;
  groundingChunks?: any[];
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    mimeType: string;
    data?: string; // base64 for re-analysis
  };
}
