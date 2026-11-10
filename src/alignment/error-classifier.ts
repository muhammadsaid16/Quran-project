/**
 * Quran Cognitive OS v2.0 — 6-Tier Recitation Error Classifier
 * Classifies Quranic recitations into the 6 standardized WhiteRoom categories:
 *  1. Correct
 *  2. Omission
 *  3. Substitution
 *  4. Repetition
 *  5. Sequence Error
 *  6. Uncertain
 */

import {
  RecitationErrorCategory,
  AlignmentOptions,
  AlignmentDiagnostics,
} from './types';
import { AlignerExecutionResult } from './ctc-dtw-aligner';

export interface ClassificationOutput {
  primaryCategory: RecitationErrorCategory;
  allCategories: RecitationErrorCategory[];
  diagnostics: AlignmentDiagnostics;
}

export class ErrorClassifier {
  private static readonly UNCERTAIN_CONFIDENCE_THRESHOLD = 0.65;
  private static readonly CRITICAL_UNCERTAIN_THRESHOLD = 0.50;
  private static readonly PER_CORRECT_THRESHOLD = 0.08;

  /**
   * Classifies recitation based on alignment metrics, acoustic confidence,
   * repetition detection, and verse context.
   */
  public static classify(
    alignment: AlignerExecutionResult,
    hypothesisTokens: string[],
    options?: AlignmentOptions
  ): ClassificationOutput {
    const categories: RecitationErrorCategory[] = [];
    const uncertaintyReasons: string[] = [];

    const acousticConfidence = options?.acousticConfidence ?? alignment.meanConfidence;
    const uncertainThreshold =
      options?.uncertainThreshold ?? this.UNCERTAIN_CONFIDENCE_THRESHOLD;

    // 1. Uncertain Check: Low acoustic confidence or empty audio.
    // Absence of confidence data is not evidence of uncertainty.
    const uncertainScore =
      acousticConfidence !== undefined
        ? Math.round((1.0 - acousticConfidence) * 10000) / 10000
        : 0;
    if (acousticConfidence !== undefined && acousticConfidence < uncertainThreshold) {
      categories.push('Uncertain');
      uncertaintyReasons.push(
        `Acoustic confidence (${Math.round(acousticConfidence * 100)}%) is below required threshold (${Math.round(uncertainThreshold * 100)}%)`
      );
    }
    if (hypothesisTokens.length === 0 && alignment.referenceLength > 0) {
      if (!categories.includes('Uncertain')) {
        categories.push('Uncertain');
      }
      uncertaintyReasons.push('No acoustic speech tokens detected (silence or non-speech audio)');
    }

    // 2. Sequence Error Check: Transposed ayah or mismatched target
    let isSequenceJump = false;
    if (
      options?.recitedAyahKeyCandidate &&
      options.targetAyahKey &&
      options.recitedAyahKeyCandidate !== options.targetAyahKey
    ) {
      isSequenceJump = true;
      categories.push('Sequence Error');
    }

    // 3. Repetition Check: Stumbling and repeating tokens/phrases
    const repetitions = this.detectRepetitions(hypothesisTokens, alignment);
    if (repetitions.length > 0) {
      categories.push('Repetition');
    }

    // 4. Omission Check: Deletions in alignment
    if (alignment.deletions > 0) {
      categories.push('Omission');
    }

    // 5. Substitution Check: Substitutions in alignment
    if (alignment.substitutions > 0) {
      categories.push('Substitution');
    }

    // 6. Correct Check: Low PER, zero omissions or substitutions, no sequence jump,
    // and no evidence of low confidence (missing confidence data is not a failure).
    const perThreshold = options?.perMatchThreshold ?? this.PER_CORRECT_THRESHOLD;
    const confidenceOk = acousticConfidence === undefined || acousticConfidence >= 0.70;
    const isCleanMatch =
      alignment.deletions === 0 &&
      alignment.substitutions === 0 &&
      repetitions.length === 0 &&
      !isSequenceJump &&
      confidenceOk &&
      alignment.per <= perThreshold;

    if (isCleanMatch) {
      categories.push('Correct');
    }

    // If no categories were flagged (e.g. minor insertion or minor variance), resolve default
    if (categories.length === 0) {
      if (alignment.per <= perThreshold && confidenceOk) {
        categories.push('Correct');
      } else if (acousticConfidence !== undefined && acousticConfidence < uncertainThreshold) {
        categories.push('Uncertain');
      } else if (alignment.insertions > 0) {
        categories.push('Repetition');
      } else {
        categories.push('Correct');
      }
    }

    // Determine primary category following clinical severity order
    let primaryCategory: RecitationErrorCategory = 'Correct';
    if (categories.includes('Sequence Error')) {
      primaryCategory = 'Sequence Error';
    } else if (
      categories.includes('Uncertain') &&
      acousticConfidence !== undefined &&
      acousticConfidence < this.CRITICAL_UNCERTAIN_THRESHOLD
    ) {
      primaryCategory = 'Uncertain';
    } else if (categories.includes('Omission')) {
      primaryCategory = 'Omission';
    } else if (categories.includes('Substitution')) {
      primaryCategory = 'Substitution';
    } else if (categories.includes('Repetition')) {
      primaryCategory = 'Repetition';
    } else if (categories.includes('Uncertain')) {
      primaryCategory = 'Uncertain';
    } else {
      primaryCategory = 'Correct';
    }

    const diagnostics: AlignmentDiagnostics = {
      matchesCount: alignment.matches,
      substitutionsCount: alignment.substitutions,
      omissionsCount: alignment.deletions,
      insertionsCount: alignment.insertions,
      repetitions,
      isSequenceJump,
      uncertainScore,
      uncertaintyReasons: uncertaintyReasons.length > 0 ? uncertaintyReasons : undefined,
    };

    return {
      primaryCategory,
      allCategories: categories,
      diagnostics,
    };
  }

  /**
   * Detects stumbling repetitions in recognized hypothesis tokens.
   * Checks for:
   * 1. Immediate repeated single tokens (e.g. "قُل", "قُل")
   * 2. Repeated n-gram phrases (e.g. "بِسمِ للَاهِ", "بِسمِ للَاهِ")
   * 3. Alignment insertion loops matching previously matched reference tokens
   */
  public static detectRepetitions(
    tokens: string[],
    alignment?: AlignerExecutionResult
  ): string[] {
    const repetitions: string[] = [];
    if (tokens.length < 2) return repetitions;

    // A. Direct Token / N-Gram Repetition Detection in Hypothesis
    // Check window sizes from 1 up to half the length of tokens
    const maxWindow = Math.min(10, Math.floor(tokens.length / 2));
    for (let w = 1; w <= maxWindow; w++) {
      for (let i = 0; i <= tokens.length - 2 * w; i++) {
        const seg1 = tokens.slice(i, i + w).join('');
        const seg2 = tokens.slice(i + w, i + 2 * w).join('');

        if (seg1 === seg2 && seg1.length > 0) {
          const phrase = tokens.slice(i, i + w).join(' ');
          if (!repetitions.includes(phrase)) {
            repetitions.push(phrase);
          }
        }
      }
    }

    // B. Check for Alignment Backtracking / Loop Repetition
    if (alignment && alignment.steps.length > 0) {
      const matchedTokens: string[] = [];
      for (const step of alignment.steps) {
        if (step.op === 'match' && step.refToken) {
          matchedTokens.push(step.refToken);
        } else if (step.op === 'insertion' && step.hypToken) {
          // If the inserted token was recently matched, reciter looped back
          if (matchedTokens.slice(-6).includes(step.hypToken)) {
            if (!repetitions.includes(step.hypToken)) {
              repetitions.push(step.hypToken);
            }
          }
        }
      }
    }

    return repetitions;
  }
}
