/**
 * Phoneme Error Rate (PER) Calculator & Dynamic Programming CTC Alignment Engine.
 * Implements Wagner-Fischer / Levenshtein alignment on phoneme token arrays.
 */

export type AlignmentOp = 'match' | 'substitution' | 'deletion' | 'insertion';

export interface AlignmentStep {
  refToken: string | null;
  hypToken: string | null;
  op: AlignmentOp;
}

export interface PERMetrics {
  referenceLength: number;
  hypothesisLength: number;
  substitutions: number;
  deletions: number; // Omissions
  insertions: number;
  matches: number; // Correct
  per: number; // (S + D + I) / N
  accuracy: number; // 1 - (S + D) / N
  alignment: AlignmentStep[];
}

export class PhonemeErrorRateCalculator {
  /**
   * Calculate PER between reference phoneme array and recognized hypothesis phoneme array.
   */
  public static calculate(ref: string[], hyp: string[]): PERMetrics {
    const n = ref.length;
    const m = hyp.length;

    // DP Table: dp[i][j] holds min edit distance
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    // Backtrace table
    const trace: AlignmentOp[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill('match'));

    for (let i = 0; i <= n; i++) {
      dp[i][0] = i; // All deletions
      trace[i][0] = 'deletion';
    }
    for (let j = 0; j <= m; j++) {
      dp[0][j] = j; // All insertions
      trace[0][j] = 'insertion';
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (ref[i - 1] === hyp[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
          trace[i][j] = 'match';
        } else {
          const subCost = dp[i - 1][j - 1] + 1; // Substitution
          const delCost = dp[i - 1][j] + 1; // Deletion (Omission)
          const insCost = dp[i][j - 1] + 1; // Insertion

          if (subCost <= delCost && subCost <= insCost) {
            dp[i][j] = subCost;
            trace[i][j] = 'substitution';
          } else if (delCost <= insCost) {
            dp[i][j] = delCost;
            trace[i][j] = 'deletion';
          } else {
            dp[i][j] = insCost;
            trace[i][j] = 'insertion';
          }
        }
      }
    }

    // Backtrack to find optimal alignment path
    let i = n;
    let j = m;
    const alignment: AlignmentStep[] = [];
    let substitutions = 0;
    let deletions = 0;
    let insertions = 0;
    let matches = 0;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && trace[i][j] === 'match') {
        alignment.unshift({ refToken: ref[i - 1], hypToken: hyp[j - 1], op: 'match' });
        matches++;
        i--;
        j--;
      } else if (i > 0 && j > 0 && trace[i][j] === 'substitution') {
        alignment.unshift({ refToken: ref[i - 1], hypToken: hyp[j - 1], op: 'substitution' });
        substitutions++;
        i--;
        j--;
      } else if (i > 0 && trace[i][j] === 'deletion') {
        alignment.unshift({ refToken: ref[i - 1], hypToken: null, op: 'deletion' });
        deletions++;
        i--;
      } else {
        alignment.unshift({ refToken: null, hypToken: hyp[j - 1], op: 'insertion' });
        insertions++;
        j--;
      }
    }

    const per = n > 0 ? (substitutions + deletions + insertions) / n : 0;
    const accuracy = n > 0 ? Math.max(0, 1 - (substitutions + deletions) / n) : 0;

    return {
      referenceLength: n,
      hypothesisLength: m,
      substitutions,
      deletions,
      insertions,
      matches,
      per: Math.round(per * 10000) / 10000,
      accuracy: Math.round(accuracy * 10000) / 10000,
      alignment,
    };
  }

  /**
   * Helper to tokenize a phoneme string into individual character tokens.
   */
  public static tokenize(phonemeStr: string): string[] {
    // Splits while ignoring whitespace
    return Array.from(phonemeStr.replace(/\s+/g, ''));
  }
}
