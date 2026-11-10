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
  wordIndex: number;
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
