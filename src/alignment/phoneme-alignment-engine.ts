/**
 * Quran Cognitive OS v2.0 — Phoneme Alignment Engine
 * Milestone 3: Dynamic Time Warping (DTW) / CTC Alignment & 6-Tier Classifier.
 *
 * Core Guarantees:
 *  - Sub-100ms Alignment Latency Guarantee.
 *  - Standardized 6-Tier Recitation Error Classification.
 *  - Exact Word-Level Bounding to Uthmani Script Tokens.
 *  - 100% Offline, Browser-Native Execution.
 */

import {
  AyahAlignmentResult,
  AlignmentOptions,
  StreamingAlignmentResult,
  StreamingPhonemeToken,
  RecitationErrorCategory,
} from './types';
import { PhonemeVocabulary } from './phoneme-vocabulary';
import { CtcDtwAligner } from './ctc-dtw-aligner';
import { ErrorClassifier } from './error-classifier';
import { WordMapper, AyahPhonemeData } from './word-mapper';

export class PhonemeAlignmentEngine {
  private phonemeDatabase: Map<string, AyahPhonemeData> = new Map();
  private isLoaded = false;

  constructor(preloadedData?: Record<string, AyahPhonemeData>) {
    if (preloadedData) {
      for (const [key, value] of Object.entries(preloadedData)) {
        this.phonemeDatabase.set(key, value);
      }
      this.isLoaded = true;
    }
  }

  /**
   * Initializes or loads the canonical phoneme dataset (`ordered_quran_phonemes.json`).
   */
  public async initialize(customPath?: string): Promise<void> {
    if (this.isLoaded && this.phonemeDatabase.size > 0) return;

    if (typeof window === 'undefined') {
      // Node.js / Test / Server environment with dynamic non-webpack require
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = typeof (globalThis as any).__non_webpack_require__ !== 'undefined'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (globalThis as any).__non_webpack_require__
        : typeof require !== 'undefined'
        ? require
        : null;

      if (req) {
        try {
          const fs = req('fs');
          const path = req('path');

          const candidatePaths = [
            customPath,
            path.join(process.cwd(), 'models', 'ordered_quran_phonemes.json'),
            path.join(process.cwd(), 'public', 'models', 'ordered_quran_phonemes.json'),
            path.join(__dirname, '..', '..', 'models', 'ordered_quran_phonemes.json'),
          ].filter(Boolean) as string[];

          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              try {
                const raw = fs.readFileSync(p, 'utf-8');
                const data = JSON.parse(raw);
                for (const [key, val] of Object.entries(data)) {
                  this.phonemeDatabase.set(key, val as AyahPhonemeData);
                }
                this.isLoaded = true;
                return;
              } catch {
                // Try next candidate path
              }
            }
          }
        } catch {
          // Fall through to browser path
        }
      }
    } else {
      // Browser environment
      try {
        const response = await fetch('/models/ordered_quran_phonemes.json');
        if (response.ok) {
          const data = await response.json();
          for (const [key, val] of Object.entries(data)) {
            this.phonemeDatabase.set(key, val as AyahPhonemeData);
          }
          this.isLoaded = true;
          return;
        }
      } catch {
        // Fallback to empty if fetch fails
      }
    }
  }

  /**
   * Registers or overrides phoneme data for an ayah (e.g. for testing or dynamic loading).
   */
  public registerAyah(verseKey: string, data: AyahPhonemeData): void {
    this.phonemeDatabase.set(verseKey, data);
    this.isLoaded = true;
  }

  /**
   * Retrieves canonical phoneme reference for an ayah.
   */
  public getAyahReference(verseKey: string): AyahPhonemeData | undefined {
    return this.phonemeDatabase.get(verseKey);
  }

  /**
   * Primary alignment method: aligns recognized hypothesis tokens with reference
   * Quranic phonemes, classifies recitation errors into 6 tiers, and maps back to Uthmani words.
   *
   * Latency requirement: sub-100ms.
   */
  public alignAyah(
    targetAyahKey: string,
    hypothesisTokens: (string | StreamingPhonemeToken)[],
    options?: Partial<AlignmentOptions>
  ): AyahAlignmentResult {
    const startTime = performance.now();
    const refData = this.phonemeDatabase.get(targetAyahKey);

    if (!refData) {
      throw new Error(
        `PhonemeAlignmentEngine: Reference data not found for target ayah key "${targetAyahKey}". Ensure database is initialized.`
      );
    }

    const referencePhonemesStr = refData.aya_phoneme || '';
    const referenceTokens = PhonemeVocabulary.tokenize(referencePhonemesStr);

    const hypTokenStrings = hypothesisTokens.map((t) =>
      typeof t === 'string' ? t : t.token
    );

    // 1. Run Dynamic Time Warping / CTC DP Alignment
    const alignResult = CtcDtwAligner.align(referenceTokens, hypothesisTokens);

    // 2. Classify errors into 6 standardized categories
    const alignmentOpts: AlignmentOptions = {
      targetAyahKey,
      recitedAyahKeyCandidate: options?.recitedAyahKeyCandidate,
      acousticConfidence: options?.acousticConfidence ?? alignResult.meanConfidence,
      uncertainThreshold: options?.uncertainThreshold ?? 0.65,
      perMatchThreshold: options?.perMatchThreshold ?? 0.08,
    };

    const classification = ErrorClassifier.classify(
      alignResult,
      hypTokenStrings,
      alignmentOpts
    );

    // 3. Map phonetic intervals and errors back to exact Uthmani word tokens
    const words = WordMapper.mapWords(
      refData.aya_text,
      referenceTokens,
      alignResult.steps,
      classification.diagnostics,
      refData.aya_phonemes_list,
      alignmentOpts.acousticConfidence
    );

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      verseKey: targetAyahKey,
      primaryCategory: classification.primaryCategory,
      allCategories: classification.allCategories,
      accuracy: alignResult.accuracy,
      per: alignResult.per,
      confidence: alignResult.meanConfidence,
      latencyMs,
      referencePhonemes: referencePhonemesStr,
      hypothesisPhonemes: hypTokenStrings.join(''),
      alignmentSteps: alignResult.steps,
      words,
      diagnostics: classification.diagnostics,
    };
  }

  /**
   * Fast incremental alignment for live streaming HUD updates.
   */
  public alignIncremental(
    targetAyahKey: string,
    streamingTokens: StreamingPhonemeToken[]
  ): StreamingAlignmentResult {
    const refData = this.phonemeDatabase.get(targetAyahKey);
    if (!refData) {
      throw new Error(`Ayah reference not found: ${targetAyahKey}`);
    }

    const refTokens = PhonemeVocabulary.tokenize(refData.aya_phoneme);
    const alignResult = CtcDtwAligner.align(refTokens, streamingTokens);

    const uthmaniWords = WordMapper.extractUthmaniWords(refData.aya_text);
    const refToWord = WordMapper.buildPhonemeToWordMapping(
      uthmaniWords,
      refTokens,
      refData.aya_phonemes_list
    );

    let activeWordIndex = 0;
    let matchedCount = 0;

    for (const step of alignResult.steps) {
      if (step.op === 'match' && step.refIndex >= 0) {
        matchedCount++;
        const w = refToWord[step.refIndex] ?? 0;
        if (w > activeWordIndex) {
          activeWordIndex = w;
        }
      }
    }

    const progressRatio =
      refTokens.length > 0
        ? Math.min(1.0, Math.round((matchedCount / refTokens.length) * 100) / 100)
        : 0;

    const words = WordMapper.mapWords(
      refData.aya_text,
      refTokens,
      alignResult.steps,
      {
        matchesCount: alignResult.matches,
        substitutionsCount: alignResult.substitutions,
        omissionsCount: alignResult.deletions,
        insertionsCount: alignResult.insertions,
        repetitions: [],
        isSequenceJump: false,
        uncertainScore: 0,
      },
      refData.aya_phonemes_list,
      alignResult.meanConfidence
    );

    const latestWord = words[activeWordIndex];

    return {
      verseKey: targetAyahKey,
      activeWordIndex,
      matchedPhonemesCount: matchedCount,
      totalReferencePhonemesCount: refTokens.length,
      progressRatio,
      words,
      latestStatus: latestWord ? latestWord.status : 'correct',
    };
  }

  /**
   * Disambiguates whether the reciter recited a different verse (for sequence error detection).
   */
  public identifyCandidateAyah(
    hypTokens: (string | StreamingPhonemeToken)[],
    candidateAyahKeys: string[]
  ): { ayahKey: string; per: number; accuracy: number } | null {
    if (candidateAyahKeys.length === 0) return null;

    let bestKey: string | null = null;
    let bestPer = 100.0;
    let bestAccuracy = 0.0;

    for (const key of candidateAyahKeys) {
      const ref = this.phonemeDatabase.get(key);
      if (!ref) continue;

      const refTokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = CtcDtwAligner.align(refTokens, hypTokens);

      if (res.per < bestPer) {
        bestPer = res.per;
        bestAccuracy = res.accuracy;
        bestKey = key;
      }
    }

    if (!bestKey) return null;
    return {
      ayahKey: bestKey,
      per: bestPer,
      accuracy: bestAccuracy,
    };
  }
}
