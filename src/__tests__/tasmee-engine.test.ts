import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { createRequire } from 'node:module';
import { TasmeeEngine } from '../audio/tasmee-engine';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sherpa = require('sherpa-onnx');

const PROJECT_ROOT = path.resolve(process.cwd());
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'fixtures');

describe('TasmeeEngine — FastConformer Recitation Testing', () => {
  let engine: TasmeeEngine;

  beforeAll(async () => {
    engine = new TasmeeEngine({
      modelPath: path.join(PROJECT_ROOT, 'models', 'fastconformer', 'qurankarim-fastconformer-mixed.onnx'),
      tokensPath: path.join(PROJECT_ROOT, 'models', 'fastconformer', 'tokens.txt'),
    });
    await engine.initialize();
  });

  afterAll(() => {
    engine.destroy();
  });

  it('correctly normalizes Arabic words while preserving base letters', () => {
    expect(engine.normalizeWord('قُلْ')).toBe('قل');
    expect(engine.normalizeWord('اللَّهُ')).toBe('الله');
    expect(engine.normalizeWord('أَحَدٌ')).toBe('احد');
    expect(engine.normalizeWord('الرَّحْمَٰنِ')).toBe('الرحمن');
  });

  it('filters standalone Quranic waqf marks when cleaning words', () => {
    const raw = 'قُلْ هُوَ اللَّهُ أَحَدٌ ۚ اللَّهُ الصَّمَدُ';
    const words = engine.cleanWords(raw);
    expect(words).toEqual(['قُلْ', 'هُوَ', 'اللَّهُ', 'أَحَدٌ', 'اللَّهُ', 'الصَّمَدُ']);
  });

  it('accurately transcribes and verifies Al-Ikhlas (112:1) with 100% word accuracy', () => {
    const wave = sherpa.readWave(path.join(FIXTURES_DIR, '112001_16k.wav'));
    const reference = 'قُلْ هُوَ اللَّهُ أَحَدٌ';

    const result = engine.verifyAyah(wave.samples, reference);

    expect(result.rawText).toContain('قُلْ هُوَ اللَّهُ أَحَدٌ');
    expect(result.totalExpectedWords).toBe(4);
    expect(result.matchedWordsCount).toBe(4);
    expect(result.accuracy).toBe(1);
    expect(result.isFullyCorrect).toBe(true);
    expect(result.wordComparisons.length).toBe(4);
    expect(result.wordComparisons.every((w) => w.status === 'matched')).toBe(true);
  });

  it('accurately transcribes Al-Fatiha (1:1) matching all base words', () => {
    const wave = sherpa.readWave(path.join(FIXTURES_DIR, '001001_16k.wav'));
    const reference = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

    const result = engine.verifyAyah(wave.samples, reference);

    expect(result.totalExpectedWords).toBe(4);
    expect(result.matchedWordsCount).toBe(4);
    expect(result.accuracy).toBe(1);
  });

  it('flags mismatches and omissions when reciter speaks an incorrect verse', () => {
    const wave = sherpa.readWave(path.join(FIXTURES_DIR, '112001_16k.wav')); // Audio is 112:1
    const wrongReference = 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ'; // Expected 108:1

    const result = engine.verifyAyah(wave.samples, wrongReference);

    expect(result.accuracy).toBeLessThan(0.5);
    expect(result.isFullyCorrect).toBe(false);
    expect(result.wordComparisons.some((w) => w.status === 'mismatched' || w.status === 'omitted')).toBe(true);
  });
});
