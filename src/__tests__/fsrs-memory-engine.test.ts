/**
 * Quran Cognitive OS v2.0 — Milestone 5: FSRS Spaced Repetition Engine Test Suite
 * 
 * Verifies all Acceptance Criteria:
 * 1. ts-fsrs integrated and configured with target retention of 90% (R=0.90).
 * 2. Automated rating logic maps recitation error classification directly into FSRS ratings (Again=1, Hard=2, Good=3, Easy=4).
 * 3. Daily Due Queue query retrieves cards where due <= now, partitioned by New and Due items.
 * 4. Inter-ayah and page boundary transition cards scheduled and updated independently.
 * 5. Automated test suite verifies scheduling determinism and state stability transitions.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuranCognitiveDB } from '../db/schema';
import { seedQuranDatabase } from '../db/seed';
import {
  createFsrsEngine,
  defaultFsrsEngine,
  calculateRetrievability,
  DEFAULT_REQUEST_RETENTION,
  DEFAULT_ENABLE_FUZZ,
  deriveFSRSRating,
  FSRSScheduler,
  DailyDueQueueManager,
  getDailyDueQueue,
  FSRSService,
  State,
  Rating,
} from '../fsrs';
import { AyahAlignmentResult } from '../alignment/types';

describe('Milestone 5: FSRS Integration & Daily Due Queue', () => {
  let db: QuranCognitiveDB;

  beforeEach(async () => {
    db = new QuranCognitiveDB(`test-fsrs-db-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('1. ts-fsrs Configuration & Retention Target (R=0.90)', () => {
    it('initializes FSRS engine with default target retention of 90% (R=0.90)', () => {
      const engine = createFsrsEngine();
      expect(engine).toBeDefined();
      expect(DEFAULT_REQUEST_RETENTION).toBe(0.90);
      expect(DEFAULT_ENABLE_FUZZ).toBe(false);

      // Verify parameters on default engine
      expect(engine.parameters.request_retention).toBe(0.90);
      expect(engine.parameters.enable_fuzz).toBe(false);
    });

    it('calculates dynamic retrievability R(t) matching the decay power law', () => {
      const stability = 10; // S = 10 days
      // At t = 0 (immediately after review), R = 1.0
      expect(calculateRetrievability(stability, 0)).toBe(1.0);

      // At t = S (10 days), R(t) should be approximately 0.90 (due to target retention R=0.90)
      const rAtS = calculateRetrievability(stability, 10, 0.1111);
      expect(rAtS).toBeCloseTo(0.90, 2);

      // At t = 30 days (3x stability), retrievability decays significantly
      const rAt3S = calculateRetrievability(stability, 30);
      expect(rAt3S).toBeLessThan(0.70);
      expect(rAt3S).toBeGreaterThan(0.0);

      // Negative or zero stability boundaries
      expect(calculateRetrievability(0, 5)).toBe(0.0);
      expect(calculateRetrievability(-1, 5)).toBe(0.0);
    });
  });

  describe('2. Automated Recitation Rating Derivation (Again=1, Hard=2, Good=3, Easy=4)', () => {
    it('rates flawless recitation as Easy (4)', () => {
      const result = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 0,
        repetitionsCount: 0,
        isSequenceJump: false,
        accuracy: 1.0,
        confidence: 0.95,
        hesitationMs: 250,
      });

      expect(result.rating).toBe(4);
      expect(result.ratingLabel).toBe('Easy');
      expect(result.reason).toContain('Flawless');
      expect(result.deductions).toHaveLength(0);
    });

    it('rates correct recitation with minor repetition or hesitation as Good (3)', () => {
      // Minor repetition / self-correction
      const withRepetition = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 0,
        repetitionsCount: 1,
        isSequenceJump: false,
        accuracy: 0.93,
        confidence: 0.88,
        hesitationMs: 300,
      });

      expect(withRepetition.rating).toBe(3);
      expect(withRepetition.ratingLabel).toBe('Good');
      expect(withRepetition.deductions).toContain('Single self-correction or brief repetition');

      // Minor hesitation (1800ms) with zero content errors
      const withHesitation = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 0,
        repetitionsCount: 0,
        isSequenceJump: false,
        accuracy: 0.96,
        confidence: 0.92,
        hesitationMs: 1800,
      });

      expect(withHesitation.rating).toBe(3);
      expect(withHesitation.ratingLabel).toBe('Good');
      expect(withHesitation.deductions).toContain('Minor hesitation (1800ms)');
    });

    it('rates single omission or substitution with struggle as Hard (2)', () => {
      // Single omission
      const singleOmission = deriveFSRSRating({
        omissionsCount: 1,
        substitutionsCount: 0,
        repetitionsCount: 0,
        isSequenceJump: false,
        accuracy: 0.82,
        confidence: 0.85,
      });

      expect(singleOmission.rating).toBe(2);
      expect(singleOmission.ratingLabel).toBe('Hard');
      expect(singleOmission.reason).toContain('omission');

      // Single substitution
      const singleSubstitution = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 1,
        repetitionsCount: 0,
        isSequenceJump: false,
        accuracy: 0.80,
        confidence: 0.82,
      });

      expect(singleSubstitution.rating).toBe(2);
      expect(singleSubstitution.ratingLabel).toBe('Hard');
      expect(singleSubstitution.reason).toContain('substitution');

      // Stumbled twice (2 repetitions) without omission
      const twoRepetitions = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 0,
        repetitionsCount: 2,
        isSequenceJump: false,
        accuracy: 0.86,
        confidence: 0.85,
      });

      expect(twoRepetitions.rating).toBe(2);
      expect(twoRepetitions.ratingLabel).toBe('Hard');
      expect(twoRepetitions.reason).toContain('stumbled repeatedly');
    });

    it('rates multiple errors, severe stumbling, or sequence breakdown as Again (1)', () => {
      // Multiple omissions/substitutions (>= 2 errors)
      const multipleErrors = deriveFSRSRating({
        omissionsCount: 2,
        substitutionsCount: 0,
        repetitionsCount: 0,
        isSequenceJump: false,
        accuracy: 0.65,
      });

      expect(multipleErrors.rating).toBe(1);
      expect(multipleErrors.ratingLabel).toBe('Again');
      expect(multipleErrors.reason).toContain('Multiple content errors');

      // Sequence Error / verse transposition
      const sequenceJump = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 0,
        repetitionsCount: 0,
        isSequenceJump: true,
        accuracy: 0.95,
      });

      expect(sequenceJump.rating).toBe(1);
      expect(sequenceJump.ratingLabel).toBe('Again');
      expect(sequenceJump.reason).toContain('Sequence breakdown');

      // Severe stumbling (3+ repetitions)
      const severeStumble = deriveFSRSRating({
        omissionsCount: 0,
        substitutionsCount: 0,
        repetitionsCount: 3,
        accuracy: 0.75,
      });

      expect(severeStumble.rating).toBe(1);
      expect(severeStumble.ratingLabel).toBe('Again');
      expect(severeStumble.reason).toContain('Severe stumbling');
    });

    it('derives rating directly from AyahAlignmentResult produced by Milestone 3', () => {
      const mockAlignment: AyahAlignmentResult = {
        verseKey: '1:1',
        primaryCategory: 'Correct',
        allCategories: ['Correct'],
        accuracy: 0.98,
        per: 0.02,
        confidence: 0.94,
        latencyMs: 45,
        referencePhonemes: 'b i s m i l l aa h',
        hypothesisPhonemes: 'b i s m i l l aa h',
        alignmentSteps: [],
        words: [],
        diagnostics: {
          matchesCount: 16,
          substitutionsCount: 0,
          omissionsCount: 0,
          insertionsCount: 0,
          repetitions: [],
          isSequenceJump: false,
          uncertainScore: 0.06,
        },
      };

      const result = deriveFSRSRating(mockAlignment);
      expect(result.rating).toBe(4);
      expect(result.ratingLabel).toBe('Easy');

      // Introduce an omission in diagnostics
      const omissionAlignment: AyahAlignmentResult = {
        ...mockAlignment,
        primaryCategory: 'Omission',
        allCategories: ['Omission'],
        accuracy: 0.85,
        diagnostics: {
          ...mockAlignment.diagnostics,
          omissionsCount: 1,
        },
      };

      const omissionResult = deriveFSRSRating(omissionAlignment);
      expect(omissionResult.rating).toBe(2);
      expect(omissionResult.ratingLabel).toBe('Hard');
    });
  });

  describe('3. Daily Due Queue Query & Partitioning (New vs Due)', () => {
    beforeEach(async () => {
      await seedQuranDatabase(db);
    });

    it('partitions cards into Due items (due <= now) and New items (state = New)', async () => {
      const now = new Date('2026-11-08T12:00:00.000Z');
      const yesterday = new Date('2026-11-07T12:00:00.000Z');
      const tomorrow = new Date('2026-11-09T12:00:00.000Z');

      // 1. Due card (due yesterday, state = Review)
      await db.memory_cards.add({
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: yesterday,
        stability: 5.0,
        difficulty: 3.0,
        elapsed_days: 5,
        scheduled_days: 5,
        reps: 2,
        lapses: 0,
        state: State.Review,
        last_review: yesterday,
        retrievability: 0.85,
      });

      // 2. Due card (due right now, state = Learning)
      await db.memory_cards.add({
        id: 'card:ayah:1:2',
        target_type: 'ayah',
        target_id: '1:2',
        due: now,
        stability: 1.5,
        difficulty: 4.0,
        elapsed_days: 1,
        scheduled_days: 1,
        reps: 1,
        lapses: 0,
        state: State.Learning,
        last_review: yesterday,
        retrievability: 0.88,
      });

      // 3. Future card (due tomorrow, state = Review) -> NOT DUE
      await db.memory_cards.add({
        id: 'card:ayah:1:3',
        target_type: 'ayah',
        target_id: '1:3',
        due: tomorrow,
        stability: 10.0,
        difficulty: 2.0,
        elapsed_days: 2,
        scheduled_days: 10,
        reps: 4,
        lapses: 0,
        state: State.Review,
        last_review: yesterday,
        retrievability: 0.98,
      });

      // 4. New card (state = New, reps = 0)
      await db.memory_cards.add({
        id: 'card:ayah:1:4',
        target_type: 'ayah',
        target_id: '1:4',
        due: now,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: State.New,
        last_review: null,
        retrievability: 0.0,
      });

      const queue = await getDailyDueQueue(db, { asOfDate: now });

      // Verification
      expect(queue.dueCards).toHaveLength(2);
      expect(queue.dueCards.map((c) => c.target_id)).toEqual(
        expect.arrayContaining(['1:1', '1:2'])
      );
      expect(queue.dueCards.find((c) => c.target_id === '1:3')).toBeUndefined();

      expect(queue.newCards).toHaveLength(1);
      expect(queue.newCards[0].target_id).toBe('1:4');

      expect(queue.summary.totalDueCount).toBe(2);
      expect(queue.summary.newCount).toBe(1);
      expect(queue.summary.learningCount).toBe(1);
      expect(queue.summary.reviewCount).toBe(1);
      expect(queue.summary.overdueCount).toBe(1); // 1:1 was due yesterday (> 24 hours ago)
    });

    it('filters Daily Due Queue by Surah, Juz, Page, and Target Type', async () => {
      const now = new Date('2026-11-08T12:00:00.000Z');
      const past = new Date('2026-11-06T12:00:00.000Z');

      // Card for Surah Al-Fatihah (1:1, Page 1, Juz 1)
      await db.memory_cards.add({
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: past,
        stability: 4.0,
        difficulty: 3.0,
        elapsed_days: 2,
        scheduled_days: 4,
        reps: 2,
        lapses: 0,
        state: State.Review,
        last_review: past,
      });

      // Card for Surah Al-Baqarah (2:1, Page 2, Juz 1)
      await db.memory_cards.add({
        id: 'card:ayah:2:1',
        target_type: 'ayah',
        target_id: '2:1',
        due: past,
        stability: 2.0,
        difficulty: 4.0,
        elapsed_days: 2,
        scheduled_days: 2,
        reps: 1,
        lapses: 0,
        state: State.Review,
        last_review: past,
      });

      // Transition Card (1:7->2:1, Page boundary transition)
      await db.memory_cards.add({
        id: 'card:transition:1:7->2:1',
        target_type: 'transition',
        target_id: '1:7->2:1',
        due: past,
        stability: 1.0,
        difficulty: 5.0,
        elapsed_days: 1,
        scheduled_days: 1,
        reps: 1,
        lapses: 0,
        state: State.Review,
        last_review: past,
      });

      // Filter by Surah 1
      const surah1Queue = await getDailyDueQueue(db, { asOfDate: now, surah: 1 });
      expect(surah1Queue.dueCards.some((c) => c.target_id === '1:1')).toBe(true);
      expect(surah1Queue.dueCards.some((c) => c.target_id === '2:1')).toBe(false);

      // Filter by targetType: 'transition'
      const transitionQueue = await getDailyDueQueue(db, {
        asOfDate: now,
        targetType: 'transition',
      });
      expect(transitionQueue.dueCards).toHaveLength(1);
      expect(transitionQueue.dueCards[0].target_id).toBe('1:7->2:1');

      // Filter by onlyPageBoundaries
      const boundaryQueue = await getDailyDueQueue(db, {
        asOfDate: now,
        targetType: 'transition',
        onlyPageBoundaries: true,
      });
      expect(boundaryQueue.dueCards).toHaveLength(1);
      expect(boundaryQueue.dueCards[0].target_id).toBe('1:7->2:1');
    });

    it('orders due items by urgency (most overdue first)', async () => {
      const now = new Date('2026-11-08T12:00:00.000Z');
      const twoDaysAgo = new Date('2026-11-06T12:00:00.000Z');
      const fourDaysAgo = new Date('2026-11-04T12:00:00.000Z');

      await db.memory_cards.add({
        id: 'card:ayah:1:1',
        target_type: 'ayah',
        target_id: '1:1',
        due: twoDaysAgo,
        stability: 4.0,
        difficulty: 3.0,
        elapsed_days: 2,
        scheduled_days: 4,
        reps: 2,
        lapses: 0,
        state: State.Review,
        last_review: twoDaysAgo,
      });

      await db.memory_cards.add({
        id: 'card:ayah:1:2',
        target_type: 'ayah',
        target_id: '1:2',
        due: fourDaysAgo, // More overdue!
        stability: 4.0,
        difficulty: 3.0,
        elapsed_days: 4,
        scheduled_days: 4,
        reps: 2,
        lapses: 0,
        state: State.Review,
        last_review: fourDaysAgo,
      });

      const queue = await getDailyDueQueue(db, { asOfDate: now, sortBy: 'urgency' });
      expect(queue.dueCards[0].target_id).toBe('1:2'); // 1:2 first because it is more overdue
      expect(queue.dueCards[1].target_id).toBe('1:1');
    });
  });

  describe('4. Independent Inter-Ayah & Page Boundary Transition Cards', () => {
    beforeEach(async () => {
      await seedQuranDatabase(db);
    });

    it('schedules transition edge cards independently from ayah cards', async () => {
      const reviewTime = new Date('2026-11-08T10:00:00.000Z');

      // 1. Review Ayah 1:1 with Easy (4)
      const ayahRes = await FSRSService.recordAyahRecitation(db, {
        targetId: '1:1',
        targetType: 'ayah',
        rating: 4,
        reviewTime,
      });

      expect(ayahRes.card.target_type).toBe('ayah');
      expect(ayahRes.card.target_id).toBe('1:1');
      expect(ayahRes.card.stability).toBeGreaterThan(0);
      const ayahStabilityBefore = ayahRes.card.stability;

      // 2. Review Transition 1:1->1:2 with Hard (2)
      const transRes = await FSRSService.recordTransitionRecitation(db, '1:1', '1:2', {
        rating: 2,
        reviewTime,
      });

      expect(transRes.card.target_type).toBe('transition');
      expect(transRes.card.target_id).toBe('1:1->1:2');
      expect(transRes.card.stability).toBeGreaterThan(0);

      // Verify that Ayah 1:1 card was NOT modified by transition review
      const ayahCardAfter = await FSRSService.getAyahCard(db, '1:1');
      expect(ayahCardAfter?.stability).toBe(ayahStabilityBefore);
      expect(ayahCardAfter?.reps).toBe(1);

      // Verify that transition edge was synchronized
      expect(transRes.transitionEdge).toBeDefined();
      expect(transRes.transitionEdge?.stability).toBe(transRes.card.stability);
      expect(transRes.transitionEdge?.difficulty).toBe(transRes.card.difficulty);
      expect(transRes.transitionEdge?.last_review).toEqual(reviewTime);
    });

    it('correctly tracks and schedules 15-line Medina page boundary transitions', async () => {
      const reviewTime = new Date('2026-11-08T14:00:00.000Z');

      // 1:7 to 2:1 is the page boundary between Medina Page 1 and Page 2
      const boundaryEdge = await db.transition_edges.get('1:7->2:1');
      expect(boundaryEdge?.is_page_boundary).toBe(true);

      const transRes = await FSRSService.recordTransitionRecitation(db, '1:7', '2:1', {
        rating: 3, // Good
        reviewTime,
      });

      expect(transRes.card.target_type).toBe('transition');
      expect(transRes.transitionEdge?.is_page_boundary).toBe(true);
      expect(transRes.transitionEdge?.due).toEqual(transRes.card.due);

      // Verify review log persisted with transition target type
      const history = await FSRSService.getReviewHistory(db, '1:7->2:1');
      expect(history).toHaveLength(1);
      expect(history[0].target_type).toBe('transition');
      expect(history[0].rating).toBe(3);
      expect(history[0].result_status).toBe('passed');
    });
  });

  describe('5. Scheduling Determinism, Stability & State Transitions', () => {
    it('guarantees 100% deterministic scheduling across 50 identical reviews', () => {
      const reviewTime = new Date('2026-11-08T12:00:00.000Z');
      const baseCard = FSRSScheduler.createAyahCard('1:1', { createdAt: reviewTime });

      const baseline = FSRSScheduler.scheduleReview(baseCard, 3, reviewTime, defaultFsrsEngine);

      for (let i = 0; i < 50; i++) {
        const result = FSRSScheduler.scheduleReview(baseCard, 3, reviewTime, defaultFsrsEngine);
        expect(result.updatedCard.stability).toBe(baseline.updatedCard.stability);
        expect(result.updatedCard.difficulty).toBe(baseline.updatedCard.difficulty);
        expect(result.updatedCard.scheduled_days).toBe(baseline.updatedCard.scheduled_days);
        expect(result.updatedCard.due).toEqual(baseline.updatedCard.due);
        expect(result.updatedCard.state).toBe(baseline.updatedCard.state);
      }
    });

    it('verifies state stability transitions across multiple review cycles (New -> Learning -> Review -> Relearning)', () => {
      const startTime = new Date('2026-11-01T10:00:00.000Z');
      let card = FSRSScheduler.createAyahCard('1:1', { createdAt: startTime });

      expect(card.state).toBe(State.New);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);

      // Step 1: First review -> Good (3)
      const r1 = FSRSScheduler.scheduleReview(card, 3, startTime);
      card = r1.updatedCard;

      expect(card.state).toBe(State.Learning);
      expect(card.reps).toBe(1);
      expect(card.lapses).toBe(0);
      expect(card.stability).toBeGreaterThan(0);

      // Step 2: Second review -> Good (3)
      const secondReviewTime = new Date('2026-11-01T10:15:00.000Z');
      const r2 = FSRSScheduler.scheduleReview(card, 3, secondReviewTime);
      card = r2.updatedCard;

      expect(card.state).toBe(State.Review);
      expect(card.reps).toBe(2);
      expect(card.scheduled_days).toBeGreaterThanOrEqual(1);
      const stabilityBeforeLapse = card.stability;

      // Step 3: Card lapses -> Again (1)
      const lapseTime = new Date(card.due);
      const r3 = FSRSScheduler.scheduleReview(card, 1, lapseTime);
      card = r3.updatedCard;

      expect(card.state).toBe(State.Relearning);
      expect(card.reps).toBe(3);
      expect(card.lapses).toBe(1);
      expect(card.stability).toBeLessThan(stabilityBeforeLapse); // Stability penalized

      // Step 4: Recovery review -> Good (3)
      const recoveryTime = new Date(card.due);
      const r4 = FSRSScheduler.scheduleReview(card, 3, recoveryTime);
      card = r4.updatedCard;

      expect(card.reps).toBe(4);
      expect(card.lapses).toBe(1);
      expect(card.stability).toBeGreaterThan(r3.updatedCard.stability);
    });

    it('previews scheduling intervals for all 4 ratings accurately', () => {
      const card = FSRSScheduler.createAyahCard('1:1');
      const preview = FSRSScheduler.previewScheduling(card);

      expect(preview[1]).toBeDefined(); // Again
      expect(preview[2]).toBeDefined(); // Hard
      expect(preview[3]).toBeDefined(); // Good
      expect(preview[4]).toBeDefined(); // Easy

      // Easy stability must exceed Good stability, which exceeds Hard
      expect(preview[4].stability).toBeGreaterThan(preview[3].stability);
      expect(preview[3].stability).toBeGreaterThan(preview[2].stability);
      expect(preview[2].stability).toBeGreaterThan(preview[1].stability);
    });

    it('persists complete audit log and FSRS state transitions into Dexie database', async () => {
      const reviewTime = new Date('2026-11-08T15:30:00.000Z');

      const result = await FSRSService.recordAyahRecitation(db, {
        targetId: '1:1',
        targetType: 'ayah',
        rating: 3,
        reviewTime,
        recordingDurationMs: 4200,
        inferenceDurationMs: 110,
        metrics: {
          confidence: 0.94,
          accuracy: 0.96,
        },
      });

      // Verify memory card persisted
      const savedCard = await db.memory_cards.get('card:ayah:1:1');
      expect(savedCard).toBeDefined();
      expect(savedCard?.reps).toBe(1);
      expect(savedCard?.stability).toBe(result.card.stability);
      expect(savedCard?.difficulty).toBe(result.card.difficulty);

      // Verify review log persisted
      const logs = await db.review_logs.where('target_id').equals('1:1').toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].rating).toBe(3);
      expect(logs[0].recording_duration_ms).toBe(4200);
      expect(logs[0].inference_duration_ms).toBe(110);
      expect(logs[0].alignment_confidence).toBe(0.94);
      expect(logs[0].result_status).toBe('passed');
    });
  });
});
