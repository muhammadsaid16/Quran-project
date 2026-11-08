/**
 * Quran Cognitive OS v2.0 — Quran Memory Heatmap Store
 * Zustand state management for 604-page Medina Mushaf heatmap, retention analytics,
 * interactive inspection, review history audit, and immediate live updates.
 */

import { create } from 'zustand';
import {
  HeatmapAnalyticsEngine,
  PageMemoryStats,
  SurahRetentionStats,
  JuzRetentionStats,
  GlobalHeatmapSummary,
  AyahMemoryStatus,
  MemoryStatusCategory,
} from '../fsrs/heatmap-analytics';
import { getDatabase, QuranAyah, MemoryCard, ReviewLog, ReviewRating } from '../db';
import { FSRSService } from '../fsrs/fsrs-service';
import { SURAHS } from '../data/surahs';
import corpusData from '../data/quran-corpus.json';

export interface HeatmapStoreState {
  pageStats: Record<number, PageMemoryStats>;
  surahStats: SurahRetentionStats[];
  juzStats: Record<number, JuzRetentionStats>;
  globalSummary: GlobalHeatmapSummary;

  // Backward-compatible rollup aliases for shell and dashboard
  totalMemorizedPages: number;
  masteredPagesCount: number;
  reviewDuePagesCount: number;
  highRiskPagesCount: number;

  // Selected item inspection
  selectedPage: PageMemoryStats | null;
  selectedAyah: AyahMemoryStatus | null;
  selectedItemReviewHistory: ReviewLog[];

  // Filtering & View controls
  filterJuz: number | null; // null = all 30 Juz
  filterSurah: number | null; // null = all Surahs
  filterStatus: MemoryStatusCategory | 'all';
  searchQuery: string;
  isLoading: boolean;

  // Actions
  loadHeatmapData: (asOfDate?: Date) => Promise<void>;
  selectPage: (pageNumber: number) => void;
  selectAyah: (verseKey: string) => Promise<void>;
  clearSelectedAyah: () => void;
  setFilterJuz: (juz: number | null) => void;
  setFilterSurah: (surah: number | null) => void;
  setFilterStatus: (status: MemoryStatusCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  recordReviewAndUpdate: (verseKey: string, rating: ReviewRating, metadata?: Partial<ReviewLog>) => Promise<void>;
}

// Fallback empty initial summary
const emptySummary: GlobalHeatmapSummary = {
  totalAyahs: 6236,
  totalMemorizedAyahs: 0,
  totalMemorizedPages: 0,
  masteredPagesCount: 0,
  reviewDuePagesCount: 0,
  highRiskPagesCount: 0,
  unreviewedPagesCount: 604,
  overallRetentionIndex: 0,
  dueTodayCount: 0,
  totalLapses: 0,
  weakestSurahs: [],
  weakestAyahs: [],
};

// Generate default clean pages mapping from canonical corpusData
const corpusAyahs = (corpusData.ayahs || []) as unknown as QuranAyah[];
const initialAyahsByPage = new Map<number, QuranAyah[]>();
for (const a of corpusAyahs) {
  const list = initialAyahsByPage.get(a.page) || [];
  list.push(a);
  initialAyahsByPage.set(a.page, list);
}

const emptyCardsMap = new Map<string, MemoryCard>();
const initialPageStats: Record<number, PageMemoryStats> = {};
for (let p = 1; p <= 604; p++) {
  const ayahs = initialAyahsByPage.get(p) || [];
  initialPageStats[p] = HeatmapAnalyticsEngine.computePageStats(p, ayahs, emptyCardsMap);
}

const initialSurahStats = HeatmapAnalyticsEngine.computeSurahStats(SURAHS, corpusAyahs, emptyCardsMap);
const initialJuzStats = HeatmapAnalyticsEngine.computeJuzStats(initialPageStats);

export const useHeatmapStore = create<HeatmapStoreState>((set, get) => ({
  pageStats: initialPageStats,
  surahStats: initialSurahStats,
  juzStats: initialJuzStats,
  globalSummary: emptySummary,

  totalMemorizedPages: 0,
  masteredPagesCount: 0,
  reviewDuePagesCount: 0,
  highRiskPagesCount: 0,

  selectedPage: initialPageStats[1] || null,
  selectedAyah: null,
  selectedItemReviewHistory: [],

  filterJuz: null,
  filterSurah: null,
  filterStatus: 'all',
  searchQuery: '',
  isLoading: false,

  loadHeatmapData: async (asOfDate: Date = new Date()) => {
    set({ isLoading: true });
    try {
      const db = getDatabase();

      // 1. Fetch all Ayahs (or fallback to corpusData if not yet seeded in IndexedDB)
      let ayahs = await db.quran_ayahs.toArray();
      if (!ayahs || ayahs.length === 0) {
        ayahs = corpusAyahs;
      }

      // Group Ayahs by page
      const ayahsByPage = new Map<number, QuranAyah[]>();
      for (const a of ayahs) {
        const list = ayahsByPage.get(a.page) || [];
        list.push(a);
        ayahsByPage.set(a.page, list);
      }

      // 2. Fetch all memory cards & transition cards
      const allCards = await db.memory_cards.toArray();
      const cardsMap = new Map<string, MemoryCard>();
      const transitionCardsMap = new Map<string, MemoryCard>();

      for (const card of allCards) {
        if (card.target_type === 'ayah') {
          cardsMap.set(card.id, card);
        } else if (card.target_type === 'transition') {
          transitionCardsMap.set(card.id, card);
        }
      }

      // 3. Compute stats across all 604 pages
      const pageStats: Record<number, PageMemoryStats> = {};
      const allAyahStatuses: AyahMemoryStatus[] = [];

      for (let p = 1; p <= 604; p++) {
        const pAyahs = ayahsByPage.get(p) || [];
        const pStat = HeatmapAnalyticsEngine.computePageStats(
          p,
          pAyahs,
          cardsMap,
          transitionCardsMap,
          asOfDate
        );
        pageStats[p] = pStat;
        allAyahStatuses.push(...pStat.ayahStatuses);
      }

      // 4. Compute Surah & Juz stats
      const surahStats = HeatmapAnalyticsEngine.computeSurahStats(SURAHS, ayahs, cardsMap, asOfDate);
      const juzStats = HeatmapAnalyticsEngine.computeJuzStats(pageStats);
      const globalSummary = HeatmapAnalyticsEngine.computeGlobalSummary(
        pageStats,
        surahStats,
        allAyahStatuses
      );

      const currentPage = get().selectedPage;
      const updatedSelectedPage = currentPage ? pageStats[currentPage.pageNumber] || pageStats[1] : pageStats[1];

      set({
        pageStats,
        surahStats,
        juzStats,
        globalSummary,
        totalMemorizedPages: globalSummary.totalMemorizedPages,
        masteredPagesCount: globalSummary.masteredPagesCount,
        reviewDuePagesCount: globalSummary.reviewDuePagesCount,
        highRiskPagesCount: globalSummary.highRiskPagesCount,
        selectedPage: updatedSelectedPage,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      set({ isLoading: false });
    }
  },

  selectPage: (pageNumber: number) => {
    const stat = get().pageStats[pageNumber] || null;
    set({ selectedPage: stat, selectedAyah: null, selectedItemReviewHistory: [] });
  },

  selectAyah: async (verseKey: string) => {
    const page = get().selectedPage;
    let targetStatus: AyahMemoryStatus | null = null;

    if (page) {
      targetStatus = page.ayahStatuses.find((a) => a.verseKey === verseKey) || null;
    }

    if (!targetStatus) {
      for (const p of Object.values(get().pageStats)) {
        const match = p.ayahStatuses.find((a) => a.verseKey === verseKey);
        if (match) {
          targetStatus = match;
          set({ selectedPage: p });
          break;
        }
      }
    }

    // Fetch review history from Dexie
    let history: ReviewLog[] = [];
    try {
      const db = getDatabase();
      history = await db.review_logs
        .where('target_id')
        .equals(verseKey)
        .reverse()
        .sortBy('timestamp');
    } catch {
      history = [];
    }

    set({ selectedAyah: targetStatus, selectedItemReviewHistory: history });
  },

  clearSelectedAyah: () => {
    set({ selectedAyah: null, selectedItemReviewHistory: [] });
  },

  setFilterJuz: (juz: number | null) => {
    set({ filterJuz: juz });
  },

  setFilterSurah: (surah: number | null) => {
    set({ filterSurah: surah });
  },

  setFilterStatus: (status: MemoryStatusCategory | 'all') => {
    set({ filterStatus: status });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  recordReviewAndUpdate: async (verseKey: string, rating: ReviewRating, metadata: Partial<ReviewLog> = {}) => {
    const db = getDatabase();
    await FSRSService.recordAyahRecitation(db, {
      targetId: verseKey,
      targetType: 'ayah',
      rating,
      recordingDurationMs: metadata.recording_duration_ms,
      inferenceDurationMs: metadata.inference_duration_ms,
      metrics: {
        confidence: metadata.alignment_confidence,
      },
    });

    // Immediate reactive refresh of the heatmap
    await get().loadHeatmapData();

    // If this ayah is currently selected, refresh its details
    if (get().selectedAyah?.verseKey === verseKey) {
      await get().selectAyah(verseKey);
    }
  },
}));
