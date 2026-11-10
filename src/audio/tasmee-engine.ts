/**
 * Quran Cognitive OS v2.0 — Production Tasmee' (Recitation Testing) Engine
 * Powered by FastConformer-Quran (87MB Mixed Quantized ONNX).
 *
 * Core Guarantees:
 *  - High-precision offline verse & word recognition (5.4% SOTA WER on phone audio).
 *  - Full Tashkeel (harakat & diacritics) verification for Lahn Jali detection.
 *  - 100% Offline, on-device execution via sherpa-onnx.
 *  - Sub-second phrase-level latency with detailed word-by-word comparison.
 */

export interface TasmeeWordComparison {
  expectedWord: string;
  transcribedWord: string | null;
  status: 'matched' | 'mismatched' | 'omitted' | 'inserted';
  harakatMatch: boolean;
}

export interface TasmeeVerificationResult {
  rawText: string;
  wordComparisons: TasmeeWordComparison[];
  totalExpectedWords: number;
  matchedWordsCount: number;
  accuracy: number;
  isFullyCorrect: boolean;
  latencyMs: number;
  durationSec: number;
}

export interface TasmeeEngineConfig {
  sampleRate?: number;
  modelPath?: string;
  tokensPath?: string;
  numThreads?: number;
}

export class TasmeeEngine {
  private config: Required<TasmeeEngineConfig>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nativeSherpa: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognizer: any = null;
  private isInitialized = false;

  constructor(config: TasmeeEngineConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 16000,
      modelPath: config.modelPath ?? 'models/fastconformer/qurankarim-fastconformer-mixed.onnx',
      tokensPath: config.tokensPath ?? 'models/fastconformer/tokens.txt',
      numThreads: config.numThreads ?? 1,
    };
  }

  /**
   * Initializes the offline FastConformer recognizer.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === 'undefined') {
      // Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = typeof (globalThis as any).__non_webpack_require__ !== 'undefined'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (globalThis as any).__non_webpack_require__
        : typeof require !== 'undefined'
        ? require
        : null;

      if (!req) {
        throw new Error('CommonJS require is not available');
      }

      const path = req('path');
      this.nativeSherpa = req('sherpa-onnx');

      const modelAbsPath = path.isAbsolute(this.config.modelPath)
        ? this.config.modelPath
        : path.resolve(process.cwd(), this.config.modelPath);
      const tokensAbsPath = path.isAbsolute(this.config.tokensPath)
        ? this.config.tokensPath
        : path.resolve(process.cwd(), this.config.tokensPath);

      this.recognizer = this.nativeSherpa.createOfflineRecognizer({
        featConfig: {
          sampleRate: this.config.sampleRate,
          featureDim: 80,
        },
        modelConfig: {
          nemoCtc: {
            model: modelAbsPath,
          },
          tokens: tokensAbsPath,
          numThreads: this.config.numThreads,
          provider: 'cpu',
          debug: 0,
        },
      });
      this.isInitialized = true;
    } else {
      // Browser environment (WASM dynamic loader)
      const dynamicImport = new Function('url', 'return import(url)');
      const { initASRModule, createOfflineRecognizer } = await dynamicImport('/sherpa-wasm/index.js');
      await initASRModule();

      const modelUrl = this.config.modelPath.startsWith('/')
        ? this.config.modelPath
        : `/${this.config.modelPath}`;
      const tokensUrl = this.config.tokensPath.startsWith('/')
        ? this.config.tokensPath
        : `/${this.config.tokensPath}`;

      this.recognizer = createOfflineRecognizer({
        featConfig: {
          sampleRate: this.config.sampleRate,
          featureDim: 80,
        },
        modelConfig: {
          nemoCtc: {
            model: modelUrl,
          },
          tokens: tokensUrl,
          numThreads: 1,
          provider: 'cpu',
        },
      });
      this.isInitialized = true;
    }
  }

  /**
   * Transcribes a raw 16kHz mono audio buffer into full Arabic text with diacritics.
   */
  public transcribe(audioSamples: Float32Array): string {
    if (!this.recognizer) {
      throw new Error('TasmeeEngine is not initialized. Call initialize() first.');
    }

    const stream = this.recognizer.createStream();
    stream.acceptWaveform(this.config.sampleRate, audioSamples);
    this.recognizer.decode(stream);
    const result = this.recognizer.getResult(stream);
    const text = (result && result.text) ? result.text.trim() : '';

    if (typeof stream.free === 'function') {
      stream.free();
    }
    return text;
  }

  /**
   * Verifies an utterance against a target reference ayah text.
   * Performs word-level alignment, harakat check, and omission/substitution detection.
   */
  public verifyAyah(
    audioSamples: Float32Array,
    referenceAyahText: string
  ): TasmeeVerificationResult {
    const t0 = Date.now();
    const durationSec = audioSamples.length / this.config.sampleRate;
    const rawText = this.transcribe(audioSamples);
    const latencyMs = Date.now() - t0;

    const expectedWords = this.cleanWords(referenceAyahText);
    const transcribedWords = this.cleanWords(rawText);

    const wordComparisons = this.alignWords(expectedWords, transcribedWords);
    const matchedCount = wordComparisons.filter((w) => w.status === 'matched').length;
    const totalExpected = expectedWords.length;
    const accuracy = totalExpected > 0 ? Number((matchedCount / totalExpected).toFixed(4)) : 0;
    const isFullyCorrect = matchedCount === totalExpected && wordComparisons.every((w) => w.harakatMatch);

    return {
      rawText,
      wordComparisons,
      totalExpectedWords: totalExpected,
      matchedWordsCount: matchedCount,
      accuracy,
      isFullyCorrect,
      latencyMs,
      durationSec: Number(durationSec.toFixed(2)),
    };
  }

  /**
   * Cleans text into distinct words, removing standalone Quranic waqf marks.
   */
  public cleanWords(text: string): string[] {
    const waqfSigns = new Set(['ۛ', 'ۚ', 'ۖ', 'ۗ', 'ۘ', 'ۙ', 'ۜ', '۞', '۩']);
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0 && !waqfSigns.has(w));
  }

  /**
   * Normalizes Arabic words for base-letter matching (stripping tashkeel and unifying letter variants).
   */
  public normalizeWord(word: string): string {
    return word
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // remove harakat, dagger alef, tatweel
      .replace(/[إأآٱء]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();
  }

  /**
   * Aligns expected words against transcribed words using Levenshtein distance on normalized tokens.
   */
  private alignWords(
    expectedWords: string[],
    transcribedWords: string[]
  ): TasmeeWordComparison[] {
    const n = expectedWords.length;
    const m = transcribedWords.length;

    // dp[i][j] = cost of matching expectedWords[0..i-1] with transcribedWords[0..j-1]
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const normExp = this.normalizeWord(expectedWords[i - 1]);
        const normTrans = this.normalizeWord(transcribedWords[j - 1]);
        const matchCost = normExp === normTrans ? 0 : 1;

        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + matchCost, // substitution / match
          dp[i - 1][j] + 1,             // omission
          dp[i][j - 1] + 1              // insertion
        );
      }
    }

    // Backtrack to build the alignment
    const comparisons: TasmeeWordComparison[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const normExp = this.normalizeWord(expectedWords[i - 1]);
        const normTrans = this.normalizeWord(transcribedWords[j - 1]);
        const matchCost = normExp === normTrans ? 0 : 1;

        if (dp[i][j] === dp[i - 1][j - 1] + matchCost) {
          const matched = matchCost === 0;
          comparisons.push({
            expectedWord: expectedWords[i - 1],
            transcribedWord: transcribedWords[j - 1],
            status: matched ? 'matched' : 'mismatched',
            harakatMatch: matched && expectedWords[i - 1] === transcribedWords[j - 1],
          });
          i--;
          j--;
          continue;
        }
      }

      if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
        // Expected word omitted by reciter
        comparisons.push({
          expectedWord: expectedWords[i - 1],
          transcribedWord: null,
          status: 'omitted',
          harakatMatch: false,
        });
        i--;
      } else if (j > 0) {
        // Extra word inserted by reciter
        comparisons.push({
          expectedWord: '',
          transcribedWord: transcribedWords[j - 1],
          status: 'inserted',
          harakatMatch: false,
        });
        j--;
      }
    }

    return comparisons.reverse();
  }

  public destroy(): void {
    if (this.recognizer && typeof this.recognizer.free === 'function') {
      this.recognizer.free();
    }
    this.recognizer = null;
    this.isInitialized = false;
  }
}
