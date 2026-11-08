'use client';

import React, { useEffect, useState } from 'react';
import { useHeatmapStore } from '@/stores/heatmap-store';
import { useSessionStore } from '@/stores/session-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { toArabicNumerals } from '@/components/mushaf/AyahMarker';
import { SURAHS } from '@/data/surahs';
import { AyahMemoryStatus, MemoryStatusCategory } from '@/fsrs/heatmap-analytics';
import {
  Activity,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronLeft,
  Calendar,
  BookOpen,
  Search,
  RotateCcw,
  Brain,
  Zap,
  ShieldCheck,
  Sparkles,
  Eye,
  Mic,
  X,
  ChevronDown,
  Info,
} from 'lucide-react';

export const MemoryHeatmapView: React.FC = () => {
  const {
    pageStats,
    surahStats,
    juzStats,
    globalSummary,
    selectedPage,
    selectedAyah,
    selectedItemReviewHistory,
    filterJuz,
    filterSurah,
    filterStatus,
    searchQuery,
    isLoading,
    loadHeatmapData,
    selectPage,
    selectAyah,
    clearSelectedAyah,
    setFilterJuz,
    setFilterSurah,
    setFilterStatus,
    setSearchQuery,
  } = useHeatmapStore();

  const { setCurrentPage, setActiveView } = useSessionStore();
  const { startRecallSession, setCurrentAyah } = useActiveRecallStore();

  const [activeTab, setActiveTab] = useState<'pages' | 'surahs' | 'weakest'>('pages');

  // Load live data from Dexie on mount
  useEffect(() => {
    loadHeatmapData();
  }, [loadHeatmapData]);

  // All 604 pages array
  const allPageNumbers = Array.from({ length: 604 }, (_, i) => i + 1);

  // Filter pages according to active filters
  const displayedPageNumbers = allPageNumbers.filter((p) => {
    const stat = pageStats[p];
    if (!stat) return true;

    // Filter by Juz
    if (filterJuz !== null && stat.juzNumber !== filterJuz) {
      return false;
    }

    // Filter by Surah
    if (filterSurah !== null && !stat.surahNumbers.includes(filterSurah)) {
      return false;
    }

    // Filter by Status
    if (filterStatus !== 'all' && stat.status !== filterStatus) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchPage = p.toString() === q;
      const matchSurah = stat.surahNames.some((name) => name.toLowerCase().includes(q));
      if (!matchPage && !matchSurah) return false;
    }

    return true;
  });

  const handleLaunchPageReview = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    startRecallSession('retention');
    setActiveView('mushaf');
  };

  const handleLaunchAyahReview = (ayah: AyahMemoryStatus) => {
    setCurrentPage(ayah.page);
    setCurrentAyah({
      ayahNumber: ayah.ayah,
      globalAyahNumber: ayah.ayah,
      surahNumber: ayah.surah,
      surahNameArabic: SURAHS.find((s) => s.number === ayah.surah)?.nameArabic || `سورة ${ayah.surah}`,
      textUthmani: ayah.textUthmani,
      pageNumber: ayah.page,
      juzNumber: ayah.juz,
    });
    startRecallSession('retention');
    setActiveView('mushaf');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 select-none" dir="rtl">
      
      {/* Top Header & Analytics Metrics Rollup */}
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-mushaf-emerald/10 text-mushaf-emerald dark:text-darkMushaf-emerald border border-mushaf-emerald/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>خريطة الذاكرة والاسترجاع التفاعلية (FSRS Memory Heatmap)</span>
            </div>
            <h1 className="font-arabic font-bold text-xl sm:text-2xl text-mushaf-ink dark:text-darkMushaf-ink flex items-center gap-2">
              <Activity className="w-6 h-6 text-mushaf-emerald dark:text-darkMushaf-emerald" />
              <span>مصحف الحفظ والاسترجاع (604 صفحات • 6,236 آية)</span>
            </h1>
            <p className="font-arabic text-xs sm:text-sm text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-1">
              حساب احتمالية الاسترجاع R(t) وفق خوارزمية FSRS المعتمدة على الفترات الزمنية ومحرك التحليل الصوتي.
            </p>
          </div>

          {/* Color Legend with strict state isolation */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-arabic bg-mushaf-parchment/60 dark:bg-darkMushaf-surface p-2.5 rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
            <span className="flex items-center gap-1.5" title="احتمالية الاسترجاع 95% فما فوق">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shadow-xs" />
              <span className="font-medium text-emerald-800 dark:text-emerald-300">≥ 95% (متقن)</span>
            </span>
            <span className="flex items-center gap-1.5" title="احتمالية الاسترجاع بين 85% و 94% أو مستحق للمراجعة">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block shadow-xs" />
              <span className="font-medium text-amber-800 dark:text-amber-300">85% - 94% (مراجعة)</span>
            </span>
            <span className="flex items-center gap-1.5" title="احتمالية الاسترجاع أقل من 85%">
              <span className="w-3.5 h-3.5 rounded bg-red-500 inline-block shadow-xs" />
              <span className="font-medium text-red-800 dark:text-red-300">&lt; 85% (تعثر/معرض للنسيان)</span>
            </span>
            <span className="flex items-center gap-1.5" title="بطاقة جديدة لم يبدأ تسميعها بعد (ليست متقنة)">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 inline-block" />
              <span className="font-medium text-slate-500 dark:text-slate-400">لم يبدأ بعد (جديد)</span>
            </span>
          </div>
        </div>

        {/* Global Retention Dashboard Rollup Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Memorized Ayahs */}
          <div className="bg-mushaf-parchment dark:bg-darkMushaf-surface p-3.5 rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-center">
            <span className="text-[11px] font-arabic text-mushaf-ink-muted block mb-1">الآيات المحفوظة</span>
            <span className="font-arabic font-extrabold text-xl text-mushaf-ink dark:text-darkMushaf-ink block">
              {toArabicNumerals(globalSummary.totalMemorizedAyahs)}
              <span className="text-xs font-normal text-mushaf-ink-muted mx-1">/ {toArabicNumerals(globalSummary.totalAyahs)}</span>
            </span>
            <span className="text-[10px] font-mono text-mushaf-ink-muted block mt-0.5">
              {Math.round((globalSummary.totalMemorizedAyahs / globalSummary.totalAyahs) * 100)}% إنجاز
            </span>
          </div>

          {/* Card 2: Overall Retention Index */}
          <div className="bg-mushaf-parchment dark:bg-darkMushaf-surface p-3.5 rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-center">
            <span className="text-[11px] font-arabic text-mushaf-ink-muted block mb-1">مؤشر الاسترجاع العام</span>
            <span className="font-arabic font-extrabold text-xl text-mushaf-emerald dark:text-darkMushaf-emerald block">
              {globalSummary.overallRetentionIndex}%
            </span>
            <span className="text-[10px] font-arabic text-mushaf-ink-muted block mt-0.5">
              احتمالية الاسترجاع R(t)
            </span>
          </div>

          {/* Card 3: Mastered Pages */}
          <div className="bg-emerald-500/10 dark:bg-emerald-500/15 p-3.5 rounded-xl border border-emerald-500/25 text-center">
            <span className="text-[11px] font-arabic text-emerald-800 dark:text-emerald-300 block mb-1">صفحات متقنة</span>
            <span className="font-arabic font-extrabold text-xl text-emerald-700 dark:text-emerald-300 block">
              {toArabicNumerals(globalSummary.masteredPagesCount)}
            </span>
            <span className="text-[10px] font-arabic text-emerald-700/80 dark:text-emerald-300/80 block mt-0.5">
              استرجاع ≥ 95%
            </span>
          </div>

          {/* Card 4: Due Today */}
          <div className="bg-amber-500/10 dark:bg-amber-500/15 p-3.5 rounded-xl border border-amber-500/25 text-center">
            <span className="text-[11px] font-arabic text-amber-800 dark:text-amber-300 block mb-1">مستحق للمراجعة اليوم</span>
            <span className="font-arabic font-extrabold text-xl text-amber-700 dark:text-amber-300 block">
              {toArabicNumerals(globalSummary.dueTodayCount)}
            </span>
            <span className="text-[10px] font-arabic text-amber-700/80 dark:text-amber-300/80 block mt-0.5">
              حسب جدول FSRS
            </span>
          </div>

          {/* Card 5: High Risk / Lapses */}
          <div className="bg-red-500/10 dark:bg-red-500/15 p-3.5 rounded-xl border border-red-500/25 text-center">
            <span className="text-[11px] font-arabic text-red-800 dark:text-red-300 block mb-1">بؤر تعثر معرضة للنسيان</span>
            <span className="font-arabic font-extrabold text-xl text-red-600 dark:text-red-400 block">
              {toArabicNumerals(globalSummary.highRiskPagesCount)}
            </span>
            <span className="text-[10px] font-arabic text-red-600/80 dark:text-red-400/80 block mt-0.5">
              استرجاع &lt; 85%
            </span>
          </div>

          {/* Card 6: Unstudied Pages */}
          <div className="bg-slate-500/10 dark:bg-slate-500/15 p-3.5 rounded-xl border border-slate-500/25 text-center">
            <span className="text-[11px] font-arabic text-slate-700 dark:text-slate-300 block mb-1">صفحات لم تبدأ بعد</span>
            <span className="font-arabic font-extrabold text-xl text-slate-700 dark:text-slate-300 block">
              {toArabicNumerals(globalSummary.unreviewedPagesCount)}
            </span>
            <span className="text-[10px] font-arabic text-slate-500 block mt-0.5">
              بطاقات جديدة (New)
            </span>
          </div>
        </div>

        {/* View Tabs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic">
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'pages'
                  ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald shadow-xs'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink'
              }`}
            >
              مصفوفة الصفحات (604)
            </button>
            <button
              onClick={() => setActiveTab('surahs')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'surahs'
                  ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald shadow-xs'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink'
              }`}
            >
              تحليلات السور (114)
            </button>
            <button
              onClick={() => setActiveTab('weakest')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'weakest'
                  ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald shadow-xs'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink'
              }`}
            >
              بؤر الضعف والتعثر
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الصفحة أو اسم السورة..."
              className="w-full pl-3 pr-8 py-1.5 text-xs font-arabic rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink dark:text-darkMushaf-ink focus:outline-none focus:ring-1 focus:ring-mushaf-emerald"
            />
            <Search className="w-3.5 h-3.5 text-mushaf-ink-muted absolute right-2.5 top-2.5" />
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="pt-2 border-t border-mushaf-border/60 dark:border-darkMushaf-border space-y-2">
          {/* Juz Selector Slider / Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-arabic">
            <span className="text-mushaf-ink-muted flex items-center gap-1 flex-shrink-0 text-[11px]">
              <Filter className="w-3 h-3" />
              <span>الجزء:</span>
            </span>

            <button
              onClick={() => setFilterJuz(null)}
              className={`px-2.5 py-1 rounded-lg flex-shrink-0 text-xs font-medium transition-colors ${
                filterJuz === null
                  ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald font-bold'
                  : 'bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border'
              }`}
            >
              كامل المصحف
            </button>

            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
              const jStat = juzStats[juz];
              return (
                <button
                  key={juz}
                  onClick={() => setFilterJuz(juz)}
                  className={`px-2.5 py-1 rounded-lg flex-shrink-0 text-xs font-medium transition-colors ${
                    filterJuz === juz
                      ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald font-bold'
                      : 'bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border'
                  }`}
                  title={jStat ? `الجزء ${juz}: ${jStat.masteredPagesCount} متقن • ${jStat.reviewDuePagesCount} مراجعة` : ''}
                >
                  {toArabicNumerals(juz)}
                </button>
              );
            })}
          </div>

          {/* Surah Dropdown & Status Filter */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-arabic text-mushaf-ink-muted">السورة:</span>
              <select
                value={filterSurah ?? ''}
                onChange={(e) => setFilterSurah(e.target.value ? Number(e.target.value) : null)}
                className="text-xs font-arabic px-3 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink dark:text-darkMushaf-ink focus:outline-none focus:ring-1 focus:ring-mushaf-emerald"
              >
                <option value="">جميع السور (114)</option>
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    {toArabicNumerals(s.number)}. {s.nameArabic} ({toArabicNumerals(s.ayahCount)} آية)
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 mr-auto text-xs font-arabic">
              <span className="text-[11px] text-mushaf-ink-muted">الحالة:</span>
              {(['all', 'mastered', 'review_due', 'high_risk', 'new'] as const).map((st) => {
                const labels = {
                  all: 'الكل',
                  mastered: 'متقن (≥95%)',
                  review_due: 'مراجعة',
                  high_risk: 'تعثر (<85%)',
                  new: 'لم يبدأ',
                };
                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      filterStatus === st
                        ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald'
                        : 'bg-mushaf-parchment dark:bg-darkMushaf-surface text-mushaf-ink-muted border border-mushaf-border dark:border-darkMushaf-border'
                    }`}
                  >
                    {labels[st]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* The 604 Pages Visual Heatmap Matrix */}
          <div className="lg:col-span-8 bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-arabic text-mushaf-ink-muted border-b border-mushaf-border/60 pb-2">
              <span>عرض {toArabicNumerals(displayedPageNumbers.length)} صفحة من أصل ٦٠٤</span>
              <span>انقر على أي صفحة لمعاينة تفاصيل آياتها وتاريخ المراجعة</span>
            </div>

            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1 sm:gap-1.5 max-h-[620px] overflow-y-auto p-1 scrollbar-thin">
              {displayedPageNumbers.map((pageNum) => {
                const stat = pageStats[pageNum];
                const r = stat?.retrievability ?? 0;
                const status = stat?.status ?? 'new';

                let bgColor = 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:border-slate-400 border border-transparent';
                if (status === 'mastered') {
                  bgColor =
                    'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600 shadow-xs';
                } else if (status === 'review_due') {
                  bgColor =
                    'bg-amber-500 text-white hover:bg-amber-600 border border-amber-600 shadow-xs';
                } else if (status === 'high_risk') {
                  bgColor =
                    'bg-red-500 text-white hover:bg-red-600 border border-red-600 shadow-xs';
                }

                const isSelected = selectedPage?.pageNumber === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => selectPage(pageNum)}
                    className={`aspect-square rounded flex flex-col items-center justify-center text-[10px] sm:text-xs font-semibold transition-all duration-150 select-none ${bgColor} ${
                      isSelected ? 'ring-2 ring-mushaf-gold ring-offset-2 scale-110 z-10' : ''
                    }`}
                    title={`صفحة ${pageNum} (الجزء ${stat?.juzNumber}) — استرجاع: ${r}% (${stat?.studiedAyahsCount}/${stat?.totalAyahs} آية)`}
                  >
                    <span>{pageNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Page Inspector Card & Ayah Drilldown */}
          <div className="lg:col-span-4 bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-2xl p-5 shadow-md space-y-4">
            {selectedPage ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
                  <div>
                    <span className="text-xs font-arabic text-mushaf-ink-muted">
                      تفاصيل الصفحة المختارة
                    </span>
                    <h3 className="font-uthmani text-2xl font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                      صفحة {toArabicNumerals(selectedPage.pageNumber)}
                    </h3>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-arabic text-mushaf-emerald dark:text-darkMushaf-emerald font-bold">
                      الجزء {toArabicNumerals(selectedPage.juzNumber)}
                    </span>
                    <p className="text-xs font-arabic text-mushaf-ink-muted">
                      {selectedPage.surahNames.join('، ')}
                    </p>
                  </div>
                </div>

                {/* Retrievability Gauge */}
                <div className="bg-mushaf-parchment dark:bg-darkMushaf-surface p-3.5 rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                  <div className="flex items-center justify-between mb-1.5 text-xs font-arabic">
                    <span className="font-semibold text-mushaf-ink dark:text-darkMushaf-ink">
                      احتمالية الاسترجاع (Retrievability):
                    </span>
                    <span
                      className={`font-bold ${
                        selectedPage.status === 'mastered'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : selectedPage.status === 'review_due'
                          ? 'text-amber-600 dark:text-amber-400'
                          : selectedPage.status === 'high_risk'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {selectedPage.status === 'new' ? 'لم يبدأ بعد (0%)' : `${selectedPage.retrievability}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${selectedPage.retrievability}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedPage.status === 'mastered'
                          ? 'bg-emerald-500'
                          : selectedPage.status === 'review_due'
                          ? 'bg-amber-500'
                          : selectedPage.status === 'high_risk'
                          ? 'bg-red-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* FSRS Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-arabic">
                  <div className="p-2.5 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                    <span className="text-mushaf-ink-muted block text-[11px]">الآيات المدروسة:</span>
                    <span className="font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                      {toArabicNumerals(selectedPage.studiedAyahsCount)} / {toArabicNumerals(selectedPage.totalAyahs)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                    <span className="text-mushaf-ink-muted block text-[11px]">متوسط الثبات (S):</span>
                    <span className="font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                      {selectedPage.averageStability} يومًا
                    </span>
                  </div>

                  <div className="p-2.5 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                    <span className="text-mushaf-ink-muted block text-[11px]">مستحق للمراجعة:</span>
                    <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                      {toArabicNumerals(selectedPage.dueTodayCount)} آيات
                    </span>
                  </div>

                  <div className="p-2.5 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                    <span className="text-mushaf-ink-muted block text-[11px]">مرات التعثر (Lapses):</span>
                    <span className="font-bold text-sm text-red-600 dark:text-red-400">
                      {toArabicNumerals(selectedPage.totalLapses)} تعثر
                    </span>
                  </div>
                </div>

                {/* Page Boundary Transition Edge Card Status */}
                {selectedPage.boundaryTransition && (
                  <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 rounded-xl text-xs font-arabic space-y-1">
                    <div className="flex items-center justify-between font-semibold text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>رابط نهاية الصفحة (Transition Link)</span>
                      </span>
                      <span>{selectedPage.boundaryTransition.retrievability}%</span>
                    </div>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                      الربط بين الآية {selectedPage.boundaryTransition.fromAyah} والصفحة التالية ({selectedPage.boundaryTransition.toAyah})
                    </p>
                  </div>
                )}

                {/* Ayahs Drilldown List on Selected Page */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-arabic text-mushaf-ink-muted">
                    <span>آيات الصفحة ({toArabicNumerals(selectedPage.ayahStatuses.length)}):</span>
                    <span>انقر لمعاينة تاريخ التسميع والأخطاء</span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                    {selectedPage.ayahStatuses.map((a) => {
                      let badgeColor = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
                      if (a.status === 'mastered') badgeColor = 'bg-emerald-500 text-white';
                      else if (a.status === 'review_due') badgeColor = 'bg-amber-500 text-white';
                      else if (a.status === 'high_risk') badgeColor = 'bg-red-500 text-white';

                      return (
                        <div
                          key={a.verseKey}
                          onClick={() => selectAyah(a.verseKey)}
                          className="p-2.5 rounded-xl bg-mushaf-parchment hover:bg-mushaf-gold/15 dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs font-arabic"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                                آية {toArabicNumerals(a.ayah)} ({a.verseKey})
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${badgeColor}`}>
                                {a.status === 'new' ? 'جديد' : `${a.retrievability}%`}
                              </span>
                            </div>
                            <p className="font-uthmani text-sm text-mushaf-ink/90 dark:text-darkMushaf-ink/90 truncate">
                              {a.textUthmani}
                            </p>
                          </div>

                          <div className="text-left flex-shrink-0 text-[10px] text-mushaf-ink-muted font-mono">
                            <span>S: {a.stability}d</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Page Review Trigger */}
                <button
                  onClick={() => handleLaunchPageReview(selectedPage.pageNumber)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mushaf-emerald hover:bg-emerald-800 text-white font-arabic font-bold text-sm shadow-md transition-all active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>بدء تسميع صفحة {toArabicNumerals(selectedPage.pageNumber)} بالصوت</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-arabic text-mushaf-ink-muted">
                اختر أي صفحة من الخريطة لعرض تفاصيل الذاكرة
              </div>
            )}
          </div>

        </div>
      )}

      {/* Surahs Tab */}
      {activeTab === 'surahs' && (
        <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-arabic font-bold text-lg text-mushaf-ink dark:text-darkMushaf-ink">
            تحليلات الحفظ والاسترجاع على مستوى السور (114 سورة)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {surahStats.map((s) => {
              let statusBadge = 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
              if (s.status === 'mastered') statusBadge = 'bg-emerald-500 text-white';
              else if (s.status === 'review_due') statusBadge = 'bg-amber-500 text-white';
              else if (s.status === 'high_risk') statusBadge = 'bg-red-500 text-white';

              return (
                <div
                  key={s.surahNumber}
                  onClick={() => {
                    setFilterSurah(s.surahNumber);
                    setActiveTab('pages');
                  }}
                  className="p-3.5 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border hover:border-mushaf-gold transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-mushaf-ink-muted">سورة #{s.surahNumber}</span>
                      <h3 className="font-uthmani text-lg font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                        سورة {s.nameArabic}
                      </h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold font-arabic ${statusBadge}`}>
                      {s.status === 'new' ? 'لم تبدأ' : `${s.retentionScore}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-arabic text-mushaf-ink-muted pt-1 border-t border-mushaf-border/60">
                    <span>{toArabicNumerals(s.studiedAyahsCount)} / {toArabicNumerals(s.totalAyahs)} آية</span>
                    <span>صفحة {toArabicNumerals(s.startPage)} - {toArabicNumerals(s.endPage)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weakest Spots / Hotspots Tab */}
      {activeTab === 'weakest' && (
        <div className="space-y-6">
          <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-arabic font-bold text-lg text-mushaf-ink dark:text-darkMushaf-ink flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>بؤر التعثر والآيات الأشد حاجة للتثبيت العاجل</span>
            </h2>
            <p className="text-xs font-arabic text-mushaf-ink-muted">
              آيات وسور تم رصد تكرار الخطأ أو انخفاض احتمالية استرجاعها دون 85% وفق خوارزمية FSRS ومحرك CTC.
            </p>

            {globalSummary.weakestAyahs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {globalSummary.weakestAyahs.map((a) => (
                  <div
                    key={a.verseKey}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 text-xs font-arabic"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-800 dark:text-red-300">
                        سورة {a.surah} • آية {a.ayah} (صفحة {a.page})
                      </span>
                      <span className="font-bold text-red-700 bg-red-200 dark:bg-red-900/60 px-2 py-0.5 rounded">
                        استرجاع: {a.retrievability}% • تعثر: {a.lapses}
                      </span>
                    </div>

                    <p className="font-uthmani text-base text-mushaf-ink dark:text-darkMushaf-ink leading-relaxed">
                      {a.textUthmani}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-red-500/20">
                      <button
                        onClick={() => selectAyah(a.verseKey)}
                        className="text-xs text-mushaf-emerald font-bold hover:underline"
                      >
                        معاينة تاريخ الخطأ
                      </button>

                      <button
                        onClick={() => handleLaunchAyahReview(a)}
                        className="px-3 py-1 bg-mushaf-emerald hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                      >
                        بدء تسميع فوري
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border text-xs font-arabic text-mushaf-ink-muted">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>لا توجد حالياً بؤر تعثر حرجة أقل من 85%. واصل التسميع المنتظم!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Ayah Review & Audit History Modal / Drawer */}
      {selectedAyah && (
        <div
          data-testid="ayah-memory-drawer"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-2xl shadow-2xl max-w-2xl w-full p-5 max-h-[90vh] flex flex-col space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-mushaf-border dark:border-darkMushaf-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-mushaf-emerald/15 text-mushaf-emerald flex items-center justify-center font-bold">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-arabic font-bold text-base text-mushaf-ink dark:text-darkMushaf-ink">
                    بطاقة ذاكرة الآية ({selectedAyah.verseKey})
                  </h3>
                  <span className="text-xs text-mushaf-ink-muted">
                    سورة {selectedAyah.surah} • صفحة {selectedAyah.page} • الجزء {selectedAyah.juz}
                  </span>
                </div>
              </div>

              <button
                onClick={clearSelectedAyah}
                className="p-1.5 rounded-lg text-mushaf-ink-muted hover:bg-mushaf-parchment dark:hover:bg-darkMushaf-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ayah Text in Uthmani Script */}
            <div className="p-4 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-center">
              <p className="font-uthmani text-xl sm:text-2xl text-mushaf-ink dark:text-darkMushaf-ink leading-loose">
                {selectedAyah.textUthmani}
              </p>
            </div>

            {/* FSRS Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-arabic text-center">
              <div className="p-2.5 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border">
                <span className="text-[11px] text-mushaf-ink-muted block">احتمالية الاسترجاع (R)</span>
                <span className="font-extrabold text-base text-mushaf-emerald dark:text-darkMushaf-emerald block">
                  {selectedAyah.status === 'new' ? 'لم تبدأ' : `${selectedAyah.retrievability}%`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border">
                <span className="text-[11px] text-mushaf-ink-muted block">ثبات الذاكرة (S)</span>
                <span className="font-extrabold text-base text-mushaf-ink dark:text-darkMushaf-ink block">
                  {selectedAyah.stability} يومًا
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border">
                <span className="text-[11px] text-mushaf-ink-muted block">مرات التعثر (Lapses)</span>
                <span className="font-extrabold text-base text-red-600 block">
                  {selectedAyah.lapses}
                </span>
              </div>
            </div>

            {/* Review History Audit Trail */}
            <div className="space-y-2 flex-1 min-h-0">
              <span className="text-xs font-arabic font-bold text-mushaf-ink dark:text-darkMushaf-ink block">
                سجل المراجعات والتقييم الصوتي السابق:
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs font-arabic scrollbar-thin">
                {selectedItemReviewHistory.length > 0 ? (
                  selectedItemReviewHistory.map((log) => {
                    const ratingNames = {
                      1: 'إعادة (Again)',
                      2: 'صعب (Hard)',
                      3: 'جيد (Good)',
                      4: 'سهل (Easy)',
                    };
                    const ratingColors = {
                      1: 'text-red-600 bg-red-100 dark:bg-red-950/60',
                      2: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60',
                      3: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60',
                      4: 'text-emerald-700 bg-emerald-200 dark:bg-emerald-900/60 font-bold',
                    };

                    return (
                      <div
                        key={log.log_id}
                        className="p-3 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${ratingColors[log.rating]}`}>
                            {ratingNames[log.rating]}
                          </span>
                          <span className="text-[10px] text-mushaf-ink-muted font-mono">
                            {new Date(log.timestamp).toLocaleString('ar-EG')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-mushaf-ink-muted pt-1">
                          <span>مدة التسجيل: {(log.recording_duration_ms / 1000).toFixed(1)} ث</span>
                          <span>أخطاء: {log.error_count}</span>
                          <span>ثقة التقاط الصوت: {Math.round(log.alignment_confidence * 100)}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-mushaf-ink-muted bg-mushaf-parchment/60 rounded-xl border border-mushaf-border">
                    لا يوجد سجل مراجعات سابقة لهذه الآية بعد.
                  </div>
                )}
              </div>
            </div>

            {/* Launch Voice Recitation */}
            <div className="pt-2 border-t border-mushaf-border">
              <button
                onClick={() => {
                  handleLaunchAyahReview(selectedAyah);
                  clearSelectedAyah();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mushaf-emerald hover:bg-emerald-800 text-white font-arabic font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>بدء تسميع صوتي لهذه الآية الآن</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
