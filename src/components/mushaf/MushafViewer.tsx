'use client';

import React from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { SURAHS } from '@/data/surahs';
import { MedinaPage } from './MedinaPage';
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Filter,
  Eye,
  Sliders,
} from 'lucide-react';

export const MushafViewer: React.FC = () => {
  const { currentPage, setCurrentPage, currentSurah, setCurrentSurah } =
    useSessionStore();
  const { recallSessionActive, mode, ghostTextLevel, setGhostTextLevel } =
    useActiveRecallStore();

  const handleNextPage = () => {
    if (currentPage < 604) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4" dir="rtl">
      
      {/* Top Mushaf Controls Bar */}
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-3 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        
        {/* Page / Surah Jump Selectors */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* Surah Dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-arabic">
            <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">السورة:</span>
            <select
              value={currentSurah}
              onChange={(e) => {
                const surahNum = parseInt(e.target.value, 10);
                setCurrentSurah(surahNum);
                const s = SURAHS.find((item) => item.number === surahNum);
                if (s) setCurrentPage(s.startPage);
              }}
              className="bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink dark:text-darkMushaf-ink rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-mushaf-gold"
            >
              {SURAHS.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.nameArabic} ({s.ayahCount} آية)
                </option>
              ))}
            </select>
          </div>

          {/* Page Direct Input */}
          <div className="flex items-center gap-1.5 text-xs font-arabic">
            <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">الصفحة:</span>
            <input
              type="number"
              min={1}
              max={604}
              value={currentPage}
              onChange={(e) => {
                const p = parseInt(e.target.value, 10);
                if (!isNaN(p)) setCurrentPage(p);
              }}
              className="w-16 bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink dark:text-darkMushaf-ink rounded-lg px-2 py-1.5 text-center font-bold focus:outline-none focus:ring-1 focus:ring-mushaf-gold"
            />
            <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">/ 604</span>
          </div>

        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold disabled:opacity-40 transition-colors"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابقة</span>
          </button>

          <span className="text-xs font-arabic text-mushaf-ink-muted px-2">
            صفحة {currentPage}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= 604}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold disabled:opacity-40 transition-colors"
            title="الصفحة التالية"
          >
            <span>التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Medina 15-Line Mushaf Page Container */}
      <div className="flex justify-center">
        <MedinaPage
          pageNumber={currentPage}
          isRecallModeActive={recallSessionActive}
        />
      </div>

    </div>
  );
};
