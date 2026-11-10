import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Dynamic require for sherpa-onnx in Node/Vitest test harness
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sherpa = require('sherpa-onnx');

import {
  PhonemeAlignmentEngine,
  PhonemeVocabulary,
  StreamingPhonemeToken,
  WordAlignmentResult,
  WordRecitationStatus,
  phonemesToText,
  formatDetectedWord,
} from '../alignment';
import { computeReviewStats, deriveSuggestedRating } from '../components/hud/review-stats';
import { useRecitationStore } from '../stores/recitation-store';

const projectRoot = process.cwd();

function makeWord(
  wordIndex: number,
  status: WordRecitationStatus,
  confidence?: number
): WordAlignmentResult {
  return {
    wordIndex,
    uthmaniText: `كَلِمَة${wordIndex}`,
    expectedPhonemes: 'كَلِمَة',
    detectedPhonemes: status === 'omission' ? '' : 'كَلِمَة',
    status,
    confidence,
  };
}

// Honest decode: confidence is attached only when the decoder actually exposes
// a probability. This CTC build returns empty ys_probs, so tokens carry none.
function decodeFixture(wavPath: string): StreamingPhonemeToken[] {
  const wave = sherpa.readWave(wavPath);
  const recognizer = sherpa.createOnlineRecognizer({
    modelConfig: {
      zipformer2Ctc: {
        model: path.join(projectRoot, 'models', 'zipformer_p_arabic_v3.2.int8.onnx'),
      },
      tokens: path.join(projectRoot, 'models', 'tokens.txt'),
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
    },
    featConfig: { sampleRate: 16000, featureDim: 80 },
    decodingMethod: 'greedy_search',
    maxActivePaths: 4,
  });
  const stream = recognizer.createStream();
  stream.acceptWaveform(16000, wave.samples);
  while (recognizer.isReady(stream)) {
    recognizer.decode(stream);
  }
  const res = recognizer.getResult(stream);
  return res.tokens.map((t: string, i: number) => {
    const raw = res.ys_probs && res.ys_probs[i];
    return {
      token: t,
      index: i,
      confidence: typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined,
      timestampMs: Math.round(((res.timestamps && res.timestamps[i]) ?? 0) * 1000),
    };
  });
}

describe('Visual Review Panel — honest stats, rating derivation & word boundaries', () => {
  let engine: PhonemeAlignmentEngine;

  beforeAll(async () => {
    engine = new PhonemeAlignmentEngine();
    await engine.initialize();
  });

  beforeEach(() => {
    useRecitationStore.getState().resetRecitation();
  });

  it('Scenario 1a: perfect synthetic recitation → 100% recall, Easy (4), no fabricated confidence', () => {
    const ref = engine.getAyahReference('1:1')!;
    const res = engine.alignAyah('1:1', PhonemeVocabulary.tokenize(ref.aya_phoneme));

    expect(res.primaryCategory).toBe('Correct');
    expect(res.confidence).toBeUndefined();
    expect(res.words.every((w) => w.confidence === undefined)).toBe(true);

    const stats = computeReviewStats(res.words);
    expect(stats.correct).toBe(4);
    expect(stats.errorCount).toBe(0);
    expect(stats.recallAccuracy).toBe(100);

    const { rating, label } = deriveSuggestedRating(stats);
    expect(rating).toBe(4);
    expect(label).toContain('سهل');
  });

  it('Scenario 1b: real 112:1 fixture → perfect recall, Easy (4), undefined confidence (empty ys_probs)', () => {
    const wavPath = path.join(projectRoot, 'fixtures', '112001_16k.wav');
    expect(fs.existsSync(wavPath)).toBe(true);

    const tokens = decodeFixture(wavPath);
    expect(tokens.length).toBeGreaterThan(5);
    expect(tokens.every((t) => t.confidence === undefined)).toBe(true);

    const res = engine.alignAyah('112:1', tokens);
    expect(res.accuracy).toBe(1.0);
    expect(res.confidence).toBeUndefined();
    expect(res.words).toHaveLength(4);
    expect(res.words.every((w) => w.status === 'correct')).toBe(true);
    expect(res.words.every((w) => w.confidence === undefined)).toBe(true);
    expect(res.words[3].detectedPhonemes).toContain('دڇ');

    const stats = computeReviewStats(res.words);
    expect(stats.recallAccuracy).toBe(100);
    // Exact boundaries must not manufacture harakah substitutions on clean audio
    expect(stats.substitutions).toBe(0);
    expect(deriveSuggestedRating(stats).rating).toBe(4);
  });

  it('Scenario 1c: real 1:1 fixture → no substitution false-positives; final partial omission is genuine', () => {
    const wavPath = path.join(projectRoot, 'fixtures', '001001_16k.wav');
    expect(fs.existsSync(wavPath)).toBe(true);

    const res = engine.alignAyah('1:1', decodeFixture(wavPath));
    expect(res.accuracy).toBeGreaterThan(0.7);
    // The reciter stops before the final madd+meem of ٱلرَّحِيمِ — a real partial
    // omission. No word may be falsely flagged as substituted.
    expect(res.words.filter((w) => w.status === 'substitution')).toHaveLength(0);
    expect(res.words[0].status).toBe('correct');
    expect(res.words[1].status).toBe('correct');
    expect(res.words[2].status).toBe('correct');
    expect(res.words[3].status).toBe('omission');

    const stats = computeReviewStats(res.words);
    expect(stats.omissions).toBe(1);
    expect(stats.errorCount).toBe(1);
    expect(stats.recallAccuracy).toBe(75);
    expect(deriveSuggestedRating(stats).rating).toBe(2);
  });

  it('Scenario 2: single consonant substitution → Hard (2), 75% recall', () => {
    // "بِسْمِ" pronounced "بِصمِ" — س replaced with ص
    const res = engine.alignAyah(
      '1:1',
      PhonemeVocabulary.tokenize('بِصمِ للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم')
    );
    expect(res.words[0].status).toBe('substitution');

    const stats = computeReviewStats(res.words);
    expect(stats.substitutions).toBe(1);
    expect(stats.errorCount).toBe(1);
    expect(stats.recallAccuracy).toBe(75);

    const { rating, label } = deriveSuggestedRating(stats);
    expect(rating).toBe(2);
    expect(label).toContain('صعب');
  });

  it('Scenario 3: single word omission → Hard (2), 75% recall', () => {
    // Skips ٱلرَّحْمَـٰنِ entirely
    const res = engine.alignAyah(
      '1:1',
      PhonemeVocabulary.tokenize('بِسمِ للَااهِ ررَحِۦۦۦۦم')
    );
    expect(res.words[2].status).toBe('omission');

    const stats = computeReviewStats(res.words);
    expect(stats.omissions).toBe(1);
    expect(stats.errorCount).toBe(1);
    expect(stats.recallAccuracy).toBe(75);
    expect(deriveSuggestedRating(stats).rating).toBe(2);
  });

  it('Scenario 4: single stray phoneme insertion → no fabricated word errors, Easy (4)', () => {
    const ref = engine.getAyahReference('1:1')!;
    const res = engine.alignAyah(
      '1:1',
      PhonemeVocabulary.tokenize('وَ ' + ref.aya_phoneme)
    );
    expect(res.diagnostics.insertionsCount).toBe(1);
    expect(res.words.every((w) => w.status === 'correct')).toBe(true);

    const stats = computeReviewStats(res.words);
    expect(stats.errorCount).toBe(0);
    expect(stats.recallAccuracy).toBe(100);
    expect(deriveSuggestedRating(stats).rating).toBe(4);
  });

  it('Scenario 5: compound repetition + omission → Again (1), 50% recall', () => {
    // Stutter on بِسْمِ, then drop ٱلرَّحِيمِ
    const res = engine.alignAyah(
      '1:1',
      PhonemeVocabulary.tokenize('بِسمِ بِسمِ للَااهِ ررَحمَاانِ')
    );
    expect(res.words[0].status).toBe('repetition');
    expect(res.words[3].status).toBe('omission');

    const stats = computeReviewStats(res.words);
    expect(stats.repetitions).toBe(1);
    expect(stats.omissions).toBe(1);
    expect(stats.correct).toBe(2);
    expect(stats.errorCount).toBe(2);
    expect(stats.recallAccuracy).toBe(50);

    const { rating, label } = deriveSuggestedRating(stats);
    expect(rating).toBe(1);
    expect(label).toContain('إعادة');
  });

  it('Scenario 6: low recognition confidence → uncertain words excluded from errors, Good (3) not Again', () => {
    const ref = engine.getAyahReference('1:1')!;
    const tokens: StreamingPhonemeToken[] = PhonemeVocabulary.tokenize(ref.aya_phoneme).map(
      (t, i) => ({ token: t, index: i, confidence: 0.4, timestampMs: i * 100 })
    );
    const res = engine.alignAyah('1:1', tokens);

    expect(res.confidence).toBe(0.4);
    expect(res.primaryCategory).toBe('Uncertain');
    expect(res.words.every((w) => w.status === 'uncertain')).toBe(true);
    expect(res.words.every((w) => w.confidence === 40)).toBe(true);

    const stats = computeReviewStats(res.words);
    expect(stats.uncertain).toBe(4);
    expect(stats.evaluatedWords).toBe(0);
    expect(stats.errorCount).toBe(0);
    expect(stats.recallAccuracy).toBe(100);

    const { rating, label } = deriveSuggestedRating(stats);
    expect(rating).toBe(3);
    expect(label).toContain('تعذر تقييم');
  });

  it('Scenario 7: low alignment accuracy → Again (1); accuracy and confidence stay distinct in the store', () => {
    const res = engine.alignAyah(
      '1:1',
      PhonemeVocabulary.tokenize('ص ط ك م ط ص ك م ط ص ك م ط ص ك')
    );
    expect(res.accuracy).toBeLessThan(0.5);
    expect(res.confidence).toBeUndefined();

    const stats = computeReviewStats(res.words);
    expect(stats.recallAccuracy).toBeLessThan(70);
    expect(deriveSuggestedRating(stats).rating).toBe(1);

    const store = useRecitationStore.getState();
    store.setAlignmentAccuracy(Math.round(res.accuracy * 100));
    store.setRecognitionConfidence(
      res.confidence !== undefined ? Math.round(res.confidence * 100) : null
    );
    expect(useRecitationStore.getState().alignmentAccuracy).toBe(Math.round(res.accuracy * 100));
    expect(useRecitationStore.getState().recognitionConfidence).toBeNull();
  });

  it('Scenario 8: uncertain words never penalize recall; all-uncertain → Good with no-evidence label', () => {
    const words = [
      makeWord(0, 'correct'),
      makeWord(1, 'correct'),
      makeWord(2, 'correct'),
      makeWord(3, 'uncertain', 40),
    ];
    const stats = computeReviewStats(words);
    expect(stats.uncertain).toBe(1);
    expect(stats.evaluatedWords).toBe(3);
    expect(stats.errorCount).toBe(0);
    expect(stats.recallAccuracy).toBe(100);
    expect(deriveSuggestedRating(stats).rating).toBe(4);
    // Real low confidence is preserved for display; absence stays absent
    expect(words[3].confidence).toBe(40);
    expect(words[0].confidence).toBeUndefined();

    const allUncertain = computeReviewStats([
      makeWord(0, 'uncertain', 30),
      makeWord(1, 'uncertain', 35),
    ]);
    expect(allUncertain.evaluatedWords).toBe(0);
    expect(allUncertain.errorCount).toBe(0);
    const suggestion = deriveSuggestedRating(allUncertain);
    expect(suggestion.rating).toBe(3);
    expect(suggestion.label).toContain('تعذر تقييم');
  });

  it('Scenario 9: 2:2 tajweed-fused boundary regression → هُدًۭى / لِّلْمُتَّقِينَ both correct', () => {
    const ref = engine.getAyahReference('2:2')!;
    const res = engine.alignAyah('2:2', PhonemeVocabulary.tokenize(ref.aya_phoneme));

    expect(res.words).toHaveLength(7);
    // Words 5–6 share one fused phoneme group (idgham); proportional guessing
    // used to drift here and flag false substitutions.
    expect(res.words[4].uthmaniText).toBe('فِيهِ');
    expect(res.words[4].status).toBe('correct');
    expect(res.words[5].uthmaniText).toBe('هُدًۭى');
    expect(res.words[5].status).toBe('correct');
    expect(res.words[6].uthmaniText).toBe('لِّلْمُتَّقِينَ');
    expect(res.words[6].status).toBe('correct');
    expect(res.words.every((w) => w.status === 'correct')).toBe(true);

    const stats = computeReviewStats(res.words);
    expect(stats.recallAccuracy).toBe(100);
    expect(stats.errorCount).toBe(0);
    expect(deriveSuggestedRating(stats).rating).toBe(4);
  });

  it('Scenario 10: summary chips ↔ word stats consistency + store plumbing and reset', () => {
    const words = [
      makeWord(0, 'correct'),
      makeWord(1, 'correct', 97),
      makeWord(2, 'substitution', 88),
      makeWord(3, 'omission'),
      makeWord(4, 'repetition', 91),
      makeWord(5, 'uncertain', 40),
    ];
    const stats = computeReviewStats(words);

    expect(stats.totalWords).toBe(6);
    expect(
      stats.correct + stats.substitutions + stats.omissions + stats.repetitions + stats.uncertain
    ).toBe(stats.totalWords);
    expect(stats.evaluatedWords).toBe(stats.totalWords - stats.uncertain);
    expect(stats.errorCount).toBe(stats.substitutions + stats.omissions + stats.repetitions);
    expect(stats.errorCount).toBe(3);
    expect(stats.recallAccuracy).toBe(Math.round((stats.correct / stats.evaluatedWords) * 100));
    expect(stats.recallAccuracy).toBe(40);
    expect(deriveSuggestedRating(stats).rating).toBe(1);

    const store = useRecitationStore.getState();
    store.setEvaluatedWords(words, 1, 1);
    expect(useRecitationStore.getState().isReviewOpen).toBe(true);
    expect(useRecitationStore.getState().evaluatedWords).toHaveLength(6);

    store.setAlignmentAccuracy(83);
    store.setRecognitionConfidence(91);
    expect(useRecitationStore.getState().alignmentAccuracy).toBe(83);
    expect(useRecitationStore.getState().recognitionConfidence).toBe(91);

    store.resetRecitation();
    expect(useRecitationStore.getState().alignmentAccuracy).toBe(0);
    expect(useRecitationStore.getState().recognitionConfidence).toBeNull();
    expect(useRecitationStore.getState().evaluatedWords).toEqual([]);
    expect(useRecitationStore.getState().isReviewOpen).toBe(false);
  });

  it('Scenario 11: phonemesToText & formatDetectedWord accurately decode Arabic words and handle omissions', () => {
    // Al-Fatiha 1:1 decoded phonemes
    expect(phonemesToText('بِسمِ للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم')).toBe('بسم للاه رحمان رحيم');
    // Al-Ikhlas 112:1 decoded phonemes with qalqalah marker
    expect(phonemesToText('قُل هُوَ للَااهُ أَحَدڇ')).toBe('قل هو للاه أحد');
    // Format detected word
    expect(formatDetectedWord('بِسمِ')).toBe('بسم');
    expect(formatDetectedWord('مَاالِكِ')).toBe('مالك');
    expect(formatDetectedWord('')).toBeNull();
    expect(formatDetectedWord(undefined)).toBeNull();
  });

  it('Scenario 12: Reference vs Recognized text store plumbing and reset', () => {
    const store = useRecitationStore.getState();
    expect(store.referenceText).toBe('');
    expect(store.recognizedText).toBe('');

    store.setReferenceText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
    store.setRecognizedText('بسم الله رحمان رحيم');

    expect(useRecitationStore.getState().referenceText).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
    expect(useRecitationStore.getState().recognizedText).toBe('بسم الله رحمان رحيم');

    store.resetRecitation();
    expect(useRecitationStore.getState().referenceText).toBe('');
    expect(useRecitationStore.getState().recognizedText).toBe('');
  });

  it('Scenario 13: Low acoustic recognition confidence (<65%) is strictly separated from recall failure', () => {
    const store = useRecitationStore.getState();
    const words = [
      makeWord(0, 'correct'),
      makeWord(1, 'correct'),
      makeWord(2, 'correct'),
    ];
    store.setEvaluatedWords(words, 1, 1);
    store.setRecognitionConfidence(50); // 50% < 65%

    const stats = computeReviewStats(words);
    // Recall accuracy is 100% because user recalled words
    expect(stats.recallAccuracy).toBe(100);
    // Acoustic confidence is 50%
    expect(useRecitationStore.getState().recognitionConfidence).toBe(50);
    // The acoustic uncertainty rule: never brand as failure
    const isAcousticUncertain =
      (useRecitationStore.getState().recognitionConfidence !== null &&
        (useRecitationStore.getState().recognitionConfidence ?? 100) < 65);
    expect(isAcousticUncertain).toBe(true);
  });
});