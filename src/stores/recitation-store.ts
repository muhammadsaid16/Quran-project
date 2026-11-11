import { create } from 'zustand';
import { WordAlignmentResult, WordRecitationStatus } from '@/alignment/types';
import { useAchievementStore } from '@/stores/achievement-store';

export type RecitationStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'evaluating'
  | 'completed'
  | 'error';

export interface AlignedToken {
  token: string;
  phoneme: string;
  status: 'correct' | 'omission' | 'substitution' | 'uncertain';
  /** 0-100; absent when the decoder exposes no probability for this token. */
  confidence?: number;
}

export interface RecitationError {
  type: 'omission' | 'substitution' | 'repetition' | 'sequence_error' | 'uncertain';
  descriptionAr: string;
  wordExpected: string;
  wordDetected?: string;
  index: number;
}

export type FSRSRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

interface RecitationState {
  status: RecitationStatus;
  micActive: boolean;
  audioLevel: number; // 0 to 100
  waveformLevels: number[]; // Array of 16-32 audio bar heights
  liveTranscript: string;
  alignedTokens: AlignedToken[];
  detectedErrors: RecitationError[];
  /** Phoneme alignment match rate, 0-100 (matches / reference tokens). NOT acoustic confidence. */
  alignmentAccuracy: number;
  /** Real acoustic recognition confidence 0-100, or null when the decoder exposes none. */
  recognitionConfidence: number | null;
  lastFsrsRating: FSRSRating | null;
  errorMessage: string | null;

  // Word-level alignment & error highlighting for visual review
  evaluatedWords: WordAlignmentResult[];
  wordStatusMap: Record<string, WordRecitationStatus>; // e.g. "surah:ayah:wordIndex" and "ayah:wordIndex"
  isReviewOpen: boolean;

  // Voice Active Recall: Reference vs Recognized text
  recognizedText: string;
  referenceText: string;

  // Pacing and continuity tracking (e.g. for Transition mode >2.0s pauses)
  pauseDurationMs: number;
  isPauseExceeded: boolean; // true if continuous pause > 2000ms

  // Actions
  setStatus: (status: RecitationStatus) => void;
  setMicActive: (active: boolean) => void;
  setAudioLevel: (level: number) => void;
  setWaveformLevels: (levels: number[]) => void;
  setLiveTranscript: (transcript: string) => void;
  setRecognizedText: (text: string) => void;
  setReferenceText: (text: string) => void;
  setAlignedTokens: (tokens: AlignedToken[]) => void;
  addAlignedToken: (token: AlignedToken) => void;
  addDetectedError: (error: RecitationError) => void;
  setAlignmentAccuracy: (score: number) => void;
  setRecognitionConfidence: (score: number | null) => void;
  setLastFsrsRating: (rating: FSRSRating | null) => void;
  setErrorMessage: (msg: string | null) => void;

  setEvaluatedWords: (
    words: WordAlignmentResult[],
    surahNumber?: number,
    ayahNumber?: number
  ) => void;
  setIsReviewOpen: (open: boolean) => void;
  clearEvaluatedWords: () => void;
  recordRecitationComplete: (
    ayahCount?: number,
    perfectAyahCount?: number,
    durationMs?: number,
    pages?: number[]
  ) => void;
  setPauseDurationMs: (ms: number) => void;
  resetRecitation: () => void;
}

export const useRecitationStore = create<RecitationState>((set) => ({
  status: 'idle',
  micActive: false,
  audioLevel: 0,
  waveformLevels: [15, 25, 45, 60, 30, 20, 50, 75, 40, 20, 35, 55, 65, 30, 20, 10],
  liveTranscript: '',
  alignedTokens: [],
  detectedErrors: [],
  alignmentAccuracy: 0,
  recognitionConfidence: null,
  lastFsrsRating: null,
  errorMessage: null,

  evaluatedWords: [],
  wordStatusMap: {},
  isReviewOpen: false,

  recognizedText: '',
  referenceText: '',

  pauseDurationMs: 0,
  isPauseExceeded: false,

  setStatus: (status) => set({ status }),
  setMicActive: (micActive) => set({ micActive }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setWaveformLevels: (waveformLevels) => set({ waveformLevels }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setRecognizedText: (recognizedText) => set({ recognizedText }),
  setReferenceText: (referenceText) => set({ referenceText }),
  setAlignedTokens: (alignedTokens) => set({ alignedTokens }),
  addAlignedToken: (token) =>
    set((state) => ({ alignedTokens: [...state.alignedTokens, token] })),
  addDetectedError: (error) =>
    set((state) => ({ detectedErrors: [...state.detectedErrors, error] })),
  setAlignmentAccuracy: (alignmentAccuracy) => set({ alignmentAccuracy }),
  setRecognitionConfidence: (recognitionConfidence) => set({ recognitionConfidence }),
  setLastFsrsRating: (lastFsrsRating) => set({ lastFsrsRating }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),

  setEvaluatedWords: (words, surahNumber, ayahNumber) =>
    set((state) => {
      const map: Record<string, WordRecitationStatus> = { ...state.wordStatusMap };
      for (const w of words) {
        const aNum = w.ayahNumber ?? ayahNumber;
        const sNum = w.surahNumber ?? surahNumber;
        if (aNum !== undefined) {
          map[`${aNum}:${w.wordIndex}`] = w.status;
          if (sNum !== undefined) {
            map[`${sNum}:${aNum}:${w.wordIndex}`] = w.status;
          }
        }
        map[`word:${w.wordIndex}`] = w.status;

        // The Mushaf renders the word under its PAGE index, which differs from
        // the reference index (Basmalah prefix, waqf marks). Store the status
        // under the page index as well so the highlight lands on the right word.
        if (w.pageWordIndex !== undefined && aNum !== undefined) {
          map[`${aNum}:${w.pageWordIndex}`] = w.status;
          if (sNum !== undefined) {
            map[`${sNum}:${aNum}:${w.pageWordIndex}`] = w.status;
          }
          map[`word:${w.pageWordIndex}`] = w.status;
        }
      }
      return {
        evaluatedWords: words,
        wordStatusMap: map,
        isReviewOpen: true,
      };
    }),

  setIsReviewOpen: (isReviewOpen) => set({ isReviewOpen }),

  clearEvaluatedWords: () =>
    set({
      evaluatedWords: [],
      wordStatusMap: {},
      recognizedText: '',
      referenceText: '',
      isReviewOpen: false,
    }),

  recordRecitationComplete: (ayahCount = 1, perfectAyahCount = 0, durationMs?: number, pages: number[] = []) =>
    useAchievementStore.getState().recordRecitation(ayahCount, perfectAyahCount, durationMs ? Math.round(durationMs / 1000) : 0, pages),

  setPauseDurationMs: (ms) =>
    set({
      pauseDurationMs: ms,
      isPauseExceeded: ms >= 2000,
    }),

  resetRecitation: () =>
    set({
      status: 'idle',
      micActive: false,
      audioLevel: 0,
      liveTranscript: '',
      recognizedText: '',
      referenceText: '',
      alignedTokens: [],
      detectedErrors: [],
      alignmentAccuracy: 0,
      recognitionConfidence: null,
      lastFsrsRating: null,
      errorMessage: null,
      evaluatedWords: [],
      wordStatusMap: {},
      isReviewOpen: false,
      pauseDurationMs: 0,
      isPauseExceeded: false,
    }),
}));
