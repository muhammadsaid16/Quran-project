'use client';

import React, { useMemo, useState } from 'react';
import { useRecitationStore, FSRSRating } from '@/stores/recitation-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useSessionStore } from '@/stores/session-store';
import { useHeatmapStore } from '@/stores/heatmap-store';
import { ReviewRating, ReviewLog } from '@/db';
import { computeReviewStats, deriveSuggestedRating } from './review-stats';
import { useAchievementStore } from '@/stores/achievement-store';
import { formatDetectedWord } from '@/alignment';
import {
  RotateCcw,
  ChevronLeft,
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Mic,
  HelpCircle,
  FileText,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { playWordAudio, stopWordAudio } from '@/audio';

export const VisualReviewPanel: React.FC = () => {
  const {
    isReviewOpen,
    setIsReviewOpen,
    evaluatedWords,
    alignmentAccuracy,
    recognitionConfidence,
    recognizedText: storeRecognizedText,
    referenceText: storeReferenceText,
    setLastFsrsRating,
    resetRecitation,
    recordRecitationComplete,
  } = useRecitationStore();

  const {
    mode,
    currentAyah,
    recordAcquisitionResult,
    nextRetentionCard,
  } = useActiveRecallStore();

  const { incrementRecitedCount } = useSessionStore();
  const [playingWordKey, setPlayingWordKey] = useState<string | null>(null);

  if (!isReviewOpen || evaluatedWords.length === 0) {
    return null;
  }

  const stats = computeReviewStats(evaluatedWords);
  const rawSuggestion = deriveSuggestedRating(stats);

  // Strict Architectural Separation: Low acoustic confidence or zero evaluated words
  // MUST NEVER penalize the reciter with an error or Again (1).
  const isAcousticUncertain =
    (recognitionConfidence !== null && recognitionConfidence < 65) ||
    stats.evaluatedWords === 0 ||
    stats.uncertain === stats.totalWords;

  const suggestedRating = isAcousticUncertain ? 3 : rawSuggestion.rating;
  const ratingLabel = isAcousticUncertain
    ? 'جيد (3): تعذر التحقق الصوتي بدقة — أعد التسميع بدون احتساب خطأ'
    : rawSuggestion.label;

  const stumbleCount = stats.substitutions + stats.repetitions;
  const isFlawless = !isAcousticUncertain && stats.recallAccuracy === 100 && stats.errorCount === 0;
  const hasMinorStumbles = !isAcousticUncertain && stats.recallAccuracy >= 80 && !isFlawless;

  // Derive Reference Text
  const referenceText =
    storeReferenceText ||
    currentAyah?.textUthmani ||
    evaluatedWords.map((w) => w.uthmaniText).join(' ');

  // Derive Recognized Text (from decoder or decoded phonemes)
  const recognizedText =
    storeRecognizedText ||
    evaluatedWords
      .map((w) => {
        if (w.status === 'omission') return '';
        const formatted = formatDetectedWord(w.detectedPhonemes);
        return formatted || w.detectedPhonemes || '';
      })
      .filter(Boolean)
      .join(' ');

  const distinctAyahs = useMemo(() => {
    const set = new Set<string>();
    for (const w of evaluatedWords) {
      if (w.ayahNumber) {
        set.add(`${w.surahNumber || currentAyah?.surahNumber || 1}:${w.ayahNumber}`);
      }
    }
    return Array.from(set);
  }, [evaluatedWords, currentAyah]);

  const handleApplyRating = (rating: FSRSRating) => {
    setLastFsrsRating(rating);
    incrementRecitedCount();

    // Persist REAL word-level facts, not just rating-derived zeros:
    // every non-correct word (including 'uncertain') becomes an audited
    // error position, and an acoustically uncertain session is forced to
    // 'needs_review' so strict achievements (Flawless/Precision/Mastery)
    // can never count it — the FSRS rating alone must not mask uncertainty.
    const isUncertainVerdict = isAcousticUncertain && rating !== 1;
    const errorPositions = evaluatedWords
      .filter((w) => w.status !== 'correct')
      .map((w) => ({
        word_index: w.wordIndex,
        expected: w.uthmaniText,
        actual: w.detectedPhonemes || undefined,
        error_type:
          w.status as ReviewLog['error_positions'][number]['error_type'],
      }));
    const sessionMetadata = {
      recording_duration_ms: (evaluatedWords.length || 1) * 600,
      alignment_confidence: alignmentAccuracy / 100,
      error_count: stats.errorCount + (isUncertainVerdict ? stats.uncertain : 0),
      error_positions: errorPositions,
      result_status: isUncertainVerdict ? ('needs_review' as const) : undefined,
    };

    if (distinctAyahs.length > 0) {
      for (const verseKey of distinctAyahs) {
        useHeatmapStore.getState().recordReviewAndUpdate(verseKey, rating as ReviewRating, sessionMetadata).catch(console.error);
      }
    } else if (currentAyah) {
      const verseKey = `${currentAyah.surahNumber}:${currentAyah.ayahNumber}`;
      useHeatmapStore.getState().recordReviewAndUpdate(verseKey, rating as ReviewRating, sessionMetadata).catch(console.error);
    }

    // Acquisition "flawless" obeys the SAME rule as achievements: an
    // acoustically uncertain session can never count as mastery evidence.
    const flawless = rating >= 3 && isFlawless;
    const perfectAyahCount = flawless ? distinctAyahs.length : 0;
    recordRecitationComplete(distinctAyahs.length || 1, perfectAyahCount, 600, distinctAyahs.map((k: string) => Number(k.split(':')[1])));

    if (mode === 'acquisition') {
      recordAcquisitionResult(flawless);
    } else if (mode === 'retention') {
      nextRetentionCard();
    }

    setIsReviewOpen(false);
  };

  const ayahSubtitle = useMemo(() => {
    if (distinctAyahs.length > 1) {
      const numbers = distinctAyahs.map((k: string) => Number(k.split(':')[1])).sort((a: number, b: number) => a - b);
      const minA = numbers[0];
      const maxA = numbers[numbers.length - 1];
      const sName = currentAyah?.surahNameArabic || 'السورة';
      return `سورة ${sName} • الآيات من ${minA} إلى ${maxA}`;
    }
    if (currentAyah) {
      return `سورة ${currentAyah.surahNameArabic} • الآية ${currentAyah.ayahNumber}`;
    }
    return 'مقارنة استرجاع الآيات من الذاكرة بالنص المرجعي';
  }, [distinctAyahs, currentAyah]);

  return (
    <div
      data-testid="visual-review-panel"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-fade-in"
      dir="rtl"
    >
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-3xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 max-h-[94vh] flex flex-col select-none overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mushaf-emerald/15 text-mushaf-emerald flex items-center justify-center shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-arabic font-extrabold text-lg text-mushaf-ink dark:text-darkMushaf-ink">
                  مقارنة التسميع الصوتي
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mushaf-gold/15 text-mushaf-gold">
                  Voice Active Recall
                </span>
              </div>
              <p className="text-xs font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                {ayahSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReviewOpen(false)}
            aria-label="إغلاق"
            className="p-1.5 rounded-xl text-mushaf-ink-muted hover:text-mushaf-ink hover:bg-mushaf-parchment dark:hover:bg-darkMushaf-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Center Content */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pl-1">
          
          {/* Status & Uncertainty Banner */}
          {isAcousticUncertain ? (
            <div
              data-testid="review-uncertain-banner"
              className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 flex items-start gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-arabic font-bold text-sm sm:text-base leading-snug">
                  غير مؤكد — يلزم إعادة التسميع
                </h3>
                <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-1 font-arabic leading-relaxed">
                  ثقة التعرف الصوتي منخفضة أو لم يُرصد صوت كافٍ. لم نتسرع في اتهام حفظك بالخطأ؛ يرجى التسميع بصوت أوضح وفي بيئة هادئة. لم يتم تسجيل أي خطأ على حفظك.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3.5 transition-all shadow-sm ${
                isFlawless
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                  : hasMinorStumbles
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                  : 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isFlawless
                    ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                    : hasMinorStumbles
                    ? 'bg-amber-600 text-white shadow-amber-500/30'
                    : 'bg-red-600 text-white shadow-red-500/30'
                }`}
              >
                {isFlawless ? (
                  <Sparkles className="w-5 h-5" />
                ) : hasMinorStumbles ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-arabic font-bold text-sm sm:text-base leading-snug">
                  {isFlawless
                    ? 'ما شاء الله! تلاوة متقنة وتسميع سليم'
                    : hasMinorStumbles
                    ? 'تلاوة جيدة جداً مع ملاحظات بسيطة'
                    : 'تحتاج الآية إلى تثبيت ومراجعة'}
                </h3>
                <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-0.5 font-arabic">
                  {isFlawless
                    ? 'تم استرجاع جميع كلمات الآية بالرسم والتشكيل السليم بنجاح.'
                    : hasMinorStumbles
                    ? 'راجع الكلمات المحددة أدناه لضبط مخارجها وتشكيلها.'
                    : 'انتبه للكلمات المنسية أو المبدلة أدناه، وأعد المحاولة لتثبيت الحفظ.'}
                </p>
              </div>
            </div>
          )}

          {/* Dual-Metric & Stats Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Recall Accuracy */}
            <div
              data-testid="review-recall-accuracy"
              className="p-2.5 sm:p-3 rounded-2xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border text-center shadow-sm"
            >
              <span className="text-[11px] font-arabic text-mushaf-ink-muted block font-medium">
                دقة الاسترجاع من الذاكرة
              </span>
              <span className="font-arabic font-black text-lg sm:text-xl text-mushaf-emerald dark:text-darkMushaf-emerald mt-0.5 block">
                {stats.recallAccuracy}%
              </span>
              {recognitionConfidence !== null && (
                <span
                  data-testid="review-recognition-confidence"
                  className="text-[9px] font-mono text-mushaf-ink-muted block mt-0.5"
                >
                  ثقة التعرف الصوتي: {recognitionConfidence}%
                </span>
              )}
            </div>

            {/* Correct Chip */}
            <div
              data-testid="review-chip-correct"
              className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center shadow-sm"
            >
              <span className="text-[11px] font-arabic text-emerald-800 dark:text-emerald-300 block font-semibold">
                صحيح
              </span>
              <span className="font-arabic font-black text-lg sm:text-xl text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                {stats.correct}
              </span>
            </div>

            {/* Stumbles Chip */}
            <div
              data-testid="review-chip-substitution"
              className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center shadow-sm"
            >
              <span className="text-[11px] font-arabic text-amber-800 dark:text-amber-300 block font-semibold">
                تعثر / تبديل
              </span>
              <span className="font-arabic font-black text-lg sm:text-xl text-amber-700 dark:text-amber-300 mt-0.5 block">
                {stumbleCount}
              </span>
            </div>

            {/* Omissions Chip */}
            <div
              data-testid="review-chip-omission"
              className="p-2.5 sm:p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-center shadow-sm"
            >
              <span className="text-[11px] font-arabic text-red-800 dark:text-red-300 block font-semibold">
                منسي / لم يُقرأ
              </span>
              <span className="font-arabic font-black text-lg sm:text-xl text-red-700 dark:text-red-300 mt-0.5 block">
                {stats.omissions}
              </span>
            </div>
          </div>

          {stats.uncertain > 0 && (
            <div
              data-testid="review-uncertain-note"
              className="px-3.5 py-2 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs font-arabic text-slate-700 dark:text-slate-300 flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{stats.uncertain} كلمة غير مؤكدة صوتياً — لم تُحسب كخطأ في التسميع.</span>
            </div>
          )}

          {/* Word-by-Word Alignment & Diff Section */}
          <div className="border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-4 bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60">
            <span className="text-xs font-arabic font-bold text-mushaf-ink block mb-3 text-center">
              تحليل الكلمات والفروقات:
            </span>

            <div className="p-4 rounded-2xl bg-white dark:bg-darkMushaf-card border border-mushaf-border/80 shadow-sm font-uthmani text-2xl sm:text-3xl leading-[2.6] text-center flex flex-wrap justify-center items-center gap-x-3 gap-y-4">
              {evaluatedWords.map((word, idx) => {
                const isCorrect = word.status === 'correct' || word.status === 'omission';
                const isOmission = false;
                const isStumble = word.status === 'substitution' || word.status === 'repetition';
                const isUncertain = word.status === 'uncertain';
                const detectedArabic = formatDetectedWord(word.detectedPhonemes);

                return (
                  <div
                    key={`${word.surahNumber || ''}:${word.ayahNumber || ''}:${word.wordIndex}-${idx}`}
                    data-testid={`evaluated-word-${word.wordIndex}`}
                    data-status={word.status}
                    className={`group relative inline-flex flex-col items-center px-3.5 py-1.5 rounded-2xl transition-all shadow-sm ${
                      isCorrect
                        ? 'bg-transparent text-mushaf-ink dark:text-darkMushaf-ink border border-transparent'
                        : isOmission
                        ? 'bg-red-500/15 text-red-950 dark:text-red-200 border border-red-500/40 line-through decoration-red-600 decoration-2'
                        : isStumble
                        ? 'bg-amber-500/15 text-amber-950 dark:text-amber-200 border border-amber-500/40'
                        : isUncertain
                        ? 'bg-slate-500/15 text-slate-800 dark:text-slate-200 border border-dashed border-slate-400'
                        : 'bg-mushaf-surface text-mushaf-ink-muted border border-mushaf-border'
                    }`}
                  >
                    {/* Reference Word & Voice Pronunciation Button */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-uthmani select-text leading-tight">{word.uthmaniText}</span>
                      <button
                        type="button"
                        data-testid={`review-play-word-${word.wordIndex}`}
                        onClick={() => {
                          const wKey = `${word.surahNumber || 1}:${word.ayahNumber || 1}:${word.wordIndex}`;
                          if (playingWordKey === wKey) {
                            stopWordAudio();
                            setPlayingWordKey(null);
                          } else {
                            setPlayingWordKey(wKey);
                            playWordAudio(
                              word.surahNumber || currentAyah?.surahNumber || 1,
                              word.ayahNumber || currentAyah?.ayahNumber || 1,
                              word.wordIndex,
                              word.uthmaniText,
                              {
                                onEnded: () => setPlayingWordKey((curr) => (curr === wKey ? null : curr)),
                                onError: () => setPlayingWordKey((curr) => (curr === wKey ? null : curr)),
                              }
                            );
                          }
                        }}
                        className={`p-1 rounded-full transition-all cursor-pointer ${
                          playingWordKey === `${word.surahNumber || 1}:${word.ayahNumber || 1}:${word.wordIndex}`
                            ? 'bg-mushaf-emerald text-white animate-pulse'
                            : 'hover:bg-black/10 dark:hover:bg-white/10 text-mushaf-ink-muted hover:text-mushaf-emerald'
                        }`}
                        title="استمع لنطق الكلمة"
                        aria-label="استمع لنطق الكلمة"
                      >
                        {playingWordKey === `${word.surahNumber || 1}:${word.ayahNumber || 1}:${word.wordIndex}` ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Detected Word below if different and available */}
                    {isStumble && detectedArabic && (
                      <span className="text-[11px] font-arabic font-semibold text-amber-900 dark:text-amber-300 mt-0.5">
                        رُصد: {detectedArabic}
                      </span>
                    )}

                    {/* Status Label — only for errors and stumbles, never for correct words */}
                    {!isCorrect && (
                      <span
                        className={`text-[10px] font-arabic font-bold mt-1 leading-none px-2 py-0.5 rounded-full ${
                          isOmission
                            ? 'text-red-700 dark:text-red-300 bg-red-500/10'
                            : isStumble
                            ? 'text-amber-800 dark:text-amber-300 bg-amber-500/10'
                            : isUncertain
                            ? 'text-slate-700 dark:text-slate-300 bg-slate-500/10'
                            : 'text-mushaf-ink-muted'
                        }`}
                      >
                        {isOmission
                          ? '✗ منسي'
                          : word.status === 'repetition'
                          ? 'تعثر'
                          : isUncertain
                          ? '❓ غير مؤكد'
                          : '⚠️ تبديل'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Observations note */}
            {stats.errorCount > 0 ? (
              <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-arabic text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">ملاحظات دقة الاسترجاع:</span>
                  <span className="text-[11px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted block mt-0.5">
                    الكلمات المميزة بالأحمر لم تُسمع من الذاكرة، والكلمات المميزة بالبرتقالي رُصد فيها اختلاف أو تعثر في الحركات والنطق.
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-arabic text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>أحسنت! لم يتم رصد أي أخطاء استرجاع في هذه الآية الكريمة.</span>
              </div>
            )}
          </div>

        </div>

        {/* Action Controls & FSRS Rating */}
        <div className="pt-3 mt-2 border-t border-mushaf-border/60 dark:border-darkMushaf-border">
          <div className="flex items-center justify-between mb-2 text-xs font-arabic">
            <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              التقييم المقترح لبطاقة التكرار المتباعد (FSRS):
            </span>
            <span className="font-bold text-mushaf-emerald dark:text-darkMushaf-emerald">
              {ratingLabel}
            </span>
          </div>

          {/* 4 Standard FSRS Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => handleApplyRating(1)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 1
                  ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25 hover:bg-red-500/20'
              }`}
            >
              إعادة (1)
            </button>
            <button
              onClick={() => handleApplyRating(2)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 2
                  ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 hover:bg-amber-500/20'
              }`}
            >
              صعب (2)
            </button>
            <button
              onClick={() => handleApplyRating(3)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 3
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
              }`}
            >
              جيد (3)
            </button>
            <button
              onClick={() => handleApplyRating(4)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 4
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-[1.02]'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/20'
              }`}
            >
              سهل (4)
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                resetRecitation();
                setIsReviewOpen(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-arabic font-semibold text-mushaf-ink-muted hover:text-mushaf-ink hover:bg-mushaf-parchment dark:hover:bg-darkMushaf-surface transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>

            <button
              onClick={() => handleApplyRating(suggestedRating as FSRSRating)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-mushaf-emerald hover:bg-emerald-800 text-white text-xs sm:text-sm font-arabic font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <span>اعتماد التقييم والانتقال</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};