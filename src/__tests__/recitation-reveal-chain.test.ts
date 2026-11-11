/**
 * Integration test for the recitation reveal chain.
 *
 * The chain is:
 *   AyahLocator  →  revealWordHint(composite ayah key, PAGE word index)
 *                →  GhostAyah reads revealedWordIndices[composite key]
 *                →  the word becomes visible
 *
 * Two things can break it:
 *  - the ayah key: a bare ayah number collides across surahs (page 604 holds
 *    112:1, 113:1 AND 114:1),
 *  - the word index: the reference dataset and the Mushaf page number their
 *    words differently (Basmalah prefix, waqf marks).
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PhonemeAlignmentEngine } from '@/alignment/phoneme-alignment-engine';
import { PhonemeVocabulary } from '@/alignment/phoneme-vocabulary';
import { AyahLocator, RecitationTarget } from '@/recitation/ayah-locator';
import { MEDINA_PAGES } from '@/data/medina-pages';
import {
  ayahStateKey,
  buildAyahWordIndexMap,
  getRenderedAyahWordsByPage,
} from '@/data/mushaf-layout';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';

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

describe('Recitation reveal chain', () => {
  let engine: PhonemeAlignmentEngine;

  beforeAll(async () => {
    engine = new PhonemeAlignmentEngine();
    await engine.initialize();
  });

  beforeEach(() => {
    useActiveRecallStore.getState().resetHints();
    useRecitationStore.getState().clearEvaluatedWords();
  });

  it('reveals only the recited ayah when two surahs share an ayah number', async () => {
    const locator = new AyahLocator(engine);
    // Page 604 holds 112:1, 113:1 AND 114:1 — all "ayah 1".
    const targets = pageTargets(604);

    // The reciter reads Al-Ikhlas (112:1) only.
    const speech = simulateSpeech(engine, ['112:1']);
    for (const token of speech) {
      const res = locator.pushToken(token, targets);
      if (res) {
        const key = ayahStateKey(res.target.surahNumber, res.target.ayahNumber);
        for (const pageIndex of res.revealPageWordIndices) {
          useActiveRecallStore.getState().revealWordHint(key, pageIndex);
        }
      }
    }

    const state = useActiveRecallStore.getState();
    const revealed112 = state.revealedWordIndices[ayahStateKey(112, 1)] ?? [];
    const revealed113 = state.revealedWordIndices[ayahStateKey(113, 1)] ?? [];
    const revealed114 = state.revealedWordIndices[ayahStateKey(114, 1)] ?? [];

    expect(revealed112.length).toBeGreaterThan(0);
    // The other two surahs must stay concealed.
    expect(revealed113).toEqual([]);
    expect(revealed114).toEqual([]);
  });

  it('reveals the words under their PAGE index, not their reference index', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(2);

    // 2:2 — the page renders the ayah starting at word index 4 (0..3 are the
    // prepended Basmalah), the reference dataset numbers it from 0.
    const speech = simulateSpeech(engine, ['2:2']);
    for (const token of speech) {
      const res = locator.pushToken(token, targets);
      if (res) {
        const key = ayahStateKey(res.target.surahNumber, res.target.ayahNumber);
        for (const pageIndex of res.revealPageWordIndices) {
          useActiveRecallStore.getState().revealWordHint(key, pageIndex);
        }
      }
    }

    const rendered = getRenderedAyahWordsByPage(2, 2, 2);
    const pageIndices = rendered.map((w) => w.wordIndex);
    const revealed = useActiveRecallStore.getState().revealedWordIndices[ayahStateKey(2, 2)] ?? [];

    expect(revealed.length).toBeGreaterThan(0);
    // Every revealed index must be a word the page actually renders for 2:2.
    for (const idx of revealed) {
      expect(pageIndices).toContain(idx);
    }
    // And the revealed set must NOT contain the Basmalah indices 0..3, which
    // belong to a different rendering path.
    for (const idx of revealed) {
      expect(idx).toBeGreaterThanOrEqual(pageIndices[0]);
    }
  });

  it('keeps the visual-review highlight on the same word the Mushaf renders', async () => {
    const locator = new AyahLocator(engine);
    const targets = pageTargets(2);

    const speech = simulateSpeech(engine, ['2:2']);
    const collected: { wordIndex: number; pageWordIndex?: number; status: string }[] = [];

    for (const token of speech) {
      const res = locator.pushToken(token, targets);
      if (!res) continue;
      const vKey = `${res.target.surahNumber}:${res.target.ayahNumber}`;
      const alignResult = engine.alignAyah(vKey, speech, {});
      const referenceWords = engine.getReferenceWords(vKey);
      const renderedWords = getRenderedAyahWordsByPage(
        res.target.pageNumber,
        res.target.surahNumber,
        res.target.ayahNumber
      );
      const pageIndexMap = buildAyahWordIndexMap(renderedWords, referenceWords);
      for (const w of alignResult.words) {
        const pageIndex = pageIndexMap[w.wordIndex];
        collected.push({
          wordIndex: w.wordIndex,
          pageWordIndex: pageIndex >= 0 ? pageIndex : undefined,
          status: w.status,
        });
      }
    }

    // The words that carry a status must map onto real page words.
    for (const w of collected) {
      if (w.pageWordIndex === undefined) continue;
      const rendered = getRenderedAyahWordsByPage(2, 2, 2);
      expect(rendered.map((r) => r.wordIndex)).toContain(w.pageWordIndex);
    }
  });
});
