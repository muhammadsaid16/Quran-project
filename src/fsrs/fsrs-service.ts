/**
 * Quran Cognitive OS v2.0 — FSRS Memory Service
 * High-level orchestration layer managing spaced repetition workflows, Dexie.js persistence,
 * recitation review recording, and transition edge updates.
 */

import {
  QuranCognitiveDB,
  MemoryCard,
  ReviewLog,
  ReviewRating,
  ReviewResultStatus,
  TransitionEdge,
} from '../db/schema';
import { defaultFsrsEngine } from './config';
import { FSRSScheduler } from './scheduler';
import { RatingDerivator, deriveFSRSRating } from './rating-derivation';
import {
  RecordReviewInput,
  ReviewRecordResult,
  RatingDerivationResult,
} from './types';

export class FSRSService {
  /**
   * Records an Ayah recitation review:
   * 1. Resolves or initializes the Ayah MemoryCard in Dexie.
   * 2. Automatically derives FSRS rating from phoneme alignment or explicit metrics.
   * 3. Schedules spaced repetition state transition via ts-fsrs.
   * 4. Persists the updated card into memory_cards.
   * 5. Persists the comprehensive audit trail into review_logs.
   */
  public static async recordAyahRecitation(
    db: QuranCognitiveDB,
    input: RecordReviewInput
  ): Promise<ReviewRecordResult> {
    const reviewTime = input.reviewTime ? new Date(input.reviewTime) : new Date();
    const verseKey = input.targetId;
    const cardId = FSRSScheduler.getCardId('ayah', verseKey);

    // 1. Fetch or initialize card
    let card = await db.memory_cards.get(cardId);
    if (!card) {
      card = FSRSScheduler.createAyahCard(verseKey, { createdAt: reviewTime });
    }

    // 2. Derive rating
    const ratingResult = this.resolveRating(input);

    // 3. Schedule review
    const { updatedCard } = FSRSScheduler.scheduleReview(
      card,
      ratingResult.rating,
      reviewTime,
      defaultFsrsEngine
    );

    // 4. Determine result status (caller override wins: e.g. acoustic-uncertain
    // sessions are forced to 'needs_review' so they can never look 'passed')
    let resultStatus: ReviewResultStatus = 'passed';
    if (ratingResult.rating === 1) {
      resultStatus = 'failed';
    } else if (ratingResult.rating === 2) {
      resultStatus = 'needs_review';
    }
    if (input.resultStatusOverride) {
      resultStatus = input.resultStatusOverride;
    }

    // Extract error positions if present
    const errorPositions: ReviewLog['error_positions'] = [];
    if (input.alignmentResult?.words) {
      for (const w of input.alignmentResult.words) {
        if (w.status !== 'correct') {
          errorPositions.push({
            word_index: w.wordIndex,
            expected: w.uthmaniText,
            actual: w.detectedPhonemes,
            error_type:
              w.status === 'omission'
                ? 'omission'
                : w.status === 'substitution'
                ? 'substitution'
                : w.status === 'repetition'
                ? 'repetition'
                : 'uncertain',
          });
        }
      }
    } else if (input.metrics?.errorPositions) {
      errorPositions.push(...input.metrics.errorPositions);
    }

    // 5. Construct review log
    const logId = `log:ayah:${verseKey}:${reviewTime.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const reviewLog: ReviewLog = {
      log_id: logId,
      target_id: verseKey,
      target_type: 'ayah',
      timestamp: reviewTime,
      rating: ratingResult.rating,
      recording_duration_ms: input.recordingDurationMs ?? 0,
      inference_duration_ms: input.inferenceDurationMs ?? 0,
      alignment_confidence:
        input.alignmentResult?.confidence ?? input.metrics?.confidence ?? 1.0,
      error_count:
        input.metrics?.errorCount ??
        ratingResult.metrics.omissions + ratingResult.metrics.substitutions,
      error_positions: errorPositions,
      result_status: resultStatus,
    };

    // 6. Atomic database transaction
    await db.transaction('rw', [db.memory_cards, db.review_logs], async () => {
      await db.memory_cards.put(updatedCard);
      await db.review_logs.add(reviewLog);
    });

    return {
      card: updatedCard,
      reviewLog,
      ratingResult,
    };
  }

  /**
   * Records an Inter-Ayah or Page-Boundary Transition recitation review.
   * Schedules and updates transition cards independently from Ayah cards,
   * while synchronizing transition_edges and logging the review.
   */
  public static async recordTransitionRecitation(
    db: QuranCognitiveDB,
    fromVerseKey: string,
    toVerseKey: string,
    input: Omit<RecordReviewInput, 'targetId' | 'targetType'> & {
      rating?: ReviewRating;
      recordingDurationMs?: number;
      inferenceDurationMs?: number;
    }
  ): Promise<ReviewRecordResult> {
    const reviewTime = input.reviewTime ? new Date(input.reviewTime) : new Date();
    const edgeId = `${fromVerseKey}->${toVerseKey}`;
    const cardId = FSRSScheduler.getCardId('transition', edgeId);

    // 1. Fetch or initialize transition card
    let card = await db.memory_cards.get(cardId);
    if (!card) {
      card = FSRSScheduler.createTransitionCard(fromVerseKey, toVerseKey, {
        createdAt: reviewTime,
      });
    }

    // 2. Derive rating
    const ratingResult = this.resolveRating({
      ...input,
      targetId: edgeId,
      targetType: 'transition',
    });

    // 3. Schedule review independently
    const { updatedCard } = FSRSScheduler.scheduleReview(
      card,
      ratingResult.rating,
      reviewTime,
      defaultFsrsEngine
    );

    // 4. Determine result status
    let resultStatus: ReviewResultStatus = 'passed';
    if (ratingResult.rating === 1) {
      resultStatus = 'failed';
    } else if (ratingResult.rating === 2) {
      resultStatus = 'needs_review';
    }

    // 5. Construct review log
    const logId = `log:trans:${edgeId}:${reviewTime.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const reviewLog: ReviewLog = {
      log_id: logId,
      target_id: edgeId,
      target_type: 'transition',
      timestamp: reviewTime,
      rating: ratingResult.rating,
      recording_duration_ms: input.recordingDurationMs ?? 0,
      inference_duration_ms: input.inferenceDurationMs ?? 0,
      alignment_confidence:
        input.alignmentResult?.confidence ?? input.metrics?.confidence ?? 1.0,
      error_count: ratingResult.metrics.omissions + ratingResult.metrics.substitutions,
      error_positions: input.metrics?.errorPositions ?? [],
      result_status: resultStatus,
    };

    // 6. Update database atomically: memory_cards + transition_edges + review_logs
    let transitionEdge: TransitionEdge | undefined;
    await db.transaction(
      'rw',
      [db.memory_cards, db.transition_edges, db.review_logs],
      async () => {
        await db.memory_cards.put(updatedCard);
        await db.review_logs.add(reviewLog);

        // Synchronize matching transition_edges table row
        await db.transition_edges.update(edgeId, {
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          due: updatedCard.due,
          last_review: updatedCard.last_review,
        });

        transitionEdge = await db.transition_edges.get(edgeId);
      }
    );

    return {
      card: updatedCard,
      transitionEdge,
      reviewLog,
      ratingResult,
    };
  }

  /**
   * Seeds initial unreviewed MemoryCards for all Ayahs in a Surah.
   */
  public static async initializeSurahAyahCards(
    db: QuranCognitiveDB,
    surahNumber: number,
    options?: { initialDue?: Date }
  ): Promise<number> {
    const ayahs = await db.quran_ayahs.where('surah').equals(surahNumber).toArray();
    if (ayahs.length === 0) return 0;

    const cardsToInsert: MemoryCard[] = [];
    const now = options?.initialDue ?? new Date();

    for (const ayah of ayahs) {
      const cardId = FSRSScheduler.getCardId('ayah', ayah.verse_key);
      const exists = await db.memory_cards.get(cardId);
      if (!exists) {
        cardsToInsert.push(
          FSRSScheduler.createAyahCard(ayah.verse_key, { initialDue: now })
        );
      }
    }

    if (cardsToInsert.length > 0) {
      await db.memory_cards.bulkAdd(cardsToInsert);
    }

    return cardsToInsert.length;
  }

  /**
   * Seeds initial unreviewed MemoryCards for transition edges (optionally boundary only).
   */
  public static async initializeTransitionCards(
    db: QuranCognitiveDB,
    options?: { onlyPageBoundaries?: boolean; surah?: number; initialDue?: Date }
  ): Promise<number> {
    let query = db.transition_edges.toCollection();

    if (options?.surah !== undefined) {
      query = db.transition_edges.where('from_surah').equals(options.surah);
    }

    let edges = await query.toArray();
    if (options?.onlyPageBoundaries) {
      edges = edges.filter((e) => e.is_page_boundary);
    }

    const cardsToInsert: MemoryCard[] = [];
    const now = options?.initialDue ?? new Date();

    for (const edge of edges) {
      const cardId = FSRSScheduler.getCardId('transition', edge.edge_id);
      const exists = await db.memory_cards.get(cardId);
      if (!exists) {
        cardsToInsert.push(
          FSRSScheduler.createTransitionCard(edge.from_ayah_id, edge.to_ayah_id, {
            initialDue: now,
          })
        );
      }
    }

    if (cardsToInsert.length > 0) {
      await db.memory_cards.bulkAdd(cardsToInsert);
    }

    return cardsToInsert.length;
  }

  /**
   * Fetches an Ayah MemoryCard by verse key.
   */
  public static async getAyahCard(
    db: QuranCognitiveDB,
    verseKey: string
  ): Promise<MemoryCard | undefined> {
    return db.memory_cards.get(FSRSScheduler.getCardId('ayah', verseKey));
  }

  /**
   * Fetches a Transition MemoryCard by from and to verse keys.
   */
  public static async getTransitionCard(
    db: QuranCognitiveDB,
    fromVerseKey: string,
    toVerseKey: string
  ): Promise<MemoryCard | undefined> {
    const edgeId = `${fromVerseKey}->${toVerseKey}`;
    return db.memory_cards.get(FSRSScheduler.getCardId('transition', edgeId));
  }

  /**
   * Fetches the complete review history for a given target.
   */
  public static async getReviewHistory(
    db: QuranCognitiveDB,
    targetId: string,
    limit = 50
  ): Promise<ReviewLog[]> {
    return db.review_logs
      .where('target_id')
      .equals(targetId)
      .reverse()
      .sortBy('timestamp')
      .then((logs) => logs.slice(0, limit));
  }

  /**
   * Resolves rating and explanation from user input.
   */
  private static resolveRating(input: RecordReviewInput): RatingDerivationResult {
    // 1. Explicit rating provided
    if (input.rating) {
      const labels: Record<ReviewRating, 'Again' | 'Hard' | 'Good' | 'Easy'> = {
        1: 'Again',
        2: 'Hard',
        3: 'Good',
        4: 'Easy',
      };
      return {
        rating: input.rating,
        ratingLabel: labels[input.rating],
        reason: `Explicit evaluation score (${labels[input.rating]}) selected`,
        confidence: 1.0,
        deductions: [],
        metrics: {
          omissions: 0,
          substitutions: 0,
          repetitions: 0,
          isSequenceJump: false,
          accuracy: input.rating === 4 ? 1.0 : input.rating === 3 ? 0.9 : input.rating === 2 ? 0.75 : 0.5,
          confidence: 1.0,
          hesitationMs: 0,
        },
      };
    }

    // 2. Alignment result or explicit metrics
    if (input.alignmentResult) {
      return deriveFSRSRating(input.alignmentResult);
    }
    if (input.metrics) {
      return deriveFSRSRating(input.metrics);
    }

    // 3. Fallback default to Good (3)
    return {
      rating: 3,
      ratingLabel: 'Good',
      reason: 'Standard review completion',
      confidence: 1.0,
      deductions: [],
      metrics: {
        omissions: 0,
        substitutions: 0,
        repetitions: 0,
        isSequenceJump: false,
        accuracy: 0.90,
        confidence: 1.0,
        hesitationMs: 0,
      },
    };
  }
}
