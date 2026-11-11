'use client';

import React from 'react';

interface AyahMarkerProps {
  ayahNumber?: number;
  number?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// Convert Western digits to Eastern Arabic-Indic numerals: 123 -> ١٢٣
export function toArabicNumerals(num: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] ?? d)
    .join('');
}

export const AyahMarker: React.FC<AyahMarkerProps> = ({
  ayahNumber,
  number,
  className = '',
  size = 'md',
  onClick,
}) => {
  const value = ayahNumber ?? number ?? 0;
  const arabicNum = toArabicNumerals(value);

  const sizeClasses = {
    sm: 'w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-[11px]',
    md: 'w-7 h-7 sm:w-8 sm:h-8 text-[11px] sm:text-[12px]',
    lg: 'w-9 h-9 sm:w-10 sm:h-10 text-[13px] sm:text-[14px]',
  };

  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`آية رقم ${value}`}
      title={`آية رقم ${value}`}
      className={`inline-flex items-center justify-center align-middle select-none font-bold relative text-mushaf-gold dark:text-darkMushaf-gold flex-shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {/* Authentic ornate ayah rosette (gold frame, olive ink) */}
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full drop-shadow-sm pointer-events-none fill-none stroke-current"
      >
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
        <circle cx="20" cy="3.5" r="1.2" className="fill-current" />
        <circle cx="20" cy="36.5" r="1.2" className="fill-current" />
        <circle cx="3.5" cy="20" r="1.2" className="fill-current" />
        <circle cx="36.5" cy="20" r="1.2" className="fill-current" />
      </svg>
      <span className="relative z-10 flex items-center justify-center font-uthmani font-semibold leading-none text-mushaf-ink dark:text-darkMushaf-ink -translate-y-px">
        {arabicNum}
      </span>
    </span>
  );
};
