/**
 * Quran Cognitive OS v2.0 — FSRS Memory Engine Types
 * Milestone 5: ts-fsrs spaced repetition scheduling & daily due queue
 */

import { Rating, State } from 'ts-fsrs';
import { MemoryCard, MemoryTargetType, ReviewLog, ReviewRating, ReviewResultStatus, TransitionEdge } from '../db/schema';
import { RecitationErrorCategory, AyahAlignmentResult } from '../alignment/types';

export { Rating, State };

export type FSRSRating = 1 | 2 | 3 | 4; // Again = 1, Hard = 2, Good = 3, Easy = 4
export type FSRSState = 0 | 1 | 2 | 3; // New = 0, Learning = 1, Review = 2, Relearning = 3

export type RatingLabel = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface RecitationEvaluationMetrics {
  /** Total recorded errors for this session (omissions+substitutions+repetitions). */
  errorCount?: number;
  omissionsCount?: number;
  substitutionsCount?: number;
  repetitionsCount?: number;
  isSequenceJump?: boolean;
  accuracy?: number; // 0.0 - 1.0
  confidence?: number; // 0.0 - 1.0 (acoustic confidence)
  hesitationMs?: number;
  per?: number; // Phoneme Error Rate
  primaryCategory?: RecitationErrorCategory;
  allCategories?: RecitationErrorCategory[];
  errorPositions?: Array<{
    word_index: number;
    expected: string;
    actual?: string;
    error_type: 'omission' | 'substitution' | 'repetition' | 'sequence_error' | 'uncertain';
  }>;
}

export interface RatingDerivationResult {
  rating: ReviewRating;
  ratingLabel: RatingLabel;
  reason: string;
  confidence: number;
  deductions: string[];
  metrics: {
    omissions: number;
    substitutions: number;
    repetitions: number;
    isSequenceJump: boolean;
    accuracy: number;
    confidence: number;
    hesitationMs: number;
  };
}

export interface DueQueueSummary {
  totalDueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  relearningCount: number;
  overdueCount: number;
  averageRetrievability: number;
  asOfDate: Date;
}

export interface DailyDueQueue {
  dueCards: MemoryCard[];
  newCards: MemoryCard[];
  allDue: MemoryCard[];
  summary: DueQueueSummary;
}

export interface DueQueueQueryOptions {
  asOfDate?: Date | string;
  targetType?: MemoryTargetType | 'all';
  surah?: number;
  juz?: number;
  page?: number;
  onlyPageBoundaries?: boolean;
  limitDue?: number;
  limitNew?: number;
  sortBy?: 'due' | 'urgency' | 'retrievability' | 'quranic_order';
}

export interface RecordReviewInput {
  targetId: string;
  targetType: MemoryTargetType;
  reviewTime?: Date;
  rating?: ReviewRating;
  alignmentResult?: AyahAlignmentResult;
  metrics?: RecitationEvaluationMetrics;
  recordingDurationMs?: number;
  inferenceDurationMs?: number;
  /**
   * Force the persisted verdict when the caller has better information than
   * the rating alone — e.g. an acoustically UNCERTAIN session is stored as
   * 'needs_review' so it can never count toward strict achievements,
   * regardless of the FSRS rating chosen.
   */
  resultStatusOverride?: ReviewResultStatus;
}

export interface ReviewRecordResult {
  card: MemoryCard;
  reviewLog: ReviewLog;
  ratingResult: RatingDerivationResult;
  transitionEdge?: TransitionEdge;
}
