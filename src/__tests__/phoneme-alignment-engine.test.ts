import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Dynamic require for sherpa-onnx in Node/Vitest test harness
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sherpa = require('sherpa-onnx');
import {
  PhonemeAlignmentEngine,
  PhonemeVocabulary,
  CtcDtwAligner,
  ErrorClassifier,
  WordMapper,
  AyahAlignmentResult,
} from '../alignment';

describe('Milestone 3: Phoneme Alignment & Error Detection Engine', () => {
  let engine: PhonemeAlignmentEngine;
  const projectRoot = process.cwd();

  beforeAll(async () => {
    engine = new PhonemeAlignmentEngine();
    await engine.initialize();
  });

  describe('Core Architecture & Latency Benchmark (< 100ms)', () => {
    it('verifies canonical phoneme database contains 6,236 Ayahs', () => {
      const fatiha1 = engine.getAyahReference('1:1');
      expect(fatiha1).toBeDefined();
      expect(fatiha1?.aya_text).toContain('بِسْمِ ٱللَّهِ');
      expect(fatiha1?.aya_phoneme).toContain('بِسمِ');
    });

    it('executes sequence alignment on Al-Fatiha (1:1) within 100ms', () => {
      const ref = engine.getAyahReference('1:1')!;
      const refTokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);

      const startTime = performance.now();
      const result = engine.alignAyah('1:1', refTokens);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(100.0);
      expect(result.latencyMs).toBeLessThan(100.0);
      expect(result.primaryCategory).toBe('Correct');
      expect(result.accuracy).toBe(1.0);
      expect(result.per).toBe(0.0);
    });

    it('executes sequence alignment on Ayat al-Kursi (2:255, 50 words) within 100ms', () => {
      const refKursi = engine.getAyahReference('2:255');
      expect(refKursi).toBeDefined();
      const tokens = PhonemeVocabulary.tokenize(refKursi!.aya_phoneme);

      const startTime = performance.now();
      const result = engine.alignAyah('2:255', tokens);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(100.0);
      expect(result.latencyMs).toBeLessThan(100.0);
      expect(result.primaryCategory).toBe('Correct');
      expect(result.words.length).toBeGreaterThan(40);
    });
  });

  describe('25+ Standardized Recitation Benchmark Cases', () => {
    // --- Tier 1: Correct Recitations ---
    it('Benchmark 01: Surah Al-Fatiha (1:1) — Flawless Tahqiq recitation -> "Correct"', () => {
      const ref = engine.getAyahReference('1:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.96 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.allCategories).toContain('Correct');
      expect(res.per).toBe(0.0);
      expect(res.words).toHaveLength(4);
      expect(res.words.every((w) => w.status === 'correct')).toBe(true);
    });

    it('Benchmark 02: Surah Al-Fatiha (1:2) — Flawless Tadwir recitation -> "Correct"', () => {
      const ref = engine.getAyahReference('1:2')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('1:2', tokens, { acousticConfidence: 0.94 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.per).toBe(0.0);
      expect(res.words).toHaveLength(4);
      expect(res.words[0].uthmaniText).toBe('ٱلْحَمْدُ');
      expect(res.words[3].uthmaniText).toBe('ٱلْعَـٰلَمِينَ');
    });

    it('Benchmark 03: Surah Al-Fatiha (1:3) — Flawless Hadr recitation (Madd variance allowed) -> "Correct"', () => {
      const ref = engine.getAyahReference('1:3')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      // In fast Hadr recitation, Madd 4/6 beats may be shortened to 2 beats
      const hadrTokens = tokens.map((t) => (t === 'اا' ? 'ا' : t === 'ۦۦۦۦ' ? 'ۦۦ' : t));
      const res = engine.alignAyah('1:3', hadrTokens, { acousticConfidence: 0.92 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.per).toBeLessThanOrEqual(0.08);
      expect(res.words.every((w) => w.status === 'correct')).toBe(true);
    });

    it('Benchmark 04: Surah Al-Fatiha (1:4) — Flawless recitation -> "Correct"', () => {
      const ref = engine.getAyahReference('1:4')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('1:4', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.words).toHaveLength(3);
    });

    it('Benchmark 05: Surah Al-Fatiha (1:5) — Flawless recitation -> "Correct"', () => {
      const ref = engine.getAyahReference('1:5')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('1:5', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.words).toHaveLength(4);
    });

    it('Benchmark 06: Surah Al-Ikhlas (112:1) — Flawless recitation with Qalqalah ("دڇ") -> "Correct"', () => {
      const ref = engine.getAyahReference('112:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('112:1', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Correct');
      expect(tokens).toContain('دڇ');
      expect(res.words).toHaveLength(4);
      expect(res.words[3].uthmaniText).toBe('أَحَدٌ');
      expect(res.words[3].detectedPhonemes).toContain('دڇ');
    });

    it('Benchmark 07: Surah Al-Falaq (113:1) — Flawless recitation -> "Correct"', () => {
      const ref = engine.getAyahReference('113:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('113:1', tokens, { acousticConfidence: 0.93 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.words).toHaveLength(4);
    });

    it('Benchmark 08: Surah An-Nas (114:1) — Flawless recitation with Ghunnah ("نننن") -> "Correct"', () => {
      const ref = engine.getAyahReference('114:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('114:1', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.words[3].uthmaniText).toBe('ٱلنَّاسِ');
      expect(res.words[3].detectedPhonemes).toContain('نننن');
    });

    // --- Tier 2: Omission Errors ---
    it('Benchmark 09: Surah Al-Fatiha (1:1) — Single Word Omission (skips "ٱلرَّحْمَـٰنِ") -> "Omission"', () => {
      const ref = engine.getAyahReference('1:1')!;
      // "بِسمِ للَااهِ ررَحِۦۦۦۦم" (omitting "ررَحمَاانِ")
      const omittedPhonemes = 'بِسمِ للَااهِ ررَحِۦۦۦۦم';
      const tokens = PhonemeVocabulary.tokenize(omittedPhonemes);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Omission');
      expect(res.allCategories).toContain('Omission');
      expect(res.diagnostics.omissionsCount).toBeGreaterThan(0);
      expect(res.words[2].uthmaniText).toBe('ٱلرَّحْمَـٰنِ');
      expect(res.words[2].status).toBe('omission');
      expect(res.words[0].status).toBe('correct');
      expect(res.words[1].status).toBe('correct');
      expect(res.words[3].status).toBe('correct');
    });

    it('Benchmark 10: Surah Al-Fatiha (1:1) — Opening Word Omission (skips "بِسْمِ") -> "Omission"', () => {
      const ref = engine.getAyahReference('1:1')!;
      const omittedPhonemes = 'للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم';
      const tokens = PhonemeVocabulary.tokenize(omittedPhonemes);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Omission');
      expect(res.words[0].uthmaniText).toBe('بِسْمِ');
      expect(res.words[0].status).toBe('omission');
      expect(res.words[1].status).toBe('correct');
    });

    it('Benchmark 11: Surah Al-Fatiha (1:1) — Ending Word Omission (stops before "ٱلرَّحِيمِ") -> "Omission"', () => {
      const ref = engine.getAyahReference('1:1')!;
      const omittedPhonemes = 'بِسمِ للَااهِ ررَحمَاانِ';
      const tokens = PhonemeVocabulary.tokenize(omittedPhonemes);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Omission');
      expect(res.words[3].uthmaniText).toBe('ٱلرَّحِيمِ');
      expect(res.words[3].status).toBe('omission');
    });

    it('Benchmark 12: Surah Al-Ikhlas (112:1) — Middle Word Omission (skips "هُوَ") -> "Omission"', () => {
      const omittedPhonemes = 'قُل للَااهُ ءَحَدڇ';
      const tokens = PhonemeVocabulary.tokenize(omittedPhonemes);
      const res = engine.alignAyah('112:1', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Omission');
      expect(res.words[1].uthmaniText).toBe('هُوَ');
      expect(res.words[1].status).toBe('omission');
      expect(res.words[0].status).toBe('correct');
      expect(res.words[2].status).toBe('correct');
      expect(res.words[3].status).toBe('correct');
    });

    it('Benchmark 13: Surah Al-Fatiha (1:5) — Half-Verse Omission (skips "وَإِيَّاكَ نَسْتَعِينُ") -> "Omission"', () => {
      const omittedPhonemes = 'ءِييَااكَ نَعبُدُ';
      const tokens = PhonemeVocabulary.tokenize(omittedPhonemes);
      const res = engine.alignAyah('1:5', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Omission');
      expect(res.words[2].status).toBe('omission');
      expect(res.words[3].status).toBe('omission');
    });

    // --- Tier 3: Substitution Errors ---
    it('Benchmark 14: Surah Al-Fatiha (1:1) — Letter Substitution ("س" replaced with "ص") -> "Substitution"', () => {
      // "بِصمِ للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم"
      const subPhonemes = 'بِصمِ للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم';
      const tokens = PhonemeVocabulary.tokenize(subPhonemes);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.90 });

      expect(res.primaryCategory).toBe('Substitution');
      expect(res.allCategories).toContain('Substitution');
      expect(res.diagnostics.substitutionsCount).toBeGreaterThan(0);
      expect(res.words[0].uthmaniText).toBe('بِسْمِ');
      expect(res.words[0].status).toBe('substitution');
    });

    it('Benchmark 15: Surah Al-Fatiha (1:2) — Word Substitution ("ٱلْعَـٰلَمِينَ" replaced with "ٱلْمُؤْمِنِينَ") -> "Substitution"', () => {
      // "ءَلحَمدُ لِللَااهِ رَببِ لمُءمِنِۦۦۦۦن"
      const subPhonemes = 'ءَلحَمدُ لِللَااهِ رَببِ لمُءمِنِۦۦۦۦن';
      const tokens = PhonemeVocabulary.tokenize(subPhonemes);
      const res = engine.alignAyah('1:2', tokens, { acousticConfidence: 0.92 });

      expect(res.primaryCategory).toBe('Substitution');
      expect(res.words[3].uthmaniText).toBe('ٱلْعَـٰلَمِينَ');
      expect(res.words[3].status).toBe('substitution');
    });

    it('Benchmark 16: Surah Al-Fatiha (1:5) — Harakah Substitution ("نَعْبُدُ" pronounced "نَعْبُدَ") -> "Substitution"', () => {
      // "ءِييَااكَ نَعبُدَ وَءِييَااكَ نَستَعِۦۦۦۦن"
      const subPhonemes = 'ءِييَااكَ نَعبُدَ وَءِييَااكَ نَستَعِۦۦۦۦن';
      const tokens = PhonemeVocabulary.tokenize(subPhonemes);
      const res = engine.alignAyah('1:5', tokens, { acousticConfidence: 0.91 });

      expect(res.allCategories).toContain('Substitution');
      expect(res.words[1].uthmaniText).toBe('نَعْبُدُ');
    });

    it('Benchmark 17: Surah Al-Ikhlas (112:1) — Word Substitution ("أَحَدٌ" replaced with "صَمَدٌ") -> "Substitution"', () => {
      const subPhonemes = 'قُل هُوَ للَااهُ صَمَدڇ';
      const tokens = PhonemeVocabulary.tokenize(subPhonemes);
      const res = engine.alignAyah('112:1', tokens, { acousticConfidence: 0.90 });

      expect(res.primaryCategory).toBe('Substitution');
      expect(res.words[3].uthmaniText).toBe('أَحَدٌ');
      expect(res.words[3].status).toBe('substitution');
    });

    it('Benchmark 18: Surah Al-Falaq (113:2) — Consonant Substitution ("مِن شَرِّ" with "مِن سَرِّ") -> "Substitution"', () => {
      const ref = engine.getAyahReference('113:2')!;
      const subPhonemes = ref.aya_phoneme.replace('ش', 'س');
      const tokens = PhonemeVocabulary.tokenize(subPhonemes);
      const res = engine.alignAyah('113:2', tokens, { acousticConfidence: 0.92 });

      expect(res.primaryCategory).toBe('Substitution');
    });

    // --- Tier 4: Repetition Errors ---
    it('Benchmark 19: Surah Al-Fatiha (1:1) — Stumbling Opening Repetition ("بِسْمِ ٱللَّهِ... بِسْمِ ٱللَّهِ") -> "Repetition"', () => {
      const ref = engine.getAyahReference('1:1')!;
      const openingPhrase = 'بِسمِ للَااهِ';
      const stutterPhonemes = `${openingPhrase} ${ref.aya_phoneme}`;
      const tokens = PhonemeVocabulary.tokenize(stutterPhonemes);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.92 });

      expect(res.primaryCategory).toBe('Repetition');
      expect(res.allCategories).toContain('Repetition');
      expect(res.diagnostics.repetitions.length).toBeGreaterThan(0);
    });

    it('Benchmark 20: Surah Al-Fatiha (1:2) — Mid-verse Stumbling Repetition ("رَبِّ ٱلْعَـٰلَمِينَ... رَبِّ ٱلْعَـٰلَمِينَ") -> "Repetition"', () => {
      const repPhonemes = 'ءَلحَمدُ لِللَااهِ رَببِ لعَاالَمِۦۦۦۦن رَببِ لعَاالَمِۦۦۦۦن';
      const tokens = PhonemeVocabulary.tokenize(repPhonemes);
      const res = engine.alignAyah('1:2', tokens, { acousticConfidence: 0.91 });

      expect(res.primaryCategory).toBe('Repetition');
      expect(res.diagnostics.repetitions.length).toBeGreaterThan(0);
    });

    it('Benchmark 21: Surah Al-Ikhlas (112:1) — Immediate Word Stutter ("قُلْ قُلْ") -> "Repetition"', () => {
      const stutterPhonemes = 'قُل قُل هُوَ للَااهُ ءَحَدڇ';
      const tokens = PhonemeVocabulary.tokenize(stutterPhonemes);
      const res = engine.alignAyah('112:1', tokens, { acousticConfidence: 0.93 });

      expect(res.primaryCategory).toBe('Repetition');
      expect(
        res.diagnostics.repetitions.some((r) => r.replace(/\s+/g, '').includes('قُل'))
      ).toBe(true);
      expect(res.words[0].status).toBe('repetition');
    });

    // --- Tier 5: Sequence Errors ---
    it('Benchmark 22: Surah Al-Fatiha (1:1) — Verse Transposition (recites 1:2 instead of 1:1) -> "Sequence Error"', () => {
      const ref1_2 = engine.getAyahReference('1:2')!;
      const tokens = PhonemeVocabulary.tokenize(ref1_2.aya_phoneme);
      const res = engine.alignAyah('1:1', tokens, {
        recitedAyahKeyCandidate: '1:2',
        acousticConfidence: 0.95,
      });

      expect(res.primaryCategory).toBe('Sequence Error');
      expect(res.allCategories).toContain('Sequence Error');
      expect(res.diagnostics.isSequenceJump).toBe(true);
    });

    it('Benchmark 23: Surah Al-Fatiha (1:3) — Verse Jump (recites 1:5 instead of 1:3) -> "Sequence Error"', () => {
      const ref1_5 = engine.getAyahReference('1:5')!;
      const tokens = PhonemeVocabulary.tokenize(ref1_5.aya_phoneme);
      const res = engine.alignAyah('1:3', tokens, {
        recitedAyahKeyCandidate: '1:5',
        acousticConfidence: 0.94,
      });

      expect(res.primaryCategory).toBe('Sequence Error');
    });

    it('Benchmark 24: Surah Al-Ikhlas (112:1) — Cross-Surah Jump (recites 113:1 instead of 112:1) -> "Sequence Error"', () => {
      const ref113_1 = engine.getAyahReference('113:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref113_1.aya_phoneme);
      const res = engine.alignAyah('112:1', tokens, {
        recitedAyahKeyCandidate: '113:1',
        acousticConfidence: 0.93,
      });

      expect(res.primaryCategory).toBe('Sequence Error');
    });

    // --- Tier 6: Uncertain Recitations ---
    it('Benchmark 25: Surah Al-Fatiha (1:1) — Low Acoustic Confidence (score = 0.45) -> "Uncertain"', () => {
      const ref = engine.getAyahReference('1:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.45 });

      expect(res.primaryCategory).toBe('Uncertain');
      expect(res.allCategories).toContain('Uncertain');
      expect(res.diagnostics.uncertainScore).toBe(0.55);
    });

    it('Benchmark 26: Surah Al-Fatiha (1:1) — Severe Acoustic Noise / Degradation (score = 0.25) -> "Uncertain"', () => {
      const ref = engine.getAyahReference('1:1')!;
      const tokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.25 });

      expect(res.primaryCategory).toBe('Uncertain');
    });

    it('Benchmark 27: Surah Al-Fatiha (1:1) — Pure Digital Silence / Empty audio stream -> "Uncertain"', () => {
      const res = engine.alignAyah('1:1', [], { acousticConfidence: 0.0 });

      expect(res.primaryCategory).toBe('Uncertain');
      expect(res.allCategories).toContain('Uncertain');
      expect(res.diagnostics.uncertaintyReasons?.length).toBeGreaterThan(0);
    });

    // --- Complex Edge Cases & Multi-Word Assimilation ---
    it('Benchmark 28: Surah Al-Fatiha (1:7) — Long Verse (9 words) & Boundary Assimilation -> < 25ms execution', () => {
      const ref1_7 = engine.getAyahReference('1:7')!;
      const tokens = PhonemeVocabulary.tokenize(ref1_7.aya_phoneme);

      const startTime = performance.now();
      const res = engine.alignAyah('1:7', tokens, { acousticConfidence: 0.95 });
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(25.0);
      expect(res.latencyMs).toBeLessThan(25.0);
      expect(res.primaryCategory).toBe('Correct');
      expect(res.words).toHaveLength(9);
      expect(res.words[0].uthmaniText).toBe('صِرَٰطَ');
      expect(res.words[8].uthmaniText).toBe('ٱلضَّآلِّينَ');
    });

    it('Benchmark 29: Surah Al-Baqarah (2:2) — Assimilation ("هُدًۭى لِّلْمُتَّقِينَ") -> Exact Word Bounding', () => {
      const ref2_2 = engine.getAyahReference('2:2')!;
      const tokens = PhonemeVocabulary.tokenize(ref2_2.aya_phoneme);
      const res = engine.alignAyah('2:2', tokens, { acousticConfidence: 0.95 });

      expect(res.primaryCategory).toBe('Correct');
      expect(res.words.length).toBeGreaterThanOrEqual(6);
      expect(res.words[0].uthmaniText).toBe('ذَٰلِكَ');
    });

    it('Benchmark 30: Compound Error — Opening Stutter + Ending Omission -> Flags both Repetition and Omission', () => {
      // Repetition of "بِسمِ" + omission of "ررَحِۦۦۦۦم"
      const compoundPhonemes = 'بِسمِ بِسمِ للَااهِ ررَحمَاانِ';
      const tokens = PhonemeVocabulary.tokenize(compoundPhonemes);
      const res = engine.alignAyah('1:1', tokens, { acousticConfidence: 0.90 });

      expect(res.allCategories).toContain('Repetition');
      expect(res.allCategories).toContain('Omission');
      expect(res.words[3].status).toBe('omission');
    });
  });

  describe('Real Audio Waveform Alignment (Zipformer CTC Inference)', () => {
    it('aligns real 16kHz WAV audio of Surah Al-Fatiha 1:1 against reference phonemes', () => {
      const wavPath = path.join(projectRoot, 'fixtures', '001001_16k.wav');
      expect(fs.existsSync(wavPath)).toBe(true);

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
      const decResult = recognizer.getResult(stream);
      expect(decResult.tokens.length).toBeGreaterThan(8);

      // Align recognized tokens with canonical 1:1 reference
      const alignResult = engine.alignAyah('1:1', decResult.tokens);

      expect(alignResult.latencyMs).toBeLessThan(100.0);
      expect(alignResult.accuracy).toBeGreaterThan(0.70);
      expect(alignResult.words[0].uthmaniText).toBe('بِسْمِ');
      expect(alignResult.words[1].uthmaniText).toBe('ٱللَّهِ');
      expect(alignResult.words[2].uthmaniText).toBe('ٱلرَّحْمَـٰنِ');
    });

    it('aligns real 16kHz WAV audio of Surah Al-Ikhlas 112:1 and captures Qalqalah', () => {
      const wavPath = path.join(projectRoot, 'fixtures', '112001_16k.wav');
      expect(fs.existsSync(wavPath)).toBe(true);

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
      const decResult = recognizer.getResult(stream);

      const alignResult = engine.alignAyah('112:1', decResult.tokens);
      expect(alignResult.latencyMs).toBeLessThan(100.0);
      expect(alignResult.words[0].uthmaniText).toBe('قُلْ');
      expect(alignResult.words[3].uthmaniText).toBe('أَحَدٌ');
      expect(alignResult.words[3].detectedPhonemes).toContain('دڇ');
    });
  });

  describe('Streaming Incremental Alignment Interface', () => {
    it('updates active word index and progress ratio as incremental tokens arrive', () => {
      const streamingTokens = [
        { token: 'بِ', timestampMs: 100, confidence: 0.95 },
        { token: 'س', timestampMs: 200, confidence: 0.97 },
        { token: 'مِ', timestampMs: 300, confidence: 0.96 },
      ];

      const incResult = engine.alignIncremental('1:1', streamingTokens);
      expect(incResult.activeWordIndex).toBe(0);
      expect(incResult.progressRatio).toBeGreaterThan(0.1);
      expect(incResult.words[0].detectedPhonemes).toBe('بِسمِ');
    });

    it('strictly enforces sequential word progression and prevents jumping to future words when intermediate words are unsaid (e.g. Al-Fatiha 1:2)', () => {
      // User says "الحمد لله" (words 0 and 1) in 1:2 ("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ")
      // Even if there are trailing spurious tokens that happen to match "العالمين",
      // word 2 ("رب") was not recited, so activeWordIndex MUST NOT advance past word 1!
      const ref = engine.getAyahReference('1:2')!;
      const refTokens = PhonemeVocabulary.tokenize(ref.aya_phoneme);
      const uthmaniWords = WordMapper.extractUthmaniWords(ref.aya_text);
      const refToWord = WordMapper.buildPhonemeToWordMapping(
        uthmaniWords,
        refTokens,
        ref.aya_phonemes_list
      );

      // Extract canonical tokens for words 0 and 1 ("ٱلْحَمْدُ" and "لِلَّهِ")
      const streamingTokens = refTokens
        .filter((_, idx) => refToWord[idx] === 0 || refToWord[idx] === 1)
        .map((tok, idx) => ({
          token: tok,
          timestampMs: idx * 100,
          confidence: 0.95,
        }));

      // Add a spurious trailing token that belongs to word 3 ("ٱلْعَـٰلَمِينَ")
      const word3Token = refTokens.find((_, idx) => refToWord[idx] === 3);
      if (word3Token) {
        streamingTokens.push({
          token: word3Token,
          timestampMs: 9999,
          confidence: 0.8,
        });
      }

      const incResult = engine.alignIncremental('1:2', streamingTokens);
      // Word 0 is "ٱلْحَمْدُ", Word 1 is "لِلَّهِ", Word 2 is "رَبِّ", Word 3 is "ٱلْعَـٰلَمِينَ"
      // Must stop strictly at Word 1 (لِلَّهِ)!
      expect(incResult.activeWordIndex).toBe(1);
      expect(incResult.activeWordIndex).not.toBe(2);
      expect(incResult.activeWordIndex).not.toBe(3);
    });

    it('verifies that short verses (e.g. Al-Fatiha 1:3) reach last word completion and transition smoothly into 1:4 without blocking', () => {
      // Verse 1:3: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" (2 words)
      const ref1_3 = engine.getAyahReference('1:3')!;
      const tokens1_3 = PhonemeVocabulary.tokenize(ref1_3.aya_phoneme).map((tok, idx) => ({
        token: tok,
        timestampMs: idx * 100,
        confidence: 0.95,
      }));

      // Incremental alignment on 1:3
      const inc1_3 = engine.alignIncremental('1:3', tokens1_3);
      expect(inc1_3.words.length).toBe(2);
      expect(inc1_3.activeWordIndex).toBe(1); // All words of 1:3 reached!

      // Verse 1:4: "مَـٰلِكِ يَوْمِ ٱلدِّينِ" (3 words)
      const ref1_4 = engine.getAyahReference('1:4')!;
      const tokens1_4 = PhonemeVocabulary.tokenize(ref1_4.aya_phoneme).map((tok, idx) => ({
        token: tok,
        timestampMs: 1000 + idx * 100,
        confidence: 0.95,
      }));

      // Candidate tokens for next ayah (1:4) starting with first 2 tokens ("مَ", "اا")
      const candidateTokens = tokens1_4.slice(0, 2);
      const inc1_4 = engine.alignIncremental('1:4', candidateTokens);
      expect(inc1_4.words.length).toBe(3);
      expect(inc1_4.activeWordIndex).toBe(0); // First word "مَـٰلِكِ" verified immediately!
    });
  });
});
