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
  AyahLocation,
  StreamingAlignmentResult,
  StreamingPhonemeToken,
  RecitationErrorCategory,
} from './types';
import { PhonemeVocabulary } from './phoneme-vocabulary';
import { CtcDtwAligner } from './ctc-dtw-aligner';
import { ErrorClassifier } from './error-classifier';
import { WordMapper, AyahPhonemeData, WordTokenBlock } from './word-mapper';

export class PhonemeAlignmentEngine {
  private phonemeDatabase: Map<string, AyahPhonemeData> = new Map();
  private wordTokenBounds: Map<string, WordTokenBlock[]> = new Map();
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
                this.loadBoundsNode(fs, path.join(path.dirname(p), 'word_token_bounds.json'));
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
          try {
            const boundsResponse = await fetch('/models/word_token_bounds.json');
            if (boundsResponse.ok) {
              const boundsData = await boundsResponse.json();
              for (const [key, val] of Object.entries(boundsData)) {
                this.wordTokenBounds.set(key, val as WordTokenBlock[]);
              }
            }
          } catch {
            // Bounds are optional; fall back to count-based mapping
          }
          this.isLoaded = true;
          return;
        }
      } catch {
        // Fallback to empty if fetch fails
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private loadBoundsNode(fs: any, boundsPath: string): void {
    try {
      if (fs.existsSync(boundsPath)) {
        const boundsData = JSON.parse(fs.readFileSync(boundsPath, 'utf-8'));
        for (const [key, val] of Object.entries(boundsData)) {
          this.wordTokenBounds.set(key, val as WordTokenBlock[]);
        }
      }
    } catch {
      // Bounds are optional; fall back to count-based mapping
    }
  }

  /**
   * Registers or overrides phoneme data for an ayah (e.g. for testing or dynamic loading).
   */
  public registerAyah(verseKey: string, data: AyahPhonemeData): void {
    this.phonemeDatabase.set(verseKey, data);
    this.wordTokenBounds.delete(verseKey);
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
      this.wordTokenBounds.get(targetAyahKey),
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
      refData.aya_phonemes_list,
      this.wordTokenBounds.get(targetAyahKey)
    );

    // Count reference phoneme tokens per word
    const wordRefCounts: number[] = new Array(uthmaniWords.length).fill(0);
    for (let t = 0; t < refTokens.length; t++) {
      const w = refToWord[t] ?? 0;
      if (w >= 0 && w < uthmaniWords.length) {
        wordRefCounts[w]++;
      }
    }

    // Count matched phonemes per word
    const wordMatchCounts: number[] = new Array(uthmaniWords.length).fill(0);
    for (const step of alignResult.steps) {
      if (step.op === 'match' && step.refIndex >= 0 && step.refIndex < refTokens.length) {
        const w = refToWord[step.refIndex] ?? 0;
        if (w >= 0 && w < uthmaniWords.length) {
          wordMatchCounts[w]++;
        }
      }
    }

    // STRICT SEQUENTIAL PROGRESSION (لا تقدم إلا كلمة كلمة بالترتيب من الأول):
    // Word w is only verified if all preceding words 0..w-1 have been verified,
    // and word w itself has sufficient matched phonemes.
    let activeWordIndex = -1;
    let sequentialMatchedCount = 0;

    for (let w = 0; w < uthmaniWords.length; w++) {
      const totalRef = wordRefCounts[w] || 1;
      const matches = wordMatchCounts[w] || 0;
      // Minimum phonemes needed to confirm word is recited:
      // Very short words (<= 2 phonemes): at least 1 match.
      // Longer words: at least 2 matches or 35% of the word's phonemes.
      const minRequired = totalRef <= 2 ? 1 : Math.max(2, Math.floor(totalRef * 0.35));

      if (matches >= minRequired) {
        activeWordIndex = w;
        sequentialMatchedCount += matches;
      } else {
        // If word w is not yet recited/matched, STOP!
        // No future word (w+1, w+2, ...) can ever be considered active.
        break;
      }
    }

    const progressRatio =
      refTokens.length > 0
        ? Math.min(1.0, Math.round((sequentialMatchedCount / refTokens.length) * 100) / 100)
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
      this.wordTokenBounds.get(targetAyahKey),
      alignResult.meanConfidence
    );

    const latestWord = activeWordIndex >= 0 ? words[activeWordIndex] : words[0];

    return {
      verseKey: targetAyahKey,
      activeWordIndex,
      matchedPhonemesCount: sequentialMatchedCount,
      totalReferencePhonemesCount: refTokens.length,
      progressRatio,
      words,
      latestStatus: latestWord ? latestWord.status : 'correct',
    };
  }

  /**
   * Returns the reference words of an ayah in the same order the alignment
   * engine enumerates them (waqf marks excluded).
   *
   * Callers that need to map a reference word onto the word the Mushaf
   * renders must use this list, because the Mushaf dataset numbers its words
   * differently (it counts the prepended Basmalah and standalone waqf marks).
   */
  public getReferenceWords(verseKey: string): string[] {
    const refData = this.phonemeDatabase.get(verseKey);
    if (!refData) return [];
    return WordMapper.extractUthmaniWords(refData.aya_text);
  }

  /**
   * Finds where inside an ayah a hypothesis best matches, WITHOUT requiring the
   * hypothesis to start at the ayah's first word.
   *
   * A reciter often resumes mid-ayah (for example starting at
   * "غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ" inside 1:7). The strictly sequential
   * `alignIncremental` reports zero matches in that case, which makes the
   * start-verse detection pick the wrong ayah entirely.
   *
   * This method aligns the hypothesis against the whole ayah and reports the
   * words that were actually matched, so the caller can locate the reciter
   * inside the ayah.
   */
  public locateInAyah(
    verseKey: string,
    hypothesisTokens: StreamingPhonemeToken[]
  ): AyahLocation | null {
    const refData = this.phonemeDatabase.get(verseKey);
    if (!refData) return null;

    const refTokens = PhonemeVocabulary.tokenize(refData.aya_phoneme);

    // A LOCAL alignment finds the segment of the ayah that the speech matches.
    // This is what makes a mid-ayah start detectable: a global alignment would
    // scatter the excerpt across the whole ayah.
    const local = CtcDtwAligner.alignLocal(refTokens, hypothesisTokens);
    if (local.steps.length === 0) {
      return {
        verseKey,
        matchedPhonemes: 0,
        alignedPhonemes: 0,
        matchedWordIndices: [],
        alignedWordIndices: [],
        firstMatchedWord: -1,
        firstMatchedHypIndex: -1,
        startHypothesisIndex: -1,
        lastMatchedHypIndex: -1,
        startReferenceWord: -1,
        endReferenceWord: -1,
        coveredHypothesisTokens: 0,
        matchedWords: 0,
      };
    }

    const uthmaniWords = WordMapper.extractUthmaniWords(refData.aya_text);
    const refToWord = WordMapper.buildPhonemeToWordMapping(
      uthmaniWords,
      refTokens,
      refData.aya_phonemes_list,
      this.wordTokenBounds.get(verseKey)
    );

    // Count matched phonemes per reference word (no sequential gating).
    const wordMatchCounts: number[] = new Array(uthmaniWords.length).fill(0);
    const wordAlignedCounts: number[] = new Array(uthmaniWords.length).fill(0);
    let matchedPhonemes = 0;
    let alignedPhonemes = 0;
    for (const step of local.steps) {
      if (step.refIndex < 0 || step.refIndex >= refTokens.length) continue;
      const w = refToWord[step.refIndex] ?? 0;
      const inRange = w >= 0 && w < uthmaniWords.length;

      if (step.op === 'match') {
        matchedPhonemes++;
        if (inRange) wordMatchCounts[w]++;
      }
      // A near-miss (Madd/Ghunnah/Qalqalah/diacritic variance) still proves
      // that the reciter pronounced this position, so it counts as aligned.
      if (step.op === 'match' || step.op === 'substitution') {
        alignedPhonemes++;
        if (inRange) wordAlignedCounts[w]++;
      }
    }

    const matchedWordIndices: number[] = [];
    const alignedWordIndices: number[] = [];
    for (let w = 0; w < wordMatchCounts.length; w++) {
      if (wordMatchCounts[w] > 0) matchedWordIndices.push(w);
      if (wordAlignedCounts[w] > 0) alignedWordIndices.push(w);
    }

    // The reciter's entry point is the first matched word.
    const firstMatchedWord =
      matchedWordIndices.length > 0
        ? matchedWordIndices[0]
        : alignedWordIndices.length > 0
        ? alignedWordIndices[0]
        : -1;

    // Index of the first hypothesis token that matched, so the caller can tell
    // which part of the recorded speech belongs to this ayah.
    let firstMatchedHypIndex = -1;
    let lastMatchedHypIndex = -1;
    let startHypothesisIndex = -1;
    for (const step of local.steps) {
      if (step.hypIndex < 0) continue;
      if (startHypothesisIndex < 0) startHypothesisIndex = step.hypIndex;
      if (firstMatchedHypIndex < 0) firstMatchedHypIndex = step.hypIndex;
      lastMatchedHypIndex = step.hypIndex;
    }

    // The reference position the alignment STARTED on and ENDED on. These tell
    // the caller whether the reciter entered the ayah in the middle and how
    // far into the ayah they have reached.
    let startReferenceWord = -1;
    let endReferenceWord = -1;
    for (const step of local.steps) {
      if (step.refIndex < 0 || step.refIndex >= refTokens.length) continue;
      const w = refToWord[step.refIndex] ?? 0;
      if (w < 0 || w >= uthmaniWords.length) continue;
      if (startReferenceWord < 0) startReferenceWord = w;
      endReferenceWord = w;
    }

    // How many hypothesis tokens the matched segment actually explains. This
    // is the fairest way to compare two candidate ayahs: it does not grow just
    // because one ayah is longer.
    let coveredHypothesisTokens = 0;
    for (const step of local.steps) {
      if (step.hypIndex < 0) continue;
      if (step.op === 'match' || step.op === 'substitution') coveredHypothesisTokens++;
    }

    return {
      verseKey,
      matchedPhonemes,
      alignedPhonemes,
      matchedWordIndices,
      alignedWordIndices,
      firstMatchedWord,
      firstMatchedHypIndex,
      startHypothesisIndex,
      lastMatchedHypIndex,
      startReferenceWord,
      endReferenceWord,
      coveredHypothesisTokens,
      matchedWords: matchedWordIndices.length,
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
