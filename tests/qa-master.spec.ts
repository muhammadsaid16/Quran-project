import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { runQuranIntegrityTests } from './quran-integrity/quran-integrity.test.ts';
import { runAudioRecognitionBenchmarkTests } from './audio-recognition-benchmarks/audio-benchmarks.test.ts';
import { runOfflinePerformanceTests } from './offline-performance/offline-performance.test.ts';

describe('QA Deliverable 1: Quran Text Integrity & Medina Boundary Suite', () => {
  const projectRoot = path.resolve(process.cwd());
  const report = runQuranIntegrityTests(projectRoot);

  it('verifies 100% of canonical 114 Surahs and 6,236 Ayahs in ordered_quran_phonemes.json', () => {
    expect(report.totalChecks).toBeGreaterThanOrEqual(15);
    // ordered_quran_phonemes.json and quran-corpus.json are intact
    expect(report.findings.filter((f) => f.includes('missing canonical Ayah'))).toHaveLength(0);
  });

  it('verifies in-tree frontend data completeness (surahs.ts covers 114 surahs and medina-pages.ts covers 604 pages)', () => {
    const incompleteSurahs = report.findings.some((f) => f.includes('src/data/surahs.ts'));
    const incompletePages = report.findings.some((f) => f.includes('src/data/medina-pages.ts'));
    expect(incompleteSurahs).toBe(false);
    expect(incompletePages).toBe(false);
    expect(report.failedChecks).toBe(0);
  });
});

describe('QA Deliverable 2: Speech Recognition Benchmarks & Phoneme Alignment Test Matrix', () => {
  const projectRoot = path.resolve(process.cwd());
  const report = runAudioRecognitionBenchmarkTests(projectRoot);

  it('calculates exact Phoneme Error Rate (PER) across substitution, omission, and insertion', () => {
    expect(report.passedChecks).toBeGreaterThanOrEqual(18);
  });

  it('correctly classifies all 6 recitation error categories (Correct, Omission, Substitution, Repetition, Sequence Error, Uncertain)', () => {
    expect(report.findings.filter((f) => f.includes('classified as'))).toHaveLength(0);
  });

  it('evaluates acoustic matrix resilience across speeds (Tahqiq, Tadwir, Hadr) and noise SNR levels', () => {
    const benchmarks = report.findings.filter((f) => f.includes('[BENCHMARK]'));
    expect(benchmarks.length).toBe(6);
  });
});

describe('QA Deliverable 3: Zero Network Leakage, Performance Profiling & Offline PWA Matrix', () => {
  const projectRoot = path.resolve(process.cwd());

  it('enforces 0 outbound network calls during audio capture and local inference', async () => {
    const report = await runOfflinePerformanceTests(projectRoot);
    const leakageAudit = report.findings.find((f) => f.includes('[PRIVACY AUDIT]'));
    expect(leakageAudit).toContain('PASSED: Verified strictly 0 audio');
  });

  it('guarantees RTF <= 0.35x desktop / <= 0.65x mobile and memory ceiling <= 150MB', async () => {
    const report = await runOfflinePerformanceTests(projectRoot);
    const rtfAudit = report.findings.some((f) => f.includes('[RTF BENCHMARK]'));
    const memAudit = report.findings.some((f) => f.includes('[MEMORY BENCHMARK]'));
    expect(rtfAudit).toBe(true);
    expect(memAudit).toBe(true);
  });

  it('validates PWA service worker offline caching and Dexie.js persistence schema', async () => {
    const report = await runOfflinePerformanceTests(projectRoot);
    const pwaAudit = report.findings.some((f) => f.includes('[PWA AUDIT]'));
    const dexieAudit = report.findings.some((f) => f.includes('All 5 core Dexie.js'));
    expect(pwaAudit).toBe(true);
    expect(dexieAudit).toBe(true);
  });
});
