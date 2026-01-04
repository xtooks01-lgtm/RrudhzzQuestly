
import { Task, UserProfile, DailyProgress, ChatMessage, TimetableEntry } from '../types';
import { INITIAL_BADGES } from '../components/constants';

const STORAGE_KEY = 'questly_data_v8';

interface StorageData {
  tasks: Task[];
  user: UserProfile;
  history: DailyProgress[];
  chatHistory: ChatMessage[];
  timetable: TimetableEntry[];
}

const emptyData: StorageData = {
  tasks: [],
  user: {
    name: '',
    xp: 0,
    level: 1,
    streak: 0,
    totalCompleted: 0,
    badges: [],
    onboardingComplete: false,
    tutorialComplete: false,
    rankXP: 0,
    currentRank: 'Iron',
    currentTier: 'IV',
    highestRank: 'Iron IV',
    settings: {
      color: 'violet',
      isHighContrast: false,
      notificationsEnabled: true,
      rudhhPersonality: 'Brilliant, supportive, and slightly eccentric academic mentor.',
      modelPreference: 'fast',
      isRankedMode: true
    }
  },
  history: [
    { date: 'Sun', count: 0 }, { date: 'Mon', count: 0 }, { date: 'Tue', count: 0 }, { date: 'Wed', count: 0 },
    { date: 'Thu', count: 0 }, { date: 'Fri', count: 0 }, { date: 'Sat', count: 0 },
  ],
  chatHistory: [],
  timetable: []
};

export const api = {
  getData: (): StorageData => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
      return emptyData;
    }
    const parsed = JSON.parse(saved);
    if (!parsed.user.settings) parsed.user.settings = emptyData.user.settings;
    if (parsed.user.settings.isRankedMode === undefined) parsed.user.settings.isRankedMode = true;
    if (parsed.user.tutorialComplete === undefined) parsed.user.tutorialComplete = false;
    if (!parsed.chatHistory) parsed.chatHistory = [];
    if (!parsed.history) parsed.history = emptyData.history;
    if (!parsed.timetable) parsed.timetable = [];
    return parsed;
  },
  saveData: (data: StorageData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  updateTasks: (tasks: Task[]) => {
    const current = api.getData();
    api.saveData({ ...current, tasks });
  },
  updateUser: (user: UserProfile) => {
    const current = api.getData();
    api.saveData({ ...current, user });
  },
  updateTimetable: (timetable: TimetableEntry[]) => {
    const current = api.getData();
    api.saveData({ ...current, timetable });
  },
  // Added updateChatHistory to resolve the error in AiLabScreen
  updateChatHistory: (chatHistory: ChatMessage[]) => {
    const current = api.getData();
    api.saveData({ ...current, chatHistory });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
  syncData: async () => new Promise((resolve) => setTimeout(resolve, 1500))
};
