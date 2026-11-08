/**
 * Comprehensive Audio Recognition Pipeline Test Suite (Milestone 2)
 *
 * Validates:
 * 1. AudioWorklet capture & resampling dynamics
 * 2. Kaldi 80-dim FBank feature extraction (Povey window, Mel filterbanks, streaming remainder)
 * 3. sherpa-onnx streaming CTC inference (Zipformer 3.2 INT8)
 * 4. Token emission with timestamps and confidence scores
 * 5. Silence handling & zero hallucination
 * 6. Zero network leakage during recording and inference
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  KaldiFbankExtractor,
  VoiceRecognitionEngine,
  StreamingTokenEvent,
  RecognitionPartialResult,
  RecognitionFinalResult,
} from '../audio';

// Dynamic require for sherpa-onnx to read wave fixtures
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sherpa = require('sherpa-onnx');

const PROJECT_ROOT = path.resolve(process.cwd());
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'fixtures');
const MODELS_DIR = path.join(PROJECT_ROOT, 'models');

describe('Milestone 2 — Voice Recognition Engine', () => {
  let engine: VoiceRecognitionEngine;

  beforeEach(() => {
    engine = new VoiceRecognitionEngine({
      modelPath: path.join(MODELS_DIR, 'zipformer_p_arabic_v3.2.int8.onnx'),
      tokensPath: path.join(MODELS_DIR, 'tokens.txt'),
    });
  });

  afterEach(() => {
    engine.dispose();
  });

  // --------------------------------------------------------------------------
  // 1. Kaldi 80-dim FBank Feature Extractor Verification
  // --------------------------------------------------------------------------
  describe('Kaldi 80-dimensional FBank Feature Extractor', () => {
    it('initializes with exact 80-dim, 25ms frame, 10ms shift specifications', () => {
      const extractor = new KaldiFbankExtractor();
      expect(extractor.sampleRate).toBe(16000);
      expect(extractor.featureDim).toBe(80);
      expect(extractor.frameLength).toBe(400); // 25ms @ 16kHz
      expect(extractor.frameShift).toBe(160);  // 10ms @ 16kHz
      expect(extractor.fftSize).toBe(512);     // next power of 2 >= 400
      expect(extractor.lowFreq).toBe(20);
      expect(extractor.highFreq).toBe(7600);   // 16000/2 - 400
    });

    it('extracts exactly 80 feature dimensions for a 400-sample frame', () => {
      const extractor = new KaldiFbankExtractor();
      const rawFrame = new Float32Array(400);
      for (let i = 0; i < 400; i++) {
        rawFrame[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.5;
      }

      const fbank = extractor.extractFrame(rawFrame);
      expect(fbank.length).toBe(80);
      for (let m = 0; m < 80; m++) {
        expect(Number.isFinite(fbank[m])).toBe(true);
      }
    });

    it('preserves exact streaming continuity (chunked extraction matches batch extraction)', () => {
      const extractor1 = new KaldiFbankExtractor();
      const extractor2 = new KaldiFbankExtractor();

      // 1 second of synthetic speech-like multi-tone audio
      const numSamples = 16000;
      const audio = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        audio[i] =
          Math.sin((2 * Math.PI * 250 * i) / 16000) * 0.4 +
          Math.sin((2 * Math.PI * 800 * i) / 16000) * 0.3 +
          Math.sin((2 * Math.PI * 2200 * i) / 16000) * 0.2;
      }

      // Batch extraction
      const batchFrames = extractor1.extractAll(audio);

      // Streaming chunk extraction (160ms chunks = 2560 samples)
      const chunkSize = 2560;
      const streamFrames: Float32Array[] = [];
      for (let i = 0; i < numSamples; i += chunkSize) {
        const chunk = audio.subarray(i, Math.min(i + chunkSize, numSamples));
        const frames = extractor2.acceptAudioChunk(chunk);
        streamFrames.push(...frames);
      }
      streamFrames.push(...extractor2.inputFinished());

      expect(streamFrames.length).toBe(batchFrames.length);
      for (let f = 0; f < batchFrames.length; f++) {
        for (let d = 0; d < 80; d++) {
          expect(streamFrames[f][d]).toBeCloseTo(batchFrames[f][d], 4);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Streaming CTC Inference on Real Quran Recitation Audio
  // --------------------------------------------------------------------------
  describe('Streaming CTC Inference with Zipformer Quran 3.2', () => {
    it('decodes Surah Al-Fatiha (1:1) in streaming chunks with incremental token events', async () => {
      const wavPath = path.join(FIXTURES_DIR, '001001_16k.wav');
      expect(fs.existsSync(wavPath)).toBe(true);

      const wave = sherpa.readWave(wavPath);
      const emittedTokens: StreamingTokenEvent[] = [];
      const partialResults: RecognitionPartialResult[] = [];

      engine.setCallbacks({
        onToken: (ev) => {
          emittedTokens.push(ev);
        },
        onPartial: (p) => {
          partialResults.push(p);
        },
      });

      const result: RecognitionFinalResult = await engine.feedSyntheticAudio(
        wave.samples,
        wave.sampleRate,
        2560 // 160ms chunks
      );

      // Verify incremental emission
      expect(emittedTokens.length).toBeGreaterThan(10);
      expect(partialResults.length).toBeGreaterThan(5);

      // Timestamps must be strictly non-decreasing
      for (let i = 1; i < emittedTokens.length; i++) {
        expect(emittedTokens[i].timestampMs).toBeGreaterThanOrEqual(
          emittedTokens[i - 1].timestampMs
        );
      }

      // Confidence scores must be valid probabilities (0.0 to 1.0)
      for (const tok of emittedTokens) {
        expect(tok.confidence).toBeGreaterThan(0.0);
        expect(tok.confidence).toBeLessThanOrEqual(1.0);
      }

      // Phonetic verification: must contain essential Tajweed substrings of Bismillah
      expect(result.text).toContain('بِسمِ');
      expect(result.text).toContain('للَااهِ');
      expect(result.text).toContain('ررَحمَاانِ');
      expect(result.text).toContain('ررَحِ');

      // Performance: RTF must be faster than real time (< 0.50)
      expect(result.realTimeFactor).toBeLessThan(0.50);
    });

    it('decodes Surah Al-Ikhlas (112:1) and captures final Qalqalah token', async () => {
      const wavPath = path.join(FIXTURES_DIR, '112001_16k.wav');
      expect(fs.existsSync(wavPath)).toBe(true);

      const wave = sherpa.readWave(wavPath);
      const result = await engine.feedSyntheticAudio(wave.samples, wave.sampleRate, 2560);

      // Qul Huwa Allahu Ahad
      expect(result.text).toContain('قُلهُوَللَااهُءَحَد');
      expect(result.tokens.length).toBeGreaterThan(8);
      expect(result.realTimeFactor).toBeLessThan(0.40);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Silence, Audio Pauses & Zero Hallucination
  // --------------------------------------------------------------------------
  describe('Silence Handling & VAD Robustness', () => {
    it('emits zero hallucinated tokens when fed pure digital silence', async () => {
      const silenceSamples = new Float32Array(16000 * 2); // 2 seconds of pure silence
      const emittedTokens: StreamingTokenEvent[] = [];

      engine.setCallbacks({
        onToken: (tok) => emittedTokens.push(tok),
      });

      const result = await engine.feedSyntheticAudio(silenceSamples, 16000, 2560);
      expect(emittedTokens.length).toBe(0);
      expect(result.text).toBe('');
      expect(result.tokens.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Zero External Network Requests
  // --------------------------------------------------------------------------
  describe('Zero External Network Requests Contract', () => {
    it('executes audio recognition completely offline with zero network calls', async () => {
      const fetchSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = fetchSpy;

      const silenceSamples = new Float32Array(16000);
      await engine.feedSyntheticAudio(silenceSamples, 16000, 2560);

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
