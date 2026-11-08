'use client';

import React from 'react';
import { useSessionStore } from '@/stores/session-store';
import {
  useActiveRecallStore,
  RecallMode,
  GhostTextLevel,
  getGhostTierNumber,
  getGhostTierLabel,
} from '@/stores/active-recall-store';
import { SURAHS } from '@/data/surahs';
import { MedinaPage } from './MedinaPage';
import { AcquisitionGuide } from './AcquisitionGuide';
import { RetentionGuide } from './RetentionGuide';
import { TransitionGuide } from './TransitionGuide';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Brain,
  Repeat,
  ArrowRightLeft,
  Eye,
  EyeOff,
  BookOpen,
} from 'lucide-react';

export const MushafViewer: React.FC = () => {
  const { currentPage, setCurrentPage, currentSurah, setCurrentSurah } =
    useSessionStore();

  const {
    recallSessionActive,
    mode,
    setMode,
    ghostTextLevel,
    setGhostTextLevel,
    setPageTurnDirection,
  } = useActiveRecallStore();

  const handleNextPage = () => {
    if (currentPage < 604) {
      setPageTurnDirection('next');
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPageTurnDirection('prev');
      setCurrentPage(currentPage - 1);
    }
  };

  const handleJumpPages = (delta: number) => {
    const target = Math.max(1, Math.min(604, currentPage + delta));
    setPageTurnDirection(delta > 0 ? 'next' : 'prev');
    setCurrentPage(target);
  };

  const currentTier = getGhostTierNumber(ghostTextLevel);

  return (
    <div
      data-testid="mushaf-viewer-container"
      className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 pb-36 sm:pb-40"
      dir="rtl"
    >
      {/* Top Mushaf Controls Bar: Navigation & Ghost Text Tier Controls */}
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-3 mb-4 shadow-sm space-y-3">
        
        {/* Row 1: Mode Switcher & Ghost Text Tiers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          
          {/* Active Recall Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
            <button
              data-testid="mode-tab-acquisition"
              onClick={() => setMode('acquisition')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-all ${
                mode === 'acquisition'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>حفظ جديد (Acquisition)</span>
            </button>

            <button
              data-testid="mode-tab-retention"
              onClick={() => setMode('retention')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-all ${
                mode === 'retention'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>مراجعة متباعدة (Retention)</span>
            </button>

            <button
              data-testid="mode-tab-transition"
              onClick={() => setMode('transition')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-all ${
                mode === 'transition'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>اختبار الروابط (Transition)</span>
            </button>
          </div>

          {/* Ghost Text 3-Tier Switcher */}
          <div
            data-testid="ghost-tier-selector"
            className="flex items-center gap-1 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic"
          >
            <span className="text-[11px] font-semibold text-mushaf-ink-muted px-2">النص الشبح:</span>

            {/* Level 1: Full Concealment */}
            <button
              data-testid="ghost-level-1-btn"
              onClick={() => setGhostTextLevel('level1_concealed')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentTier === 1
                  ? 'bg-mushaf-gold text-mushaf-ink font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
              title="إخفاء كامل لجميع الكلمات مع بقاء مواضع الآيات"
            >
              مستوى ١: إخفاء كامل
            </button>

            {/* Level 2: First Words / Anchor Clues */}
            <button
              data-testid="ghost-level-2-btn"
              onClick={() => setGhostTextLevel('level2_first_words')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentTier === 2
                  ? 'bg-mushaf-gold text-mushaf-ink font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
              title="ظهور أول كلمة أو كلمتين من كل آية"
            >
              مستوى ٢: بدايات الآيات
            </button>

            {/* Level 3: Key Landmarks */}
            <button
              data-testid="ghost-level-3-btn"
              onClick={() => setGhostTextLevel('level3_landmarks')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentTier === 3
                  ? 'bg-mushaf-gold text-mushaf-ink font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
              title="ظهور المعالم الهيكلية والروابط"
            >
              مستوى ٣: معالم الآيات
            </button>

            {/* Study Mode: Visible */}
            <button
              data-testid="ghost-level-visible-btn"
              onClick={() => setGhostTextLevel('visible')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentTier === 0
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
              title="عرض النص القرآني كاملاً للقراءة والدراسة"
            >
              نص كامل
            </button>
          </div>

        </div>

        {/* Row 2: Page Turning Stepper & Selectors (ZERO KEYBOARD INPUTS) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Surah & Fast Jump Dropdowns (No keyboard typing required!) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            
            {/* Surah Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-arabic">
              <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">السورة:</span>
              <select
                data-testid="surah-select-dropdown"
                value={currentSurah}
                onChange={(e) => {
                  const surahNum = parseInt(e.target.value, 10);
                  setCurrentSurah(surahNum);
                  const s = SURAHS.find((item) => item.number === surahNum);
                  if (s) {
                    setPageTurnDirection('next');
                    setCurrentPage(s.startPage);
                  }
                }}
                className="bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink dark:text-darkMushaf-ink rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-mushaf-gold cursor-pointer"
              >
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.nameArabic} ({s.ayahCount} آية)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Page Jump Dropdown (ZERO keyboard input) */}
            <div className="flex items-center gap-1.5 text-xs font-arabic">
              <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">انتقال لصفحة:</span>
              <select
                data-testid="page-select-dropdown"
                value={currentPage}
                onChange={(e) => {
                  const p = parseInt(e.target.value, 10);
                  if (!isNaN(p)) {
                    setPageTurnDirection(p > currentPage ? 'next' : 'prev');
                    setCurrentPage(p);
                  }
                }}
                className="bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink dark:text-darkMushaf-ink rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-mushaf-gold cursor-pointer"
              >
                {Array.from({ length: 604 }, (_, i) => i + 1).map((pageNum) => (
                  <option key={pageNum} value={pageNum}>
                    صفحة {pageNum}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Stepper Page Navigation Buttons (Zero character entry) */}
          <div data-testid="page-navigation-controls" className="flex items-center gap-1.5">
            
            {/* Jump -10 */}
            <button
              onClick={() => handleJumpPages(-10)}
              disabled={currentPage <= 10}
              className="px-2 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold disabled:opacity-30 transition-colors"
              title="الانتقال 10 صفحات للخلف"
            >
              <ChevronsRight className="w-4 h-4 inline" />
              <span className="mr-0.5">١٠-</span>
            </button>

            {/* Previous Page (-1) */}
            <button
              data-testid="prev-page-btn"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold disabled:opacity-30 transition-colors"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابقة</span>
            </button>

            {/* Page Indicator (Read-only badge, NO INPUT) */}
            <div
              data-testid="current-page-badge"
              className="px-3 py-1.5 rounded-lg bg-mushaf-gold/15 border border-mushaf-gold/40 text-xs font-arabic font-bold text-mushaf-ink dark:text-darkMushaf-ink"
            >
              صفحة {currentPage} / 604
            </div>

            {/* Next Page (+1) */}
            <button
              data-testid="next-page-btn"
              onClick={handleNextPage}
              disabled={currentPage >= 604}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold disabled:opacity-30 transition-colors"
              title="الصفحة التالية"
            >
              <span>التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Jump +10 */}
            <button
              onClick={() => handleJumpPages(10)}
              disabled={currentPage >= 595}
              className="px-2 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold disabled:opacity-30 transition-colors"
              title="الانتقال 10 صفحات للأمام"
            >
              <span className="ml-0.5">١٠+</span>
              <ChevronsLeft className="w-4 h-4 inline" />
            </button>

          </div>

        </div>

      </div>

      {/* Mode-Specific Interaction Guides */}
      {mode === 'acquisition' && <AcquisitionGuide />}
      {mode === 'retention' && <RetentionGuide />}
      {mode === 'transition' && <TransitionGuide />}

      {/* Medina 15-Line Mushaf Page Container */}
      <div className="flex justify-center">
        <MedinaPage
          pageNumber={currentPage}
          isRecallModeActive={currentTier > 0 || recallSessionActive}
        />
      </div>

    </div>
  );
};
