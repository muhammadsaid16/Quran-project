/**
 * Quran Cognitive OS v2.0 — Phoneme Alignment & Error Detection Types
 * Milestone 3 Specification: CTC Alignment, DTW, and 6-Tier Classifier.
 */

export type AlignmentOp = 'match' | 'substitution' | 'deletion' | 'insertion';

export type RecitationErrorCategory =
  | 'Correct'
  | 'Omission'
  | 'Substitution'
  | 'Repetition'
  | 'Sequence Error'
  | 'Uncertain';

export type WordRecitationStatus =
  | 'correct'
  | 'omission'
  | 'substitution'
  | 'repetition'
  | 'uncertain';

export interface StreamingPhonemeToken {
  token: string;
  timestampMs?: number;
  confidence?: number;
  index?: number;
}

export interface PhonemeAlignmentStep {
  refToken: string | null;
  hypToken: string | null;
  op: AlignmentOp;
  cost: number;
  refIndex: number;
  hypIndex: number;
  timestampMs?: number;
  confidence?: number;
  wordIndex?: number;
}

export interface WordAlignmentResult {
  /** Index of the word inside the reference (phoneme dataset) word list. */
  wordIndex: number;
  /**
   * Index of the word inside the rendered Mushaf page.
   *
   * The two spaces differ: the reference dataset numbers only the words of the
   * ayah, while the Mushaf dataset also counts the prepended Basmalah and the
   * standalone waqf marks. `undefined` when the word could not be placed.
   */
  pageWordIndex?: number;
  ayahNumber?: number;
  surahNumber?: number;
  uthmaniText: string;
  expectedPhonemes: string;
  detectedPhonemes: string;
  status: WordRecitationStatus;
  /** 0-100, present only when real acoustic samples exist; absence means unknown, not failure. */
  confidence?: number;
  startTimeMs?: number;
  endTimeMs?: number;
  errorDetails?: string;
}

export interface AlignmentDiagnostics {
  matchesCount: number;
  substitutionsCount: number;
  omissionsCount: number;
  insertionsCount: number;
  repetitions: string[];
  isSequenceJump: boolean;
  uncertainScore: number;
  uncertaintyReasons?: string[];
}

export interface AyahAlignmentResult {
  verseKey: string;
  primaryCategory: RecitationErrorCategory;
  allCategories: RecitationErrorCategory[];
  accuracy: number; // 0.0 - 1.0
  per: number; // Phoneme Error Rate: (S + D + I) / N
  /** Overall acoustic confidence (0.0 - 1.0); undefined when the decoder exposes no probabilities. */
  confidence?: number;
  latencyMs: number; // Execution time of alignment algorithm in ms (< 100ms)
  referencePhonemes: string;
  hypothesisPhonemes: string;
  alignmentSteps: PhonemeAlignmentStep[];
  words: WordAlignmentResult[];
  diagnostics: AlignmentDiagnostics;
}

export interface AlignmentOptions {
  targetAyahKey: string;
  recitedAyahKeyCandidate?: string;
  acousticConfidence?: number;
  uncertainThreshold?: number; // default 0.65
  perMatchThreshold?: number; // default 0.08
}

export interface StreamingAlignmentResult {
  verseKey: string;
  activeWordIndex: number;
  matchedPhonemesCount: number;
  totalReferencePhonemesCount: number;
  progressRatio: number; // 0.0 - 1.0
  words: WordAlignmentResult[];
  latestStatus: WordRecitationStatus;
}

/**
 * Where inside an ayah a hypothesis matched, ignoring the strict
 * word-by-word order. Used to detect that a reciter resumed mid-ayah.
 */
export interface AyahLocation {
  verseKey: string;
  /** Number of phoneme tokens that matched the reference exactly. */
  matchedPhonemes: number;
  /** Number of phoneme tokens aligned to the reference (match or near-miss). */
  alignedPhonemes: number;
  /** Reference word indices that received at least one match. */
  matchedWordIndices: number[];
  /** Reference word indices that received at least one aligned phoneme. */
  alignedWordIndices: number[];
  /** Index of the first matched reference word (-1 when nothing matched). */
  firstMatchedWord: number;
  /** Index of the first hypothesis token that matched (-1 when nothing matched). */
  firstMatchedHypIndex: number;
  /** Index of the FIRST hypothesis token of the matched segment (-1 when none). */
  startHypothesisIndex: number;
  /** Index of the last hypothesis token that matched (-1 when nothing matched). */
  lastMatchedHypIndex: number;
  /** Reference word the alignment ENDED on (-1 when nothing matched). */
  endReferenceWord: number;
  /** Reference word the alignment STARTED on (-1 when nothing matched). */
  startReferenceWord: number;
  /** Hypothesis tokens that fall inside the matched segment. */
  coveredHypothesisTokens: number;
  /** How many reference words matched. */
  matchedWords: number;
}
