'use client';

import React, { useMemo } from 'react';
import { MEDINA_PAGES, MedinaPageData } from '@/data/medina-pages';
import {
  formatHizbQuarter,
  normalizePageLines,
} from '@/data/mushaf-layout';
import { SurahHeader } from './SurahHeader';
import { GhostAyah } from './GhostAyah';
import { toArabicNumerals } from './AyahMarker';

interface MedinaPageProps {
  pageNumber: number;
  isRecallModeActive?: boolean;
  /**
   * True for the page waiting behind the one being read. It is rendered while
   * a page turn is in flight, so it must not run the page-turn animation
   * itself.
   */
  isSecondary?: boolean;
}


export const MedinaPage: React.FC<MedinaPageProps> = ({
  pageNumber,
  isRecallModeActive = false,
  isSecondary = false,
}) => {
  const pageData: MedinaPageData =
    MEDINA_PAGES[pageNumber] || MEDINA_PAGES[2]; // Fallback to Al-Baqarah page 2

  const arabicPageNum = toArabicNumerals(pageData.pageNumber);
  const arabicJuzNum = toArabicNumerals(pageData.juzNumber);
  const formattedQuarter = formatHizbQuarter(pageData.hizbQuarter);

  const displayLines = useMemo(
    () => normalizePageLines(pageData),
    [pageData]
  );

  const isOpeningSpread = pageData.pageNumber === 1 || pageData.pageNumber === 2;

  // The page turn itself lives in MushafSpread, which drives the motion with
  // an interruptible spring. This component only draws the page.

  return (
    <div
      data-testid="medina-page"
      data-page-number={pageData.pageNumber}
      data-15-lines="true"
      className="w-full max-w-3xl lg:max-w-4xl mx-auto my-4 pb-24"
      dir="rtl"
    >
      {/* Outer Mushaf Page Container */}
      <div className="relative bg-mushaf-parchment dark:bg-darkMushaf-bg border border-mushaf-border dark:border-darkMushaf-border rounded-2xl shadow-mushaf p-3 sm:p-5 md:p-6 select-none">
        {/* Double Ornate Medina Frame */}
        <div className="border-2 border-mushaf-gold/60 dark:border-darkMushaf-gold/40 rounded-xl p-2 sm:p-3.5">
          <div className="border border-mushaf-gold/30 dark:border-darkMushaf-gold/20 rounded-lg p-2 sm:p-3 relative">
            
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
                <span>{formattedQuarter}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-mushaf-gold dark:bg-darkMushaf-gold inline-block" />
              </span>
            </div>

            {/* Mushaf Lines Grid */}
            {isOpeningSpread ? (
              /* ── Pages 1 & 2: Compact centered column (Al-Fatiha / start of Al-Baqarah) ── */
              <div
                data-testid="mushaf-15-lines-grid"
                className="flex flex-col items-center justify-center py-4 sm:py-8 gap-3 sm:gap-4 min-h-[520px] sm:min-h-[620px] md:min-h-[700px] w-full"
              >
                {displayLines.map((line) => {
                  if (line.type === 'surah_header') {
                    return (
                      <div key={`header-${line.lineNumber}`} className="w-full max-w-[540px] mx-auto my-0.5 sm:my-1">
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
                        key={`basmalah-${line.lineNumber}`}
                        className="w-full max-w-[540px] mx-auto text-center font-uthmani text-2xl sm:text-3xl md:text-[30px] text-mushaf-emerald dark:text-darkMushaf-emerald font-semibold select-none"
                      >
                        {line.text}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`text-${line.lineNumber}`}
                      className="w-full max-w-[540px] mx-auto hover:bg-mushaf-gold/5 transition-colors rounded"
                    >
                      <GhostAyah
                        words={line.words}
                        isRecallModeActive={isRecallModeActive}
                        isOpeningSpread={true}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Pages 3–604: Full 15-line justified grid ── */
              <div
                data-testid="mushaf-15-lines-grid"
                className="flex flex-col justify-between min-h-[660px] sm:min-h-[740px] md:min-h-[820px] pb-6 sm:pb-8 w-full"
              >
                {displayLines.map((line) => {
                  if (line.type === 'surah_header') {
                    return (
                      <div key={`header-${line.lineNumber}`} className="w-full my-0.5 sm:my-1 flex-shrink-0">
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
                        key={`basmalah-${line.lineNumber}`}
                        className="flex-shrink-0 py-1 text-center font-uthmani text-xl sm:text-2xl md:text-[26px] text-mushaf-emerald dark:text-darkMushaf-emerald font-semibold select-none"
                      >
                        {line.text}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`text-${line.lineNumber}`}
                      className="flex-1 flex items-center w-full hover:bg-mushaf-gold/5 transition-colors rounded px-0.5 sm:px-1 min-h-0"
                    >
                      <GhostAyah
                        words={line.words}
                        isRecallModeActive={isRecallModeActive}
                        isOpeningSpread={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}

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
