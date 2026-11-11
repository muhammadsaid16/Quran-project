import { describe, it, expect, beforeAll } from 'vitest';
import { PhonemeAlignmentEngine } from '@/alignment/phoneme-alignment-engine';
import { PhonemeVocabulary } from '@/alignment/phoneme-vocabulary';
import { AyahLocator, RecitationTarget } from '@/recitation/ayah-locator';
import { MEDINA_PAGES } from '@/data/medina-pages';
import { getRenderedAyahWordsByPage } from '@/data/mushaf-layout';

/**
 * Builds the speech stream the microphone would produce for the given ayahs:
 * the phoneme tokens of the reference, in order.
 */
function simulateSpeech(
  engine: PhonemeAlignmentEngine,
  ayahKeys: string[]
): { token: string; index: number; confidence: number; timestampMs: number }[] {
  const tokens: { token: string; index: number; confidence: number; timestampMs: number }[] = [];
  let i = 0;
  for (const key of ayahKeys) {
    const ref = engine.getAyahReference(key);
    if (!ref) continue;
    for (const group of ref.aya_phonemes_list ?? []) {
      for (const piece of PhonemeVocabulary.tokenize(group)) {
        tokens.push({ token: piece, index: i++, confidence: 0.95, timestampMs: i * 60 });
      }
    }
  }
  return tokens;
}

/**
 * The speech of ONE ayah, starting at a given reference word (for mid-ayah
 * starts).
 */
function simulateSpeechFromWord(
  engine: PhonemeAlignmentEngine,
  ayahKey: string,
  fromWord: number,
  toWord?: number
): { token: string; index: number; confidence: number; timestampMs: number }[] {
  const ref = engine.getAyahReference(ayahKey);
  const groups = ref?.aya_phonemes_list ?? [];
  const tokens: { token: string; index: number; confidence: number; timestampMs: number }[] = [];
  let i = 0;
  const end = toWord ?? groups.length;
  for (let w = fromWord; w < end; w++) {
    for (const piece of PhonemeVocabulary.tokenize(groups[w] ?? '')) {
      tokens.push({ token: piece, index: i++, confidence: 0.95, timestampMs: i * 60 });
    }
  }
  return tokens;
}

/** All ayahs rendered on a page, in reading order. */
function pageTargets(pageNumber: number): RecitationTarget[] {
  const page = MEDINA_PAGES[pageNumber];
  const out: RecitationTarget[] = [];
  const seen = new Set<string>();
  for (const line of page.lines) {
    if (line.type !== 'text') continue;
    for (const w of line.words) {
      if (w.isAyahMarker) continue;
      const key = `${w.surahNumber}:${w.ayahNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ surahNumber: w.surahNumber, ayahNumber: w.ayahNumber, pageNumber });
    }
  }
  return out;
}

/** The first ayah of the NEXT page — the only candidate allowed to advance the page. */
function nextPageFirstAyah(pageNumber: number): RecitationTarget | null {
  const next = MEDINA_PAGES[pageNumber + 1];
  if (!next) return null;
  for (const line of next.lines) {
    if (line.type !== 'text' || !line.words) continue;
    const word = line.words.find((w) => !w.isAyahMarker);
    if (word) {
      return {
        surahNumber: word.surahNumber,
        ayahNumber: word.ayahNumber,
        pageNumber: pageNumber + 1,
      };
    }
  }
  return null;
}

describe('AyahLocator — Tarteel-style recitation tracking', () => {
  let engine: PhonemeAlignmentEngine;

  beforeAll(async () => {
    engine = new PhonemeAlignmentEngine();
    await engine.initialize();
  });

  it('locates a mid-ayah start inside Al-Fatiha 1:7 instead of locking onto the Basmala', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(1);

    // The reciter opens the mic and starts at "غير المغضوب عليهم" (1:7 words 4-6).
    const speech = simulateSpeechFromWord(engine, '1:7', 4, 7);

    let last: ReturnType<AyahLocator['pushToken']> = null;
    for (const token of speech) {
      last = locator.pushToken(token, targets);
    }

    expect(last).not.toBeNull();
    expect(last!.target.surahNumber).toBe(1);
    expect(last!.target.ayahNumber).toBe(7);
  });

  it('reveals the page word indices of the words actually recited', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(1);

    const speech = simulateSpeechFromWord(engine, '1:7', 4, 7);
    const revealed = new Set<number>();
    for (const token of speech) {
      const res = locator.pushToken(token, targets);
      res?.revealPageWordIndices.forEach((i) => revealed.add(i));
    }

    // 1:7 words 4,5,6 are "غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ" -> page indices 4,5,6
    expect(revealed.has(4)).toBe(true);
    expect(revealed.has(5)).toBe(true);
    expect(revealed.has(6)).toBe(true);
    // The Basmala (1:1) must stay concealed
    expect(revealed.has(0)).toBe(false);
    expect(revealed.has(1)).toBe(false);
  });

  it('follows a continuous recitation across several ayahs on one page', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(1);

    const speech = simulateSpeech(engine, ['1:1', '1:2', '1:3']);
    let last: ReturnType<AyahLocator['pushToken']> = null;
    for (const token of speech) {
      last = locator.pushToken(token, targets);
    }

    expect(last!.target.surahNumber).toBe(1);
    expect(last!.target.ayahNumber).toBe(3);
  });

  it('does NOT advance to the next page when the reciter only recites the current page', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(1);
    const next = nextPageFirstAyah(1);
    const candidates = next ? [...targets, next] : targets;

    const speech = simulateSpeech(engine, ['1:6', '1:7']);
    let last: ReturnType<AyahLocator['pushToken']> = null;
    for (const token of speech) {
      last = locator.pushToken(token, candidates);
    }

    expect(last!.target.ayahNumber).toBe(7);
    expect(last!.target.pageNumber).toBe(1);
  });

  it('advances to the next page only once the reciter starts the next page first ayah', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(1);
    const next = nextPageFirstAyah(1);
    expect(next).not.toBeNull();
    const candidates = [...targets, next!];

    // Finish page 1 …
    for (const token of simulateSpeech(engine, ['1:7'])) {
      locator.pushToken(token, candidates);
    }
    expect(locator.getActiveTarget()!.pageNumber).toBe(1);

    // … then start reciting the first ayah of page 2 (2:1 = "الٓمٓ").
    for (const token of simulateSpeech(engine, ['2:1'])) {
      locator.pushToken(token, candidates);
    }
    expect(locator.getActiveTarget()!.pageNumber).toBe(2);
    expect(locator.getActiveTarget()!.surahNumber).toBe(2);
    expect(locator.getActiveTarget()!.ayahNumber).toBe(1);
  });

  it('detects a mid-ayah start in a surah whose ayah 1 carries a Basmala prefix', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(2);

    // 2:3 on page 2 — recite it from its first word.
    const speech = simulateSpeech(engine, ['2:3']);
    let last: ReturnType<AyahLocator['pushToken']> = null;
    for (const token of speech) {
      last = locator.pushToken(token, targets);
    }

    expect(last!.target.surahNumber).toBe(2);
    expect(last!.target.ayahNumber).toBe(3);
  });

  it('maps the recited words onto the PAGE word indices of a Basmala-prefixed ayah', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(2);

    // 2:2 — the rendered page starts the ayah at word index 4 (0..3 are the
    // prepended Basmalah), while the reference dataset numbers it from 0.
    const speech = simulateSpeech(engine, ['2:2']);
    const revealed = new Set<number>();
    for (const token of speech) {
      const res = locator.pushToken(token, targets);
      res?.revealPageWordIndices.forEach((i) => revealed.add(i));
    }

    const rendered = getRenderedAyahWordsByPage(2, 2, 2);
    const renderedIndices = rendered.map((w) => w.wordIndex);
    expect(renderedIndices.length).toBeGreaterThan(0);
    // Every revealed index must be a real page word of ayah 2:2.
    for (const idx of revealed) {
      expect(renderedIndices).toContain(idx);
    }
    // The first revealed word must be the first word of the ayah.
    expect(Math.min(...revealed)).toBe(renderedIndices[0]);
  });
});
