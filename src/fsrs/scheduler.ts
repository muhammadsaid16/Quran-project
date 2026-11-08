/**
 * Quran Cognitive OS v2.0 — FSRS Memory Card Scheduler
 * Core scheduling engine wrapping ts-fsrs for Ayah cards and Transition Edge cards.
 */

import {
  Card as FSRSCard,
  RecordLogItem,
  Rating as FSRSRatingEnum,
  createEmptyCard,
  FSRS,
} from 'ts-fsrs';
import { MemoryCard, MemoryTargetType, ReviewRating } from '../db/schema';
import { defaultFsrsEngine } from './config';
import { FSRSState, State } from './types';

export class FSRSScheduler {
  /**
   * Generates a unique standard ID for a memory card based on target type and target identifier.
   */
  public static getCardId(targetType: MemoryTargetType, targetId: string): string {
    return `card:${targetType}:${targetId}`;
  }

  /**
   * Creates a new unreviewed MemoryCard for an Ayah (State.New = 0).
   */
  public static createAyahCard(
    verseKey: string,
    options?: { initialDue?: Date; createdAt?: Date }
  ): MemoryCard {
    const now = options?.createdAt ?? new Date();
    const due = options?.initialDue ?? now;

    return {
      id: this.getCardId('ayah', verseKey),
      target_type: 'ayah',
      target_id: verseKey,
      due,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      last_review: null,
      retrievability: 0.0,
    };
  }

  /**
   * Creates a new unreviewed MemoryCard for an inter-ayah or page boundary transition.
   */
  public static createTransitionCard(
    fromVerseKey: string,
    toVerseKey: string,
    options?: { initialDue?: Date; createdAt?: Date }
  ): MemoryCard {
    const edgeId = `${fromVerseKey}->${toVerseKey}`;
    const now = options?.createdAt ?? new Date();
    const due = options?.initialDue ?? now;

    return {
      id: this.getCardId('transition', edgeId),
      target_type: 'transition',
      target_id: edgeId,
      due,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      last_review: null,
      retrievability: 0.0,
    };
  }

  /**
   * Executes spaced repetition scheduling for a card given a review rating.
   * Updates stability, difficulty, interval, reps, lapses, and state.
   */
  public static scheduleReview(
    card: MemoryCard,
    rating: ReviewRating,
    reviewTime: Date = new Date(),
    engine: FSRS = defaultFsrsEngine
  ): {
    updatedCard: MemoryCard;
    logItem: RecordLogItem;
  } {
    // Convert MemoryCard to ts-fsrs Card
    const fsrsCard: FSRSCard = this.toFSRSCard(card, reviewTime);

    // Map rating to ts-fsrs Rating enum
    const fsrsRating = this.mapToFSRSRating(rating);

    // Execute ts-fsrs repeat
    const scheduledRecords = engine.repeat(fsrsCard, reviewTime);
    const scheduledItem = scheduledRecords[fsrsRating];

    if (!scheduledItem) {
      throw new Error(`Failed to schedule card with rating: ${rating}`);
    }

    const updatedFsrsCard = scheduledItem.card;

    // Calculate elapsed days since previous review
    let elapsedDays = 0;
    if (card.last_review) {
      const prevDate = new Date(card.last_review);
      const diffMs = reviewTime.getTime() - prevDate.getTime();
      elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Calculate retrievability after review
    let retrievability = 1.0;
    try {
      const r = engine.retrievability(updatedFsrsCard, reviewTime);
      retrievability = typeof r === 'number' && !isNaN(r) ? r : 1.0;
    } catch {
      retrievability = 1.0;
    }

    const updatedCard: MemoryCard = {
      id: card.id,
      target_type: card.target_type,
      target_id: card.target_id,
      due: updatedFsrsCard.due,
      stability: Math.round(updatedFsrsCard.stability * 10000) / 10000,
      difficulty: Math.round(updatedFsrsCard.difficulty * 10000) / 10000,
      elapsed_days: elapsedDays,
      scheduled_days: updatedFsrsCard.scheduled_days,
      reps: updatedFsrsCard.reps,
      lapses: updatedFsrsCard.lapses,
      state: updatedFsrsCard.state as FSRSState,
      last_review: reviewTime,
      retrievability: Math.round(retrievability * 10000) / 10000,
    };

    return {
      updatedCard,
      logItem: scheduledItem,
    };
  }

  /**
   * Previews future scheduling outcomes for all 4 ratings (Again, Hard, Good, Easy)
   * without mutating the database or card state.
   */
  public static previewScheduling(
    card: MemoryCard,
    reviewTime: Date = new Date(),
    engine: FSRS = defaultFsrsEngine
  ): Record<
    ReviewRating,
    {
      due: Date;
      intervalDays: number;
      stability: number;
      difficulty: number;
      state: FSRSState;
    }
  > {
    const fsrsCard = this.toFSRSCard(card, reviewTime);
    const scheduledRecords = engine.repeat(fsrsCard, reviewTime);

    const ratings: ReviewRating[] = [1, 2, 3, 4];
    const preview = {} as Record<
      ReviewRating,
      {
        due: Date;
        intervalDays: number;
        stability: number;
        difficulty: number;
        state: FSRSState;
      }
    >;

    for (const r of ratings) {
      const fsrsRating = this.mapToFSRSRating(r);
      const item = scheduledRecords[fsrsRating];
      preview[r] = {
        due: item.card.due,
        intervalDays: item.card.scheduled_days,
        stability: Math.round(item.card.stability * 100) / 100,
        difficulty: Math.round(item.card.difficulty * 100) / 100,
        state: item.card.state as FSRSState,
      };
    }

    return preview;
  }

  /**
   * Computes estimated retrievability R(t) of a card at any given point in time.
   */
  public static getCardRetrievability(
    card: MemoryCard,
    asOfDate: Date = new Date(),
    engine: FSRS = defaultFsrsEngine
  ): number {
    if (card.state === State.New || !card.last_review || card.stability <= 0) {
      return 0.0;
    }

    const fsrsCard = this.toFSRSCard(card, asOfDate);
    try {
      const r = engine.retrievability(fsrsCard, asOfDate);
      if (typeof r === 'number' && !isNaN(r)) {
        return Math.max(0, Math.min(1, Math.round(r * 10000) / 10000));
      }
    } catch {
      // Fallback to power decay formula
    }

    const lastReviewDate = new Date(card.last_review);
    const elapsedDays = Math.max(0, (asOfDate.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24));
    const factor = 0.19; // Default FSRS decay factor mapping 90% at t = S
    const r = Math.pow(1 + factor * (elapsedDays / card.stability), -1);
    return Math.max(0, Math.min(1, Math.round(r * 10000) / 10000));
  }

  /**
   * Converts a domain MemoryCard into ts-fsrs internal Card representation.
   */
  private static toFSRSCard(card: MemoryCard, fallbackNow: Date): FSRSCard {
    if (card.state === State.New && card.reps === 0 && !card.last_review) {
      const empty = createEmptyCard(card.due ? new Date(card.due) : fallbackNow);
      return empty;
    }

    return {
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state as State,
      last_review: card.last_review ? new Date(card.last_review) : undefined,
      learning_steps: card.state === State.Learning ? 1 : 0,
    };
  }

  /**
   * Helper mapping 1-4 numeric rating to ts-fsrs Rating enum.
   */
  public static mapToFSRSRating(rating: ReviewRating): 1 | 2 | 3 | 4 {
    switch (rating) {
      case 1:
        return FSRSRatingEnum.Again as 1;
      case 2:
        return FSRSRatingEnum.Hard as 2;
      case 3:
        return FSRSRatingEnum.Good as 3;
      case 4:
        return FSRSRatingEnum.Easy as 4;
      default:
        throw new Error(`Invalid ReviewRating: ${rating}`);
    }
  }
}
