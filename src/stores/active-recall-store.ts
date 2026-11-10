import { create } from 'zustand';

export type RecallMode = 'acquisition' | 'retention' | 'transition';

export type GhostTextLevel =
  | 'level1_concealed'
  | 'level2_first_words'
  | 'level3_landmarks'
  | 'visible'
  // Backwards compatibility aliases
  | 'hidden'
  | 'initial_prompt'
  | 'keywords';

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
  dueReason?: string;
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

export type AcquisitionStep =
  | 'read' // Read & listen to original text
  | 'ghost' // Engage Ghost Text
  | 'recite' // Reciting into microphone
  | 'review' // Reviewing errors
  | 'mastered'; // 2 consecutive flawless recitations

export interface ActiveRecallState {
  mode: RecallMode;
  ghostTextLevel: GhostTextLevel;
  activeAyahIndex: number;
  revealedAyahIds: number[];
  revealedWordIndices: Record<number, number[]>; // ayahId -> array of revealed word indices
  currentAyah: AyahTarget | null;
  transitionTarget: TransitionTarget | null;
  transitionPauseDetected: boolean;
  isHintRevealed: boolean;
  recallSessionActive: boolean;

  // Acquisition mode specifics
  acquisitionStep: AcquisitionStep;
  consecutiveFlawlessCount: number;

  // Retention mode queue
  retentionQueue: AyahTarget[];
  retentionQueueIndex: number;

  // Page turning animation state
  pageTurnDirection: 'next' | 'prev' | null;

  // Actions
  setMode: (mode: RecallMode) => void;
  setGhostTextLevel: (level: GhostTextLevel) => void;
  cycleGhostTextLevel: () => void;
  setCurrentAyah: (ayah: AyahTarget | null) => void;
  setTransitionTarget: (target: TransitionTarget | null) => void;
  setTransitionPauseDetected: (detected: boolean) => void;
  toggleAyahVisibility: (ayahId: number) => void;
  revealWordHint: (ayahId: number, wordIndex: number) => void;
  revealFullHint: () => void;
  startRecallSession: (mode: RecallMode) => void;
  stopRecallSession: () => void;
  resetHints: () => void;

  // Acquisition actions
  setAcquisitionStep: (step: AcquisitionStep) => void;
  recordAcquisitionResult: (isFlawless: boolean) => void;
  resetFlawless: () => void;

  // Retention actions
  setRetentionQueue: (queue: AyahTarget[]) => void;
  nextRetentionCard: () => void;
  prevRetentionCard: () => void;

  // Page animation
  setPageTurnDirection: (direction: 'next' | 'prev' | null) => void;
}

export function getGhostTierNumber(level: GhostTextLevel): 1 | 2 | 3 | 0 {
  if (level === 'level1_concealed' || level === 'hidden') return 1;
  if (level === 'level2_first_words' || level === 'initial_prompt') return 2;
  if (level === 'level3_landmarks' || level === 'keywords') return 3;
  return 0; // visible
}

export function getGhostTierLabel(level: GhostTextLevel): string {
  const tier = getGhostTierNumber(level);
  switch (tier) {
    case 1:
      return 'المستوى 1: إخفاء كامل';
    case 2:
      return 'المستوى 2: بدايات الآيات';
    case 3:
      return 'المستوى 3: معالم الآيات';
    default:
      return 'النص الكامل (دراسة)';
  }
}

export const useActiveRecallStore = create<ActiveRecallState>((set, get) => ({
  mode: 'acquisition',
  ghostTextLevel: 'visible',
  activeAyahIndex: 0,
  revealedAyahIds: [],
  revealedWordIndices: {},
  currentAyah: null,
  transitionTarget: null,
  transitionPauseDetected: false,
  isHintRevealed: false,
  recallSessionActive: false,

  acquisitionStep: 'read',
  consecutiveFlawlessCount: 0,

  retentionQueue: [],
  retentionQueueIndex: 0,

  pageTurnDirection: null,

  setMode: (mode) =>
    set({
      mode,
      acquisitionStep: mode === 'acquisition' ? 'read' : 'recite',
      ghostTextLevel: mode === 'acquisition' ? 'visible' : 'level1_concealed',
    }),
  setGhostTextLevel: (ghostTextLevel) =>
    set((state) => {
      let nextStep = state.acquisitionStep;
      if (state.mode === 'acquisition') {
        if (ghostTextLevel === 'visible') {
          nextStep = 'read';
        } else if (state.acquisitionStep === 'read') {
          nextStep = 'recite';
        }
      }
      return {
        ghostTextLevel,
        acquisitionStep: nextStep,
      };
    }),
  cycleGhostTextLevel: () => {
    const current = get().ghostTextLevel;
    const tier = getGhostTierNumber(current);
    let next: GhostTextLevel;
    if (tier === 1) next = 'level2_first_words';
    else if (tier === 2) next = 'level3_landmarks';
    else if (tier === 3) next = 'visible';
    else next = 'level1_concealed';
    get().setGhostTextLevel(next);
  },

  setCurrentAyah: (currentAyah) => set({ currentAyah, isHintRevealed: false }),
  setTransitionTarget: (transitionTarget) =>
    set({ transitionTarget, isHintRevealed: false, transitionPauseDetected: false }),
  setTransitionPauseDetected: (transitionPauseDetected) => set({ transitionPauseDetected }),

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
      consecutiveFlawlessCount: 0,
      acquisitionStep: mode === 'acquisition' ? 'read' : 'recite',
      ghostTextLevel: mode === 'acquisition' ? 'visible' : 'level1_concealed',
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

  setAcquisitionStep: (acquisitionStep) =>
    set((state) => ({
      acquisitionStep,
      ghostTextLevel:
        acquisitionStep === 'read'
          ? 'visible'
          : acquisitionStep === 'ghost' || acquisitionStep === 'recite'
          ? 'level1_concealed'
          : state.ghostTextLevel,
    })),

  recordAcquisitionResult: (isFlawless) =>
    set((state) => {
      if (isFlawless) {
        const newCount = state.consecutiveFlawlessCount + 1;
        return {
          consecutiveFlawlessCount: newCount,
          acquisitionStep: newCount >= 2 ? 'mastered' : 'review',
        };
      }
      return {
        consecutiveFlawlessCount: 0,
        acquisitionStep: 'review',
      };
    }),

  resetFlawless: () => set({ consecutiveFlawlessCount: 0 }),

  setRetentionQueue: (queue) =>
    set({
      retentionQueue: queue,
      retentionQueueIndex: 0,
      currentAyah: queue.length > 0 ? queue[0] : null,
    }),

  nextRetentionCard: () =>
    set((state) => {
      const nextIdx = state.retentionQueueIndex + 1;
      if (nextIdx < state.retentionQueue.length) {
        return {
          retentionQueueIndex: nextIdx,
          currentAyah: state.retentionQueue[nextIdx],
          isHintRevealed: false,
          revealedAyahIds: [],
          revealedWordIndices: {},
        };
      }
      return state;
    }),

  prevRetentionCard: () =>
    set((state) => {
      const prevIdx = state.retentionQueueIndex - 1;
      if (prevIdx >= 0) {
        return {
          retentionQueueIndex: prevIdx,
          currentAyah: state.retentionQueue[prevIdx],
          isHintRevealed: false,
          revealedAyahIds: [],
          revealedWordIndices: {},
        };
      }
      return state;
    }),

  setPageTurnDirection: (pageTurnDirection) => set({ pageTurnDirection }),
}));
