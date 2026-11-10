/**
 * Quran Cognitive OS v2.0 — Achievement Evaluation Engine
 *
 * Determines which achievements a user has unlocked and their current
 * progress by reconciling the canonical definitions with the user's
 * recorded session history stored in IndexedDB.
 */

import type {
  AchievementDefinition,
  AchievementTier,
  AchievementCategory,
  AchievementProgressType,
  UserAchievement,
} from './schema';
import { ACHIEVEMENT_DEFINITIONS } from './achievements';

export interface AchievementUserProgress {
  totalRecitations: number;
  perfectRecitations: number;
  studyStreak: number;
  longestStreak: number;
  totalRecitationMinutes: number;
  distinctAyahsRecited: number;
  pagesTouched: number[]; // Medina page numbers recited at least once
  juzCompleted: number[]; // Juz numbers fully covered by logged recitations
}

export interface EvaluationResult {
  definition: AchievementDefinition;
  currentProgress: number;
  unlocked: boolean;
  remainingUntilNext: number | null;
}

export interface AchievementState {
  unlocked: UserAchievement[];
  inProgress: {
    definition: AchievementDefinition;
    currentProgress: number;
    remainingUntilNext: number | null;
  }[];
}

function familyKey(d: AchievementDefinition): string {
  if (d.category === 'memorization') return 'ayahs';
  if (d.category === 'accuracy') return 'perfect';
  if (d.category === 'completion') return d.id;
  if (d.category === 'consistency') return 'streak';
  return d.id;
}

export function evaluateAchievements(progress: AchievementUserProgress): EvaluationResult[] {
  return ACHIEVEMENT_DEFINITIONS.map((d) => ({
    definition: d,
    currentProgress: computeCurrentProgress(d, progress),
    unlocked: computeCurrentProgress(d, progress) >= d.threshold,
    remainingUntilNext: computeNextFamily(d, progress),
  }));
}

function computeCurrentProgress(d: AchievementDefinition, progress: AchievementUserProgress): number {
  switch (d.progressType) {
    case 'count':
      return countForDefinition(d, progress);
    case 'streak_days':
      return progress.longestStreak;
    case 'total_minutes':
      return Math.round(progress.totalRecitationMinutes);
    default:
      return 0;
  }
}

function countForDefinition(d: AchievementDefinition, progress: AchievementUserProgress): number {
  switch (d.id) {
    // Recitation-count family: any recitation event counts
    case 'first-recitation':
    case 'hundred-ayahs':
    case 'thousand-ayahs':
    case 'ten-thousand-ayahs':
      return progress.totalRecitations;
    // Accuracy family: number of flawless (100% alignment) recitations
    case 'perfect-ayah':
    case 'ten-perfect-ayahs':
    case 'hundred-perfect-ayahs':
      return progress.perfectRecitations;
    // Completion family: Juz numbers are stored in threshold (30 / 29)
    case 'complete-juz-amma':
    case 'complete-juz-tabarak':
      return progress.juzCompleted.includes(d.threshold) ? d.threshold : 0;
    // Whole-Quran completion counts DISTINCT ayahs recited, not repeats
    case 'complete-full-quran':
      return Math.min(progress.distinctAyahsRecited, d.threshold);
    // Page family: unlock when that specific Medina page was recited
    case 'page-604':
    case 'page-1':
      return progress.pagesTouched.includes(d.threshold)
        ? d.threshold
        : Math.max(0, ...progress.pagesTouched);
    default:
      return 0;
  }
}

function computeNextFamily(d: AchievementDefinition, progress: AchievementUserProgress): number | null {
  const fam = familyKey(d);
  if (fam === 'ayahs') {
    if (d.id === 'first-recitation') return 99;
    if (d.id === 'hundred-ayahs') return 900;
    if (d.id === 'thousand-ayahs') return 9000;
    if (d.id === 'ten-thousand-ayahs') return -1;
  }
  if (fam === 'perfect') {
    if (d.id === 'perfect-ayah') return 9;
    if (d.id === 'ten-perfect-ayahs') return 90;
    if (d.id === 'hundred-perfect-ayahs') return -1;
  }
  if (fam === 'streak') {
    if (d.id === 'three-day-streak') return 4;
    if (d.id === 'seven-day-streak') return 23;
    if (d.id === 'thirty-day-streak') return 70;
    if (d.id === 'hundred-day-streak') return -1;
  }
  return null;
}

export function tierLabel(tier: AchievementTier): string {
  const labels: Record<AchievementTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    diamond: 'Diamond',
  };
  return labels[tier];
}

export function categoryLabel(category: AchievementCategory): string {
  const labels: Record<AchievementCategory, string> = {
    memorization: 'Memorization',
    consistency: 'Consistency',
    accuracy: 'Accuracy',
    completion: 'Completion',
    special: 'Special',
  };
  return labels[category];
}

export function tierColors(tier: AchievementTier): { bg: string; text: string; border: string } {
  switch (tier) {
    case 'bronze':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' };
    case 'silver':
      return { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' };
    case 'gold':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-400 dark:border-yellow-700' };
    case 'diamond':
      return { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-400 dark:border-cyan-700' };
  }
}
