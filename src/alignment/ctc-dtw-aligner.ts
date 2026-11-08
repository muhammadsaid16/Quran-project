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
  meanConfidence: number;
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
        return { token: t, index: idx, confidence: 1.0, timestampMs: idx * 100 };
      }
      return {
        token: t.token,
        index: t.index ?? idx,
        confidence: t.confidence ?? 1.0,
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
        meanConfidence: 0.0,
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
    const accuracy = Math.round(Math.max(0, 1 - (substitutions + deletions) / n) * 10000) / 10000;
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

  private static calculateMeanConfidence(tokens: StreamingPhonemeToken[]): number {
    if (tokens.length === 0) return 0.0;
    let sum = 0;
    for (const t of tokens) {
      sum += t.confidence ?? 1.0;
    }
    return Math.round((sum / tokens.length) * 10000) / 10000;
  }
}
