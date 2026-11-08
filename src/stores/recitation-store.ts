import { create } from 'zustand';
import { WordAlignmentResult, WordRecitationStatus } from '@/alignment/types';

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
  confidence: number;
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
  confidenceScore: number; // 0 - 100
  lastFsrsRating: FSRSRating | null;
  errorMessage: string | null;

  // Word-level alignment & error highlighting for visual review
  evaluatedWords: WordAlignmentResult[];
  wordStatusMap: Record<string, WordRecitationStatus>; // e.g. "surah:ayah:wordIndex" and "ayah:wordIndex"
  isReviewOpen: boolean;

  // Pacing and continuity tracking (e.g. for Transition mode >2.0s pauses)
  pauseDurationMs: number;
  isPauseExceeded: boolean; // true if continuous pause > 2000ms

  // Actions
  setStatus: (status: RecitationStatus) => void;
  setMicActive: (active: boolean) => void;
  setAudioLevel: (level: number) => void;
  setWaveformLevels: (levels: number[]) => void;
  setLiveTranscript: (transcript: string) => void;
  setAlignedTokens: (tokens: AlignedToken[]) => void;
  addAlignedToken: (token: AlignedToken) => void;
  addDetectedError: (error: RecitationError) => void;
  setConfidenceScore: (score: number) => void;
  setLastFsrsRating: (rating: FSRSRating | null) => void;
  setErrorMessage: (msg: string | null) => void;

  setEvaluatedWords: (
    words: WordAlignmentResult[],
    surahNumber?: number,
    ayahNumber?: number
  ) => void;
  setIsReviewOpen: (open: boolean) => void;
  clearEvaluatedWords: () => void;
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
  confidenceScore: 0,
  lastFsrsRating: null,
  errorMessage: null,

  evaluatedWords: [],
  wordStatusMap: {},
  isReviewOpen: false,

  pauseDurationMs: 0,
  isPauseExceeded: false,

  setStatus: (status) => set({ status }),
  setMicActive: (micActive) => set({ micActive }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setWaveformLevels: (waveformLevels) => set({ waveformLevels }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setAlignedTokens: (alignedTokens) => set({ alignedTokens }),
  addAlignedToken: (token) =>
    set((state) => ({ alignedTokens: [...state.alignedTokens, token] })),
  addDetectedError: (error) =>
    set((state) => ({ detectedErrors: [...state.detectedErrors, error] })),
  setConfidenceScore: (confidenceScore) => set({ confidenceScore }),
  setLastFsrsRating: (lastFsrsRating) => set({ lastFsrsRating }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),

  setEvaluatedWords: (words, surahNumber, ayahNumber) =>
    set((state) => {
      const map: Record<string, WordRecitationStatus> = { ...state.wordStatusMap };
      for (const w of words) {
        // Map by wordIndex if ayah is given
        if (ayahNumber !== undefined) {
          map[`${ayahNumber}:${w.wordIndex}`] = w.status;
          if (surahNumber !== undefined) {
            map[`${surahNumber}:${ayahNumber}:${w.wordIndex}`] = w.status;
          }
        }
        map[`word:${w.wordIndex}`] = w.status;
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
      isReviewOpen: false,
    }),

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
      alignedTokens: [],
      detectedErrors: [],
      confidenceScore: 0,
      lastFsrsRating: null,
      errorMessage: null,
      evaluatedWords: [],
      wordStatusMap: {},
      isReviewOpen: false,
      pauseDurationMs: 0,
      isPauseExceeded: false,
    }),
}));
