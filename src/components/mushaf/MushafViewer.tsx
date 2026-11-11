'use client';

import React, { useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import {
  useActiveRecallStore,
  RecallMode,
  GhostTextLevel,
  getGhostTierNumber,
  getGhostTierLabel,
} from '@/stores/active-recall-store';
import { SURAHS } from '@/data/surahs';
import { MushafSpread } from './MushafSpread';
import { AcquisitionGuide } from './AcquisitionGuide';
import { RetentionGuide } from './RetentionGuide';
import { RandomAyahTestView } from './RandomAyahTestView';
import { RecitationHUD } from '@/components/hud/RecitationHUD';
import { MEDINA_PAGES } from '@/data/medina-pages';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Brain,
  Repeat,
  ArrowRightLeft,
  Shuffle,
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
    setAcquisitionStep,
    setPageTurnDirection,
  } = useActiveRecallStore();

  useEffect(() => {
    const pageData = MEDINA_PAGES[currentPage];
    if (pageData && pageData.startSurah && pageData.startSurah !== currentSurah) {
      setCurrentSurah(pageData.startSurah);
    }
  }, [currentPage, currentSurah, setCurrentSurah]);

  const handleNextPage = () => {
    if (currentPage < 604) {
      setPageTurnDirection('next');
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const pageData = MEDINA_PAGES[nextPage];
      if (pageData && pageData.startSurah) {
        setCurrentSurah(pageData.startSurah);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPageTurnDirection('prev');
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const pageData = MEDINA_PAGES[prevPage];
      if (pageData && pageData.startSurah) {
        setCurrentSurah(pageData.startSurah);
      }
    }
  };

  const handleJumpPages = (delta: number) => {
    const target = Math.max(1, Math.min(604, currentPage + delta));
    setPageTurnDirection(delta > 0 ? 'next' : 'prev');
    setCurrentPage(target);
    const pageData = MEDINA_PAGES[target];
    if (pageData && pageData.startSurah) {
      setCurrentSurah(pageData.startSurah);
    }
  };

  const currentTier = getGhostTierNumber(ghostTextLevel);

  return (
    <div
      data-testid="mushaf-viewer-container"
      className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 pb-36 sm:pb-40"
      dir="rtl"
    >
      {/* Top Mushaf Controls Bar: Navigation & Ghost Text Tier Controls */}
      <div className="mushaf-material bg-mushaf-surface/80 dark:bg-darkMushaf-card/75 backdrop-blur-xl backdrop-saturate-150 border border-mushaf-border/70 dark:border-darkMushaf-border/70 rounded-xl p-3 mb-4 shadow-page space-y-3">
        
        {/* Row 1: Mode Switcher & Ghost Text Tiers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          
          {/* Active Recall Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
            <button
              data-testid="mode-tab-acquisition"
              onClick={() => setMode('acquisition')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-[transform,background-color,color,box-shadow] duration-150 ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-[transform,background-color,color,box-shadow] duration-150 ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-[transform,background-color,color,box-shadow] duration-150 cursor-pointer ${
                mode === 'transition'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>اختبار عشوائي (السابق والتالي)</span>
            </button>
          </div>

          {/* Ghost Text Selector: Conceal vs Visible (No Hints) - only in acquisition/retention */}
          {mode !== 'transition' && (
            <div
              data-testid="ghost-tier-selector"
              className="flex items-center gap-1.5 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic"
            >
              {/* Level 1: Full Concealment (Active Recall / Memorization) */}
              <button
                data-testid="ghost-level-1-btn"
                onClick={() => {
                  setGhostTextLevel('level1_concealed');
                  if (mode === 'acquisition') {
                    setAcquisitionStep('recite');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-[transform,background-color,color,box-shadow] duration-150 font-semibold cursor-pointer ${
                  currentTier > 0
                    ? 'bg-mushaf-gold text-mushaf-ink font-bold shadow-sm'
                    : 'text-mushaf-ink-muted hover:text-mushaf-ink'
                }`}
                title="إخفاء كامل للنص للتسميع من الذاكرة (بدون أي تلميحات)"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>إخفاء النص (تسميع)</span>
              </button>

              {/* Visible: Full Mushaf Text */}
              <button
                data-testid="ghost-level-visible-btn"
                onClick={() => {
                  setGhostTextLevel('visible');
                  if (mode === 'acquisition') {
                    setAcquisitionStep('read');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-[transform,background-color,color,box-shadow] duration-150 font-semibold cursor-pointer ${
                  currentTier === 0
                    ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                    : 'text-mushaf-ink-muted hover:text-mushaf-ink'
                }`}
                title="عرض النص القرآني كاملاً للقراءة والمراجعة"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>إظهار النص (قراءة)</span>
              </button>

              {/* Hidden compatibility buttons */}
              <button data-testid="ghost-level-2-btn" onClick={() => setGhostTextLevel('level1_concealed')} className="hidden" />
              <button data-testid="ghost-level-3-btn" onClick={() => setGhostTextLevel('level1_concealed')} className="hidden" />
            </div>
          )}

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
                    const pageData = MEDINA_PAGES[p];
                    if (pageData && pageData.startSurah) {
                      setCurrentSurah(pageData.startSurah);
                    }
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
      {mode === 'transition' && <RandomAyahTestView />}

      {/* Medina 15-Line Mushaf Page Container (Only visible in normal reading/recitation modes) */}
      {mode !== 'transition' && (
        <div className="flex justify-center">
          <MushafSpread isRecallModeActive={currentTier > 0 || recallSessionActive} />
        </div>
      )}

      {/* Floating Recitation HUD (strictly active in Mushaf View) */}
      {mode !== 'transition' && <RecitationHUD />}
    </div>
  );
};
