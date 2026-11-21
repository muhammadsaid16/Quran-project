import { beforeEach, describe, expect, it } from 'vitest';
import {
  isAyahAtOrBefore,
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
    expect(isAyahAtOrBefore(1001, null)).toBe(false);
  });

  it('stops at the surah boundary instead of exposing earlier surahs', () => {
    const startOfAlImran = ayahStateKey(3, 1);
    const endOfBaqarah = ayahStateKey(2, 286);
    expect(startOfAlImran).toBeGreaterThan(endOfBaqarah);
    // Different surah: it must stay masked
    expect(isAyahAtOrBefore(endOfBaqarah, startOfAlImran)).toBe(false);
    expect(isAyahAtOrBefore(ayahStateKey(2, 100), endOfBaqarah)).toBe(true);
  });

  it('reveals the located ayah and every ayah before it on the page', () => {
    const located = ayahStateKey(1, 6);
    useActiveRecallStore.getState().setRevealFromKey(located);

    const pageWords = MEDINA_PAGES[1].lines.flatMap((line) =>
      line.type === 'text' ? line.words : []
    );
    const ayahNumbers = Array.from(
      new Set(pageWords.map((word) => word.ayahNumber))
    );
    expect(ayahNumbers.length).toBeGreaterThan(3);

    const visible = ayahNumbers.filter((ayah) =>
      isAyahAtOrBefore(ayahStateKey(1, ayah), located)
    );
    // Ayahs 1 through 6 are revealed
    expect(visible).toContain(1);
    expect(visible).toContain(2);
    expect(visible).toContain(3);
    expect(visible).toContain(4);
    expect(visible).toContain(5);
    expect(visible).toContain(6);
    // Ayah 7 (the one after) must stay concealed
    expect(visible).not.toContain(7);
  });

  it('keeps the anchor when the HUD re-asserts concealment on mic start', () => {
    const located = ayahStateKey(1, 6);
    useActiveRecallStore.getState().setRevealFromKey(located);

    // RecitationHUD's microphone handler re-applies the concealment level;
    // that must not re-ghost the ayahs before or at the located one.
    useActiveRecallStore.getState().setGhostTextLevel('level1_concealed');
    useActiveRecallStore.getState().setAcquisitionStep('recite');

    expect(useActiveRecallStore.getState().revealFromKey).toBe(located);
    expect(isAyahAtOrBefore(ayahStateKey(1, 5), located)).toBe(true);
    expect(isAyahAtOrBefore(ayahStateKey(1, 6), located)).toBe(true);
    expect(isAyahAtOrBefore(ayahStateKey(1, 7), located)).toBe(false);
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