/**
 * Quran Cognitive OS v2.0 — CTC Alignment & Dynamic Time Warping (DTW) Engine
 * Implements high-performance dynamic programming sequence alignment
 * between acoustic CTC phoneme token hypotheses and reference Quranic phonemes.
 *
 * Latency Guarantee: < 100ms (typically < 3ms for whole ayahs).
 */

import {
  AlignmentOp,
  PhonemeAlignmentStep,
  StreamingPhonemeToken,
} from './types';
import { PhonemeVocabulary } from './phoneme-vocabulary';

export interface AlignerExecutionResult {
  steps: PhonemeAlignmentStep[];
  referenceLength: number;
  hypothesisLength: number;
  matches: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  per: number; // Phoneme Error Rate: (S + D + I) / N
  accuracy: number; // 1.0 - (S + D) / N
  /** Mean over tokens that carry a real probability; undefined when none do. */
  meanConfidence: number | undefined;
  latencyMs: number;
}

/**
 * Result of a LOCAL alignment: the best matching segment of the reference.
 */
export interface LocalAlignmentResult {
  steps: PhonemeAlignmentStep[];
  /** Index of the first reference token of the matching segment (-1 when none). */
  startReferenceIndex: number;
  /** Index of the last reference token of the matching segment (-1 when none). */
  endReferenceIndex: number;
  /** Index of the first hypothesis token of the matching segment (-1 when none). */
  startHypothesisIndex: number;
  /** Index of the last hypothesis token of the matching segment (-1 when none). */
  endHypothesisIndex: number;
  matches: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  /** Total score of the matching segment — how well the segment explains the speech. */
  score: number;
  latencyMs: number;
}

export class CtcDtwAligner {
  private static readonly INSERTION_COST = 1.0;
  private static readonly DELETION_COST = 1.0;
  private static readonly MATCH_COST_THRESHOLD = 0.25;

  /**
   * Aligns hypothesis tokens against reference phoneme tokens using
   * Tajweed-aware Dynamic Time Warping / Needleman-Wunsch DP.
   */
  public static align(
    referenceTokens: string[],
    hypothesisTokens: (string | StreamingPhonemeToken)[]
  ): AlignerExecutionResult {
    const startTime = performance.now();

    // Normalize hypothesis tokens into structured tokens
    const hyp: StreamingPhonemeToken[] = hypothesisTokens.map((t, idx) => {
      if (typeof t === 'string') {
        return { token: t, index: idx, timestampMs: idx * 100 };
      }
      return {
        token: t.token,
        index: t.index ?? idx,
        confidence: t.confidence,
        timestampMs: t.timestampMs ?? idx * 100,
      };
    });

    const ref = referenceTokens;
    const n = ref.length;
    const m = hyp.length;

    // Edge case: Empty reference
    if (n === 0) {
      const steps: PhonemeAlignmentStep[] = hyp.map((h, j) => ({
        refToken: null,
        hypToken: h.token,
        op: 'insertion',
        cost: 1.0,
        refIndex: -1,
        hypIndex: j,
        timestampMs: h.timestampMs,
        confidence: h.confidence,
      }));
      const latencyMs = performance.now() - startTime;
      return {
        steps,
        referenceLength: 0,
        hypothesisLength: m,
        matches: 0,
        substitutions: 0,
        deletions: 0,
        insertions: m,
        per: m > 0 ? 1.0 : 0.0,
        accuracy: 0.0,
        meanConfidence: this.calculateMeanConfidence(hyp),
        latencyMs,
      };
    }

    // Edge case: Empty hypothesis
    if (m === 0) {
      const steps: PhonemeAlignmentStep[] = ref.map((r, i) => ({
        refToken: r,
        hypToken: null,
        op: 'deletion',
        cost: 1.0,
        refIndex: i,
        hypIndex: -1,
      }));
      const latencyMs = performance.now() - startTime;
      return {
        steps,
        referenceLength: n,
        hypothesisLength: 0,
        matches: 0,
        substitutions: 0,
        deletions: n,
        insertions: 0,
        per: 1.0,
        accuracy: 0.0,
        meanConfidence: undefined,
        latencyMs,
      };
    }

    // Allocate DP matrix: dp[i][j] holds cumulative alignment cost
    // Flat typed array for maximal performance and zero GC pressure
    const width = m + 1;
    const dp = new Float32Array((n + 1) * width);
    const trace = new Uint8Array((n + 1) * width);
    // Trace codes: 0 = match/sub, 1 = deletion (up), 2 = insertion (left)

    // Base conditions
    for (let i = 0; i <= n; i++) {
      dp[i * width] = i * this.DELETION_COST;
      trace[i * width] = 1;
    }
    for (let j = 0; j <= m; j++) {
      dp[j] = j * this.INSERTION_COST;
      trace[j] = 2;
    }

    // Fill DP table
    for (let i = 1; i <= n; i++) {
      const rTok = ref[i - 1];
      const rowOffset = i * width;
      const prevRowOffset = (i - 1) * width;

      for (let j = 1; j <= m; j++) {
        const hTok = hyp[j - 1].token;
        const subDist = PhonemeVocabulary.getPhonemeDistance(rTok, hTok);

        const diagCost = dp[prevRowOffset + (j - 1)] + subDist;
        const upCost = dp[prevRowOffset + j] + this.DELETION_COST;
        const leftCost = dp[rowOffset + (j - 1)] + this.INSERTION_COST;

        if (diagCost <= upCost && diagCost <= leftCost) {
          dp[rowOffset + j] = diagCost;
          trace[rowOffset + j] = 0; // Match or substitution
        } else if (upCost <= leftCost) {
          dp[rowOffset + j] = upCost;
          trace[rowOffset + j] = 1; // Deletion
        } else {
          dp[rowOffset + j] = leftCost;
          trace[rowOffset + j] = 2; // Insertion
        }
      }
    }

    // Backtrack optimal alignment path
    let i = n;
    let j = m;
    const steps: PhonemeAlignmentStep[] = [];
    let matches = 0;
    let substitutions = 0;
    let deletions = 0;
    let insertions = 0;

    while (i > 0 || j > 0) {
      const action = trace[i * width + j];

      if (i > 0 && j > 0 && action === 0) {
        const rTok = ref[i - 1];
        const hTok = hyp[j - 1];
        const dist = PhonemeVocabulary.getPhonemeDistance(rTok, hTok.token);
        const op: AlignmentOp = dist <= this.MATCH_COST_THRESHOLD ? 'match' : 'substitution';

        steps.unshift({
          refToken: rTok,
          hypToken: hTok.token,
          op,
          cost: dist,
          refIndex: i - 1,
          hypIndex: j - 1,
          timestampMs: hTok.timestampMs,
          confidence: hTok.confidence,
        });

        if (op === 'match') {
          matches++;
        } else {
          substitutions++;
        }

        i--;
        j--;
      } else if (i > 0 && action === 1) {
        steps.unshift({
          refToken: ref[i - 1],
          hypToken: null,
          op: 'deletion',
          cost: 1.0,
          refIndex: i - 1,
          hypIndex: j > 0 ? j - 1 : 0,
        });
        deletions++;
        i--;
      } else if (j > 0) {
        const hTok = hyp[j - 1];
        steps.unshift({
          refToken: null,
          hypToken: hTok.token,
          op: 'insertion',
          cost: 1.0,
          refIndex: i > 0 ? i - 1 : 0,
          hypIndex: j - 1,
          timestampMs: hTok.timestampMs,
          confidence: hTok.confidence,
        });
        insertions++;
        j--;
      } else {
        break;
      }
    }

    const per = Math.round(((substitutions + deletions + insertions) / n) * 10000) / 10000;
    // Accuracy subtracts all error types (substitutions, deletions, and insertions)
    const accuracy = Math.round(Math.max(0, 1 - (substitutions + deletions + insertions) / n) * 10000) / 10000;
    const meanConfidence = this.calculateMeanConfidence(hyp);
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      steps,
      referenceLength: n,
      hypothesisLength: m,
      matches,
      substitutions,
      deletions,
      insertions,
      per,
      accuracy,
      meanConfidence,
      latencyMs,
    };
  }

  /**
   * Aligns a hypothesis against a reference with a LOCAL (Smith-Waterman)
   * alignment: it finds the best matching SEGMENT of the reference instead of
   * forcing the whole reference onto the speech.
   *
   * This is what makes a mid-ayah start work. A global alignment has to place
   * every reference token somewhere, so a short mid-ayah excerpt is scattered
   * across the ayah and matches words the reciter never said. A local
   * alignment simply asks "which part of this ayah does this speech match?"
   */
  public static alignLocal(
    referenceTokens: string[],
    hypothesisTokens: (string | StreamingPhonemeToken)[]
  ): LocalAlignmentResult {
    const startTime = performance.now();

    const hyp: StreamingPhonemeToken[] = hypothesisTokens.map((t, idx) => {
      if (typeof t === 'string') {
        return { token: t, index: idx, timestampMs: idx * 100 };
      }
      return {
        token: t.token,
        index: t.index ?? idx,
        confidence: t.confidence,
        timestampMs: t.timestampMs ?? idx * 100,
      };
    });

    const n = referenceTokens.length;
    const m = hyp.length;

    if (n === 0 || m === 0) {
      return {
        steps: [],
        startReferenceIndex: -1,
        endReferenceIndex: -1,
        startHypothesisIndex: -1,
        endHypothesisIndex: -1,
        matches: 0,
        substitutions: 0,
        deletions: 0,
        insertions: 0,
        score: 0,
        latencyMs: performance.now() - startTime,
      };
    }

    const width = m + 1;
    const dp = new Float32Array((n + 1) * width);
    const trace = new Uint8Array((n + 1) * width);

    // Match scoring: an exact (or near-exact) token is worth +2, a near-miss
    // (Madd / Ghunnah / Qalqalah / diacritic variance) +1, anything else -1.
    // Gaps cost 1 so a segment never grows through empty space.
    const MATCH_SCORE = 2;
    const NEAR_MISS_SCORE = 1;
    const MISMATCH_SCORE = -1;
    const GAP_COST = 1;

    let bestScore = 0;
    let bestI = 0;
    let bestJ = 0;

    for (let i = 1; i <= n; i++) {
      const rTok = referenceTokens[i - 1];
      const rowOffset = i * width;
      const prevRowOffset = (i - 1) * width;

      for (let j = 1; j <= m; j++) {
        const dist = PhonemeVocabulary.getPhonemeDistance(rTok, hyp[j - 1].token);
        const diagScore =
          dist <= this.MATCH_COST_THRESHOLD
            ? MATCH_SCORE
            : dist <= 0.5
            ? NEAR_MISS_SCORE
            : MISMATCH_SCORE;

        const diag = dp[prevRowOffset + (j - 1)] + diagScore;
        const up = dp[prevRowOffset + j] - GAP_COST;
        const left = dp[rowOffset + (j - 1)] - GAP_COST;

        // A local alignment may always restart at zero.
        let cellValue = 0;
        let cellTrace = 0;
        if (diag > cellValue) {
          cellValue = diag;
          cellTrace = 0;
        }
        if (up > cellValue) {
          cellValue = up;
          cellTrace = 1;
        }
        if (left > cellValue) {
          cellValue = left;
          cellTrace = 2;
        }

        dp[rowOffset + j] = cellValue;
        trace[rowOffset + j] = cellTrace;

        if (cellValue > bestScore) {
          bestScore = cellValue;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestScore <= 0) {
      return {
        steps: [],
        startReferenceIndex: -1,
        endReferenceIndex: -1,
        startHypothesisIndex: -1,
        endHypothesisIndex: -1,
        matches: 0,
        substitutions: 0,
        deletions: 0,
        insertions: 0,
        score: 0,
        latencyMs: performance.now() - startTime,
      };
    }

    // Backtrack the best segment.
    const steps: PhonemeAlignmentStep[] = [];
    let matches = 0;
    let substitutions = 0;
    let deletions = 0;
    let insertions = 0;
    let i = bestI;
    let j = bestJ;

    while (i > 0 && j > 0 && dp[i * width + j] > 0) {
      const action = trace[i * width + j];

      if (action === 0) {
        const rTok = referenceTokens[i - 1];
        const hTok = hyp[j - 1];
        const dist = PhonemeVocabulary.getPhonemeDistance(rTok, hTok.token);
        const op: AlignmentOp = dist <= this.MATCH_COST_THRESHOLD ? 'match' : 'substitution';

        steps.unshift({
          refToken: rTok,
          hypToken: hTok.token,
          op,
          cost: dist,
          refIndex: i - 1,
          hypIndex: j - 1,
          timestampMs: hTok.timestampMs,
          confidence: hTok.confidence,
        });

        if (op === 'match') matches++;
        else substitutions++;

        i--;
        j--;
      } else if (action === 1) {
        steps.unshift({
          refToken: referenceTokens[i - 1],
          hypToken: null,
          op: 'deletion',
          cost: 1.0,
          refIndex: i - 1,
          hypIndex: j - 1,
        });
        deletions++;
        i--;
      } else {
        steps.unshift({
          refToken: null,
          hypToken: hyp[j - 1].token,
          op: 'insertion',
          cost: 1.0,
          refIndex: i - 1,
          hypIndex: j - 1,
          timestampMs: hyp[j - 1].timestampMs,
          confidence: hyp[j - 1].confidence,
        });
        insertions++;
        j--;
      }
    }

    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];

    return {
      steps,
      startReferenceIndex: firstStep?.refIndex ?? -1,
      endReferenceIndex: lastStep?.refIndex ?? -1,
      startHypothesisIndex: firstStep?.hypIndex ?? -1,
      endHypothesisIndex: lastStep?.hypIndex ?? -1,
      matches,
      substitutions,
      deletions,
      insertions,
      score: bestScore,
      latencyMs: performance.now() - startTime,
    };
  }

  private static calculateMeanConfidence(tokens: StreamingPhonemeToken[]): number | undefined {
    let sum = 0;
    let samples = 0;
    for (const t of tokens) {
      if (t.confidence !== undefined && Number.isFinite(t.confidence)) {
        sum += t.confidence;
        samples++;
      }
    }
    if (samples === 0) return undefined;
    return Math.round((sum / samples) * 10000) / 10000;
  }
}
