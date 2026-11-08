'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MEDINA_PAGES, MedinaPageData, MushafLine } from '@/data/medina-pages';
import { SURAHS } from '@/data/surahs';
import { SurahHeader } from './SurahHeader';
import { GhostAyah } from './GhostAyah';
import { toArabicNumerals } from './AyahMarker';
import { useActiveRecallStore } from '@/stores/active-recall-store';

interface MedinaPageProps {
  pageNumber: number;
  isRecallModeActive?: boolean;
}

/**
 * Formats a raw quarter indicator (1 to 240 or 'الحزب X') into authentic
 * Medina Quranic Hizb Quarter terminology (e.g. 'نِصۡفُ الحِزۡبِ ٦٠').
 */
export function formatHizbQuarter(raw: string | number | undefined): string {
  if (!raw) return '';
  const match = String(raw).match(/\d+/);
  if (!match) return String(raw);
  const quarter = parseInt(match[0], 10);
  if (isNaN(quarter) || quarter < 1 || quarter > 240) return String(raw);

  const hizbNumber = Math.ceil(quarter / 4);
  const arabicHizb = toArabicNumerals(hizbNumber);
  const quarterInHizb = ((quarter - 1) % 4) + 1;

  switch (quarterInHizb) {
    case 1:
      return `الحِزۡبُ ${arabicHizb}`;
    case 2:
      return `رُبۡعُ الحِزۡبِ ${arabicHizb}`;
    case 3:
      return `نِصۡفُ الحِزۡبِ ${arabicHizb}`;
    case 4:
      return `ثَلَاثَةُ أَرۡبَاعِ الحِزۡبِ ${arabicHizb}`;
    default:
      return `الحِزۡبُ ${arabicHizb}`;
  }
}

export const WAQF_MARKS = new Set(['ۚ', 'ۖ', 'ۗ', 'ۘ', 'ۙ', 'ۜ', 'ۛ']);

/**
 * Normalizes raw page lines to faithfully adhere to the King Fahd Medina Mushaf:
 * - Page 1 (Al-Fatiha): Injects ornate Surah Header, centers Basmalah on its own line,
 *   and lays out the remaining 6 verses symmetrically.
 * - Pages 2-604: Injects ornate Surah Headers whenever a Surah begins, renders centered
 *   Basmalah lines (except Surah 9 At-Tawbah), cleanly merges waqf pause marks into the
 *   preceding words, and strips inline prepended Basmalah words.
 */
export function normalizePageLines(pageData: MedinaPageData): MushafLine[] {
  const pageNum = pageData.pageNumber;
  const rawLines = pageData.lines;

  // Special authentic layout for Page 1 (Al-Fatiha)
  if (pageNum === 1) {
    const allWords = rawLines.flatMap((l) => (l.type === 'text' ? l.words || [] : []));
    const fatihaMeta = SURAHS[0];
    const result: MushafLine[] = [];
    let lineCounter = 1;

    // Surah Header
    result.push({
      lineNumber: lineCounter++,
      type: 'surah_header',
      surahNumber: 1,
      surahName: fatihaMeta?.nameArabic || 'الفاتحة',
      revelationType: 'مَكِّيَّةٌ',
      ayahCount: 7,
    });

    const ayah1Words = allWords.filter((w) => w.ayahNumber === 1);
    const ayah2Words = allWords.filter((w) => w.ayahNumber === 2);
    const ayah3Words = allWords.filter((w) => w.ayahNumber === 3);
    const ayah4Words = allWords.filter((w) => w.ayahNumber === 4);
    const ayah5Words = allWords.filter((w) => w.ayahNumber === 5);
    const ayah6Words = allWords.filter((w) => w.ayahNumber === 6);
    const ayah7Words = allWords.filter((w) => w.ayahNumber === 7);

    const ayah7Part1 = ayah7Words.slice(0, 4);
    const ayah7Part2 = ayah7Words.slice(4);

    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah1Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah2Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: [...ayah3Words, ...ayah4Words] });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah5Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah6Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah7Part1 });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah7Part2 });

    return result;
  }

  // General layout for pages 2 to 604
  const result: MushafLine[] = [];
  let lineCounter = 1;
  const surahsHeaded = new Set<number>();

  for (let li = 0; li < rawLines.length; li++) {
    const line = rawLines[li];
    if (line.type === 'surah_header' || line.type === 'basmalah') {
      result.push({ ...line, lineNumber: lineCounter++ });
      continue;
    }

    const words = line.words || [];
    const currentLineWords: typeof words = [];

    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      const sNum = w.surahNumber;

      // Handle Waqf Marks (علامات الوقف): Merge into preceding word rather than creating orphan lines
      if (WAQF_MARKS.has(w.text)) {
        if (currentLineWords.length > 0) {
          let tIdx = currentLineWords.length - 1;
          while (tIdx >= 0 && currentLineWords[tIdx].isAyahMarker) tIdx--;
          if (tIdx >= 0) {
            currentLineWords[tIdx] = { ...currentLineWords[tIdx], waqfMark: w.text };
          }
        } else {
          // Waqf mark at line start belongs to the end of the previous text line
          for (let ri = result.length - 1; ri >= 0; ri--) {
            const prevLine = result[ri];
            if (prevLine.type === 'text' && prevLine.words.length > 0) {
              let tIdx = prevLine.words.length - 1;
              while (tIdx >= 0 && prevLine.words[tIdx].isAyahMarker) tIdx--;
              if (tIdx >= 0) {
                prevLine.words[tIdx] = { ...prevLine.words[tIdx], waqfMark: w.text };
              }
              break;
            }
          }
        }
        continue;
      }

      // If this word is the start of a new surah that hasn't been headed yet
      if (w.ayahNumber === 1 && !surahsHeaded.has(sNum)) {
        // Flush any preceding words from previous surah
        if (currentLineWords.length > 0) {
          result.push({
            lineNumber: lineCounter++,
            type: 'text',
            words: [...currentLineWords],
          });
          currentLineWords.length = 0;
        }

        surahsHeaded.add(sNum);
        const meta = SURAHS[sNum - 1];
        if (meta) {
          result.push({
            lineNumber: lineCounter++,
            type: 'surah_header',
            surahNumber: sNum,
            surahName: meta.nameArabic || meta.name,
            revelationType: meta.revelationType === 'Meccan' ? 'مَكِّيَّةٌ' : 'مَدَنِيَّةٌ',
            ayahCount: meta.ayahCount || meta.ayahsCount,
          });

          // Insert Basmalah for all surahs except Surah 9 (At-Tawbah) and Surah 1 (where Basmalah is verse 1)
          if (sNum !== 9 && sNum !== 1) {
            result.push({
              lineNumber: lineCounter++,
              type: 'basmalah',
              text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
            });
          }
        }
      }

      // In the scraped dataset, surahs > 1 have the Basmalah prepended as ayah 1 words 0..3
      // Filter those out of the inline verse text so they don't render inline
      if (sNum > 1 && w.ayahNumber === 1 && w.wordIndex <= 3 && !w.isAyahMarker) {
        continue;
      }

      currentLineWords.push(w);
    }

    if (currentLineWords.length > 0) {
      result.push({
        lineNumber: lineCounter++,
        type: 'text',
        words: currentLineWords,
      });
    }
  }

  return result;
}

export const MedinaPage: React.FC<MedinaPageProps> = ({
  pageNumber,
  isRecallModeActive = false,
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

  const { pageTurnDirection, setPageTurnDirection } = useActiveRecallStore();
  const [turningClass, setTurningClass] = useState<string>('');

  useEffect(() => {
    if (pageTurnDirection) {
      setTurningClass(
        pageTurnDirection === 'next'
          ? 'translate-x-2 opacity-90 transition-transform duration-200'
          : '-translate-x-2 opacity-90 transition-transform duration-200'
      );
      const timer = setTimeout(() => {
        setTurningClass('');
        setPageTurnDirection(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pageTurnDirection, pageNumber, setPageTurnDirection]);

  return (
    <div
      data-testid="medina-page"
      data-page-number={pageData.pageNumber}
      data-15-lines="true"
      className={`w-full max-w-3xl lg:max-w-4xl mx-auto my-4 transition-all duration-300 ${turningClass}`}
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
            <div
              data-testid="mushaf-15-lines-grid"
              className={
                isOpeningSpread
                  ? 'flex flex-col items-center justify-center py-2 sm:py-4 gap-2 sm:gap-3 min-h-[520px] sm:min-h-[620px] md:min-h-[700px]'
                  : 'flex flex-col justify-between min-h-[660px] sm:min-h-[740px] md:min-h-[820px] gap-1 sm:gap-1.5'
              }
            >
              {displayLines.map((line) => {
                if (line.type === 'surah_header') {
                  return (
                    <div key={`header-${line.lineNumber}`} className="w-full my-0.5 sm:my-1">
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
                      className="my-1 sm:my-1.5 py-1 text-center font-uthmani text-xl sm:text-2xl md:text-[26px] text-mushaf-emerald dark:text-darkMushaf-emerald font-semibold select-none tracking-wide"
                    >
                      {line.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={`text-${line.lineNumber}`}
                    className="flex items-center justify-center w-full py-0.5 sm:py-1 hover:bg-mushaf-gold/5 transition-colors rounded px-0.5 sm:px-1 min-h-[40px] sm:min-h-[46px]"
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
