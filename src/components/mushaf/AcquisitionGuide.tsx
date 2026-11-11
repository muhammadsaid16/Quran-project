'use client';

import React, { useMemo, useState } from 'react';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useRecitationStore } from '@/stores/recitation-store';
import { useSessionStore } from '@/stores/session-store';
import { generateTransitionForAyah } from '@/data/transition-generator';
import {
  Brain,
  Headphones,
  EyeOff,
  Mic,
  CheckCircle2,
  Sparkles,
  Flame,
  RotateCcw,
  ArrowRightLeft,
  Timer,
  AlertTriangle,
  Zap,
} from 'lucide-react';

export const AcquisitionGuide: React.FC = () => {
  const {
    acquisitionStep,
    setAcquisitionStep,
    consecutiveFlawlessCount,
    resetFlawless,
    completeTransitionChallenge,
    ghostTextLevel,
    setGhostTextLevel,
    currentAyah,
  } = useActiveRecallStore();

  const { status, resetRecitation } = useRecitationStore();
  const { currentPage, currentSurah } = useSessionStore();

  const [challengeSuccess, setChallengeSuccess] = useState<boolean | null>(null);

  // Generate dynamic transition for current ayah
  const transition = useMemo(() => {
    const sNum = currentAyah?.surahNumber || currentSurah || 1;
    const aNum = currentAyah?.ayahNumber || 1;
    return generateTransitionForAyah(sNum, aNum);
  }, [currentAyah, currentSurah]);

  const handlePassChallenge = () => {
    setChallengeSuccess(true);
    setTimeout(() => {
      completeTransitionChallenge(true);
      setChallengeSuccess(null);
    }, 1000);
  };

  const handleFailChallenge = () => {
    setChallengeSuccess(false);
    setTimeout(() => {
      completeTransitionChallenge(false);
      setChallengeSuccess(null);
    }, 1200);
  };

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
              حفظ متدرج: قراءة ← تسميع صوتي غيباً ← اختبار الوصل وكسر النغمة ← إتقان راسخ
            </p>
          </div>
        </div>

        {/* Flawless Counter Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-arabic font-bold border transition-all ${
              acquisitionStep === 'mastered'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                : acquisitionStep === 'transition_challenge'
                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 animate-pulse'
                : consecutiveFlawlessCount === 1
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : 'bg-mushaf-parchment dark:bg-darkMushaf-surface text-mushaf-ink-muted border-mushaf-border'
            }`}
          >
            {acquisitionStep === 'mastered' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>متقنة ومثبتة! (2/2)</span>
              </>
            ) : acquisitionStep === 'transition_challenge' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>بوابة كسر النغمة ⚡</span>
              </>
            ) : (
              <>
                <Flame className={`w-3.5 h-3.5 ${consecutiveFlawlessCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                <span>الإتقان المتتالي: {consecutiveFlawlessCount} / 2</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3 Step Interactive Workflow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pb-2">
        {/* Step 1: Read & Look */}
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
            <span className="block font-bold">١. القراءة والنظر</span>
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

        {/* Step 3: Review & Mastered */}
        <div
          title="تتفاعل هذه المرحلة تلقائياً بعد إنهاء التسميع الصوتي بالميكروفون"
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-arabic text-right select-none ${
            acquisitionStep === 'mastered'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
              : acquisitionStep === 'transition_challenge'
              ? 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300 font-bold animate-pulse'
              : acquisitionStep === 'review'
              ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
              : 'bg-mushaf-parchment dark:bg-darkMushaf-surface border-mushaf-border dark:border-darkMushaf-border text-mushaf-ink-muted'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="block font-bold">٣. المراجعة والوصل</span>
            <span className="text-[10px] opacity-80">
              {acquisitionStep === 'mastered'
                ? 'تم الحفظ وتثبيت الوصل!'
                : acquisitionStep === 'transition_challenge'
                ? 'تحدي كسر النغمة جاري الآن...'
                : 'تلقائي: تُفتح بعد التسميع'}
            </span>
          </div>
        </div>
      </div>

      {/* Break-the-melody Transition Challenge Gate */}
      {acquisitionStep === 'transition_challenge' && transition && (
        <div className="mt-3 p-3.5 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 text-right animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-500/20">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 animate-bounce" />
              <span className="font-arabic font-bold text-sm text-blue-900 dark:text-blue-200">
                بوابة التمكين: اختبار الوصل المباغت (كسر النغمة)
              </span>
            </div>
            <span className="text-[11px] font-arabic text-blue-700 dark:text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-full font-bold">
              الحد الأقصى للوقفة: 2.0 ثانية
            </span>
          </div>

          <p className="text-xs font-arabic text-blue-950 dark:text-blue-200 mb-3">
            أحسنت في التسميع! الآن للتأكد من رسوخ الحفظ وعدم الاعتماد على نغمة التلاوة فقط:
            <span className="font-bold block mt-0.5">
              صِل ختام الآية بمطلع الآية التالية فوراً دون وقفة أو تردد:
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center mb-3">
            <div className="md:col-span-5 p-2.5 rounded-xl bg-white dark:bg-darkMushaf-card border border-blue-200 dark:border-blue-900 text-center">
              <span className="text-[10px] text-mushaf-ink-muted block mb-0.5">
                ختام الآية المسمعة ({transition.fromAyah.surahNumber}:{transition.fromAyah.ayahNumber})
              </span>
              <span className="font-uthmani text-base font-bold text-mushaf-ink dark:text-darkMushaf-ink">
                {transition.fromAyah.textEnding}
              </span>
            </div>

            <div className="md:col-span-2 flex flex-col items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">صِل بالمطلع</span>
            </div>

            <div className="md:col-span-5 p-2.5 rounded-xl bg-white dark:bg-darkMushaf-card border border-dashed border-blue-400 text-center">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 block mb-0.5">
                المطلوب: مطلع الآية التالية ({transition.toAyah.surahNumber}:{transition.toAyah.ayahNumber})
              </span>
              <span className="font-uthmani text-base font-bold text-transparent bg-blue-500/10 rounded px-2 select-none blur-[4px]">
                {transition.toAyah.textBeginning}
              </span>
            </div>
          </div>

          {/* Verification buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-500/20">
            <button
              onClick={handleFailChallenge}
              className="px-3 py-1.5 rounded-xl text-xs font-arabic font-semibold bg-white dark:bg-darkMushaf-card border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors cursor-pointer"
            >
              ترددت في الوصل (إعادة تثبيت)
            </button>
            <button
              onClick={handlePassChallenge}
              className="px-4 py-1.5 rounded-xl text-xs font-arabic font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>وصلتُ بنجاح وانسيابية (تأكيد الإتقان)</span>
            </button>
          </div>

          {challengeSuccess === true && (
            <div className="mt-2 text-center text-xs font-arabic font-bold text-emerald-700 dark:text-emerald-300 animate-fade-in">
              ✨ رائع! تم كسر قفل النغمة وإثبات متانة الحفظ بنجاح!
            </div>
          )}
          {challengeSuccess === false && (
            <div className="mt-2 text-center text-xs font-arabic font-bold text-amber-700 dark:text-amber-300 animate-fade-in">
              ⚠️ أحسنت المحاولة، سنعيد تثبيت هذه الآية لتمكين الرابط بقوة.
            </div>
          )}
        </div>
      )}

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
            تمت المراجعة بنجاح! استمر للتسميع للمرة الثانية لفتح بوابة اختبار الوصل.
          </span>
        )}
        {acquisitionStep === 'mastered' && (
          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
            مبارك! حققت التسميع المتقن واجتزت اختبار الوصل بامتياز. تم جدولة الآية في نظام التكرار المتباعد (FSRS).
          </span>
        )}

        {consecutiveFlawlessCount > 0 && acquisitionStep !== 'transition_challenge' && (
          <button
            onClick={() => {
              resetFlawless();
              resetRecitation();
              setAcquisitionStep('ghost');
            }}
            className="flex items-center gap-1 text-[11px] text-mushaf-ink-muted hover:text-mushaf-ruby transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة تعيين المحاولات</span>
          </button>
        )}
      </div>
    </div>
  );
};
