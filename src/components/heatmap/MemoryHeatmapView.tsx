'use client';

import React from 'react';
import { useHeatmapStore, PageMemoryStats } from '@/stores/heatmap-store';
import { useSessionStore } from '@/stores/session-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { toArabicNumerals } from '@/components/mushaf/AyahMarker';
import {
  Activity,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

export const MemoryHeatmapView: React.FC = () => {
  const {
    pageStats,
    selectedPageForInspect,
    setSelectedPageForInspect,
    filterJuz,
    setFilterJuz,
    masteredPagesCount,
    reviewDuePagesCount,
    highRiskPagesCount,
  } = useHeatmapStore();

  const { setCurrentPage, setActiveView } = useSessionStore();
  const { startRecallSession } = useActiveRecallStore();

  // All 604 pages array
  const pages = Array.from({ length: 604 }, (_, i) => i + 1);

  // Filter pages by Juz if selected
  const displayedPages = filterJuz
    ? pages.filter((p) => pageStats[p]?.juzNumber === filterJuz)
    : pages;

  const handleLaunchPageReview = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    startRecallSession('retention');
    setActiveView('mushaf');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      
      {/* Top Header & Metrics */}
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          <div>
            <h1 className="font-arabic font-bold text-xl sm:text-2xl text-mushaf-ink dark:text-darkMushaf-ink flex items-center gap-2">
              <Activity className="w-6 h-6 text-mushaf-emerald dark:text-darkMushaf-emerald" />
              <span>الخريطة الحرارية لذاكرة المصحف (604 صفحات)</span>
            </h1>
            <p className="font-arabic text-xs sm:text-sm text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-1">
              مقياس احتمالية الاسترجاع (Retrievability R) لكل صفحة وفق خوارزمية FSRS ومحرك التسميع الصوتي.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-arabic">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
              <span>≥ 95% (متقن)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" />
              <span>85% - 94% (يحتاج مراجعة)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-red-500 inline-block" />
              <span>&lt; 85% (معرض للنسيان)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-gray-200 dark:bg-gray-800 inline-block" />
              <span>لم يبدأ بعد</span>
            </span>
          </div>
        </div>

        {/* Juz Filters Toolbar */}
        <div className="pt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-arabic">
          <span className="text-mushaf-ink-muted flex items-center gap-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية حسب الجزء:</span>
          </span>

          <button
            onClick={() => setFilterJuz(null)}
            className={`px-3 py-1.5 rounded-lg flex-shrink-0 font-medium transition-colors ${
              filterJuz === null
                ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald font-bold'
                : 'bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border'
            }`}
          >
            المصحف كاملًا (604)
          </button>

          {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
            <button
              key={juz}
              onClick={() => setFilterJuz(juz)}
              className={`px-2.5 py-1.5 rounded-lg flex-shrink-0 font-medium transition-colors ${
                filterJuz === juz
                  ? 'bg-mushaf-emerald text-white dark:bg-darkMushaf-emerald font-bold'
                  : 'bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border'
              }`}
            >
              الجزء {toArabicNumerals(juz)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Heatmap Grid & Inspector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* The 604 Pages Visual Heatmap Matrix */}
        <div className="lg:col-span-8 bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1 sm:gap-1.5 max-h-[600px] overflow-y-auto p-1">
            {displayedPages.map((pageNum) => {
              const stat = pageStats[pageNum];
              const r = stat?.retrievability ?? 0;

              let bgColor = 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:border-gray-400';
              if (r >= 95) {
                bgColor =
                  'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600 shadow-xs';
              } else if (r >= 85) {
                bgColor =
                  'bg-amber-500 text-white hover:bg-amber-600 border border-amber-600 shadow-xs';
              } else if (r > 0) {
                bgColor =
                  'bg-red-500 text-white hover:bg-red-600 border border-red-600 shadow-xs';
              }

              const isSelected = selectedPageForInspect?.pageNumber === pageNum;

              return (
                <button
                  key={pageNum}
                  onClick={() => setSelectedPageForInspect(stat || null)}
                  className={`aspect-square rounded flex flex-col items-center justify-center text-[10px] sm:text-xs font-semibold transition-all duration-150 select-none ${bgColor} ${
                    isSelected ? 'ring-2 ring-mushaf-gold ring-offset-2 scale-110 z-10' : ''
                  }`}
                  title={`صفحة ${pageNum} (الجزء ${stat?.juzNumber}) — استرجاع: ${r}%`}
                >
                  <span>{pageNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Page Inspector Card */}
        <div className="lg:col-span-4 bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-2xl p-5 shadow-md">
          {selectedPageForInspect ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
                <div>
                  <span className="text-xs font-arabic text-mushaf-ink-muted">
                    تفاصيل الصفحة
                  </span>
                  <h3 className="font-uthmani text-2xl font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                    صفحة {selectedPageForInspect.pageNumber}
                  </h3>
                </div>
                <div className="text-left">
                  <span className="text-xs font-arabic text-mushaf-emerald dark:text-darkMushaf-emerald font-bold">
                    الجزء {toArabicNumerals(selectedPageForInspect.juzNumber)}
                  </span>
                  <p className="text-xs text-mushaf-ink-muted">
                    {selectedPageForInspect.surahNames.join('، ')}
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
                      selectedPageForInspect.retrievability >= 95
                        ? 'text-emerald-600'
                        : selectedPageForInspect.retrievability >= 85
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {selectedPageForInspect.retrievability}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${selectedPageForInspect.retrievability}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedPageForInspect.retrievability >= 95
                        ? 'bg-emerald-500'
                        : selectedPageForInspect.retrievability >= 85
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>

              {/* FSRS Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-arabic">
                <div className="p-3 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                  <span className="text-mushaf-ink-muted block text-[11px]">ثبات الذاكرة (Stability):</span>
                  <span className="font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                    {selectedPageForInspect.stability} يومًا
                  </span>
                </div>

                <div className="p-3 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                  <span className="text-mushaf-ink-muted block text-[11px]">مؤشر الصعوبة (Difficulty):</span>
                  <span className="font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                    {selectedPageForInspect.difficulty.toFixed(1)} / 10
                  </span>
                </div>

                <div className="p-3 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                  <span className="text-mushaf-ink-muted block text-[11px]">عدد مرات التسميع:</span>
                  <span className="font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                    {selectedPageForInspect.reps} مرات
                  </span>
                </div>

                <div className="p-3 bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
                  <span className="text-mushaf-ink-muted block text-[11px]">مرات التعثر (Lapses):</span>
                  <span className="font-bold text-sm text-red-600 dark:text-red-400">
                    {selectedPageForInspect.lapses} تعثر
                  </span>
                </div>
              </div>

              {/* Direct Review Trigger */}
              <button
                onClick={() => handleLaunchPageReview(selectedPageForInspect.pageNumber)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mushaf-emerald hover:bg-emerald-800 text-white font-arabic font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <span>بدء تسميع صفحة {selectedPageForInspect.pageNumber}</span>
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

    </div>
  );
};
