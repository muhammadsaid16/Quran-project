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
  /** ALL recitation sessions logged (any verdict). Bold totals (10k) use this. */
  totalRecitations: number;
  /** Sessions whose verdict was 'passed' with a real, definite alignment result. */
  successfulRecitations: number;
  /** DISTINCT ayah verse-keys reviewed >= 1 time (cap 6,236). */
  uniqueAyahsReviewed: number;
  /** Recitations meeting every STRICT Flawless condition (see isPerfectRecitation). */
  perfectRecitations: number;
  studyStreak: number;
  longestStreak: number;
  totalRecitationMinutes: number;
  pagesTouched: number[]; // Medina page numbers reviewed at least once
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
  return ACHIEVEMENT_DEFINITIONS.map((d) => {
    const currentProgress = computeCurrentProgress(d, progress);
    return {
      definition: d,
      currentProgress,
      unlocked: currentProgress >= d.threshold,
      remainingUntilNext: computeNextFamily(d, currentProgress),
    };
  });
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
  // Session-count family: TOTAL recitation sessions (repeats all count).
  if (d.category === 'memorization') {
    return progress.totalRecitations;
  }

  // Accuracy family: STRICT flawless recitations only
  if (d.category === 'accuracy') {
    return progress.perfectRecitations;
  }

  // Completion family: Juz numbers 1-30 are stored in d.threshold
  if (d.category === 'completion') {
    if (d.id === 'complete-full-quran') {
      return Math.min(progress.uniqueAyahsReviewed, d.threshold);
    }
    return progress.juzCompleted.includes(d.threshold) ? d.threshold : 0;
  }

  // Page family: Medina page milestones
  if (d.id === 'page-604' || d.id === 'page-1') {
    return progress.pagesTouched.includes(d.threshold) ? d.threshold : 0;
  }

  return 0;
}

const FAMILY_IDS: Record<string, string[]> = {
  ayahs: [
    'first-recitation',
    'hundred-ayahs',
    'two-hundred-fifty-ayahs',
    'five-hundred-ayahs',
    'thousand-ayahs',
    'fifteen-hundred-ayahs',
    'two-thousand-ayahs',
    'three-thousand-ayahs',
    'four-thousand-ayahs',
    'five-thousand-ayahs',
    'ten-thousand-ayahs',
  ],
  perfect: ['perfect-ayah', 'ten-perfect-ayahs', 'hundred-perfect-ayahs'],
  streak: ['three-day-streak', 'seven-day-streak', 'thirty-day-streak', 'hundred-day-streak'],
};

/**
 * How much progress remains until the NEXT card in the same family.
 * Returns null when the card is the final tier of its family.
 */
function computeNextFamily(d: AchievementDefinition, currentProgress: number): number | null {
  const ids = FAMILY_IDS[familyKey(d)];
  if (!ids) return null;

  const family = ids
    .map((id) => ACHIEVEMENT_DEFINITIONS.find((x) => x.id === id))
    .filter((x): x is AchievementDefinition => Boolean(x));
  const index = family.findIndex((x) => x.id === d.id);
  const next = index >= 0 ? family[index + 1] : undefined;
  if (!next) return null;

  return Math.max(0, next.threshold - currentProgress);
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
      return {
        bg: 'bg-amber-50/90 dark:bg-gradient-to-br dark:from-amber-950/40 dark:to-slate-900',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-300 dark:border-amber-600/50',
      };
    case 'silver':
      return {
        bg: 'bg-slate-50/90 dark:bg-gradient-to-br dark:from-slate-800/60 dark:to-slate-900',
        text: 'text-slate-800 dark:text-slate-200',
        border: 'border-slate-300 dark:border-slate-600/70',
      };
    case 'gold':
      return {
        bg: 'bg-yellow-50/90 dark:bg-gradient-to-br dark:from-yellow-950/40 dark:to-slate-900',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-400 dark:border-yellow-500/50',
      };
    case 'diamond':
      return {
        bg: 'bg-cyan-50/90 dark:bg-gradient-to-br dark:from-cyan-950/40 dark:to-slate-900',
        text: 'text-cyan-800 dark:text-cyan-300',
        border: 'border-cyan-400 dark:border-cyan-500/50',
      };
  }
}

/**
 * STRICT Flawless predicate for ONE review log.
 *
 * All of the following must hold:
 *  1. verdict is 'passed' — 'failed' and 'needs_review' (acoustic-uncertain)
 *     sessions can never count;
 *  2. error_count === 0 — no deletion (omission), substitution, or
 *     repetition/insertion was recorded;
 *  3. error_positions empty — word-level alignment found nothing to flag,
 *     including NO 'uncertain' words (uncertain is excluded, never assumed).
 *
 * alignment_confidence is DELIBERATELY not consulted: weak model confidence
 * must not auto-fail a clean, definite recitation, and strong confidence
 * must not rescue an uncertain or erroneous verdict.
 *
 * Idempotence: this predicate reads stored logs only; combined with the
 * achievements table's primary key (achievementId) and the already-unlocked
 * filter in the store, the same event can never unlock twice.
 */
export function isPerfectRecitation(log: {
  result_status: 'passed' | 'failed' | 'needs_review';
  error_count?: number;
  error_positions?: Array<{ error_type?: string }>;
}): boolean {
  if (log.result_status !== 'passed') return false;
  if ((log.error_count ?? 0) > 0) return false;
  const positions = log.error_positions ?? [];
  if (positions.length > 0) return false;
  return true;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar-day key (YYYY-MM-DD in the device's own timezone). */
export function localDayKey(ts: Date | string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayKeyToUTC(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export interface TimestampedLog {
  timestamp: Date | string;
}

/**
 * Current streak in LOCAL calendar days, back from today (or yesterday if
 * nothing was logged today yet). A day qualifies only if >= 1 COMPLETED
 * review session exists for it — several sessions on one day count once.
 * Logs are distinct-dayed first, so ordering of input is irrelevant.
 */
export function computeCurrentStreak(logs: TimestampedLog[]): number {
  const days = new Set(logs.map((l) => localDayKey(l.timestamp)).filter(Boolean));
  if (days.size === 0) return 0;

  const now = new Date();
  const today = localDayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate);

  const anchor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!anchor) return 0;

  let count = 0;
  let cursor = dayKeyToUTC(anchor);
  for (;;) {
    const key = utcToDayKey(cursor);
    if (!days.has(key)) break;
    count++;
    cursor -= 86400000;
  }
  return count;
}

/**
 * Longest consecutive LOCAL-day run ever achieved.
 * Several sessions on the same local day count as ONE day.
 */
export function computeLongestStreak(logs: TimestampedLog[]): number {
  const keys = [...new Set(logs.map((l) => localDayKey(l.timestamp)).filter(Boolean))].sort();
  if (keys.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < keys.length; i++) {
    const gap = dayKeyToUTC(keys[i]) - dayKeyToUTC(keys[i - 1]);
    if (gap === 86400000) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}
