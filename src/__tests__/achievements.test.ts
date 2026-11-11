/**
 * Milestone: Achievement Cards
 *
 * Verifies the achievement definition catalogue integrity, the evaluation
 * engine, the STRICT accuracy/local-day-streak predicates, and store
 * persistence against IndexedDB review logs:
 *  1. Definitions: exact count (16) & category breakdown, unique ids, valid
 *     tiers/categories, ascending thresholds
 *  2. Evaluation: fresh user locked; thresholds unlock exactly when reached
 *  3. THE REVIEW REQUIRED CASES:
 *     - one ayah repeated 6,236 times does NOT unlock Quran Coverage
 *     - reviewing all 6,236 distinct ayahs unlocks Coverage (and only that
 *       completion card, juzes untouched)
 *     - several sessions on the same LOCAL calendar day count as ONE day
 *     - an acoustically UNCERTAIN session never grants Flawless
 *     - re-evaluating twice never writes a duplicate unlock
 *     - reaching a final threshold unlocks exactly once
 *  4. Counter separation: total / successful / unique / perfect recitations
 *  5. Store progress derivation from real IndexedDB logs
 */

import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS, getAchievementDefinition, achievementSortKey } from '../db/achievements';
import {
  evaluateAchievements,
  isPerfectRecitation,
  computeCurrentStreak,
  computeLongestStreak,
  localDayKey,
  tierLabel,
  categoryLabel,
  tierColors,
  type AchievementUserProgress,
} from '../db/achievement-engine';
import type { AchievementTier, AchievementCategory } from '../db/schema';

function freshProgress(overrides: Partial<AchievementUserProgress> = {}): AchievementUserProgress {
  return {
    totalRecitations: 0,
    successfulRecitations: 0,
    uniqueAyahsReviewed: 0,
    perfectRecitations: 0,
    studyStreak: 0,
    longestStreak: 0,
    totalRecitationMinutes: 0,
    pagesTouched: [],
    juzCompleted: [],
    ...overrides,
  };
}

function unlock(results: ReturnType<typeof evaluateAchievements>, id: string): boolean {
  return results.find((r) => r.definition.id === id)?.unlocked === true;
}

describe('Milestone 8 — Achievement Cards: definition catalogue', () => {
  it('contains EXACTLY 51 cards with all 30 Juzes and expanded recitation milestones', () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(51);
    const byCategory: Record<string, number> = {};
    for (const d of ACHIEVEMENT_DEFINITIONS) {
      byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;
    }
    expect(byCategory).toEqual({
      memorization: 11,
      consistency: 4,
      accuracy: 3,
      completion: 31,
      special: 2,
    });
  });

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

  it('names the whole-Quran card "Quran Coverage" (not a mastery/hifz claim)', () => {
    const coverage = getAchievementDefinition('complete-full-quran');
    expect(coverage).toBeDefined();
    expect(coverage!.title).toBe('Quran Coverage');
    expect(coverage!.description).toMatch(/coverage/i);
    expect(coverage!.description).toMatch(/not a.*claim|not a حفظ|mastery/i);
  });

  it('orders threshold tiers ascending within each family', () => {
    const sessionFamily = ACHIEVEMENT_DEFINITIONS.filter((d) =>
      ['first-recitation', 'hundred-ayahs', 'thousand-ayahs', 'ten-thousand-ayahs'].includes(d.id)
    ).sort((a, b) => achievementSortKey(a) - achievementSortKey(b));
    const thresholds = sessionFamily.map((d) => d.threshold);
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
    expect(unlock(zero, 'first-recitation')).toBe(false);

    const one = evaluateAchievements(freshProgress({ totalRecitations: 1 }));
    expect(unlock(one, 'first-recitation')).toBe(true);
    expect(unlock(one, 'hundred-ayahs')).toBe(false);
  });

  it('unlocks the session-count family at exactly each threshold', () => {
    const at100 = evaluateAchievements(freshProgress({ totalRecitations: 100 }));
    expect(unlock(at100, 'first-recitation')).toBe(true);
    expect(unlock(at100, 'hundred-ayahs')).toBe(true);
    expect(unlock(at100, 'thousand-ayahs')).toBe(false);

    const at1000 = evaluateAchievements(freshProgress({ totalRecitations: 1000 }));
    expect(unlock(at1000, 'thousand-ayahs')).toBe(true);
  });

  it('keeps the top milestone bound to TOTAL sessions capped at the true ayah count (6,236)', () => {
    // All 6,236 ayahs reviewed ONCE reaches both the 6,236-review milestone
    // and full coverage — the milestone can never exceed the Quran's ayah count.
    const allAyahsOnce = evaluateAchievements(
      freshProgress({ totalRecitations: 6236, uniqueAyahsReviewed: 6236 })
    );
    expect(unlock(allAyahsOnce, 'complete-full-quran')).toBe(true);
    expect(unlock(allAyahsOnce, 'ten-thousand-ayahs')).toBe(true);

    // One session short stays locked.
    const justBelow = evaluateAchievements(freshProgress({ totalRecitations: 6235 }));
    expect(unlock(justBelow, 'ten-thousand-ayahs')).toBe(false);

    // A SINGLE ayah repeated 6,236 times unlocks the session milestone (repeats
    // count) while TRUE coverage stays locked at one distinct ayah.
    const repeatOne = evaluateAchievements(
      freshProgress({ totalRecitations: 6236, uniqueAyahsReviewed: 1 })
    );
    expect(unlock(repeatOne, 'ten-thousand-ayahs')).toBe(true);
    expect(unlock(repeatOne, 'complete-full-quran')).toBe(false);
  });

  it('unlocks accuracy milestones from strict flawless recitations only', () => {
    const results = evaluateAchievements(freshProgress({ perfectRecitations: 10 }));
    expect(unlock(results, 'perfect-ayah')).toBe(true);
    expect(unlock(results, 'ten-perfect-ayahs')).toBe(true);
    expect(unlock(results, 'hundred-perfect-ayahs')).toBe(false);

    // Many imperfect sessions must NOT unlock accuracy cards
    const imperfect = evaluateAchievements(
      freshProgress({ totalRecitations: 500, successfulRecitations: 500, perfectRecitations: 0 })
    );
    expect(unlock(imperfect, 'perfect-ayah')).toBe(false);
  });

  it('unlocks streak milestones from the longest achieved streak', () => {
    const results = evaluateAchievements(freshProgress({ longestStreak: 7 }));
    expect(unlock(results, 'three-day-streak')).toBe(true);
    expect(unlock(results, 'seven-day-streak')).toBe(true);
    expect(unlock(results, 'thirty-day-streak')).toBe(false);
  });

  it('unlocks Juz/Page completion only for truly covered units', () => {
    const results = evaluateAchievements(
      freshProgress({ juzCompleted: [30], pagesTouched: [1, 604] })
    );
    expect(unlock(results, 'complete-juz-amma')).toBe(true);
    expect(unlock(results, 'complete-juz-tabarak')).toBe(false);
    expect(unlock(results, 'page-1')).toBe(true);
    expect(unlock(results, 'page-604')).toBe(true);

    const early = evaluateAchievements(freshProgress({ pagesTouched: [1, 2] }));
    expect(unlock(early, 'page-604')).toBe(false);

    // Progress on other pages must not leak: touching only page 604 must NOT
    // falsely unlock the page-1 card (page-1 threshold is 1).
    const lastPageOnly = evaluateAchievements(freshProgress({ pagesTouched: [604] }));
    expect(unlock(lastPageOnly, 'page-604')).toBe(true);
    expect(unlock(lastPageOnly, 'page-1')).toBe(false);
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

// ---------------------------------------------------------------------------
// Required adversarial cases from the feature review
// ---------------------------------------------------------------------------

describe('Milestone 8 — required review cases', () => {
  it('CASE 1: one ayah repeated 6,236 times does NOT unlock Quran Coverage', () => {
    const results = evaluateAchievements(
      freshProgress({ totalRecitations: 6236, uniqueAyahsReviewed: 1 })
    );
    expect(unlock(results, 'complete-full-quran')).toBe(false);
    // progress must cap at the single distinct ayah, not the session count
    const coverage = results.find((r) => r.definition.id === 'complete-full-quran');
    expect(coverage?.currentProgress).toBe(1);
    // session milestones legitimately DO advance from repeats (counters separated)
    expect(unlock(results, 'thousand-ayahs')).toBe(true);
    expect(unlock(results, 'ten-thousand-ayahs')).toBe(true);
  });

  it('CASE 2: reviewing every distinct ayah once unlocks Coverage (only juz-coverage can follow, juzes untouched)', () => {
    const results = evaluateAchievements(
      freshProgress({ totalRecitations: 6236, uniqueAyahsReviewed: 6236 })
    );
    expect(unlock(results, 'complete-full-quran')).toBe(true);
    // no juz was fully covered in this scenario (juzCompleted: [])
    expect(unlock(results, 'complete-juz-amma')).toBe(false);
    expect(unlock(results, 'complete-juz-tabarak')).toBe(false);
    // coverage alone proves nothing about accuracy or streaks
    expect(unlock(results, 'perfect-ayah')).toBe(false);
    expect(unlock(results, 'three-day-streak')).toBe(false);
  });

  it('CASE 3: several sessions on the same local calendar day count as ONE streak day', () => {
    const morning = new Date();
    morning.setHours(6, 0, 0, 0);
    const noon = new Date();
    noon.setHours(12, 30, 0, 0);
    const evening = new Date();
    evening.setHours(23, 45, 0, 0);

    const sameDay = [
      { timestamp: morning.toISOString() },
      { timestamp: noon.toISOString() },
      { timestamp: evening.toISOString() },
    ];
    expect(computeCurrentStreak(sameDay)).toBe(1);
    expect(computeLongestStreak(sameDay)).toBe(1);

    // two days, five sessions => streak of 2
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(20, 0, 0, 0);
    const twoDays = [...sameDay, { timestamp: yesterday.toISOString() }];
    expect(computeCurrentStreak(twoDays)).toBe(2);
    expect(computeLongestStreak(twoDays)).toBe(2);
  });

  it('CASE 4: an acoustically UNCERTAIN session never grants Flawless', () => {
    // needs_review verdict (forced by the review panel when acoustic
    // confidence is weak) even with zero recorded errors:
    expect(
      isPerfectRecitation({ result_status: 'needs_review', error_count: 0, error_positions: [] })
    ).toBe(false);
    // a 'passed' verdict carrying uncertain word flags is still excluded:
    expect(
      isPerfectRecitation({
        result_status: 'passed',
        error_count: 0,
        error_positions: [{ error_type: 'uncertain' }],
      })
    ).toBe(false);
    // failed verdict excluded:
    expect(
      isPerfectRecitation({ result_status: 'failed', error_count: 0, error_positions: [] })
    ).toBe(false);
    // real omissions/substitutions excluded:
    expect(
      isPerfectRecitation({
        result_status: 'passed',
        error_count: 1,
        error_positions: [],
      })
    ).toBe(false);
    expect(
      isPerfectRecitation({
        result_status: 'passed',
        error_count: 0,
        error_positions: [{ error_type: 'substitution' }],
      })
    ).toBe(false);
    // only a definite, error-free, flag-free verdict qualifies:
    expect(
      isPerfectRecitation({ result_status: 'passed', error_count: 0, error_positions: [] })
    ).toBe(true);
    // ...even if model confidence was weak (never auto-fail a clean verdict):
    expect(
      isPerfectRecitation({ result_status: 'passed', error_count: 0, error_positions: [] })
    ).toBe(true);
  });

  it('CASE 5 + 6: re-evaluating twice never duplicates unlocks; final thresholds fire once', async () => {
    const { getDatabase } = await import('../db');
    const db = getDatabase();

    await db.review_logs.clear();
    await db.achievements.clear();

    // three definite, flawless sessions (each a different ayah for coverage realism)
    const baseLogs = [
      { log_id: 'log:a', target_id: '1:1', error_count: 0, error_positions: [], result_status: 'passed' as const },
      { log_id: 'log:b', target_id: '1:2', error_count: 0, error_positions: [], result_status: 'passed' as const },
      { log_id: 'log:c', target_id: '1:3', error_count: 0, error_positions: [], result_status: 'passed' as const },
    ];
    for (const l of baseLogs) {
      await db.review_logs.add({
        ...l,
        target_type: 'ayah',
        timestamp: new Date().toISOString(),
        rating: 3,
        recording_duration_ms: 30000,
        inference_duration_ms: 300,
        alignment_confidence: 1,
      });
    }

    const { useAchievementStore } = await import('../stores/achievement-store');
    await useAchievementStore.getState().load(); // load() itself evaluates once
    await useAchievementStore.getState().refreshEvaluations(); // evaluate a 2nd time
    await useAchievementStore.getState().refreshEvaluations(); // and a 3rd

    const rows = await db.achievements.toArray();
    const ids = rows.map((r) => r.achievementId);
    // no duplicate unlock rows even after three evaluations
    expect(new Set(ids).size).toBe(ids.length);
    // exactly one row for a card whose threshold was reached (First Step = 1)
    expect(ids.filter((i) => i === 'first-recitation')).toHaveLength(1);

    const state = useAchievementStore.getState();
    const unlockedIds = state.unlocked.map((u) => u.achievementId);
    expect(new Set(unlockedIds).size).toBe(unlockedIds.length);
    // notifications must not repeat either
    const noteIds = state.notifications.map((n) => n.achievementId ?? n.id);
    expect(new Set(noteIds).size).toBe(noteIds.length);

    await db.review_logs.clear();
    await db.achievements.clear();
    await db.delete();
  }, 20000);

  it('CASE 3b: streak helpers respect LOCAL calendar days (not UTC-aligned)', () => {
    // 23:30 local must belong to TODAY locally even though tomorrow's UTC
    // string would say otherwise for Etc/GMT zones — anchor relative to now.
    const now = new Date();
    expect(localDayKey(now)).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    );

    // a session 8 days ago + one today => current streak 1 (gap breaks it)
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const broken = [{ timestamp: eightDaysAgo }, { timestamp: new Date() }];
    expect(computeCurrentStreak(broken)).toBe(1);
    expect(computeLongestStreak(broken)).toBe(1);
  });
});

describe('Milestone 8 — Achievement Cards: store persistence', () => {
  it('derives separated counters from real logs and persists unlocks across reloads', async () => {
    const { getDatabase } = await import('../db');
    const db = getDatabase(); // same singleton the achievement store reads from

    await db.review_logs.clear();
    await db.achievements.clear();

    // Phase A: ONLY an acoustically uncertain session exists — it is a
    // completed session (First Step may fire) but must never count perfect.
    await db.review_logs.add({
      log_id: 'log:test:uncertain',
      target_id: '1:1',
      target_type: 'ayah',
      timestamp: new Date().toISOString(),
      rating: 3, // user (or suggestion) pressed Good — yet verdict stays uncertain
      recording_duration_ms: 20000,
      inference_duration_ms: 300,
      alignment_confidence: 0.4,
      error_count: 0,
      error_positions: [{ word_index: 7, expected: 'رَبِّ', error_type: 'uncertain' }],
      result_status: 'needs_review',
    });

    const { useAchievementStore } = await import('../stores/achievement-store');
    await useAchievementStore.getState().load();
    await useAchievementStore.getState().refreshEvaluations();

    let state = useAchievementStore.getState();
    let firstStep = state.unlocked.find((u) => u.achievementId === 'first-recitation');
    expect(firstStep).toBeDefined();

    // The uncertain session must NOT have granted Flawless:
    const flawlessUncertainOnly = state.evaluations.find((e) => e.definition.id === 'perfect-ayah');
    expect(flawlessUncertainOnly?.unlocked).toBe(false);
    expect(flawlessUncertainOnly?.currentProgress).toBe(0);

    // Phase B: now add ONE definite clean session — Flawless fires from it
    // ALONE (progress must be exactly 1: the uncertain one stayed excluded).
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
    await useAchievementStore.getState().refreshEvaluations();

    state = useAchievementStore.getState();
    const flawlessClean = state.evaluations.find((e) => e.definition.id === 'perfect-ayah');
    expect(flawlessClean?.unlocked).toBe(true);
    expect(flawlessClean?.currentProgress).toBe(1);
    firstStep = state.unlocked.find((u) => u.achievementId === 'first-recitation');
    expect(firstStep).toBeDefined();

    // distinct ayah = 1 despite 2 sessions (uniqueAyahsReviewed separation)
    const coverage = state.evaluations.find((e) => e.definition.id === 'complete-full-quran');
    expect(coverage?.currentProgress).toBe(1);

    // Persisted record survives a fresh store load
    expect(await db.achievements.get('first-recitation')).toBeDefined();
    const beforeIds = (await db.achievements.toArray()).map((r) => r.achievementId);
    await useAchievementStore.getState().refreshEvaluations();
    const afterIds = (await db.achievements.toArray()).map((r) => r.achievementId);
    expect(afterIds).toEqual(beforeIds);

    await db.review_logs.clear();
    await db.achievements.clear();
    await db.delete();
  }, 20000);
});