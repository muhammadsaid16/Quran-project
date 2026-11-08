import { PhonemeErrorRateCalculator, type PERMetrics } from './phoneme-error-rate.ts';

export type RecitationErrorCategory =
  | 'Correct'
  | 'Omission'
  | 'Substitution'
  | 'Repetition'
  | 'Sequence Error'
  | 'Uncertain';

export interface RecitationClassificationResult {
  primaryCategory: RecitationErrorCategory;
  allCategories: RecitationErrorCategory[];
  confidence: number;
  perMetrics: PERMetrics;
  details: {
    omittedWordsCount: number;
    substitutedWordsCount: number;
    repeatedSequences: string[];
    isSequenceJump: boolean;
    uncertainScore: number;
  };
}

export class RecitationErrorClassifier {
  /**
   * Classifies recitation performance based on reference phonemes, hypothesis phonemes,
   * acoustic confidence, and verse transition context.
   */
  public static classify(
    referenceTokens: string[],
    hypothesisTokens: string[],
    acousticConfidence: number = 0.95,
    context?: {
      targetAyahKey: string;
      recitedAyahKeyCandidate?: string;
    }
  ): RecitationClassificationResult {
    const metrics = PhonemeErrorRateCalculator.calculate(referenceTokens, hypothesisTokens);
    const categories: RecitationErrorCategory[] = [];

    // 1. Uncertain Check: Low acoustic confidence
    const uncertainScore = 1 - acousticConfidence;
    if (acousticConfidence < 0.65) {
      categories.push('Uncertain');
    }

    // 2. Sequence Error Check: Recited different verse or jumped sequence
    let isSequenceJump = false;
    if (
      context?.recitedAyahKeyCandidate &&
      context.recitedAyahKeyCandidate !== context.targetAyahKey
    ) {
      isSequenceJump = true;
      categories.push('Sequence Error');
    }

    // 3. Repetition Check: Repeated phoneme clusters in hypothesis
    const repeatedSequences = this.detectRepetitions(hypothesisTokens);
    if (repeatedSequences.length > 0) {
      categories.push('Repetition');
    }

    // 4. Omission Check: Deletions in alignment
    if (metrics.deletions > 0) {
      categories.push('Omission');
    }

    // 5. Substitution Check: Substitutions in alignment
    if (metrics.substitutions > 0) {
      categories.push('Substitution');
    }

    // 6. Correct Check: Zero omissions, substitutions, or repetitions, and high confidence
    if (
      metrics.deletions === 0 &&
      metrics.substitutions === 0 &&
      metrics.insertions === 0 &&
      !isSequenceJump &&
      acousticConfidence >= 0.70
    ) {
      categories.push('Correct');
    }

    // Determine primary category
    let primaryCategory: RecitationErrorCategory = 'Correct';
    if (categories.includes('Sequence Error')) {
      primaryCategory = 'Sequence Error';
    } else if (categories.includes('Uncertain') && acousticConfidence < 0.50) {
      primaryCategory = 'Uncertain';
    } else if (categories.includes('Omission')) {
      primaryCategory = 'Omission';
    } else if (categories.includes('Substitution')) {
      primaryCategory = 'Substitution';
    } else if (categories.includes('Repetition')) {
      primaryCategory = 'Repetition';
    } else if (categories.includes('Uncertain')) {
      primaryCategory = 'Uncertain';
    }

    return {
      primaryCategory,
      allCategories: categories,
      confidence: acousticConfidence,
      perMetrics: metrics,
      details: {
        omittedWordsCount: metrics.deletions,
        substitutedWordsCount: metrics.substitutions,
        repeatedSequences,
        isSequenceJump,
        uncertainScore,
      },
    };
  }

  /**
   * Helper to detect repeated contiguous subsequences in hypothesis tokens (min length 3)
   */
  private static detectRepetitions(tokens: string[]): string[] {
    const repeated: string[] = [];
    const len = tokens.length;
    for (let subLen = 3; subLen <= Math.floor(len / 2); subLen++) {
      for (let i = 0; i <= len - 2 * subLen; i++) {
        const sub1 = tokens.slice(i, i + subLen).join('');
        const sub2 = tokens.slice(i + subLen, i + 2 * subLen).join('');
        if (sub1 === sub2 && !repeated.includes(sub1)) {
          repeated.push(sub1);
        }
      }
    }
    return repeated;
  }
}
