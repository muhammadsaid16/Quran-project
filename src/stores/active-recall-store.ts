import { create } from 'zustand';

export type RecallMode = 'acquisition' | 'retention' | 'transition';
export type GhostTextLevel = 'hidden' | 'keywords' | 'initial_prompt' | 'visible';

export interface AyahTarget {
  surahNumber: number;
  surahNameArabic: string;
  ayahNumber: number;
  globalAyahNumber: number;
  pageNumber: number;
  juzNumber: number;
  textUthmani: string;
  keyWords?: string[];
  firstWord?: string;
}

export interface TransitionTarget {
  fromAyah: {
    surahNumber: number;
    ayahNumber: number;
    textEnding: string;
    pageNumber: number;
  };
  toAyah: {
    surahNumber: number;
    ayahNumber: number;
    textBeginning: string;
    pageNumber: number;
  };
  isPageBoundary: boolean;
}

interface ActiveRecallState {
  mode: RecallMode;
  ghostTextLevel: GhostTextLevel;
  activeAyahIndex: number;
  revealedAyahIds: number[];
  revealedWordIndices: Record<number, number[]>; // ayahId -> array of revealed word indices
  currentAyah: AyahTarget | null;
  transitionTarget: TransitionTarget | null;
  isHintRevealed: boolean;
  recallSessionActive: boolean;

  // Actions
  setMode: (mode: RecallMode) => void;
  setGhostTextLevel: (level: GhostTextLevel) => void;
  setCurrentAyah: (ayah: AyahTarget | null) => void;
  setTransitionTarget: (target: TransitionTarget | null) => void;
  toggleAyahVisibility: (ayahId: number) => void;
  revealWordHint: (ayahId: number, wordIndex: number) => void;
  revealFullHint: () => void;
  startRecallSession: (mode: RecallMode) => void;
  stopRecallSession: () => void;
  resetHints: () => void;
}

export const useActiveRecallStore = create<ActiveRecallState>((set) => ({
  mode: 'acquisition',
  ghostTextLevel: 'initial_prompt',
  activeAyahIndex: 0,
  revealedAyahIds: [],
  revealedWordIndices: {},
  currentAyah: null,
  transitionTarget: null,
  isHintRevealed: false,
  recallSessionActive: false,

  setMode: (mode) => set({ mode }),
  setGhostTextLevel: (ghostTextLevel) => set({ ghostTextLevel }),
  setCurrentAyah: (currentAyah) => set({ currentAyah, isHintRevealed: false }),
  setTransitionTarget: (transitionTarget) => set({ transitionTarget, isHintRevealed: false }),
  toggleAyahVisibility: (ayahId) =>
    set((state) => ({
      revealedAyahIds: state.revealedAyahIds.includes(ayahId)
        ? state.revealedAyahIds.filter((id) => id !== ayahId)
        : [...state.revealedAyahIds, ayahId],
    })),
  revealWordHint: (ayahId, wordIndex) =>
    set((state) => {
      const existing = state.revealedWordIndices[ayahId] || [];
      if (existing.includes(wordIndex)) return state;
      return {
        revealedWordIndices: {
          ...state.revealedWordIndices,
          [ayahId]: [...existing, wordIndex],
        },
      };
    }),
  revealFullHint: () => set({ isHintRevealed: true }),
  startRecallSession: (mode) =>
    set({
      mode,
      recallSessionActive: true,
      revealedAyahIds: [],
      revealedWordIndices: {},
      isHintRevealed: false,
    }),
  stopRecallSession: () =>
    set({
      recallSessionActive: false,
      isHintRevealed: false,
    }),
  resetHints: () =>
    set({
      revealedAyahIds: [],
      revealedWordIndices: {},
      isHintRevealed: false,
    }),
}));
