import { create } from 'zustand';

export interface PageMemoryStats {
  pageNumber: number;
  juzNumber: number;
  surahNames: string[];
  retrievability: number; // 0 - 100%
  stability: number; // in days
  difficulty: number; // 1 - 10
  lapses: number;
  reps: number;
  dueToday: boolean;
  lastReviewedDate?: string;
}

interface HeatmapState {
  pageStats: Record<number, PageMemoryStats>;
  selectedPageForInspect: PageMemoryStats | null;
  filterJuz: number | null; // null means all
  totalMemorizedPages: number;
  masteredPagesCount: number;
  reviewDuePagesCount: number;
  highRiskPagesCount: number;

  // Actions
  setSelectedPageForInspect: (stats: PageMemoryStats | null) => void;
  setFilterJuz: (juz: number | null) => void;
  updatePageStats: (pageNumber: number, update: Partial<PageMemoryStats>) => void;
}

// Generate realistic baseline data for Medina 604 pages based on user's current progress
const initialPageStats: Record<number, PageMemoryStats> = {};
let mastered = 0;
let due = 0;
let risk = 0;

for (let p = 1; p <= 604; p++) {
  const juz = Math.min(30, Math.ceil(p / 20.13));
  // Let's seed initial realistic data for active memorization (Juz 1 & 30 active)
  let retrievability = 0;
  let stability = 0;
  let difficulty = 5.0;
  let lapses = 0;
  let reps = 0;
  let dueToday = false;

  if (p <= 21) {
    // Juz 1 (Al-Fatihah, Al-Baqarah 1-141)
    if (p <= 8) {
      retrievability = 96;
      stability = 45;
      mastered++;
    } else if (p <= 14) {
      retrievability = 88;
      stability = 14;
      dueToday = true;
      due++;
    } else {
      retrievability = 78;
      stability = 5;
      lapses = 2;
      dueToday = true;
      risk++;
    }
    reps = 12;
  } else if (p >= 582) {
    // Juz 30 (Juz Amma)
    if (p >= 595) {
      retrievability = 98;
      stability = 60;
      mastered++;
    } else {
      retrievability = 91;
      stability = 22;
      dueToday = true;
      due++;
    }
    reps = 18;
  }

  initialPageStats[p] = {
    pageNumber: p,
    juzNumber: juz,
    surahNames: p === 1 ? ['الفاتحة'] : p === 2 ? ['البقرة'] : p >= 604 ? ['الناس', 'الفلق', 'الإخلاص'] : [`صفحة ${p}`],
    retrievability,
    stability,
    difficulty,
    lapses,
    reps,
    dueToday,
    lastReviewedDate: retrievability > 0 ? '2026-11-07' : undefined,
  };
}

export const useHeatmapStore = create<HeatmapState>((set) => ({
  pageStats: initialPageStats,
  selectedPageForInspect: initialPageStats[1],
  filterJuz: null,
  totalMemorizedPages: 21 + (604 - 582 + 1),
  masteredPagesCount: mastered,
  reviewDuePagesCount: due,
  highRiskPagesCount: risk,

  setSelectedPageForInspect: (selectedPageForInspect) => set({ selectedPageForInspect }),
  setFilterJuz: (filterJuz) => set({ filterJuz }),
  updatePageStats: (pageNumber, update) =>
    set((state) => {
      const prev = state.pageStats[pageNumber];
      if (!prev) return state;
      const updated = { ...prev, ...update };
      return {
        pageStats: { ...state.pageStats, [pageNumber]: updated },
        selectedPageForInspect:
          state.selectedPageForInspect?.pageNumber === pageNumber
            ? updated
            : state.selectedPageForInspect,
      };
    }),
}));
