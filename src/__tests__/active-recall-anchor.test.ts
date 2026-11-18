import { beforeEach, describe, expect, it } from 'vitest';
import {
  isAyahAtOrAfter,
  useActiveRecallStore,
} from '@/stores/active-recall-store';
import { ayahStateKey } from '@/data/mushaf-layout';
import { MEDINA_PAGES } from '@/data/medina-pages';

const reset = () =>
  useActiveRecallStore.setState({
    revealFromKey: null,
    ghostTextLevel: 'visible',
    mode: 'acquisition',
  });

describe('reveal-from anchor', () => {
  beforeEach(reset);

  it('treats a null anchor as "nothing auto-revealed"', () => {
    expect(isAyahAtOrAfter(1001, null)).toBe(false);
  });

  it('stops at the surah boundary instead of exposing later surahs', () => {
    const endOfBaqarah = ayahStateKey(2, 286);
    const startOfAlImran = ayahStateKey(3, 1);
    expect(startOfAlImran).toBeGreaterThan(endOfBaqarah);
    // Numerically "after", but a different surah: it must stay masked so
    // opening another page or surah does not dump the whole page open.
    expect(isAyahAtOrAfter(startOfAlImran, endOfBaqarah)).toBe(false);
    expect(isAyahAtOrAfter(endOfBaqarah, ayahStateKey(2, 100))).toBe(true);
  });

  it('reveals the located ayah and every ayah after it on the page', () => {
    const located = ayahStateKey(1, 3);
    useActiveRecallStore.getState().setRevealFromKey(located);

    const pageWords = MEDINA_PAGES[1].lines.flatMap((line) =>
      line.type === 'text' ? line.words : []
    );
    const ayahNumbers = Array.from(
      new Set(pageWords.map((word) => word.ayahNumber))
    );
    expect(ayahNumbers.length).toBeGreaterThan(3);

    const visible = ayahNumbers.filter((ayah) =>
      isAyahAtOrAfter(ayahStateKey(1, ayah), located)
    );
    expect(visible).toContain(3);
    expect(visible).toContain(Math.max(...ayahNumbers));
    expect(visible).not.toContain(1);
    expect(visible).not.toContain(2);
  });

  it('keeps the anchor when the HUD re-asserts concealment on mic start', () => {
    const located = ayahStateKey(1, 6);
    useActiveRecallStore.getState().setRevealFromKey(located);

    // RecitationHUD's microphone handler re-applies the concealment level;
    // that must not re-ghost the ayahs after the located one.
    useActiveRecallStore.getState().setGhostTextLevel('level1_concealed');
    useActiveRecallStore.getState().setAcquisitionStep('recite');

    expect(useActiveRecallStore.getState().revealFromKey).toBe(located);
    expect(isAyahAtOrAfter(ayahStateKey(1, 7), located)).toBe(true);
  });

  it('drops the anchor only through the explicit hide control', () => {
    const located = ayahStateKey(1, 3);
    useActiveRecallStore.getState().setRevealFromKey(located);

    useActiveRecallStore.getState().clearRevealAnchor();
    expect(useActiveRecallStore.getState().revealFromKey).toBeNull();
  });

  it('drops the anchor when a new recall session starts', () => {
    useActiveRecallStore.getState().setRevealFromKey(ayahStateKey(1, 3));
    useActiveRecallStore.getState().startRecallSession('retention');
    expect(useActiveRecallStore.getState().revealFromKey).toBeNull();
  });
});