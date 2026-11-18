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

  it('follows mushaf order across a surah boundary', () => {
    const endOfBaqarah = ayahStateKey(2, 286);
    const startOfAlImran = ayahStateKey(3, 1);
    expect(startOfAlImran).toBeGreaterThan(endOfBaqarah);
    expect(isAyahAtOrAfter(startOfAlImran, endOfBaqarah)).toBe(true);
    expect(isAyahAtOrAfter(endOfBaqarah, startOfAlImran)).toBe(false);
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

  it('drops the anchor when concealment is changed explicitly', () => {
    const store = useActiveRecallStore.getState();
    store.setRevealFromKey(ayahStateKey(1, 3));
    expect(useActiveRecallStore.getState().revealFromKey).toBe(
      ayahStateKey(1, 3)
    );

    useActiveRecallStore.getState().setGhostTextLevel('level2_first_words');
    expect(useActiveRecallStore.getState().revealFromKey).toBeNull();
  });

  it('drops the anchor when a new recall session starts', () => {
    useActiveRecallStore.getState().setRevealFromKey(ayahStateKey(1, 3));
    useActiveRecallStore.getState().startRecallSession('retention');
    expect(useActiveRecallStore.getState().revealFromKey).toBeNull();
  });
});