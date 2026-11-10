'use client';

import { create } from 'zustand';
import { QuranCognitiveDB, UserAchievement, ReviewRating } from '@/db/schema';
import {
  evaluateAchievements,
  type AchievementUserProgress,
  type EvaluationResult,
} from '@/db/achievement-engine';
import { getDatabase } from '@/db';

const db = getDatabase();

export interface AchievementNotification {
  id: string;
  achievementId: string;
  title: string;
  unlockedAt: string;
  isNew?: boolean;
}

interface AchievementState {
  unlocked: UserAchievement[];
  evaluations: EvaluationResult[];
  notifications: AchievementNotification[];

  load: () => Promise<void>;
  refreshEvaluations: () => Promise<void>;
  recordRecitation: (
    ayahCount: number,
    perfectAyahCount: number,
    durationSeconds: number,
    pages: number[]
  ) => void;
  updateStreak: (isContinued: boolean) => void;
  addNotification: (notification: AchievementNotification) => void;
  clearNotifications: () => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  unlocked: [],
  evaluations: [],
  notifications: [],

  load: async () => {
    const unlocked = await db.achievements.toArray();
    set({ unlocked, notifications: [] });
    await get().refreshEvaluations();
  },

  refreshEvaluations: async () => {
    const progress = await computeProgressFromDB();
    const state = get();
    const evaluations = evaluateAchievements(progress);
    const newlyUnlocked = evaluations.filter((e) => e.unlocked && !state.unlocked.some((u) => u.achievementId === e.definition.id));
    if (newlyUnlocked.length > 0) {
      const tx = db.transaction('rw', db.achievements, async () => {
        for (const e of newlyUnlocked) {
          await db.achievements.put({
            achievementId: e.definition.id,
            unlockedAt: new Date().toISOString(),
            currentProgress: e.definition.threshold,
            progressType: e.definition.progressType,
            cumulative: e.definition.cumulative,
            totalProgress: e.currentProgress,
          });
        }
      });
      const newNotifications = newlyUnlocked.map((e) => ({
        id: e.definition.id,
        achievementId: e.definition.id,
        title: e.definition.title,
        unlockedAt: new Date().toISOString(),
        isNew: true,
      }));
      set((s) => ({
        unlocked: [...s.unlocked, ...newlyUnlocked.map((e) => ({
          achievementId: e.definition.id,
          unlockedAt: new Date().toISOString(),
          currentProgress: e.definition.threshold,
          progressType: e.definition.progressType,
          cumulative: e.definition.cumulative,
          totalProgress: e.currentProgress,
        }))],
        evaluations,
        notifications: [...newNotifications, ...s.notifications],
      }));
    } else {
      set({ evaluations });
    }
  },

  recordRecitation: (ayahCount, perfectAyahCount, durationSeconds, pages) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => !n.isNew),
    }));
    void get().refreshEvaluations();
  },

  updateStreak: (isContinued) => {
    void get().refreshEvaluations();
  },

  addNotification: (notification) => {
    set((s) => ({ notifications: [...s.notifications, notification] }));
  },

  clearNotifications: () => {
    set({ notifications: get().notifications.map((n) => ({ ...n, isNew: false })) });
  },
}));

async function computeProgressFromDB(): Promise<AchievementUserProgress> {
  const allLogs = await db.review_logs.toArray();
  const ayahLogs = allLogs.filter((l) => l.target_type === 'ayah');

  const totalRecitations = allLogs.length;
  const perfectRecitations = allLogs.filter((l) => l.error_count === 0).length;

  // Distinct ayahs ever recited (verse keys like "2:255")
  const loggedKeys = [...new Set(ayahLogs.map((l) => l.target_id))];
  const distinctAyahsRecited = loggedKeys.length;

  const studyStreak = computeCurrentStreak(allLogs);
  const longestStreak = computeLongestStreak(allLogs);
  const totalRecitationMinutes =
    allLogs.reduce((acc, l) => acc + (l.recording_duration_ms || 0), 0) / 1000;

  // Resolve recited verse keys to Medina pages and Juz coverage rate
  const rows = loggedKeys.length
    ? await db.quran_ayahs.where('verse_key').anyOf(loggedKeys).toArray()
    : [];
  const pagesTouched = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);

  const juzCompleted: number[] = [];
  for (const juz of [29, 30]) {
    const totalInJuz = await db.quran_ayahs.where('juz').equals(juz).count();
    if (totalInJuz === 0) continue;
    const covered = rows.filter((r) => r.juz === juz).length;
    if (covered >= totalInJuz) juzCompleted.push(juz);
  }

  return {
    totalRecitations,
    perfectRecitations,
    studyStreak,
    longestStreak,
    totalRecitationMinutes,
    distinctAyahsRecited,
    pagesTouched,
    juzCompleted,
  };
}

function computeCurrentStreak(logs: { timestamp: Date | string }[]): number {
  if (logs.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  let streak = 0;
  for (const log of logs) {
    const logDate = new Date(log.timestamp).toISOString().slice(0, 10);
    if (logDate === todayKey || logDate === yesterdayKey) {
      streak++;
    } else if (streak > 0) {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(logs: { timestamp: Date | string }[]): number {
  if (logs.length === 0) return 0;
  const byDay = new Map<string, number>();
  for (const log of logs) {
    const day = new Date(log.timestamp).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  const days = [...byDay.keys()].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}
