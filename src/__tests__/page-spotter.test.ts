import { describe, it, expect, beforeAll } from 'vitest';
import { PhonemeAlignmentEngine } from '@/alignment/phoneme-alignment-engine';
import { PhonemeVocabulary } from '@/alignment/phoneme-vocabulary';
import { AyahLocation, StreamingPhonemeToken } from '@/alignment/types';
import {
  collectPageCandidates,
  PageSpotter,
  SpotterCandidate,
} from '@/recitation/page-spotter';
import { MEDINA_PAGES } from '@/data/medina-pages';

let engine: PhonemeAlignmentEngine;
let spotter: PageSpotter;

beforeAll(async () => {
  engine = new PhonemeAlignmentEngine();
  await engine.initialize();
  spotter = new PageSpotter(engine);
});

function speechOf(verseKey: string): StreamingPhonemeToken[] {
  const ref = engine.getAyahReference(verseKey);
  const tokens: StreamingPhonemeToken[] = [];
  let index = 0;
  for (const group of ref?.aya_phonemes_list ?? []) {
    for (const piece of PhonemeVocabulary.tokenize(group)) {
      tokens.push({ token: piece, index: index++, confidence: 0.95, timestampMs: index * 60 });
    }
  }
  return tokens;
}

/** Drops every 7th token and flips every 11th — a rough ASR error model. */
function degrade(tokens: StreamingPhonemeToken[]): StreamingPhonemeToken[] {
  const alphabet = ['ا', 'ب', 'ت', 'ن', 'م', 'ل', 'ر', 'س', 'ع', 'ي', 'و', 'ه', 'د', 'ك', 'ف', 'ق'];
  const out: StreamingPhonemeToken[] = [];
  tokens.forEach((token, i) => {
    if (i % 7 === 0) return;
    out.push({
      ...token,
      token: i % 11 === 0 ? alphabet[i % alphabet.length] : token.token,
      index: out.length,
    });
  });
  return out;
}

function location(overrides: Partial<AyahLocation>): AyahLocation {
  return {
    verseKey: '1:1',
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
    ...overrides,
  };
}

describe('collectPageCandidates', () => {
  it('returns every distinct ayah of the page, in reading order', () => {
    const candidates = collectPageCandidates(3);
    const keys = candidates.map((c) => `${c.surahNumber}:${c.ayahNumber}`);

    expect(keys[0]).toBe('2:6');
    expect(keys).toContain('2:16');
    expect(new Set(keys).size).toBe(keys.length);
    expect(candidates.every((c) => c.pageNumber === 3)).toBe(true);

    // Every word on the page belongs to one of the candidates.
    const page = MEDINA_PAGES[3];
    for (const line of page.lines) {
      if (line.type !== 'text') continue;
      for (const word of line.words) {
        expect(keys).toContain(`${word.surahNumber}:${word.ayahNumber}`);
      }
    }
  });

  it('returns an empty list for an unknown page', () => {
    expect(collectPageCandidates(0)).toEqual([]);
    expect(collectPageCandidates(9999)).toEqual([]);
  });
});

describe('PageSpotter — ranking logic (stubbed alignment)', () => {
  const candidates: SpotterCandidate[] = [
    { surahNumber: 2, ayahNumber: 6, pageNumber: 3 },
    { surahNumber: 2, ayahNumber: 7, pageNumber: 3 },
  ];
  const tokens: StreamingPhonemeToken[] = Array.from({ length: 40 }, (_, i) => ({
    token: 'ب',
    index: i,
    confidence: 0.9,
    timestampMs: i * 60,
  }));

  function stubEngine(locations: Record<string, AyahLocation>): PhonemeAlignmentEngine {
    return {
      locateInAyah: (key: string) => locations[key] ?? null,
      getReferenceWords: () => ['و', 'م', 'ن', 'ه'],
      getAyahReference: (key: string) => ({ aya_text: `نص ${key}` }),
    } as unknown as PhonemeAlignmentEngine;
  }

  it('picks the candidate whose phonemes matched exactly', () => {
    const stub = new PageSpotter(
      stubEngine({
        '2:6': location({ matchedPhonemes: 39, coveredHypothesisTokens: 40, matchedWords: 4 }),
        '2:7': location({ matchedPhonemes: 9, coveredHypothesisTokens: 40, matchedWords: 1 }),
      })
    );

    const outcome = stub.identify(tokens, candidates);

    expect(outcome.best?.verseKey).toBe('2:6');
    expect(outcome.confidence).toBe('high');
    expect(outcome.ambiguous).toBe(false);
    expect(outcome.reason).toBe('match');
    // The runner-up is far behind, so it is not surfaced as an alternative.
    expect(outcome.alternatives).toEqual([]);
  });

  it('asks instead of jumping when two ayahs are equally plausible', () => {
    const stub = new PageSpotter(
      stubEngine({
        '2:6': location({ matchedPhonemes: 39, coveredHypothesisTokens: 40, matchedWords: 4 }),
        '2:7': location({ matchedPhonemes: 38, coveredHypothesisTokens: 40, matchedWords: 4 }),
      })
    );

    const outcome = stub.identify(tokens, candidates);

    expect(outcome.best?.verseKey).toBe('2:6');
    expect(outcome.ambiguous).toBe(true);
    expect(outcome.confidence).toBe('low');
    expect(outcome.reason).toBe('ambiguous');
    expect(outcome.alternatives.length).toBeGreaterThan(0);
  });

  it('reports no speech for a too-short utterance', () => {
    const outcome = spotter.identify(tokens.slice(0, 2), candidates);
    expect(outcome.best).toBeNull();
    expect(outcome.reason).toBe('no-speech');
  });

  it('reports no match when nothing aligns', () => {
    const stub = new PageSpotter(
      stubEngine({
        '2:6': location({ matchedPhonemes: 3, coveredHypothesisTokens: 4, matchedWords: 1 }),
        '2:7': location({ matchedPhonemes: 0, coveredHypothesisTokens: 0, matchedWords: 0 }),
      })
    );

    const outcome = stub.identify(tokens, candidates);
    expect(outcome.best).toBeNull();
    expect(outcome.reason).toBe('no-match');
  });
});

describe('PageSpotter — real phoneme database', () => {
  it('identifies a middle ayah of the page from a clean recitation', () => {
    const candidates = collectPageCandidates(3);
    const tokens = speechOf('2:10');

    const outcome = spotter.identify(tokens, candidates);

    expect(outcome.best?.verseKey).toBe('2:10');
    expect(outcome.confidence).toBe('high');
    expect(outcome.ambiguous).toBe(false);
    // Every candidate is ranked, but only plausible runner-ups are surfaced.
    expect(outcome.alternatives.every((m) => m.verseKey !== '2:10')).toBe(true);
  });

  it('identifies the ayah through ASR-level token noise', () => {
    const candidates = collectPageCandidates(4);
    const tokens = degrade(speechOf('2:22'));

    const outcome = spotter.identify(tokens, candidates);

    expect(outcome.best?.verseKey).toBe('2:22');
    expect(outcome.confidence).not.toBe('low');
  });

  it('identifies the ayah from a partial recitation (first words only)', () => {
    const candidates = collectPageCandidates(10);
    const full = speechOf('2:65');
    const tokens = full.slice(0, Math.floor(full.length * 0.6));

    const outcome = spotter.identify(tokens, candidates);

    expect(outcome.best?.verseKey).toBe('2:65');
  });

  it('returns no-match for speech that is not on the page', () => {
    const garbage: StreamingPhonemeToken[] = 'بتبتبتبتبتتبتب'.split('').map((token, i) => ({
      token,
      index: i,
      confidence: 0.4,
      timestampMs: i * 60,
    }));

    const outcome = spotter.identify(garbage, collectPageCandidates(300));

    expect(outcome.best).toBeNull();
    expect(['no-match', 'no-speech']).toContain(outcome.reason);
  });

  it('scans a full page fast enough for an interactive jump', () => {
    const candidates = collectPageCandidates(3);
    const tokens = speechOf('2:13');

    // Warm the caches, then measure a typical (11-candidate) scan.
    spotter.identify(tokens, candidates);
    const startedAt = performance.now();
    const outcome = spotter.identify(tokens, candidates);
    const elapsed = performance.now() - startedAt;

    expect(outcome.best?.verseKey).toBe('2:13');
    expect(elapsed).toBeLessThan(200);
  });
});