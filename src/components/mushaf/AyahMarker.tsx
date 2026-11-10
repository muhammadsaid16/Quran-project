'use client';

import React from 'react';

interface AyahMarkerProps {
  ayahNumber: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// Convert English digits to Eastern Arabic (Arabic-Indic) numerals: 123 -> ١٢٣
export function toArabicNumerals(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] ?? d)
    .join('');
}

export const AyahMarker: React.FC<AyahMarkerProps> = ({
  ayahNumber,
  className = '',
  size = 'md',
  onClick,
}) => {
  const arabicNum = toArabicNumerals(ayahNumber);

  const sizeClasses = {
    sm: 'w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-[11px]',
    md: 'w-7 h-7 sm:w-8 sm:h-8 text-[11px] sm:text-[12px]',
    lg: 'w-9 h-9 sm:w-10 sm:h-10 text-[13px] sm:text-[14px]',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center align-middle select-none font-bold relative text-mushaf-gold dark:text-darkMushaf-gold flex-shrink-0 ${sizeClasses[size]} ${className}`}
      title={`آية رقم ${ayahNumber}`}
    >
      {/* Authentic Ornate Quranic Ayah Rosette SVG */}
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 w-full h-full drop-shadow-sm pointer-events-none fill-none stroke-current"
      >
        {/* Outer 8-point scalloped floral ring */}
        <circle
          cx="20"
          cy="20"
          r="17"
          strokeWidth="1.5"
          strokeDasharray="2 1"
          className="opacity-70"
        />
        <circle cx="20" cy="20" r="14.5" strokeWidth="1.2" />
        <circle cx="20" cy="20" r="12" strokeWidth="0.8" className="opacity-50" />
        {/* Cardinal ornamental dots */}
        <circle cx="20" cy="3.5" r="1.2" className="fill-current" />
        <circle cx="20" cy="36.5" r="1.2" className="fill-current" />
        <circle cx="3.5" cy="20" r="1.2" className="fill-current" />
        <circle cx="36.5" cy="20" r="1.2" className="fill-current" />
      </svg>
      {/* Centered Arabic Numeral */}
      <span className="relative z-10 font-uthmani font-semibold text-mushaf-ink dark:text-darkMushaf-ink pt-0.5 leading-none">
        {arabicNum}
      </span>
    </span>
  );
};
