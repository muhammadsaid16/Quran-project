/**
 * Quran Cognitive OS v2.0 — Heatmap & Retrievability Analytics Engine
 * Computes mathematically sound per-Ayah, per-Page, per-Surah, and per-Juz retention metrics:
 *  - Dynamic FSRS Retrievability R(t) = (1 + factor * (t / S))^-1
 *  - Strict state isolation: New/unreviewed cards have R = 0 and are never classified as mastered
 *  - 604 Medina 15-line Mushaf pages mapped to all 6,236 Ayahs
 *  - Independent Ayah and Transition edge card states
 */

import { QuranAyah, MemoryCard, TransitionEdge, ReviewLog } from '../db/schema';
import { FSRSScheduler } from './scheduler';
import { State } from './types';
import { SURAHS, SurahMeta } from '../data/surahs';

export type MemoryStatusCategory = 'new' | 'mastered' | 'review_due' | 'high_risk';

export interface AyahMemoryStatus {
  verseKey: string;
  surah: number;
  ayah: number;
  page: number;
  juz: number;
  textUthmani: string;
  retrievability: number; // 0 - 100%
  stability: number; // days
  difficulty: number; // 1 - 10
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: State;
  stateLabel: string;
  status: MemoryStatusCategory;
  due: Date | string | null;
  lastReview: Date | string | null;
  hasCard: boolean;
}

export interface PageTransitionStatus {
  edgeId: string;
  fromAyah: string;
  toAyah: string;
  isPageBoundary: boolean;
  stability: number;
  retrievability: number;
  due: Date | string | null;
  state: State;
}

export interface PageMemoryStats {
  pageNumber: number;
  juzNumber: number;
  surahNames: string[];
  surahNumbers: number[];
  totalAyahs: number;
  studiedAyahsCount: number;
  masteredAyahsCount: number;
  reviewDueAyahsCount: number;
  highRiskAyahsCount: number;
  newAyahsCount: number;
  retrievability: number; // 0 - 100% (average of studied ayahs)
  coveragePercent: number; // (studied / total) * 100
  status: MemoryStatusCategory;
  averageStability: number;
  averageDifficulty: number;
  totalLapses: number;
  totalReps: number;
  dueTodayCount: number;
  lastReviewedDate?: string;
  ayahStatuses: AyahMemoryStatus[];
  boundaryTransition?: PageTransitionStatus;
}

export interface SurahRetentionStats {
  surahNumber: number;
  nameArabic: string;
  nameEnglish: string;
  totalAyahs: number;
  studiedAyahsCount: number;
  masteredAyahsCount: number;
  reviewDueAyahsCount: number;
  highRiskAyahsCount: number;
  newAyahsCount: number;
  retentionScore: number; // 0 - 100%
  coveragePercent: number; // 0 - 100%
  status: MemoryStatusCategory;
  totalLapses: number;
  startPage: number;
  endPage: number;
  startJuz: number;
}

export interface JuzRetentionStats {
  juzNumber: number;
  totalPages: number;
  studiedPagesCount: number;
  masteredPagesCount: number;
  reviewDuePagesCount: number;
  highRiskPagesCount: number;
  newPagesCount: number;
  retentionScore: number; // 0 - 100%
  coveragePercent: number; // 0 - 100%
  status: MemoryStatusCategory;
}

export interface GlobalHeatmapSummary {
  totalAyahs: number;
  totalMemorizedAyahs: number; // Studied ayahs (state !== New)
  totalMemorizedPages: number; // Pages with at least 1 studied ayah
  masteredPagesCount: number; // Pages where all ayahs are mastered (R >= 95%)
  reviewDuePagesCount: number;
  highRiskPagesCount: number;
  unreviewedPagesCount: number;
  overallRetentionIndex: number; // 0 - 100%
  dueTodayCount: number;
  totalLapses: number;
  weakestSurahs: SurahRetentionStats[];
  weakestAyahs: AyahMemoryStatus[];
}

export class HeatmapAnalyticsEngine {
  /**
   * Evaluates dynamic retrievability R(t) of an Ayah card at a specified timestamp.
   * If card is New, unstudied, or has stability 0, returns 0.0.
   */
  public static calculateAyahRetrievability(card?: MemoryCard | null, asOfDate: Date = new Date()): number {
    if (!card || card.state === State.New || !card.last_review || card.stability <= 0) {
      return 0.0;
    }
    return FSRSScheduler.getCardRetrievability(card, asOfDate);
  }

  /**
   * Categorizes memory status according to FSRS Retrievability thresholds:
   *  - Mastered: R >= 95% and state !== New
   *  - Review Due: 85% <= R < 95% or due <= now
   *  - High Risk: 0% < R < 85%
   *  - New: Unstudied / state === New (R = 0)
   */
  public static classifyMemoryStatus(
    retrievability: number,
    card?: MemoryCard | null,
    asOfDate: Date = new Date()
  ): MemoryStatusCategory {
    if (!card || card.state === State.New || !card.last_review || card.stability <= 0) {
      return 'new';
    }

    const rPercent = retrievability * 100;
    const isOverdue = card.due ? new Date(card.due).getTime() <= asOfDate.getTime() : false;

    if (rPercent > 0.0 && rPercent < 85.0) {
      return 'high_risk';
    } else if (rPercent >= 95.0 && !isOverdue) {
      return 'mastered';
    } else if (rPercent >= 85.0 || isOverdue) {
      return 'review_due';
    }

    return 'new';
  }

  /**
   * Generates comprehensive Ayah memory status record
   */
  public static computeAyahStatus(
    ayah: QuranAyah,
    card?: MemoryCard | null,
    asOfDate: Date = new Date()
  ): AyahMemoryStatus {
    const retrievabilityRaw = this.calculateAyahRetrievability(card, asOfDate);
    const retrievability = Math.round(retrievabilityRaw * 100);
    const status = this.classifyMemoryStatus(retrievabilityRaw, card, asOfDate);

    const state = (card?.state as State) ?? State.New;
    let stateLabel = 'جديد (لم يبدأ)';
    if (state === State.Learning) stateLabel = 'قيد التعلم (Learning)';
    else if (state === State.Review) stateLabel = 'مراجعة دورية (Review)';
    else if (state === State.Relearning) stateLabel = 'إعادة تثبيت (Relearning)';

    return {
      verseKey: ayah.verse_key,
      surah: ayah.surah,
      ayah: ayah.ayah,
      page: ayah.page,
      juz: ayah.juz,
      textUthmani: ayah.text_uthmani,
      retrievability,
      stability: card ? Math.round(card.stability * 10) / 10 : 0,
      difficulty: card ? Math.round(card.difficulty * 10) / 10 : 5.0,
      elapsedDays: card?.elapsed_days ?? 0,
      scheduledDays: card?.scheduled_days ?? 0,
      reps: card?.reps ?? 0,
      lapses: card?.lapses ?? 0,
      state,
      stateLabel,
      status,
      due: card?.due ?? null,
      lastReview: card?.last_review ?? null,
      hasCard: Boolean(card && card.state !== State.New),
    };
  }

  /**
   * Computes Page Memory Stats across all 604 Medina Mushaf pages
   */
  public static computePageStats(
    pageNumber: number,
    ayahsOnPage: QuranAyah[],
    cardsMap: Map<string, MemoryCard>,
    transitionCardsMap: Map<string, MemoryCard> = new Map(),
    asOfDate: Date = new Date()
  ): PageMemoryStats {
    const totalAyahs = ayahsOnPage.length;
    let studiedCount = 0;
    let masteredCount = 0;
    let reviewDueCount = 0;
    let highRiskCount = 0;
    let newCount = 0;
    let retrievabilitySum = 0;
    let stabilitySum = 0;
    let difficultySum = 0;
    let totalLapses = 0;
    let totalReps = 0;
    let dueTodayCount = 0;
    let latestReviewTime = 0;

    const surahSet = new Set<number>();
    const ayahStatuses: AyahMemoryStatus[] = [];

    for (const ayah of ayahsOnPage) {
      surahSet.add(ayah.surah);
      const card = cardsMap.get(FSRSScheduler.getCardId('ayah', ayah.verse_key));
      const status = this.computeAyahStatus(ayah, card, asOfDate);
      ayahStatuses.push(status);

      if (status.hasCard) {
        studiedCount++;
        retrievabilitySum += status.retrievability;
        stabilitySum += status.stability;
        difficultySum += status.difficulty;
        totalLapses += status.lapses;
        totalReps += status.reps;

        if (status.status === 'mastered') masteredCount++;
        else if (status.status === 'review_due') reviewDueCount++;
        else if (status.status === 'high_risk') highRiskCount++;

        if (status.due && new Date(status.due).getTime() <= asOfDate.getTime()) {
          dueTodayCount++;
        }

        if (status.lastReview) {
          const t = new Date(status.lastReview).getTime();
          if (t > latestReviewTime) latestReviewTime = t;
        }
      } else {
        newCount++;
      }
    }

    const surahNumbers = Array.from(surahSet).sort((a, b) => a - b);
    const surahNames = surahNumbers.map((sNum) => {
      const meta = SURAHS.find((s) => s.number === sNum);
      return meta ? meta.nameArabic : `سورة ${sNum}`;
    });

    const juzNumber = ayahsOnPage[0]?.juz ?? Math.min(30, Math.ceil(pageNumber / 20.13));

    // Page Retrievability is strictly based on studied ayahs
    const retrievability =
      studiedCount > 0 ? Math.round(retrievabilitySum / studiedCount) : 0;
    const coveragePercent = totalAyahs > 0 ? Math.round((studiedCount / totalAyahs) * 100) : 0;

    // Page status categorization:
    let pageStatus: MemoryStatusCategory = 'new';
    if (studiedCount === 0) {
      pageStatus = 'new'; // Zero studied = strictly New (not mastered!)
    } else if (highRiskCount > 0 || (retrievability > 0 && retrievability < 85)) {
      pageStatus = 'high_risk';
    } else if (reviewDueCount > 0 || dueTodayCount > 0 || retrievability < 95 || studiedCount < totalAyahs) {
      pageStatus = 'review_due';
    } else if (studiedCount === totalAyahs && masteredCount === totalAyahs) {
      pageStatus = 'mastered';
    }

    // Boundary transition edge
    const lastAyah = ayahsOnPage[ayahsOnPage.length - 1];
    let boundaryTransition: PageTransitionStatus | undefined;
    if (lastAyah) {
      // Find boundary transition if exists
      for (const [, card] of transitionCardsMap) {
        if (card.target_id.startsWith(`${lastAyah.verse_key}->`)) {
          const r = Math.round(this.calculateAyahRetrievability(card, asOfDate) * 100);
          boundaryTransition = {
            edgeId: card.target_id,
            fromAyah: lastAyah.verse_key,
            toAyah: card.target_id.split('->')[1] || '',
            isPageBoundary: true,
            stability: card.stability,
            retrievability: r,
            due: card.due,
            state: card.state as State,
          };
          break;
        }
      }
    }

    return {
      pageNumber,
      juzNumber,
      surahNames,
      surahNumbers,
      totalAyahs,
      studiedAyahsCount: studiedCount,
      masteredAyahsCount: masteredCount,
      reviewDueAyahsCount: reviewDueCount,
      highRiskAyahsCount: highRiskCount,
      newAyahsCount: newCount,
      retrievability,
      coveragePercent,
      status: pageStatus,
      averageStability: studiedCount > 0 ? Math.round((stabilitySum / studiedCount) * 10) / 10 : 0,
      averageDifficulty: studiedCount > 0 ? Math.round((difficultySum / studiedCount) * 10) / 10 : 5.0,
      totalLapses,
      totalReps,
      dueTodayCount,
      lastReviewedDate: latestReviewTime > 0 ? new Date(latestReviewTime).toISOString().split('T')[0] : undefined,
      ayahStatuses,
      boundaryTransition,
    };
  }

  /**
   * Computes Surah retention rollup metrics for all 114 Surahs
   */
  public static computeSurahStats(
    surahs: SurahMeta[],
    allAyahs: QuranAyah[],
    cardsMap: Map<string, MemoryCard>,
    asOfDate: Date = new Date()
  ): SurahRetentionStats[] {
    const ayahsBySurah = new Map<number, QuranAyah[]>();
    for (const a of allAyahs) {
      const list = ayahsBySurah.get(a.surah) || [];
      list.push(a);
      ayahsBySurah.set(a.surah, list);
    }

    return surahs.map((meta) => {
      const ayahs = ayahsBySurah.get(meta.number) || [];
      const totalAyahs = ayahs.length || meta.ayahCount;
      let studied = 0;
      let mastered = 0;
      let reviewDue = 0;
      let highRisk = 0;
      let newCount = 0;
      let retrievabilitySum = 0;
      let totalLapses = 0;

      for (const a of ayahs) {
        const card = cardsMap.get(FSRSScheduler.getCardId('ayah', a.verse_key));
        const st = this.computeAyahStatus(a, card, asOfDate);
        if (st.hasCard) {
          studied++;
          retrievabilitySum += st.retrievability;
          totalLapses += st.lapses;
          if (st.status === 'mastered') mastered++;
          else if (st.status === 'review_due') reviewDue++;
          else if (st.status === 'high_risk') highRisk++;
        } else {
          newCount++;
        }
      }

      const retentionScore = studied > 0 ? Math.round(retrievabilitySum / studied) : 0;
      const coveragePercent = totalAyahs > 0 ? Math.round((studied / totalAyahs) * 100) : 0;

      let status: MemoryStatusCategory = 'new';
      if (studied === 0) status = 'new';
      else if (highRisk > 0 || retentionScore < 85) status = 'high_risk';
      else if (reviewDue > 0 || retentionScore < 95 || studied < totalAyahs) status = 'review_due';
      else if (studied === totalAyahs && mastered === totalAyahs) status = 'mastered';

      return {
        surahNumber: meta.number,
        nameArabic: meta.nameArabic,
        nameEnglish: meta.nameEnglish,
        totalAyahs,
        studiedAyahsCount: studied,
        masteredAyahsCount: mastered,
        reviewDueAyahsCount: reviewDue,
        highRiskAyahsCount: highRisk,
        newAyahsCount: newCount,
        retentionScore,
        coveragePercent,
        status,
        totalLapses,
        startPage: meta.startPage,
        endPage: meta.endPage,
        startJuz: meta.startJuz,
      };
    });
  }

  /**
   * Computes Juz retention rollup metrics for all 30 Juz
   */
  public static computeJuzStats(pageStats: Record<number, PageMemoryStats>): Record<number, JuzRetentionStats> {
    const juzMap: Record<number, JuzRetentionStats> = {};

    for (let j = 1; j <= 30; j++) {
      juzMap[j] = {
        juzNumber: j,
        totalPages: 0,
        studiedPagesCount: 0,
        masteredPagesCount: 0,
        reviewDuePagesCount: 0,
        highRiskPagesCount: 0,
        newPagesCount: 0,
        retentionScore: 0,
        coveragePercent: 0,
        status: 'new',
      };
    }

    for (let p = 1; p <= 604; p++) {
      const stat = pageStats[p];
      if (!stat) continue;
      const j = stat.juzNumber;
      if (!juzMap[j]) continue;

      juzMap[j].totalPages++;
      if (stat.status === 'mastered') {
        juzMap[j].masteredPagesCount++;
        juzMap[j].studiedPagesCount++;
      } else if (stat.status === 'review_due') {
        juzMap[j].reviewDuePagesCount++;
        juzMap[j].studiedPagesCount++;
      } else if (stat.status === 'high_risk') {
        juzMap[j].highRiskPagesCount++;
        juzMap[j].studiedPagesCount++;
      } else {
        juzMap[j].newPagesCount++;
      }
    }

    for (let j = 1; j <= 30; j++) {
      const item = juzMap[j];
      item.coveragePercent = item.totalPages > 0 ? Math.round((item.studiedPagesCount / item.totalPages) * 100) : 0;
      if (item.studiedPagesCount === 0) item.status = 'new';
      else if (item.highRiskPagesCount > 0) item.status = 'high_risk';
      else if (item.reviewDuePagesCount > 0 || item.studiedPagesCount < item.totalPages) item.status = 'review_due';
      else item.status = 'mastered';
    }

    return juzMap;
  }

  /**
   * Computes Global Heatmap Summary Metrics
   */
  public static computeGlobalSummary(
    pageStats: Record<number, PageMemoryStats>,
    surahStats: SurahRetentionStats[],
    allAyahStatuses: AyahMemoryStatus[]
  ): GlobalHeatmapSummary {
    let totalMemorizedAyahs = 0;
    let totalMemorizedPages = 0;
    let masteredPagesCount = 0;
    let reviewDuePagesCount = 0;
    let highRiskPagesCount = 0;
    let unreviewedPagesCount = 0;
    let totalLapses = 0;
    let dueTodayCount = 0;
    let studiedAyahScoreSum = 0;

    for (let p = 1; p <= 604; p++) {
      const ps = pageStats[p];
      if (!ps) continue;

      if (ps.studiedAyahsCount > 0) totalMemorizedPages++;
      if (ps.status === 'mastered') masteredPagesCount++;
      else if (ps.status === 'review_due') reviewDuePagesCount++;
      else if (ps.status === 'high_risk') highRiskPagesCount++;
      else unreviewedPagesCount++;

      dueTodayCount += ps.dueTodayCount;
      totalLapses += ps.totalLapses;
    }

    const studiedAyahs = allAyahStatuses.filter((a) => a.hasCard);
    totalMemorizedAyahs = studiedAyahs.length;
    for (const a of studiedAyahs) {
      studiedAyahScoreSum += a.retrievability;
    }

    const overallRetentionIndex =
      totalMemorizedAyahs > 0 ? Math.round(studiedAyahScoreSum / totalMemorizedAyahs) : 0;

    // Weakest Surahs (Surahs that have studied ayahs with lowest retention score or most lapses)
    const studiedSurahs = surahStats.filter((s) => s.studiedAyahsCount > 0);
    const weakestSurahs = [...studiedSurahs]
      .sort((a, b) => a.retentionScore - b.retentionScore || b.totalLapses - a.totalLapses)
      .slice(0, 5);

    // Weakest Ayahs (Ayahs with lowest R or highest lapses)
    const weakestAyahs = [...studiedAyahs]
      .sort((a, b) => a.retrievability - b.retrievability || b.lapses - a.lapses)
      .slice(0, 10);

    return {
      totalAyahs: allAyahStatuses.length || 6236,
      totalMemorizedAyahs,
      totalMemorizedPages,
      masteredPagesCount,
      reviewDuePagesCount,
      highRiskPagesCount,
      unreviewedPagesCount,
      overallRetentionIndex,
      dueTodayCount,
      totalLapses,
      weakestSurahs,
      weakestAyahs,
    };
  }
}
