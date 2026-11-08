import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'sepia' | 'high-contrast';
export type ViewMode = 'dashboard' | 'mushaf' | 'heatmap';
export type MushafFontSize = 'compact' | 'standard' | 'large';

interface SessionState {
  theme: ThemeMode;
  fontSize: MushafFontSize;
  activeView: ViewMode;
  currentPage: number;
  currentSurah: number;
  currentJuz: number;
  dailyGoal: number;
  todayRecitedCount: number;
  streakDays: number;
  audioSensitivity: number; // 0 - 100
  isOnline: boolean;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (fontSize: MushafFontSize) => void;
  setActiveView: (view: ViewMode) => void;
  setCurrentPage: (page: number) => void;
  setCurrentSurah: (surah: number) => void;
  setCurrentJuz: (juz: number) => void;
  setDailyGoal: (goal: number) => void;
  incrementRecitedCount: () => void;
  setAudioSensitivity: (sensitivity: number) => void;
  setIsOnline: (online: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  theme: 'light',
  fontSize: 'standard',
  activeView: 'dashboard',
  currentPage: 1,
  currentSurah: 1,
  currentJuz: 1,
  dailyGoal: 20,
  todayRecitedCount: 7,
  streakDays: 14,
  audioSensitivity: 75,
  isOnline: true,

  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark' || theme === 'high-contrast') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  setFontSize: (fontSize) => set({ fontSize }),
  setActiveView: (activeView) => set({ activeView }),
  setCurrentPage: (currentPage) => {
    const page = Math.max(1, Math.min(604, currentPage));
    set({ currentPage: page });
  },
  setCurrentSurah: (currentSurah) => set({ currentSurah: Math.max(1, Math.min(114, currentSurah)) }),
  setCurrentJuz: (currentJuz) => set({ currentJuz: Math.max(1, Math.min(30, currentJuz)) }),
  setDailyGoal: (dailyGoal) => set({ dailyGoal }),
  incrementRecitedCount: () => set((state) => ({ todayRecitedCount: state.todayRecitedCount + 1 })),
  setAudioSensitivity: (audioSensitivity) => set({ audioSensitivity }),
  setIsOnline: (isOnline) => set({ isOnline }),
}));
