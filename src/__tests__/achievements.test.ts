/**
 * Milestone: Achievement Cards
 *
 * Verifies the achievement definition catalogue integrity and the
 * evaluation engine that unlocks cards from raw user progress:
 *  1. Definitions: unique ids, valid tiers/categories, ascending thresholds
 *  2. Evaluation: fresh user has nothing unlocked; thresholds unlock exactly when reached
 *  3. Family semantics: recitation counts, perfect-ayah counts, streak milestones,
 *     Juz/Page completion, distinct-ayah (no repeat farming)
 *  4. Store progress derivation from IndexedDB logs
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS, getAchievementDefinition, achievementSortKey } from '../db/achievements';
import {
  evaluateAchievements,
  tierLabel,
  categoryLabel,
  tierColors,
  type AchievementUserProgress,
} from '../db/achievement-engine';
import type { AchievementTier, AchievementCategory } from '../db/schema';

function freshProgress(overrides: Partial<AchievementUserProgress> = {}): AchievementUserProgress {
  return {
    totalRecitations: 0,
    perfectRecitations: 0,
    studyStreak: 0,
    longestStreak: 0,
    totalRecitationMinutes: 0,
    distinctAyahsRecited: 0,
    pagesTouched: [],
    juzCompleted: [],
    ...overrides,
  };
}

describe('Milestone 8 — Achievement Cards: definition catalogue', () => {
  it('has unique, non-empty ids and descriptions for every card', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of ACHIEVEMENT_DEFINITIONS) {
      expect(d.id).toMatch(/^[a-z0-9-]+$/);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
      expect(d.threshold).toBeGreaterThan(0);
    }
  });

  it('uses only valid tiers and categories', () => {
    const tiers: AchievementTier[] = ['bronze', 'silver', 'gold', 'diamond'];
    const categories: AchievementCategory[] = [
      'memorization',
      'consistency',
      'accuracy',
      'completion',
      'special',
    ];
    for (const d of ACHIEVEMENT_DEFINITIONS) {
      expect(tiers).toContain(d.tier);
      expect(categories).toContain(d.category);
      expect(['count', 'total_minutes', 'streak_days']).toContain(d.progressType);
    }
  });

  it('orders threshold tiers ascending within each family', () => {
    const reciteFamily = ACHIEVEMENT_DEFINITIONS.filter((d) =>
      ['first-recitation', 'hundred-ayahs', 'thousand-ayahs', 'ten-thousand-ayahs'].includes(d.id)
    ).sort((a, b) => achievementSortKey(a) - achievementSortKey(b));
    const thresholds = reciteFamily.map((d) => d.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });

  it('provides lookup helpers', () => {
    expect(getAchievementDefinition('first-recitation')?.tier).toBe('bronze');
    expect(getAchievementDefinition('does-not-exist')).toBeUndefined();
  });
});

describe('Milestone 8 — Achievement Cards: evaluation engine', () => {
  it('leaves every card locked for a brand new user', () => {
    const results = evaluateAchievements(freshProgress());
    expect(results).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
    expect(results.every((r) => !r.unlocked)).toBe(true);
  });

  it('unlocks First Step on the very first recitation and nothing before', () => {
    const zero = evaluateAchievements(freshProgress({ totalRecitations: 0 }));
    expect(zero.find((r) => r.definition.id === 'first-recitation')?.unlocked).toBe(false);

    const one = evaluateAchievements(freshProgress({ totalRecitations: 1 }));
    expect(one.find((r) => r.definition.id === 'first-recitation')?.unlocked).toBe(true);
    expect(one.find((r) => r.definition.id === 'hundred-ayahs')?.unlocked).toBe(false);
  });

  it('unlocks the recitation-count family at exactly each threshold', () => {
    const at100 = evaluateAchievements(freshProgress({ totalRecitations: 100 }));
    expect(at100.find((r) => r.definition.id === 'first-recitation')?.unlocked).toBe(true);
    expect(at100.find((r) => r.definition.id === 'hundred-ayahs')?.unlocked).toBe(true);
    expect(at100.find((r) => r.definition.id === 'thousand-ayahs')?.unlocked).toBe(false);

    const at1000 = evaluateAchievements(freshProgress({ totalRecitations: 1000 }));
    expect(at1000.find((r) => r.definition.id === 'thousand-ayahs')?.unlocked).toBe(true);
  });

  it('unlocks accuracy milestones from flawless recitations only', () => {
    const results = evaluateAchievements(freshProgress({ perfectRecitations: 10 }));
    expect(results.find((r) => r.definition.id === 'perfect-ayah')?.unlocked).toBe(true);
    expect(results.find((r) => r.definition.id === 'ten-perfect-ayahs')?.unlocked).toBe(true);
    expect(results.find((r) => r.definition.id === 'hundred-perfect-ayahs')?.unlocked).toBe(false);

    // Many imperfect recitations must NOT unlock accuracy cards
    const imperfect = evaluateAchievements(
      freshProgress({ totalRecitations: 500, perfectRecitations: 0 })
    );
    expect(imperfect.find((r) => r.definition.id === 'perfect-ayah')?.unlocked).toBe(false);
  });

  it('unlocks streak milestones from the longest achieved streak', () => {
    const results = evaluateAchievements(freshProgress({ longestStreak: 7 }));
    expect(results.find((r) => r.definition.id === 'three-day-streak')?.unlocked).toBe(true);
    expect(results.find((r) => r.definition.id === 'seven-day-streak')?.unlocked).toBe(true);
    expect(results.find((r) => r.definition.id === 'thirty-day-streak')?.unlocked).toBe(false);
  });

  it('unlocks Juz/Page completion only for truly covered units', () => {
    const results = evaluateAchievements(
      freshProgress({ juzCompleted: [30], pagesTouched: [1, 604] })
    );
    expect(results.find((r) => r.definition.id === 'complete-juz-amma')?.unlocked).toBe(true);
    expect(results.find((r) => r.definition.id === 'complete-juz-tabarak')?.unlocked).toBe(false);
    expect(results.find((r) => r.definition.id === 'page-1')?.unlocked).toBe(true);
    expect(results.find((r) => r.definition.id === 'page-604')?.unlocked).toBe(true);

    const early = evaluateAchievements(freshProgress({ pagesTouched: [1, 2] }));
    expect(early.find((r) => r.definition.id === 'page-604')?.unlocked).toBe(false);
  });

  it('counts DISTINCT ayahs for Hafiz completion (repeat-farming cannot cheat)', () => {
    const repeats = evaluateAchievements(
      freshProgress({ totalRecitations: 99999, distinctAyahsRecited: 10 })
    );
    expect(repeats.find((r) => r.definition.id === 'hundred-ayahs')?.unlocked).toBe(true);
    expect(repeats.find((r) => r.definition.id === 'complete-full-quran')?.unlocked).toBe(false);

    const complete = evaluateAchievements(
      freshProgress({ distinctAyahsRecited: 6236 })
    );
    expect(complete.find((r) => r.definition.id === 'complete-full-quran')?.unlocked).toBe(true);
  });

  it('exposes clean labels and tier colours for every tier/category', () => {
    expect(tierLabel('bronze')).toBe('Bronze');
    expect(tierLabel('diamond')).toBe('Diamond');
    expect(categoryLabel('memorization')).toBe('Memorization');
    for (const tier of ['bronze', 'silver', 'gold', 'diamond'] as AchievementTier[]) {
      const colors = tierColors(tier);
      expect(colors.bg).toContain('bg-');
      expect(colors.text).toContain('text-');
      expect(colors.border).toContain('border-');
    }
  });
});

describe('Milestone 8 — Achievement Cards: store persistence', () => {
  it('auto-unlocks newly earned achievements in IndexedDB and keeps them across reloads', async () => {
    const { getDatabase } = await import('../db');
    const db = getDatabase(); // same singleton the achievement store reads from

    // Seed a fake review log so the store's progress computation sees one recitation
    await db.review_logs.add({
      log_id: 'log:test:1',
      target_id: '1:1',
      target_type: 'ayah',
      timestamp: new Date().toISOString(),
      rating: 3,
      recording_duration_ms: 60000,
      inference_duration_ms: 400,
      alignment_confidence: 1,
      error_count: 0,
      error_positions: [],
      result_status: 'passed',
    });

    const { useAchievementStore } = await import('../stores/achievement-store');
    await useAchievementStore.getState().load();
    await useAchievementStore.getState().refreshEvaluations();

    const state = useAchievementStore.getState();
    const firstStep = state.unlocked.find((u) => u.achievementId === 'first-recitation');
    expect(firstStep).toBeDefined();
    expect(firstStep!.unlockedAt).toBeTruthy();

    // Persisted record survives a fresh store load
    expect(await db.achievements.get('first-recitation')).toBeDefined();

    await db.review_logs.clear();
    await db.achievements.clear();
    await db.delete();
  }, 20000);
});
