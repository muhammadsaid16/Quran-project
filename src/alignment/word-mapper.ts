/**
 * Quran Cognitive OS v2.0 — Word-Level Bounding & Phonetic Interval Mapper
 * Maps phonetic alignment steps and error intervals back to exact Uthmani word tokens.
 */

import {
  PhonemeAlignmentStep,
  WordAlignmentResult,
  WordRecitationStatus,
  AlignmentDiagnostics,
} from './types';
import { PhonemeVocabulary } from './phoneme-vocabulary';

export interface AyahPhonemeData {
  aya_text: string;
  aya_phoneme: string;
  aya_phonemes_list?: string[];
}

/**
 * One block of the offline word/group partition (scripts/build_word_token_bounds.py):
 * words[ws..we) are covered by phoneme groups[gs..ge). Ends are exclusive.
 * Fused blocks (we-ws > 1) mark tajweed assimilation; split blocks (ge-gs > 1)
 * mark disconnected letters (الٓمٓ etc.).
 */
export type WordTokenBlock = [ws: number, we: number, gs: number, ge: number];

export class WordMapper {
  /**
   * Cleans an Uthmani ayah text string into discrete words, preserving full
   * diacritics while removing standalone stop/pause signs.
   */
  public static extractUthmaniWords(ayaText: string): string[] {
    const rawTokens = ayaText.trim().split(/\s+/);
    // Filter out standalone Waqf/stop signs
    const stopSigns = new Set(['ۛ', 'ۚ', 'ۖ', 'ۗ', 'ۘ', 'ۙ', 'ۜ']);
    return rawTokens.filter((tok) => tok.length > 0 && !stopSigns.has(tok));
  }

  /**
   * Builds an index mapping each reference phoneme token to its corresponding
   * Uthmani word index in the ayah.
   *
   * Preferred path: the offline word/group partition (`blocks`), which resolves
   * tajweed fusions and disconnected-letter splits exactly at block boundaries.
   * Inside a fused block, tokens are distributed over the block's words weighted
   * by base-letter count (never across block boundaries, so no drift).
   * Without blocks, falls back to group-count matching, then proportional guessing.
   */
  public static buildPhonemeToWordMapping(
    uthmaniWords: string[],
    referenceTokens: string[],
    phonemesList?: string[],
    blocks?: WordTokenBlock[]
  ): number[] {
    const mapping: number[] = new Array(referenceTokens.length).fill(0);
    const numWords = uthmaniWords.length;
    if (numWords === 0) return mapping;

    if (blocks && blocks.length > 0 && phonemesList) {
      let currentTokenIdx = 0;
      for (const [ws, we, gs, ge] of blocks) {
        const blockTokens: string[] = [];
        for (let g = gs; g < ge; g++) {
          blockTokens.push(...PhonemeVocabulary.tokenize(phonemesList[g] ?? ''));
        }
        const wordCount = we - ws;
        if (wordCount <= 1) {
          for (let k = 0; k < blockTokens.length && currentTokenIdx < referenceTokens.length; k++) {
            mapping[currentTokenIdx++] = ws;
          }
          continue;
        }
        const weights: number[] = [];
        let totalWeight = 0;
        for (let w = ws; w < we; w++) {
          const weight = this.countBaseLetters(uthmaniWords[w]);
          weights.push(weight);
          totalWeight += weight;
        }
        let cumulative = 0;
        let wordOffset = 0;
        for (let k = 0; k < blockTokens.length && currentTokenIdx < referenceTokens.length; k++) {
          const target = ((k + 0.5) * totalWeight) / blockTokens.length;
          while (wordOffset < wordCount - 1 && cumulative + weights[wordOffset] <= target) {
            cumulative += weights[wordOffset];
            wordOffset++;
          }
          mapping[currentTokenIdx++] = ws + wordOffset;
        }
      }
      while (currentTokenIdx < referenceTokens.length) {
        mapping[currentTokenIdx++] = numWords - 1;
      }
      return mapping;
    }

    // Fallback 1: Word count matches aya_phonemes_list count 1-to-1
    if (phonemesList && phonemesList.length === numWords) {
      let currentTokenIdx = 0;
      for (let w = 0; w < numWords; w++) {
        const wordPhonemeTokens = PhonemeVocabulary.tokenize(phonemesList[w]);
        for (let k = 0; k < wordPhonemeTokens.length; k++) {
          if (currentTokenIdx < referenceTokens.length) {
            mapping[currentTokenIdx] = w;
            currentTokenIdx++;
          }
        }
      }
      // Fill any remaining tokens with the last word
      while (currentTokenIdx < referenceTokens.length) {
        mapping[currentTokenIdx] = numWords - 1;
        currentTokenIdx++;
      }
      return mapping;
    }

    // Fallback 2 (last resort, unknown ayahs): proportional guessing
    const tokensPerWord = referenceTokens.length / numWords;
    for (let i = 0; i < referenceTokens.length; i++) {
      const estimatedWord = Math.min(numWords - 1, Math.floor(i / tokensPerWord));
      mapping[i] = estimatedWord;
    }

    return mapping;
  }

  /** Counts letters after stripping harakat and orthographic markers (fusion weighting). */
  private static countBaseLetters(word: string): number {
    const stripped = word.replace(
      /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g,
      ''
    );
    return Math.max(1, stripped.length);
  }

  /**
   * Maps alignment steps and intervals to individual Uthmani words.
   */
  public static mapWords(
    ayaText: string,
    referenceTokens: string[],
    alignmentSteps: PhonemeAlignmentStep[],
    diagnostics: AlignmentDiagnostics,
    phonemesList?: string[],
    blocks?: WordTokenBlock[],
    acousticConfidence?: number
  ): WordAlignmentResult[] {
    const uthmaniWords = this.extractUthmaniWords(ayaText);
    const refTokenToWord = this.buildPhonemeToWordMapping(
      uthmaniWords,
      referenceTokens,
      phonemesList,
      blocks
    );

    // Annotate alignment steps with wordIndex
    for (let s = 0; s < alignmentSteps.length; s++) {
      const step = alignmentSteps[s];
      if (step.refIndex >= 0 && step.refIndex < refTokenToWord.length) {
        step.wordIndex = refTokenToWord[step.refIndex];
      } else {
        // For insertions, find closest surrounding ref step
        let closestWord = 0;
        for (let back = s - 1; back >= 0; back--) {
          if (alignmentSteps[back].wordIndex !== undefined) {
            closestWord = alignmentSteps[back].wordIndex!;
            break;
          }
        }
        step.wordIndex = closestWord;
      }
    }

    // Group steps by wordIndex
    const wordStepsMap: Map<number, PhonemeAlignmentStep[]> = new Map();
    for (let w = 0; w < uthmaniWords.length; w++) {
      wordStepsMap.set(w, []);
    }
    for (const step of alignmentSteps) {
      const wIdx = Math.min(uthmaniWords.length - 1, Math.max(0, step.wordIndex ?? 0));
      wordStepsMap.get(wIdx)?.push(step);
    }

    // Produce WordAlignmentResult for each word
    const results: WordAlignmentResult[] = [];

    for (let w = 0; w < uthmaniWords.length; w++) {
      const wordText = uthmaniWords[w];
      const steps = wordStepsMap.get(w) || [];

      const expectedTokens: string[] = [];
      const detectedTokens: string[] = [];
      let deletionsCount = 0;
      let substitutionsCount = 0;
      let matchesCount = 0;
      let insertionsCount = 0;
      let confidenceSum = 0;
      let confidenceSamples = 0;
      let startMs: number | undefined;
      let endMs: number | undefined;

      for (const step of steps) {
        if (step.refToken) {
          expectedTokens.push(step.refToken);
        }
        if (step.hypToken) {
          detectedTokens.push(step.hypToken);
          if (step.confidence !== undefined) {
            confidenceSum += step.confidence;
            confidenceSamples++;
          }
          if (step.timestampMs !== undefined) {
            if (startMs === undefined || step.timestampMs < startMs) {
              startMs = step.timestampMs;
            }
            if (endMs === undefined || step.timestampMs > endMs) {
              endMs = step.timestampMs;
            }
          }
        }

        if (step.op === 'match') matchesCount++;
        if (step.op === 'substitution') substitutionsCount++;
        if (step.op === 'deletion') deletionsCount++;
        if (step.op === 'insertion') insertionsCount++;
      }

      const meanConfidence =
        confidenceSamples > 0
          ? confidenceSum / confidenceSamples
          : acousticConfidence;
      let status: WordRecitationStatus = 'correct';
      let errorDetails: string | undefined;

      const totalExpected = expectedTokens.length;

      // Check if word was repeated in diagnostics
      const isWordRepeated = diagnostics.repetitions.some((rep) => {
        const cleanRep = rep.replace(/\s+/g, '');
        const cleanDet = detectedTokens.join('');
        return cleanDet.length > 0 && (cleanRep.includes(cleanDet) || cleanDet.includes(cleanRep));
      });

      if (totalExpected > 0 && deletionsCount === totalExpected && matchesCount === 0 && substitutionsCount === 0) {
        status = 'omission';
        errorDetails = `تم ترك الكلمة (حذف): "${wordText}"`;
      } else if (substitutionsCount > 0 && (substitutionsCount >= totalExpected * 0.4 || matchesCount === 0)) {
        status = 'substitution';
        errorDetails = `خطأ في نطق الكلمة: المتوقع "${expectedTokens.join('')}" ورُصد "${detectedTokens.join('')}"`;
      } else if (isWordRepeated || insertionsCount > totalExpected) {
        status = 'repetition';
        errorDetails = `تكرار أو تعثر عند كلمة: "${wordText}"`;
      } else if (meanConfidence !== undefined && meanConfidence < 0.65) {
        status = 'uncertain';
        errorDetails = `ثقة التقاط صوتي منخفضة عند كلمة: "${wordText}"`;
      } else if (deletionsCount > 0) {
        status = 'omission';
        errorDetails = `نقص في نطق بعض فونيمات كلمة: "${wordText}"`;
      } else if (substitutionsCount > 0) {
        status = 'substitution';
        errorDetails = `تبديل في بعض حركات أو مخارج كلمة: "${wordText}"`;
      } else {
        status = 'correct';
      }

      results.push({
        wordIndex: w,
        uthmaniText: wordText,
        expectedPhonemes: expectedTokens.join(''),
        detectedPhonemes: detectedTokens.join(''),
        status,
        confidence:
          meanConfidence !== undefined ? Math.round(meanConfidence * 100) : undefined,
        startTimeMs: startMs,
        endTimeMs: endMs,
        errorDetails,
      });
    }

    return results;
  }
}
