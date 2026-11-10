'use client';

import React from 'react';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';
import { useSessionStore } from '@/stores/session-store';
import {
  Brain,
  Headphones,
  EyeOff,
  Mic,
  CheckCircle2,
  Sparkles,
  Flame,
  RotateCcw,
} from 'lucide-react';

export const AcquisitionGuide: React.FC = () => {
  const {
    acquisitionStep,
    setAcquisitionStep,
    consecutiveFlawlessCount,
    resetFlawless,
    ghostTextLevel,
    setGhostTextLevel,
    currentAyah,
  } = useActiveRecallStore();

  const { status, resetRecitation } = useRecitationStore();
  const { currentPage } = useSessionStore();

  return (
    <div
      data-testid="acquisition-guide"
      className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-4 mb-4 shadow-sm"
      dir="rtl"
    >
      {/* Header and Step Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-mushaf-emerald/15 text-mushaf-emerald dark:text-darkMushaf-emerald flex items-center justify-center font-bold">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-arabic font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
              مسار وضع الحفظ الجديد (Acquisition Flow)
            </h3>
            <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              حفظ متدرج: قراءة واستماع ← تسميع صوتي غيباً ← مراجعة وإتقان (مرتين متتاليتين)
            </p>
          </div>
        </div>

        {/* Flawless Counter Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-arabic font-bold border transition-all ${
              consecutiveFlawlessCount >= 2
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                : consecutiveFlawlessCount === 1
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : 'bg-mushaf-parchment dark:bg-darkMushaf-surface text-mushaf-ink-muted dark:text-darkMushaf-ink-muted border-mushaf-border'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-mushaf-gold" />
            <span>
              الإتقان المتتالي: {consecutiveFlawlessCount} / 2
            </span>
          </div>
        </div>
      </div>

      {/* Step Sequence Pills (3 Clear Steps) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {/* Step 1: Read */}
        <button
          onClick={() => {
            setAcquisitionStep('read');
            setGhostTextLevel('visible');
          }}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-arabic transition-all text-right ${
            acquisitionStep === 'read'
              ? 'bg-mushaf-emerald/15 border-mushaf-emerald text-mushaf-emerald font-bold shadow-sm'
              : 'bg-mushaf-parchment dark:bg-darkMushaf-surface border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink-muted'
          }`}
        >
          <Headphones className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="block font-bold">١. القراءة والاستماع</span>
            <span className="text-[10px] opacity-80">النص ظاهر بالكامل</span>
          </div>
        </button>

        {/* Step 2: Voice Recitation (Text Concealed) */}
        <button
          onClick={() => {
            setAcquisitionStep('recite');
            setGhostTextLevel('level1_concealed');
          }}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-arabic transition-all text-right ${
            acquisitionStep === 'recite' || acquisitionStep === 'ghost'
              ? 'bg-mushaf-emerald/15 border-mushaf-emerald text-mushaf-emerald font-bold shadow-sm'
              : 'bg-mushaf-parchment dark:bg-darkMushaf-surface border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink-muted'
          }`}
        >
          <Mic className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="block font-bold">٢. التسميع الصوتي غيباً</span>
            <span className="text-[10px] opacity-80">النص مخفي والتسميع بالصوت</span>
          </div>
        </button>

        {/* Step 3: Review / Mastered */}
        <div
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-arabic text-right ${
            acquisitionStep === 'mastered'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
              : acquisitionStep === 'review'
              ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
              : 'bg-mushaf-parchment dark:bg-darkMushaf-surface border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink-muted'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="block font-bold">٣. المراجعة والإتقان</span>
            <span className="text-[10px] opacity-80">
              {acquisitionStep === 'mastered' ? 'تم الحفظ بنجاح!' : 'فحص الأخطاء وتثبيت الحفظ'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Step Advice */}
      <div className="flex items-center justify-between text-xs font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted pt-1">
        {acquisitionStep === 'read' && (
          <span>اقرأ الآية بتمعن في الرسم العثماني، ثم اضغط على «إخفاء النص» للبدء في التسميع الصوتي غيباً.</span>
        )}
        {(acquisitionStep === 'recite' || acquisitionStep === 'ghost') && (
          <span>تم إخفاء النص للتسميع غيباً. اضغط زر الميكروفون وابدأ القراءة بصوتك وترتيلك.</span>
        )}
        {acquisitionStep === 'review' && (
          <span className="text-amber-700 dark:text-amber-300">
            راجع الأخطاء الملونة أدناه: الأحمر للنسيان، والكهرماني للتعثر والتبديل.
          </span>
        )}
        {acquisitionStep === 'mastered' && (
          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
            مبارك! حققت تسميعين متتاليين متقنين بنسبة 100%. تم إنشاء بطاقة FSRS وجدولتها في المراجعة المتباعدة.
          </span>
        )}

        {consecutiveFlawlessCount > 0 && (
          <button
            onClick={() => {
              resetFlawless();
              resetRecitation();
              setAcquisitionStep('ghost');
            }}
            className="flex items-center gap-1 text-[11px] text-mushaf-ink-muted hover:text-mushaf-ruby transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة تعيين المحاولات</span>
          </button>
        )}
      </div>
    </div>
  );
};
