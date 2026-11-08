'use client';

import React from 'react';
import { MEDINA_PAGES, MedinaPageData } from '@/data/medina-pages';
import { SurahHeader } from './SurahHeader';
import { GhostAyah } from './GhostAyah';
import { toArabicNumerals } from './AyahMarker';

interface MedinaPageProps {
  pageNumber: number;
  isRecallModeActive?: boolean;
}

export const MedinaPage: React.FC<MedinaPageProps> = ({
  pageNumber,
  isRecallModeActive = false,
}) => {
  const pageData: MedinaPageData =
    MEDINA_PAGES[pageNumber] || MEDINA_PAGES[2]; // Fallback to Al-Baqarah page 2

  const arabicPageNum = toArabicNumerals(pageData.pageNumber);
  const arabicJuzNum = toArabicNumerals(pageData.juzNumber);

  return (
    <div
      className="w-full max-w-2xl mx-auto my-4 transition-all duration-300"
      dir="rtl"
    >
      {/* Outer Mushaf Page Container */}
      <div className="relative bg-mushaf-parchment dark:bg-darkMushaf-bg border border-mushaf-border dark:border-darkMushaf-border rounded-xl shadow-mushaf p-4 sm:p-6 md:p-8 select-none">
        {/* Double Ornate Medina Frame */}
        <div className="border-2 border-mushaf-gold/60 dark:border-darkMushaf-gold/40 rounded-lg p-2.5 sm:p-4">
          <div className="border border-mushaf-gold/30 dark:border-darkMushaf-gold/20 rounded p-2 sm:p-3 relative">
            
            {/* Top Page Margin: Juz and Surah Indicators */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-mushaf-border/60 dark:border-darkMushaf-border text-xs sm:text-sm font-arabic font-semibold text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-mushaf-emerald dark:bg-darkMushaf-emerald inline-block" />
                <span>الجُزۡءُ {arabicJuzNum}</span>
              </span>

              <span className="font-uthmani text-base sm:text-lg text-mushaf-ink dark:text-darkMushaf-ink">
                {pageData.surahHeaderName}
              </span>

              <span className="flex items-center gap-1.5">
                <span>{pageData.hizbQuarter}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-mushaf-gold dark:bg-darkMushaf-gold inline-block" />
              </span>
            </div>

            {/* Exactly 15 Lines Grid */}
            <div className="flex flex-col justify-between min-h-[640px] sm:min-h-[720px] md:min-h-[800px] gap-1 sm:gap-1.5">
              {pageData.lines.map((line) => {
                if (line.type === 'surah_header') {
                  return (
                    <div key={line.lineNumber} className="w-full">
                      <SurahHeader
                        surahNumber={line.surahNumber}
                        surahName={line.surahName}
                        revelationType={line.revelationType}
                        ayahCount={line.ayahCount}
                      />
                    </div>
                  );
                }

                if (line.type === 'basmalah') {
                  return (
                    <div
                      key={line.lineNumber}
                      className="py-1 text-center font-uthmani text-xl sm:text-2xl text-mushaf-emerald dark:text-darkMushaf-emerald font-semibold select-none"
                    >
                      {line.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={line.lineNumber}
                    className="flex items-center justify-between w-full border-b border-dashed border-mushaf-border/20 dark:border-darkMushaf-border/20 py-0.5 hover:bg-mushaf-gold/5 transition-colors rounded px-1"
                  >
                    <GhostAyah
                      words={line.words}
                      isRecallModeActive={isRecallModeActive}
                    />
                  </div>
                );
              })}
            </div>

            {/* Bottom Page Margin: Medina Page Number & Navigation Bookmark */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-mushaf-border/60 dark:border-darkMushaf-border text-xs sm:text-sm font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              <span>{pageData.isRightPage ? 'صفحة يمنى' : 'صفحة يسرى'}</span>
              <div className="flex items-center gap-2">
                <span className="text-mushaf-gold dark:text-darkMushaf-gold font-bold">۞</span>
                <span className="font-uthmani text-base sm:text-lg font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                  {arabicPageNum}
                </span>
                <span className="text-mushaf-gold dark:text-darkMushaf-gold font-bold">۞</span>
              </div>
              <span className="text-[11px] opacity-75">مصحف المدينة النبوية (١٥ سطرًا)</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
