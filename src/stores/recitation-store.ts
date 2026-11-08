import { create } from 'zustand';

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
  type: 'omission' | 'substitution' | 'repetition' | 'sequence_error';
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
    }),
}));
