/**
 * Quran Cognitive OS v2.0 — Automated Recitation Rating Derivation
 * Maps phoneme alignment diagnostics and recitation error classifications into FSRS ratings:
 *  - Easy (4): Flawless recitation, zero omissions, minimal hesitation.
 *  - Good (3): Correct recitation with minor hesitation or self-correction.
 *  - Hard (2): Single omission or substitution corrected with struggle.
 *  - Again (1): Multiple errors, severe stumbling, or sequence breakdown.
 */

import { ReviewRating } from '../db/schema';
import { AyahAlignmentResult, RecitationErrorCategory } from '../alignment/types';
import {
  RecitationEvaluationMetrics,
  RatingDerivationResult,
  RatingLabel,
} from './types';

export class RatingDerivator {
  private static readonly HESITATION_THRESHOLD_MS = 1500;
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.75;
  private static readonly ACCURACY_EASY_THRESHOLD = 0.95;

  /**
   * Automatically calculates FSRS review rating from alignment results or error metrics.
   */
  public static deriveRating(
    input: AyahAlignmentResult | RecitationEvaluationMetrics
  ): RatingDerivationResult {
    const metrics = this.extractMetrics(input);
    const deductions: string[] = [];

    // 1. Critical Failure Check -> Again (1)
    // Sequence breakdown (verse transpositions or sequence jump)
    if (metrics.isSequenceJump) {
      deductions.push('Sequence breakdown: verse transposed or out-of-order recitation');
      return this.formatResult(1, 'Again', deductions.join('; '), 0.98, deductions, metrics);
    }

    // Multiple omissions or substitutions (total errors >= 2)
    const totalContentErrors = metrics.omissions + metrics.substitutions;
    if (totalContentErrors >= 2) {
      deductions.push(
        `Multiple content errors detected (${metrics.omissions} omission(s), ${metrics.substitutions} substitution(s))`
      );
      return this.formatResult(1, 'Again', deductions.join('; '), 0.95, deductions, metrics);
    }

    // Severe stumbling (3+ repetitions or 2 repetitions with low accuracy)
    if (metrics.repetitions >= 3 || (metrics.repetitions >= 2 && metrics.accuracy < 0.80)) {
      deductions.push(`Severe stumbling with ${metrics.repetitions} repeated attempts/backtracks`);
      return this.formatResult(1, 'Again', deductions.join('; '), 0.90, deductions, metrics);
    }

    // Critical acoustic failure or total silence
    if (metrics.confidence < 0.50 && metrics.accuracy < 0.60) {
      deductions.push('Acoustic confidence critically low or reciter unable to produce audio');
      return this.formatResult(1, 'Again', deductions.join('; '), 0.85, deductions, metrics);
    }

    // Overall accuracy too low for passing (< 65%)
    if (metrics.accuracy < 0.65) {
      deductions.push(`Phoneme accuracy (${Math.round(metrics.accuracy * 100)}%) below passing threshold`);
      return this.formatResult(1, 'Again', deductions.join('; '), 0.92, deductions, metrics);
    }

    // 2. Single Error / Struggled Recovery -> Hard (2)
    // Single omission or single substitution
    if (totalContentErrors === 1) {
      const errType = metrics.omissions === 1 ? 'omission' : 'substitution';
      deductions.push(`Single ${errType} corrected or recovered with struggle`);
      return this.formatResult(2, 'Hard', deductions.join('; '), 0.92, deductions, metrics);
    }

    // Noticeable stumbling (2 repetitions) even without final omissions
    if (metrics.repetitions >= 2) {
      deductions.push(`Reciter stumbled repeatedly (${metrics.repetitions} repetitions) before completing verse`);
      return this.formatResult(2, 'Hard', deductions.join('; '), 0.88, deductions, metrics);
    }

    // Heavy hesitation / struggle (> 3000ms delay)
    if (metrics.hesitationMs >= 3000) {
      deductions.push(`Significant hesitation (${metrics.hesitationMs}ms) during recall`);
      return this.formatResult(2, 'Hard', deductions.join('; '), 0.85, deductions, metrics);
    }

    // Borderline accuracy (between 65% and 82%)
    if (metrics.accuracy < 0.82) {
      deductions.push(`Accuracy moderate (${Math.round(metrics.accuracy * 100)}%) with multiple minor phonetic variances`);
      return this.formatResult(2, 'Hard', deductions.join('; '), 0.84, deductions, metrics);
    }

    // 3. Minor Hesitation or Self-Correction -> Good (3)
    const hasMinorRepetition = metrics.repetitions === 1;
    const hasMinorHesitation = metrics.hesitationMs >= this.HESITATION_THRESHOLD_MS && metrics.hesitationMs < 3000;
    const hasModerateAccuracy = metrics.accuracy >= 0.82 && metrics.accuracy < this.ACCURACY_EASY_THRESHOLD;

    if (hasMinorRepetition || hasMinorHesitation || hasModerateAccuracy) {
      if (hasMinorRepetition) {
        deductions.push('Single self-correction or brief repetition');
      }
      if (hasMinorHesitation) {
        deductions.push(`Minor hesitation (${metrics.hesitationMs}ms)`);
      }
      if (hasModerateAccuracy && !hasMinorRepetition && !hasMinorHesitation) {
        deductions.push(`Minor phonetic variance (accuracy ${Math.round(metrics.accuracy * 100)}%)`);
      }
      return this.formatResult(
        3,
        'Good',
        deductions.length > 0 ? deductions.join('; ') : 'Correct recitation with minor hesitation or self-correction',
        0.90,
        deductions,
        metrics
      );
    }

    // 4. Flawless Recitation -> Easy (4)
    // Zero content errors, zero repetitions, minimal hesitation, high accuracy, high confidence
    return this.formatResult(
      4,
      'Easy',
      'Flawless recitation with zero omissions, smooth cadence, and high acoustic confidence',
      0.98,
      [],
      metrics
    );
  }

  /**
   * Helper extracting normalized numerical metrics from either result shape.
   */
  private static extractMetrics(
    input: AyahAlignmentResult | RecitationEvaluationMetrics
  ): {
    omissions: number;
    substitutions: number;
    repetitions: number;
    isSequenceJump: boolean;
    accuracy: number;
    confidence: number;
    hesitationMs: number;
  } {
    // Check if input is AyahAlignmentResult
    if ('diagnostics' in input && 'primaryCategory' in input) {
      const diag = input.diagnostics;
      const isSequenceJump =
        diag.isSequenceJump || input.primaryCategory === 'Sequence Error';
      const omissions = diag.omissionsCount;
      const substitutions = diag.substitutionsCount;
      const repetitions = diag.repetitions.length;
      const accuracy = typeof input.accuracy === 'number' ? input.accuracy : 1.0 - (input.per ?? 0);
      const confidence = typeof input.confidence === 'number' ? input.confidence : 1.0;
      const hesitationMs = input.latencyMs > 2000 ? input.latencyMs : 0;

      return {
        omissions,
        substitutions,
        repetitions,
        isSequenceJump,
        accuracy: Math.max(0, Math.min(1, accuracy)),
        confidence: Math.max(0, Math.min(1, confidence)),
        hesitationMs,
      };
    }

    // Explicit RecitationEvaluationMetrics input
    const omissions = input.omissionsCount ?? 0;
    const substitutions = input.substitutionsCount ?? 0;
    const repetitions = input.repetitionsCount ?? 0;
    const isSequenceJump =
      input.isSequenceJump !== undefined
        ? input.isSequenceJump
        : input.primaryCategory === 'Sequence Error';
    const accuracy = input.accuracy ?? (input.per !== undefined ? 1.0 - input.per : 1.0);
    const confidence = input.confidence ?? 1.0;
    const hesitationMs = input.hesitationMs ?? 0;

    return {
      omissions,
      substitutions,
      repetitions,
      isSequenceJump,
      accuracy: Math.max(0, Math.min(1, accuracy)),
      confidence: Math.max(0, Math.min(1, confidence)),
      hesitationMs,
    };
  }

  private static formatResult(
    rating: ReviewRating,
    ratingLabel: RatingLabel,
    reason: string,
    confidence: number,
    deductions: string[],
    metrics: {
      omissions: number;
      substitutions: number;
      repetitions: number;
      isSequenceJump: boolean;
      accuracy: number;
      confidence: number;
      hesitationMs: number;
    }
  ): RatingDerivationResult {
    return {
      rating,
      ratingLabel,
      reason,
      confidence,
      deductions,
      metrics,
    };
  }
}

/**
 * Convenient standalone function for deriving FSRS review rating.
 */
export function deriveFSRSRating(
  input: AyahAlignmentResult | RecitationEvaluationMetrics
): RatingDerivationResult {
  return RatingDerivator.deriveRating(input);
}
