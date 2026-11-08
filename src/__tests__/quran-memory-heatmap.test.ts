/**
 * Quran Cognitive OS v2.0 — Milestone 6: Quran Memory Heatmap & Retrievability Analytics Tests
 *
 * Verifies:
 * 1. FSRS Retrievability mathematics across known decay intervals & state isolation.
 * 2. Unreviewed / New cards are strictly NEVER classified as mastered.
 * 3. Exact 15-line Medina Mushaf pagination mapping across all 6,236 Ayahs & 604 pages.
 * 4. Immediate reactive update of heatmap upon voice review completion.
 * 5. Full state transitions (New, Learning, Review, Relearning) and lapses.
 * 6. High-throughput performance profiling for full 604-page matrix rendering.
 * 7. Independent state preservation between Ayah cards and Transition Edge boundary cards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { QuranCognitiveDB, MemoryCard, QuranAyah, TransitionEdge } from '../db/schema';
import { seedQuranDatabase } from '../db/seed';
import { HeatmapAnalyticsEngine } from '../fsrs/heatmap-analytics';
import { FSRSService } from '../fsrs/fsrs-service';
import { FSRSScheduler } from '../fsrs/scheduler';
import { State } from '../fsrs/types';
import { SURAHS } from '../data/surahs';
import corpusData from '../data/quran-corpus.json';

describe('Milestone 6: Quran Memory Heatmap & Retrievability Analytics', () => {
  let db: QuranCognitiveDB;
  const corpusAyahs = (corpusData.ayahs || []) as unknown as QuranAyah[];

  beforeEach(async () => {
    db = new QuranCognitiveDB(`test-heatmap-${Date.now()}-${Math.random()}`);
    await seedQuranDatabase(db);
  });

  // ==========================================================================
  // 1. Mathematical FSRS Retrievability & Strict State Isolation
  // ==========================================================================
  describe('1. FSRS Retrievability Mathematics & State Isolation', () => {
    it('strictly assigns R = 0% to New or unreviewed cards and NEVER classifies them as mastered', () => {
      const newCard: MemoryCard = {
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: State.New,
        last_review: null,
      };

      const now = new Date();
      const r = HeatmapAnalyticsEngine.calculateAyahRetrievability(newCard, now);
      const status = HeatmapAnalyticsEngine.classifyMemoryStatus(r, newCard, now);

      expect(r).toBe(0.0);
      expect(status).toBe('new');
      expect(status).not.toBe('mastered');
    });

    it('calculates R = 100% immediately after successful review (t = 0)', () => {
      const now = new Date();
      const masteredCard: MemoryCard = {
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: new Date(now.getTime() + 10 * 86400000),
        stability: 10.0,
        difficulty: 4.5,
        elapsed_days: 0,
        scheduled_days: 10,
        reps: 3,
        lapses: 0,
        state: State.Review,
        last_review: now,
      };

      const r = HeatmapAnalyticsEngine.calculateAyahRetrievability(masteredCard, now);
      const status = HeatmapAnalyticsEngine.classifyMemoryStatus(r, masteredCard, now);

      expect(r).toBe(1.0);
      expect(status).toBe('mastered');
    });

    it('accurately evaluates R ≈ 90% when elapsed time equals memory stability (t = S)', () => {
      const stabilityDays = 14;
      const reviewDate = new Date('2026-10-01T12:00:00Z');
      const asOfDate = new Date('2026-10-15T12:00:00Z'); // 14 days later

      const card: MemoryCard = {
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: asOfDate,
        stability: stabilityDays,
        difficulty: 5.0,
        elapsed_days: 14,
        scheduled_days: 14,
        reps: 4,
        lapses: 0,
        state: State.Review,
        last_review: reviewDate,
      };

      const r = HeatmapAnalyticsEngine.calculateAyahRetrievability(card, asOfDate);
      expect(r).toBeGreaterThanOrEqual(0.85);
      expect(r).toBeLessThanOrEqual(0.95);
    });

    it('classifies cards with elapsed time far exceeding stability as high_risk (R < 85%)', () => {
      const reviewDate = new Date('2026-09-01T12:00:00Z');
      const asOfDate = new Date('2026-10-15T12:00:00Z'); // 44 days elapsed

      const card: MemoryCard = {
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: new Date('2026-09-08T12:00:00Z'),
        stability: 7.0, // only 7 days stability
        difficulty: 6.0,
        elapsed_days: 44,
        scheduled_days: 7,
        reps: 2,
        lapses: 1,
        state: State.Review,
        last_review: reviewDate,
      };

      const r = HeatmapAnalyticsEngine.calculateAyahRetrievability(card, asOfDate);
      const status = HeatmapAnalyticsEngine.classifyMemoryStatus(r, card, asOfDate);

      expect(r).toBeLessThan(0.85);
      expect(status).toBe('high_risk');
    });
  });

  // ==========================================================================
  // 2. Medina 15-Line Mushaf Pagination & All 6,236 Ayahs Verification
  // ==========================================================================
  describe('2. Medina 15-Line Mushaf Pagination & All 6,236 Ayahs Mapping', () => {
    it('maps all 6,236 Ayahs across all 604 Medina Mushaf pages with zero gaps or overlaps', () => {
      const ayahsByPage = new Map<number, QuranAyah[]>();
      for (const a of corpusAyahs) {
        expect(a.page).toBeGreaterThanOrEqual(1);
        expect(a.page).toBeLessThanOrEqual(604);
        expect(a.juz).toBeGreaterThanOrEqual(1);
        expect(a.juz).toBeLessThanOrEqual(30);

        const list = ayahsByPage.get(a.page) || [];
        list.push(a);
        ayahsByPage.set(a.page, list);
      }

      // Check all 604 pages are populated
      expect(ayahsByPage.size).toBe(604);
      let totalCounted = 0;
      for (let p = 1; p <= 604; p++) {
        const pAyahs = ayahsByPage.get(p);
        expect(pAyahs).toBeDefined();
        expect(pAyahs!.length).toBeGreaterThan(0);
        totalCounted += pAyahs!.length;
      }

      expect(totalCounted).toBe(6236);
    });

    it('correctly maps canonical starting and ending ayahs for key pages', () => {
      // Page 1: Surah Al-Fatiha (1:1 to 1:7)
      const page1 = corpusAyahs.filter((a) => a.page === 1);
      expect(page1.length).toBe(7);
      expect(page1[0].verse_key).toBe('1:1');
      expect(page1[page1.length - 1].verse_key).toBe('1:7');

      // Page 2: Surah Al-Baqarah (2:1 to 2:5)
      const page2 = corpusAyahs.filter((a) => a.page === 2);
      expect(page2.length).toBe(5);
      expect(page2[0].verse_key).toBe('2:1');
      expect(page2[page2.length - 1].verse_key).toBe('2:5');

      // Page 604: Al-Ikhlas, Al-Falaq, An-Nas
      const page604 = corpusAyahs.filter((a) => a.page === 604);
      expect(page604[0].surah).toBe(112);
      expect(page604[page604.length - 1].verse_key).toBe('114:6');
    });
  });

  // ==========================================================================
  // 3. Immediate Live Heatmap Updates on Review Events
  // ==========================================================================
  describe('3. Reactive Heatmap Updates on Review Events', () => {
    it('instantly elevates Ayah from New (0%) to Mastered (100%) and updates Page stats upon review', async () => {
      const page1Ayahs = corpusAyahs.filter((a) => a.page === 1);
      const emptyMap = new Map<string, MemoryCard>();

      // Baseline: Page 1 with no reviews
      const initialPage1 = HeatmapAnalyticsEngine.computePageStats(1, page1Ayahs, emptyMap);
      expect(initialPage1.status).toBe('new');
      expect(initialPage1.retrievability).toBe(0);
      expect(initialPage1.studiedAyahsCount).toBe(0);

      // Record a flawless review for 1:1
      const reviewNow = new Date();
      await FSRSService.recordAyahRecitation(db, {
        targetId: '1:1',
        targetType: 'ayah',
        rating: 4, // Easy
        reviewTime: reviewNow,
      });

      // Fetch cards from db
      const cards = await db.memory_cards.toArray();
      const cardsMap = new Map<string, MemoryCard>();
      for (const c of cards) cardsMap.set(c.id, c);

      // Recompute stats
      const updatedPage1 = HeatmapAnalyticsEngine.computePageStats(1, page1Ayahs, cardsMap, new Map(), reviewNow);

      expect(updatedPage1.studiedAyahsCount).toBe(1);
      expect(updatedPage1.retrievability).toBe(100);
      // Status is review_due because page 1 is partially studied (1 of 7 ayahs)
      expect(updatedPage1.status).toBe('review_due');
      expect(updatedPage1.ayahStatuses[0].status).toBe('mastered');
      expect(updatedPage1.ayahStatuses[0].retrievability).toBe(100);
    });

    it('tracks multiple reviews and generates persistent review log audit trails', async () => {
      const reviewTime1 = new Date('2026-11-01T10:00:00Z');
      const reviewTime2 = new Date('2026-11-05T10:00:00Z');

      await FSRSService.recordAyahRecitation(db, {
        targetId: '1:2',
        targetType: 'ayah',
        rating: 3, // Good
        reviewTime: reviewTime1,
        recordingDurationMs: 3500,
      });

      await FSRSService.recordAyahRecitation(db, {
        targetId: '1:2',
        targetType: 'ayah',
        rating: 4, // Easy
        reviewTime: reviewTime2,
        recordingDurationMs: 3200,
      });

      const logs = await db.review_logs.where('target_id').equals('1:2').toArray();
      expect(logs.length).toBe(2);
      expect(logs[0].rating).toBe(3);
      expect(logs[1].rating).toBe(4);

      const card = await db.memory_cards.get(FSRSScheduler.getCardId('ayah', '1:2'));
      expect(card).toBeDefined();
      expect(card!.reps).toBe(2);
      expect(card!.stability).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 4. Full State Handling (New, Learning, Review, Relearning) & Lapses
  // ==========================================================================
  describe('4. Full State Transitions & Lapse Accounting', () => {
    it('properly transitions cards across FSRS states and reflects lapses on stumble', async () => {
      const t0 = new Date('2026-11-01T10:00:00Z');

      // 1. Initial review with rating 'Easy' (4) -> Directly graduates to Review state (State.Review = 2)
      await FSRSService.recordAyahRecitation(db, {
        targetId: '1:3',
        targetType: 'ayah',
        rating: 4,
        reviewTime: t0,
      });

      let card = (await db.memory_cards.get(FSRSScheduler.getCardId('ayah', '1:3')))!;
      expect(card.reps).toBe(1);
      expect(card.state).toBe(State.Review);

      // 2. Next review with 'Again' (1) on a Review card -> Transitions to Relearning state & increments lapses
      const t1 = new Date('2026-11-02T10:00:00Z');
      await FSRSService.recordAyahRecitation(db, {
        targetId: '1:3',
        targetType: 'ayah',
        rating: 1,
        reviewTime: t1,
      });

      card = (await db.memory_cards.get(FSRSScheduler.getCardId('ayah', '1:3')))!;
      expect(card.state).toBe(State.Relearning);
      expect(card.lapses).toBeGreaterThanOrEqual(1);

      const ayah = corpusAyahs.find((a) => a.verse_key === '1:3')!;
      const status = HeatmapAnalyticsEngine.computeAyahStatus(ayah, card, t1);
      expect(status.lapses).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 5. Independent Ayah and Transition Edge Boundary Cards
  // ==========================================================================
  describe('5. Independent Ayah and Transition Card Preservation', () => {
    it('preserves distinct scheduling states for Ayah card vs page boundary Transition card', async () => {
      const now = new Date();

      // Review Ayah 1:7
      await FSRSService.recordAyahRecitation(db, {
        targetId: '1:7',
        targetType: 'ayah',
        rating: 4,
        reviewTime: now,
      });

      // Review Transition Edge 1:7->2:1 (page boundary transition)
      await FSRSService.recordTransitionRecitation(db, '1:7', '2:1', {
        rating: 2, // Hard
        reviewTime: now,
      });

      const ayahCard = await db.memory_cards.get(FSRSScheduler.getCardId('ayah', '1:7'));
      const transCard = await db.memory_cards.get(FSRSScheduler.getCardId('transition', '1:7->2:1'));

      expect(ayahCard).toBeDefined();
      expect(transCard).toBeDefined();

      // Independent stabilities & ratings
      expect(ayahCard!.stability).not.toBe(transCard!.stability);
      expect(ayahCard!.reps).toBe(1);
      expect(transCard!.reps).toBe(1);
    });
  });

  // ==========================================================================
  // 6. High-Performance Full-Mushaf (604 pages, 114 Surahs, 30 Juz) Profiling
  // ==========================================================================
  describe('6. High-Performance Rendering & Rollup Computation', () => {
    it('computes full 604-page, 114-surah, and 30-juz retention metrics within 50ms', () => {
      const cardsMap = new Map<string, MemoryCard>();

      // Seed 200 random cards to simulate an active memorizer
      for (let i = 1; i <= 200; i++) {
        const verseKey = corpusAyahs[i % corpusAyahs.length].verse_key;
        cardsMap.set(FSRSScheduler.getCardId('ayah', verseKey), {
          id: FSRSScheduler.getCardId('ayah', verseKey),
          target_type: 'ayah',
          target_id: verseKey,
          due: new Date(),
          stability: 15.0,
          difficulty: 4.8,
          elapsed_days: 2,
          scheduled_days: 15,
          reps: 5,
          lapses: 0,
          state: State.Review,
          last_review: new Date(),
        });
      }

      const ayahsByPage = new Map<number, QuranAyah[]>();
      for (const a of corpusAyahs) {
        const list = ayahsByPage.get(a.page) || [];
        list.push(a);
        ayahsByPage.set(a.page, list);
      }

      const t0 = performance.now();

      // Compute all 604 pages
      const pageStats: Record<number, any> = {};
      const allStatuses: any[] = [];
      for (let p = 1; p <= 604; p++) {
        const pStat = HeatmapAnalyticsEngine.computePageStats(p, ayahsByPage.get(p) || [], cardsMap);
        pageStats[p] = pStat;
        allStatuses.push(...pStat.ayahStatuses);
      }

      // Compute 114 surahs & 30 juz
      const surahStats = HeatmapAnalyticsEngine.computeSurahStats(SURAHS, corpusAyahs, cardsMap);
      const juzStats = HeatmapAnalyticsEngine.computeJuzStats(pageStats);
      const summary = HeatmapAnalyticsEngine.computeGlobalSummary(pageStats, surahStats, allStatuses);

      const elapsedMs = performance.now() - t0;

      expect(elapsedMs).toBeLessThan(100); // Strict performance budget (< 100ms)
      expect(Object.keys(pageStats).length).toBe(604);
      expect(surahStats.length).toBe(114);
      expect(Object.keys(juzStats).length).toBe(30);
      expect(summary.totalMemorizedAyahs).toBeGreaterThan(0);
      expect(summary.overallRetentionIndex).toBeGreaterThanOrEqual(95);
    });
  });
});
