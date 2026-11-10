/**
 * Quran Cognitive OS v2.0 — Achievement Definitions
 *
 * Canonical list of unlockable achievement cards with thresholds, tiers,
 * categories, and the stat each one tracks.
 *
 * Categories:
 *  - memorization   (total ayahs recited across all time)
 *  - consistency    (daily study streaks)
 *  - accuracy       (highest alignment accuracy in a single recitation)
 *  - completion     (surahs/juzs completed)
 *  - special        (one-off milestones, e.g. page 604)
 *
 * Icons reference lucide-react icon names consumed by the UI layer.
 */

import type { AchievementDefinition, AchievementCategory, AchievementTier } from './schema';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // --- Memorization ---
  {
    id: 'first-recitation',
    key: 'ach.first-recitation',
    tier: 'bronze',
    category: 'memorization',
    title: 'First Step',
    description: 'Complete your first recitation review.',
    icon: 'Mic',
    threshold: 1,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'hundred-ayahs',
    key: 'ach.hundred-ayahs',
    tier: 'bronze',
    category: 'memorization',
    title: 'Century',
    description: 'Recite 100 ayahs in total.',
    icon: 'Target',
    threshold: 100,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'thousand-ayahs',
    key: 'ach.thousand-ayahs',
    tier: 'silver',
    category: 'memorization',
    title: 'Million Steps',
    description: 'Recite 1,000 ayahs in total.',
    icon: 'Award',
    threshold: 1000,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'ten-thousand-ayahs',
    key: 'ach.ten-thousand-ayahs',
    tier: 'gold',
    category: 'memorization',
    title: 'The Long Path',
    description: 'Recite 10,000 ayahs in total.',
    icon: 'Trophy',
    threshold: 10000,
    progressType: 'count',
    cumulative: true,
  },

  // --- Consistency ---
  {
    id: 'three-day-streak',
    key: 'ach.three-day-streak',
    tier: 'bronze',
    category: 'consistency',
    title: 'Habit Builder',
    description: 'Study for 3 days in a row.',
    icon: 'Calendar',
    threshold: 3,
    progressType: 'streak_days',
    cumulative: true,
  },
  {
    id: 'seven-day-streak',
    key: 'ach.seven-day-streak',
    tier: 'silver',
    category: 'consistency',
    title: 'Week of Light',
    description: 'Study for 7 days in a row.',
    icon: 'Calendar',
    threshold: 7,
    progressType: 'streak_days',
    cumulative: true,
  },
  {
    id: 'thirty-day-streak',
    key: 'ach.thirty-day-streak',
    tier: 'gold',
    category: 'consistency',
    title: 'Month of Devotion',
    description: 'Study for 30 days in a row.',
    icon: 'Calendar',
    threshold: 30,
    progressType: 'streak_days',
    cumulative: true,
  },
  {
    id: 'hundred-day-streak',
    key: 'ach.hundred-day-streak',
    tier: 'diamond',
    category: 'consistency',
    title: 'Guardian of the Path',
    description: 'Study for 100 days in a row.',
    icon: 'Shield',
    threshold: 100,
    progressType: 'streak_days',
    cumulative: true,
  },

  // --- Accuracy ---
  {
    id: 'perfect-ayah',
    key: 'ach.perfect-ayah',
    tier: 'bronze',
    category: 'accuracy',
    title: 'Flawless',
    description: 'Recite an ayah with 100% accuracy.',
    icon: 'CheckCircle2',
    threshold: 1,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'ten-perfect-ayahs',
    key: 'ach.ten-perfect-ayahs',
    tier: 'silver',
    category: 'accuracy',
    title: 'Precision',
    description: 'Recite 10 ayahs with 100% accuracy.',
    icon: 'Star',
    threshold: 10,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'hundred-perfect-ayahs',
    key: 'ach.hundred-perfect-ayahs',
    tier: 'gold',
    category: 'accuracy',
    title: 'Mastery',
    description: 'Recite 100 ayahs with 100% accuracy.',
    icon: 'Zap',
    threshold: 100,
    progressType: 'count',
    cumulative: true,
  },

  // --- Completion ---
  {
    id: 'complete-juz-amma',
    key: 'ach.complete-juz-amma',
    tier: 'bronze',
    category: 'completion',
    title: 'Juz Amma',
    description: 'Complete Juz 30.',
    icon: 'BookOpen',
    threshold: 30,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'complete-juz-tabarak',
    key: 'ach.complete-juz-tabarak',
    tier: 'silver',
    category: 'completion',
    title: 'Juz Tabarak',
    description: 'Complete Juz 29.',
    icon: 'BookOpen',
    threshold: 29,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'complete-full-quran',
    key: 'ach.complete-full-quran',
    tier: 'diamond',
    category: 'completion',
    title: 'Hafiz',
    description: 'Complete the entire Quran (all 6,236 ayahs).',
    icon: 'Crown',
    threshold: 6236,
    progressType: 'count',
    cumulative: true,
  },

  // --- Special ---
  {
    id: 'page-604',
    key: 'ach.page-604',
    tier: 'gold',
    category: 'special',
    title: 'The Final Page',
    description: 'Recite from page 604 of the Medina Mushaf.',
    icon: 'Flag',
    threshold: 604,
    progressType: 'count',
    cumulative: true,
  },
  {
    id: 'page-1',
    key: 'ach.page-1',
    tier: 'bronze',
    category: 'special',
    title: 'Opening Page',
    description: 'Recite from page 1 of the Medina Mushaf.',
    icon: 'Flag',
    threshold: 1,
    progressType: 'count',
    cumulative: true,
  },
];

export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((d) => d.category === category);
}

export function getAchievementsByTier(tier: AchievementTier): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((d) => d.tier === tier);
}

export function achievementSortKey(d: AchievementDefinition): number {
  const tierOrder: Record<AchievementTier, number> = {
    bronze: 0,
    silver: 1,
    gold: 2,
    diamond: 3,
  };
  return tierOrder[d.tier];
}
