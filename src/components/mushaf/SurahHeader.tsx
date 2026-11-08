'use client';

import React from 'react';
import { toArabicNumerals } from './AyahMarker';

interface SurahHeaderProps {
  surahNumber: number;
  surahName: string;
  revelationType: string;
  ayahCount: number;
}

export const SurahHeader: React.FC<SurahHeaderProps> = ({
  surahNumber,
  surahName,
  revelationType,
  ayahCount,
}) => {
  return (
    <div
      className="my-3 w-full relative overflow-hidden rounded-md border-2 border-mushaf-border-ornate bg-gradient-to-r from-mushaf-gold-light via-mushaf-surface to-mushaf-gold-light dark:from-darkMushaf-card dark:via-darkMushaf-surface dark:to-darkMushaf-card py-2 px-4 shadow-sm select-none"
      dir="rtl"
    >
      {/* Decorative inner border */}
      <div className="absolute inset-1 border border-mushaf-gold/40 dark:border-darkMushaf-gold/30 rounded pointer-events-none" />

      {/* Ornate corner rosettes */}
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-mushaf-gold dark:border-darkMushaf-gold" />
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-mushaf-gold dark:border-darkMushaf-gold" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-mushaf-gold dark:border-darkMushaf-gold" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-mushaf-gold dark:border-darkMushaf-gold" />

      <div className="flex items-center justify-between relative z-10 text-xs sm:text-sm font-arabic font-medium text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
        {/* Right Info: Revelation type */}
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-mushaf-emerald dark:bg-darkMushaf-emerald inline-block" />
          <span>{revelationType}</span>
        </span>

        {/* Center Title: Surah Name in authentic ornate styling */}
        <div className="flex items-center gap-2">
          <span className="text-mushaf-gold dark:text-darkMushaf-gold font-serif text-sm">۞</span>
          <h2 className="font-uthmani text-xl sm:text-2xl font-bold text-mushaf-ink dark:text-darkMushaf-ink tracking-wide">
            سُورَةُ {surahName}
          </h2>
          <span className="text-mushaf-gold dark:text-darkMushaf-gold font-serif text-sm">۞</span>
        </div>

        {/* Left Info: Ayah count */}
        <span className="flex items-center gap-1">
          <span>آيَاتُهَا {toArabicNumerals(ayahCount)}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-mushaf-gold dark:bg-darkMushaf-gold inline-block" />
        </span>
      </div>
    </div>
  );
};
