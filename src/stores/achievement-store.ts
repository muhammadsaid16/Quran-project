'use client';

import { create } from 'zustand';
import { UserAchievement } from '@/db/schema';
import {
  evaluateAchievements,
  isPerfectRecitation,
  computeCurrentStreak,
  computeLongestStreak,
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
      await db.transaction('rw', db.achievements, async () => {
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

  // NOTE on wording: 'recitations' == completed review SESSIONS (any verdict),
  // NOT distinct ayahs. The Quran has 6,236 ayahs, so the top memorization
  // milestone (6,236 reviews) equals exactly one full pass over that count and
  // is reached through SESSIONS/repeats — not by covering 6,236 distinct ayahs
  // (that is what the separate Quran Coverage card measures).
  const totalRecitations = allLogs.length;
  const successfulRecitations = allLogs.filter((l) => l.result_status === 'passed').length;
  // STRICT Flawless definition: passed verdict, zero errors, no flagged
  // (incl. uncertain) words — confidence is never consulted (see engine).
  const perfectRecitations = allLogs.filter(isPerfectRecitation).length;
  // Anti-farming: DISTINCT verse keys only — repeating one ayah can never
  // inflate Quran Coverage beyond 1.
  const uniqueAyahsReviewed = new Set(ayahLogs.map((l) => l.target_id)).size;

  const studyStreak = computeCurrentStreak(allLogs);
  const longestStreak = computeLongestStreak(allLogs);
  const totalRecitationMinutes =
    allLogs.reduce((acc, l) => acc + (l.recording_duration_ms || 0), 0) / 60000;

  // Resolve recited verse keys to Medina pages and Juz coverage rate
  const verseKeys = [...new Set(ayahLogs.map((l) => l.target_id))];
  const rows = verseKeys.length
    ? await db.quran_ayahs.where('verse_key').anyOf(verseKeys).toArray()
    : [];
  const pagesTouched = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);

  const juzCompleted: number[] = [];
  for (let juz = 1; juz <= 30; juz++) {
    const totalInJuz = await db.quran_ayahs.where('juz').equals(juz).count();
    if (totalInJuz === 0) continue;
    // Coverage rule: EVERY ayah of the juz reviewed >= 1 time — sessions of
    // uncertain verdict still prove exposure (coverage != mastery).
    const covered = rows.filter((r) => r.juz === juz).length;
    if (covered >= totalInJuz) juzCompleted.push(juz);
  }

  return {
    totalRecitations,
    successfulRecitations,
    uniqueAyahsReviewed,
    perfectRecitations,
    studyStreak,
    longestStreak,
    totalRecitationMinutes,
    pagesTouched,
    juzCompleted,
  };
}
