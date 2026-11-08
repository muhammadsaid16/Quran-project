'use client';

import React, { useState } from 'react';
import { useActiveRecallStore, TransitionTarget } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';
import { useSessionStore } from '@/stores/session-store';
import {
  ArrowRightLeft,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

const MOCK_TRANSITIONS: TransitionTarget[] = [
  {
    fromAyah: {
      surahNumber: 1,
      ayahNumber: 1,
      textEnding: '... ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
      pageNumber: 1,
    },
    toAyah: {
      surahNumber: 1,
      ayahNumber: 2,
      textBeginning: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ...',
      pageNumber: 1,
    },
    isPageBoundary: false,
  },
  {
    fromAyah: {
      surahNumber: 1,
      ayahNumber: 7,
      textEnding: '... غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
      pageNumber: 1,
    },
    toAyah: {
      surahNumber: 2,
      ayahNumber: 1,
      textBeginning: 'الٓمٓ • ذَٰلِكَ ٱلْكِتَٰبُ ...',
      pageNumber: 2,
    },
    isPageBoundary: true, // Page Boundary transition!
  },
  {
    fromAyah: {
      surahNumber: 2,
      ayahNumber: 5,
      textEnding: '... وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ',
      pageNumber: 2,
    },
    toAyah: {
      surahNumber: 2,
      ayahNumber: 6,
      textBeginning: 'إِنَّ ٱلَّذِينَ كَفَرُوا۟ سَوَآءٌ ...',
      pageNumber: 3,
    },
    isPageBoundary: true,
  },
];

export const TransitionGuide: React.FC = () => {
  const {
    transitionTarget,
    setTransitionTarget,
    transitionPauseDetected,
    setTransitionPauseDetected,
  } = useActiveRecallStore();

  const { isPauseExceeded, pauseDurationMs } = useRecitationStore();
  const { setCurrentPage } = useSessionStore();

  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const activeTransition = transitionTarget || MOCK_TRANSITIONS[selectedIdx];

  const handleSelectTransition = (idx: number) => {
    setSelectedIdx(idx);
    const target = MOCK_TRANSITIONS[idx];
    setTransitionTarget(target);
    setCurrentPage(target.fromAyah.pageNumber);
  };

  return (
    <div
      data-testid="transition-guide"
      className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-4 mb-4 shadow-sm"
      dir="rtl"
    >
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-arabic font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
              اختبار الروابط والانتقال السلس (Transition Mode)
            </h3>
            <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              قياس قوة الوصل بين أواخر الآيات ومطالع ما بعدها • كشف الوقفات {'>'} 2.0 ثانية
            </p>
          </div>
        </div>

        {/* Boundary Selector Tabs */}
        <div className="flex items-center gap-1.5">
          {MOCK_TRANSITIONS.map((t, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectTransition(idx)}
              className={`px-2.5 py-1 rounded-lg text-xs font-arabic transition-all ${
                selectedIdx === idx
                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/40'
                  : 'bg-mushaf-parchment dark:bg-darkMushaf-surface text-mushaf-ink-muted border border-mushaf-border'
              }`}
            >
              {t.isPageBoundary ? 'انتقال صفحة' : `وصل ${t.fromAyah.ayahNumber} ← ${t.toAyah.ayahNumber}`}
            </button>
          ))}
        </div>
      </div>

      {/* Continuity Bridge Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Terminal portion of Ayah N */}
        <div className="md:col-span-5 p-3 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border text-center">
          <span className="text-[11px] font-arabic text-mushaf-ink-muted block mb-1">
            ختام الآية السابقة ({activeTransition.fromAyah.surahNumber}:{activeTransition.fromAyah.ayahNumber})
          </span>
          <p className="font-uthmani text-lg font-bold text-mushaf-ink dark:text-darkMushaf-ink">
            {activeTransition.fromAyah.textEnding}
          </p>
        </div>

        {/* Bridge Indicator & Continuity Timer */}
        <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-1">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold mb-1">
            <ArrowRightLeft className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-[10px] font-arabic font-bold text-blue-600 dark:text-blue-400">
            {activeTransition.isPageBoundary ? 'حد صفحة' : 'وصل آية'}
          </span>
          <span className="text-[9px] text-mushaf-ink-muted">
            الحد الأقصى للوقفة: 2.0s
          </span>
        </div>

        {/* Target opening prompt for Ayah N+1 (Concealed/Prompted) */}
        <div className="md:col-span-5 p-3 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-dashed border-mushaf-gold text-center">
          <span className="text-[11px] font-arabic text-mushaf-gold block mb-1">
            المطلوب: صل بالمطلع مباشرة دون تردد ({activeTransition.toAyah.surahNumber}:{activeTransition.toAyah.ayahNumber})
          </span>
          <p className="font-uthmani text-lg font-bold text-transparent bg-mushaf-ink/10 rounded px-2 py-0.5 select-none blur-[4px]">
            {activeTransition.toAyah.textBeginning}
          </p>
        </div>
      </div>

      {/* Real-time Pause Alert Banner */}
      {(isPauseExceeded || transitionPauseDetected) && (
        <div className="mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-xs font-arabic text-red-700 dark:text-red-300 font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>
            تنبيه وقفة مفرطة: تم رصد توقف في التسميع تجاوز 2.0 ثانية ({((pauseDurationMs || 2200) / 1000).toFixed(1)} ث).
            يُنصح بإعادة التسميع لترسيخ الوصل الانسيابي.
          </span>
        </div>
      )}
    </div>
  );
};
