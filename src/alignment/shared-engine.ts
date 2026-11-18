/**
 * The phoneme database (`ordered_quran_phonemes.json`) is loaded once and
 * shared by every alignment consumer — the streaming locator in the HUD and the
 * page spotter. Loading it twice would keep two copies of the whole Quran's
 * phoneme data in memory.
 */

import { PhonemeAlignmentEngine } from './phoneme-alignment-engine';

let sharedEngine: PhonemeAlignmentEngine | null = null;
let initPromise: Promise<PhonemeAlignmentEngine> | null = null;

export function getSharedAlignmentEngine(): PhonemeAlignmentEngine {
  if (!sharedEngine) sharedEngine = new PhonemeAlignmentEngine();
  return sharedEngine;
}

/**
 * Returns the shared engine once its database is loaded.
 *
 * Concurrent callers share one in-flight load, so mounting the HUD and the
 * spotter together cannot download the phoneme database twice.
 */
export function getReadyAlignmentEngine(): Promise<PhonemeAlignmentEngine> {
  const engine = getSharedAlignmentEngine();
  if (!initPromise) {
    initPromise = engine.initialize().then(
      () => engine,
      (error) => {
        initPromise = null;
        throw error;
      }
    );
  }
  return initPromise;
}

/** Drops the shared database. Only for tests or a hard reset. */
export function disposeSharedAlignmentEngine(): void {
  sharedEngine = null;
  initPromise = null;
}