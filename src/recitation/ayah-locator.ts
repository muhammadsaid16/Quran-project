/**
 * Ayah Locator — finds WHICH ayah the reciter is currently reciting.
 *
 * The old approach (`PhonemeAlignmentEngine.alignIncremental`) verifies words
 * STRICTLY SEQUENTIALLY: word `w` only counts when every word before it also
 * matched. A reciter who opens the microphone and starts mid-ayah (for example
 * at "غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ" inside 1:7) therefore scores ZERO matches
 * against the correct ayah, and the HUD locks onto the wrong ayah — which is
 * exactly what produced the amber "substitution" boxes over the Basmala.
 *
 * This module locates the reciter with a LOCAL alignment: it asks "which part
 * of this ayah does this speech match?" instead of demanding that the speech
 * starts at the first word.
 *
 * The tracking model:
 *  - `pending` holds the speech tokens that are not yet committed to a
 *    finished ayah.
 *  - Every candidate ayah is scored by COVERAGE — the share of the speech it
 *    explains. Coverage is fair between short and long ayahs, unlike a raw
 *    match count.
 *  - The active ayah keeps the target while it explains the speech best.
 *  - When the reciter reaches the end of the active ayah, its tokens are
 *    committed and dropped, so the speech that follows is judged against the
 *    ayah that comes next.
 *  - Only ayahs AFTER the active one are considered for a switch, so the
 *    reciter never moves backwards by accident.
 *
 * The module is pure logic (no React, no DOM) so it can be unit tested.
 */

import { PhonemeAlignmentEngine } from '@/alignment/phoneme-alignment-engine';
import { AyahLocation, StreamingPhonemeToken } from '@/alignment/types';
import {
  buildAyahWordIndexMap,
  getRenderedAyahWordsByPage,
} from '@/data/mushaf-layout';

/** One ayah that the reciter may be reciting. */
export interface RecitationTarget {
  surahNumber: number;
  ayahNumber: number;
  /** The Medina page this ayah is rendered on (may be the NEXT page). */
  pageNumber: number;
}

/** The "surah:ayah" key of a target. */
export function verseKeyOf(target: {
  surahNumber: number;
  ayahNumber: number;
}): string {
  return `${target.surahNumber}:${target.ayahNumber}`;
}

/** Result of feeding one speech token into the locator. */
export interface LocatorResult {
  /** The ayah the reciter is on (changed or not). */
  target: RecitationTarget;
  /** True when the target just changed. */
  changed: boolean;
  /** True when the reciter reached the end of the target ayah. */
  completed: boolean;
  /** Page word indices that must be revealed for the target ayah. */
  revealPageWordIndices: number[];
  /** Reference (dataset) word indices matched for the target ayah. */
  matchedReferenceWords: number[];
}

/** Minimum speech tokens before a target may be anchored at all. */
const MIN_ANCHOR_TOKENS = 3;
/** Minimum aligned phonemes before a target is trusted. */
const MIN_ACCEPT_SCORE = 3;
/** Minimum share of the speech a candidate must explain to be anchored. */
const MIN_COVERAGE = 0.5;
/** How much better a forward candidate must be before the active target is dropped. */
const SWITCH_MARGIN = 0.15;
/** Matched words needed to confirm that the reciter started mid-ayah. */
const MID_AYAH_CONFIRMATION = 2;
/** Speech tokens used for scoring (keeps the scan cheap and local). */
const SCAN_WINDOW_TOKENS = 48;

interface CandidateScore {
  target: RecitationTarget & { verseKey: string };
  location: AyahLocation;
  /** Share of the scanned speech this ayah explains (0..1). */
  coverage: number;
}

export class AyahLocator {
  /** Speech tokens not yet committed to a finished ayah. */
  private pending: StreamingPhonemeToken[] = [];
  private active: RecitationTarget | null = null;
  /** The ayah the reciter last finished — later switches may only go past it. */
  private committed: RecitationTarget | null = null;
  private revealed = new Set<string>();
  /** Lowest reference word index the reciter entered the active ayah at. */
  private entryReferenceWord = -1;
  /** True once the mid-ayah start has been confirmed by enough matched words. */
  private midAyahConfirmed = false;

  constructor(private engine: PhonemeAlignmentEngine) {}

  /** Clears all state (called when the microphone opens or closes). */
  public reset(): void {
    this.pending = [];
    this.active = null;
    this.committed = null;
    this.revealed.clear();
    this.entryReferenceWord = -1;
    this.midAyahConfirmed = false;
  }

  public getActiveTarget(): RecitationTarget | null {
    return this.active;
  }

  /**
   * Called when the Mushaf moved to another page. The committed ayah belongs
   * to the old page, so the forward restriction has to be lifted — but the
   * pending speech is kept, because the reciter is already reciting the first
   * ayah of the new page.
   */
  public onPageChanged(): void {
    this.committed = null;
    this.active = null;
    this.entryReferenceWord = -1;
    this.midAyahConfirmed = false;
  }

  /**
   * Feeds one speech token into the locator.
   *
   * @param token      the recognised phoneme token
   * @param candidates ayahs that may be recited, in reading order. The last
   *                   candidate may live on the NEXT page — that is the only
   *                   way the page can advance.
   */
  public pushToken(
    token: StreamingPhonemeToken,
    candidates: RecitationTarget[]
  ): LocatorResult | null {
    this.pending.push(token);
    if (candidates.length === 0) return null;

    const window =
      this.pending.length > SCAN_WINDOW_TOKENS
        ? this.pending.slice(-SCAN_WINDOW_TOKENS)
        : this.pending;
    if (window.length < MIN_ANCHOR_TOKENS) return null;

    const scored = this.scoreCandidates(candidates, window);

    // ── 1. Anchor on a target when there is none yet ────────────────────
    if (!this.active) {
      const best = this.bestOf(scored, this.forwardCandidates(candidates, null));
      if (!best || best.coverage < MIN_COVERAGE) return null;
      this.active = best.target;
      this.entryReferenceWord = best.location.startReferenceWord;
      this.midAyahConfirmed = false;
      // Drop the speech that belongs to an earlier ayah.
      this.trimPending(best.location.startHypothesisIndex);
      return this.buildResult(best.location, true, false);
    }

    // ── 2. Commit the active ayah when the reciter reached its last word ──
    const activeKey = verseKeyOf(this.active);
    const activeScore = scored.find((s) => s.target.verseKey === activeKey);
    let completed = false;

    if (activeScore) {
      const lastWordIndex =
        this.engine.getReferenceWords(activeKey).length - 1;
      if (
        activeScore.location.endReferenceWord === lastWordIndex &&
        activeScore.location.lastMatchedHypIndex < this.pending.length - 1
      ) {
        // The reciter finished this ayah and continued speaking.
        completed = true;
        this.trimPending(activeScore.location.lastMatchedHypIndex + 1);
        this.committed = this.active;
      }
    }

    // ── 3. Consider moving on to a later ayah ────────────────────────────
    const forward = this.forwardCandidates(candidates, this.active);
    const bestForward = this.bestOf(scored, forward);

    if (
      bestForward &&
      bestForward.coverage >= MIN_COVERAGE &&
      bestForward.coverage > (activeScore?.coverage ?? 0) + SWITCH_MARGIN
    ) {
      this.active = bestForward.target;
      this.entryReferenceWord = bestForward.location.startReferenceWord;
      this.midAyahConfirmed = false;
      this.trimPending(bestForward.location.startHypothesisIndex);
      return this.buildResult(bestForward.location, true, completed);
    }

    // ── 4. Stay on the active ayah ──────────────────────────────────────
    if (!activeScore) return null;
    return this.buildResult(activeScore.location, false, completed);
  }

  /**
   * The candidates the reciter may move to: the ones AFTER the committed
   * ayah. When nothing was committed yet, every candidate is allowed.
   */
  private forwardCandidates(
    candidates: RecitationTarget[],
    active: RecitationTarget | null
  ): Set<string> {
    const allowed = new Set<string>();
    const anchor = this.committed ?? active;

    if (!anchor) {
      for (const c of candidates) allowed.add(verseKeyOf(c));
      return allowed;
    }

    const anchorKey = verseKeyOf(anchor);
    const anchorIndex = candidates.findIndex((c) => verseKeyOf(c) === anchorKey);
    for (let i = anchorIndex + 1; i < candidates.length; i++) {
      allowed.add(verseKeyOf(candidates[i]));
    }
    return allowed;
  }

  private bestOf(
    scored: CandidateScore[],
    allowed: Set<string>
  ): CandidateScore | null {
    let best: CandidateScore | null = null;
    for (const s of scored) {
      if (!allowed.has(s.target.verseKey)) continue;
      if (s.coverage < MIN_COVERAGE) continue;
      if (!best || s.coverage > best.coverage) best = s;
    }
    return best;
  }

  /** Removes the first `count` pending tokens. */
  private trimPending(count: number): void {
    if (count <= 0 || count >= this.pending.length) return;
    this.pending = this.pending.slice(count);
  }

  /** Builds the public result for the current target. */
  private buildResult(
    location: AyahLocation,
    changed: boolean,
    completed: boolean
  ): LocatorResult {
    const target = this.active!;
    return {
      target,
      changed,
      completed,
      revealPageWordIndices: this.resolveRevealIndices(target, location),
      matchedReferenceWords: location.alignedWordIndices,
    };
  }

  /**
   * Translates the matched reference words into page word indices (the index
   * space the Mushaf renderer uses) and returns the ones not revealed yet.
   *
   * When the reciter started MID-ayah (not at the first word), the whole rest
   * of the ayah is revealed once the start has been confirmed: the reciter is
   * already inside the ayah, so the text from there on must be visible.
   */
  private resolveRevealIndices(
    target: RecitationTarget,
    location: AyahLocation
  ): number[] {
    const verseKey = verseKeyOf(target);
    const referenceWords = this.engine.getReferenceWords(verseKey);
    const renderedWords = getRenderedAyahWordsByPage(
      target.pageNumber,
      target.surahNumber,
      target.ayahNumber
    );
    const indexMap = buildAyahWordIndexMap(renderedWords, referenceWords);

    const indices: number[] = [];

    // 1. The words that were actually recited.
    for (const refIndex of location.alignedWordIndices) {
      const pageIndex = indexMap[refIndex];
      if (pageIndex === undefined || pageIndex < 0) continue;
      const key = `${verseKey}:${pageIndex}`;
      if (this.revealed.has(key)) continue;
      this.revealed.add(key);
      indices.push(pageIndex);
    }

    // 2. A confirmed mid-ayah start reveals the remainder of that ayah.
    const entry = this.entryReferenceWord;
    if (
      entry > 0 &&
      !this.midAyahConfirmed &&
      location.alignedWordIndices.length >= MID_AYAH_CONFIRMATION
    ) {
      this.midAyahConfirmed = true;
      for (let refIndex = entry; refIndex < referenceWords.length; refIndex++) {
        const pageIndex = indexMap[refIndex];
        if (pageIndex === undefined || pageIndex < 0) continue;
        const key = `${verseKey}:${pageIndex}`;
        if (this.revealed.has(key)) continue;
        this.revealed.add(key);
        indices.push(pageIndex);
      }
    }

    return indices;
  }

  /** Scores every candidate ayah against the given speech window. */
  private scoreCandidates(
    candidates: RecitationTarget[],
    window: StreamingPhonemeToken[]
  ): CandidateScore[] {
    const results: CandidateScore[] = [];
    for (const candidate of candidates) {
      const verseKey = verseKeyOf(candidate);
      const location = this.engine.locateInAyah(verseKey, window);
      if (!location) continue;
      results.push({
        target: { ...candidate, verseKey },
        location,
        coverage:
          window.length > 0 ? location.coveredHypothesisTokens / window.length : 0,
      });
    }
    return results;
  }
}
