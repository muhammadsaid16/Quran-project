/**
 * Page Spotter — answers "which ayah of THIS page did the reciter just say?"
 *
 * The streaming `AyahLocator` has to guess while the reciter is still speaking:
 * it anchors on the first few tokens and may only move forward afterwards. That
 * is the right model for continuous tracking, but it is the wrong model for
 * cold-start navigation — the reciter opens the microphone on a page, says one
 * ayah, and wants to be taken to it. A wrong early anchor is unrecoverable
 * there.
 *
 * The spotter waits for the whole utterance, then compares it against EVERY
 * ayah of the page with a LOCAL phoneme alignment and ranks the candidates.
 * Only one page is scanned (5–15 ayahs), so the whole scan is a few DTW passes
 * and stays well inside a frame budget.
 *
 * Ranking favours ayahs whose phonemes the speech matches EXACTLY, not ayahs
 * that merely absorb the speech through substitutions: `matchRatio` is the
 * share of the recorded phonemes that matched one-to-one. A wrong ayah can
 * still be "covered" by DTW (Arabic phonemes are a small alphabet) but its
 * exact-match ratio stays low.
 *
 * The module is pure logic (no React, no DOM) so it can be unit tested.
 */

import { PhonemeAlignmentEngine } from '@/alignment/phoneme-alignment-engine';
import { AyahLocation, StreamingPhonemeToken } from '@/alignment/types';
import { MEDINA_PAGES } from '@/data/medina-pages';

/** One ayah rendered on the page being spotted. */
export interface SpotterCandidate {
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
}

/** A scored candidate. */
export interface SpotterMatch {
  target: SpotterCandidate;
  verseKey: string;
  /** 0..1 — how well this ayah explains the recorded speech. */
  score: number;
  /** Share of the recorded tokens inside the aligned segment. */
  coverage: number;
  /** Share of the aligned tokens that matched exactly (not substitutions). */
  precision: number;
  /** Share of the candidate's own words that were matched. */
  recall: number;
  matchedWords: number;
  referenceWords: number;
  /** Canonical Uthmani text of the candidate, for the confirmation card. */
  text: string;
  location: AyahLocation;
}

export type SpotterConfidence = 'high' | 'medium' | 'low';

export interface SpotterOutcome {
  best: SpotterMatch | null;
  /** Other plausible ayahs, best first (never includes `best`). */
  alternatives: SpotterMatch[];
  /** True when two candidates are too close to jump without asking. */
  ambiguous: boolean;
  confidence: SpotterConfidence;
  reason: 'match' | 'ambiguous' | 'no-match' | 'no-speech';
}

/** Below this the utterance is too short to identify anything. */
export const MIN_SPEECH_TOKENS = 4;
/** A match must contain at least this many exact phoneme matches. */
const MIN_MATCHED_PHONEMES = 8;
/** Score gates for the confidence tiers. */
const HIGH_SCORE = 0.6;
const MEDIUM_SCORE = 0.4;
/** A tier is only trusted when the runner-up is this far behind. */
const HIGH_MARGIN = 0.12;
const MEDIUM_MARGIN = 0.05;
const MIN_ALTERNATIVE_SCORE = 0.2;
const MAX_ALTERNATIVES = 3;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function verseKeyOf(candidate: { surahNumber: number; ayahNumber: number }): string {
  return `${candidate.surahNumber}:${candidate.ayahNumber}`;
}

/**
 * Every distinct ayah rendered on a Medina page, in reading order.
 *
 * Ayah markers are skipped: they are ornaments, not recitable words, and an
 * ayah that opens a page is already represented by its first real word.
 */
export function collectPageCandidates(pageNumber: number): SpotterCandidate[] {
  const page = MEDINA_PAGES[pageNumber];
  if (!page) return [];

  const candidates: SpotterCandidate[] = [];
  const seen = new Set<string>();

  for (const line of page.lines) {
    if (line.type !== 'text' || !line.words) continue;
    for (const word of line.words) {
      if (word.isAyahMarker) continue;
      const key = verseKeyOf(word);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        surahNumber: word.surahNumber,
        ayahNumber: word.ayahNumber,
        pageNumber,
      });
    }
  }

  return candidates;
}

export class PageSpotter {
  constructor(private engine: PhonemeAlignmentEngine) {}

  /**
   * Ranks every candidate ayah against the recorded utterance.
   *
   * @param tokens     the recognised phoneme tokens of the utterance
   * @param candidates the ayahs of the page (see `collectPageCandidates`)
   */
  public identify(
    tokens: StreamingPhonemeToken[],
    candidates: SpotterCandidate[]
  ): SpotterOutcome {
    if (tokens.length < MIN_SPEECH_TOKENS || candidates.length === 0) {
      return {
        best: null,
        alternatives: [],
        ambiguous: false,
        confidence: 'low',
        reason: 'no-speech',
      };
    }

    const scored: SpotterMatch[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
      const key = verseKeyOf(candidate);
      if (seen.has(key)) continue;
      seen.add(key);

      const location = this.engine.locateInAyah(key, tokens);
      if (!location || location.matchedPhonemes < MIN_MATCHED_PHONEMES) continue;

      const referenceWords = Math.max(1, this.engine.getReferenceWords(key).length);
      const coverage = clamp01(location.coveredHypothesisTokens / tokens.length);
      const precision =
        location.coveredHypothesisTokens > 0
          ? clamp01(location.matchedPhonemes / location.coveredHypothesisTokens)
          : 0;
      const recall = clamp01(location.matchedWords / referenceWords);
      const matchRatio = clamp01(location.matchedPhonemes / tokens.length);
      // Short fragments ("one word heard") must not win over a fully recited
      // ayah: the length factor only reaches 1 after three matched words.
      const lengthFactor = clamp01(location.matchedWords / 3);

      const score =
        matchRatio * (0.65 + 0.35 * recall) * (0.5 + 0.5 * lengthFactor);

      scored.push({
        target: candidate,
        verseKey: key,
        score,
        coverage,
        precision,
        recall,
        matchedWords: location.matchedWords,
        referenceWords,
        text: this.engine.getAyahReference(key)?.aya_text ?? '',
        location,
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.matchedWords - a.matchedWords;
    });

    const best = scored[0] ?? null;
    if (!best || best.score < MIN_ALTERNATIVE_SCORE) {
      return {
        best: null,
        alternatives: scored.slice(0, MAX_ALTERNATIVES).filter((m) => m.score >= MIN_ALTERNATIVE_SCORE),
        ambiguous: false,
        confidence: 'low',
        reason: 'no-match',
      };
    }

    const runnerUp = scored[1] ?? null;
    const gap = runnerUp ? best.score - runnerUp.score : 1;

    let confidence: SpotterConfidence = 'low';
    if (best.score >= HIGH_SCORE && gap >= HIGH_MARGIN) {
      confidence = 'high';
    } else if (best.score >= MEDIUM_SCORE && gap >= MEDIUM_MARGIN) {
      confidence = 'medium';
    }

    const ambiguous = confidence === 'low';

    const alternatives = scored
      .slice(1)
      .filter((m) => m.score >= MIN_ALTERNATIVE_SCORE)
      .slice(0, MAX_ALTERNATIVES);

    return {
      best,
      alternatives,
      ambiguous,
      confidence,
      reason:
        confidence === 'low'
          ? ambiguous
            ? 'ambiguous'
            : 'no-match'
          : 'match',
    };
  }
}