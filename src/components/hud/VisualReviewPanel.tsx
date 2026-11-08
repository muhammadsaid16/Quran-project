'use client';

import React from 'react';
import { useRecitationStore, FSRSRating } from '@/stores/recitation-store';
import { useActiveRecallStore } from '@/stores/active-recall-store';
import { useSessionStore } from '@/stores/session-store';
import { useHeatmapStore } from '@/stores/heatmap-store';
import { ReviewRating } from '@/db';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  X,
  Award,
} from 'lucide-react';

export const VisualReviewPanel: React.FC = () => {
  const {
    isReviewOpen,
    setIsReviewOpen,
    evaluatedWords,
    confidenceScore,
    detectedErrors,
    setLastFsrsRating,
    resetRecitation,
  } = useRecitationStore();

  const {
    mode,
    currentAyah,
    recordAcquisitionResult,
    nextRetentionCard,
    setGhostTextLevel,
  } = useActiveRecallStore();

  const { incrementRecitedCount } = useSessionStore();

  if (!isReviewOpen || evaluatedWords.length === 0) {
    return null;
  }

  const correctCount = evaluatedWords.filter((w) => w.status === 'correct').length;
  const omissionCount = evaluatedWords.filter((w) => w.status === 'omission').length;
  const stumbleCount = evaluatedWords.filter(
    (w) =>
      w.status === 'substitution' ||
      w.status === 'repetition' ||
      w.status === 'uncertain'
  ).length;

  const totalWords = evaluatedWords.length;
  // True recall accuracy is strictly the ratio of correctly recalled words
  const recallAccuracy = Math.round((correctCount / Math.max(1, totalWords)) * 100);

  // Suggested FSRS rating strictly derived from user active recall accuracy
  let suggestedRating: FSRSRating = 4;
  let ratingLabel = 'سهل (Easy): استرجاع فوري متقن';
  if (omissionCount > 1 || stumbleCount > 2 || recallAccuracy < 70) {
    suggestedRating = 1;
    ratingLabel = 'إعادة (Again): تعثر أو حذف متعدد';
  } else if (omissionCount === 1 || stumbleCount > 0 || recallAccuracy < 90) {
    suggestedRating = 2;
    ratingLabel = 'صعب (Hard): تم الاسترجاع مع تعثر أو مساعدة';
  } else if (recallAccuracy < 98) {
    suggestedRating = 3;
    ratingLabel = 'جيد (Good): تسميع صحيح مع تردد طفيف';
  }

  const handleApplyRating = (rating: FSRSRating) => {
    setLastFsrsRating(rating);
    incrementRecitedCount();

    // Persist review to Dexie and update heatmap immediately
    if (currentAyah) {
      const verseKey = `${currentAyah.surahNumber}:${currentAyah.ayahNumber}`;
      useHeatmapStore.getState().recordReviewAndUpdate(verseKey, rating as ReviewRating, {
        recording_duration_ms: (evaluatedWords.length || 1) * 600,
        alignment_confidence: confidenceScore > 1 ? confidenceScore / 100 : confidenceScore,
        error_count: omissionCount + stumbleCount,
      }).catch(console.error);
    }

    if (mode === 'acquisition') {
      const isFlawless = rating >= 3 && omissionCount === 0 && stumbleCount === 0;
      recordAcquisitionResult(isFlawless);
    } else if (mode === 'retention') {
      nextRetentionCard();
    }

    setIsReviewOpen(false);
  };

  return (
    <div
      data-testid="visual-review-panel"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      dir="rtl"
    >
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-border-ornate/80 dark:border-darkMushaf-gold/60 rounded-2xl shadow-hud max-w-2xl w-full p-5 max-h-[90vh] flex flex-col select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-mushaf-emerald/15 text-mushaf-emerald flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-arabic font-bold text-base text-mushaf-ink dark:text-darkMushaf-ink">
                نتائج التقييم الصوتي والفحص البصري (Visual Review)
              </h2>
              <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                {currentAyah
                  ? `سورة ${currentAyah.surahNameArabic} • آية ${currentAyah.ayahNumber}`
                  : 'تحليل مطابقة الفونيمات القرآنية (Zipformer 3.2)'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReviewOpen(false)}
            className="p-1 rounded-lg text-mushaf-ink-muted hover:text-mushaf-ink hover:bg-mushaf-parchment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accuracy and Error Summary Chips */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {/* Accuracy Score */}
          <div className="p-3 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border text-center">
            <span className="text-[11px] font-arabic text-mushaf-ink-muted block">نسبة دقة الاسترجاع</span>
            <span className="font-arabic font-extrabold text-xl text-mushaf-emerald dark:text-darkMushaf-emerald">
              {recallAccuracy}%
            </span>
            {confidenceScore > 0 && (
              <span className="text-[9px] font-mono text-mushaf-ink-muted block mt-0.5">
                ثقة الصوت: {confidenceScore > 1 ? Math.round(confidenceScore) : Math.round(confidenceScore * 100)}%
              </span>
            )}
          </div>

          {/* Correct Chip (Emerald) */}
          <div
            data-testid="review-chip-correct"
            className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center"
          >
            <span className="text-[11px] font-arabic text-emerald-800 dark:text-emerald-300 block font-semibold">
              صحيح (Emerald)
            </span>
            <span className="font-arabic font-extrabold text-xl text-emerald-700 dark:text-emerald-300">
              {correctCount}
            </span>
          </div>

          {/* Stumbles Chip (Amber) */}
          <div
            data-testid="review-chip-substitution"
            className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center"
          >
            <span className="text-[11px] font-arabic text-amber-800 dark:text-amber-300 block font-semibold">
              تعثر / استبدال (Amber)
            </span>
            <span className="font-arabic font-extrabold text-xl text-amber-700 dark:text-amber-300">
              {stumbleCount}
            </span>
          </div>

          {/* Omissions Chip (Red) */}
          <div
            data-testid="review-chip-omission"
            className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-center"
          >
            <span className="text-[11px] font-arabic text-red-800 dark:text-red-300 block font-semibold">
              حذف / نقص (Red)
            </span>
            <span className="font-arabic font-extrabold text-xl text-red-700 dark:text-red-300">
              {omissionCount}
            </span>
          </div>
        </div>

        {/* Word-by-Word Highlighted Review List */}
        <div className="flex-1 overflow-y-auto mb-4 border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-3 bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60 space-y-2">
          <span className="text-xs font-arabic font-semibold text-mushaf-ink-muted block mb-2">
            تفصيل مطابقة الكلمات القرآنية:
          </span>

          <div className="grid grid-cols-1 gap-2">
            {evaluatedWords.map((word) => {
              const isCorrect = word.status === 'correct';
              const isOmission = word.status === 'omission';
              const isStumble = !isCorrect && !isOmission;

              return (
                <div
                  key={word.wordIndex}
                  data-testid={`evaluated-word-${word.wordIndex}`}
                  data-status={word.status}
                  className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                    isCorrect
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                      : isOmission
                      ? 'bg-red-500/15 border-red-500/30 text-red-900 dark:text-red-200'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-uthmani text-lg font-bold">
                      {word.uthmaniText}
                    </span>
                    <span className="text-xs text-mushaf-ink-muted">
                      ({word.expectedPhonemes || 'فونيم مرجعي'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-arabic font-bold px-2 py-0.5 rounded-full ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isOmission
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isCorrect && 'صحيح'}
                      {isOmission && 'حذف / لم يُتلى'}
                      {isStumble && 'تعثر / استبدال'}
                    </span>
                    {word.confidence > 0 && (
                      <span className="text-[11px] font-semibold text-mushaf-ink-muted">
                        {word.confidence}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FSRS Rating Recommendation & Actions */}
        <div className="pt-3 border-t border-mushaf-border/60 dark:border-darkMushaf-border">
          <div className="flex items-center justify-between mb-3 text-xs font-arabic">
            <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              التقييم المقترح بناء على أداء التسميع:
            </span>
            <span className="font-bold text-mushaf-emerald dark:text-darkMushaf-emerald">
              {ratingLabel}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => handleApplyRating(1)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 1
                  ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]'
                  : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/25'
              }`}
            >
              إعادة (1)
            </button>
            <button
              onClick={() => handleApplyRating(2)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 2
                  ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              صعب (2)
            </button>
            <button
              onClick={() => handleApplyRating(3)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 3
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
            >
              جيد (3)
            </button>
            <button
              onClick={() => handleApplyRating(4)}
              className={`py-2 px-2 rounded-xl text-xs font-arabic font-bold border transition-all ${
                suggestedRating === 4
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-[1.02]'
                  : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25'
              }`}
            >
              سهل (4)
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                resetRecitation();
                setIsReviewOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic font-semibold text-mushaf-ink-muted hover:text-mushaf-ink transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة من البداية</span>
            </button>

            <button
              onClick={() => handleApplyRating(suggestedRating)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mushaf-emerald hover:bg-emerald-800 text-white text-xs font-arabic font-bold shadow-md transition-all active:scale-95"
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
