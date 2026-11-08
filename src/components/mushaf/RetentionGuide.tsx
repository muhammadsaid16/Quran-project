'use client';

import React, { useEffect } from 'react';
import { useActiveRecallStore, AyahTarget } from '@/stores/active-recall-store';
import { useRecitationStore, FSRSRating } from '@/stores/recitation-store';
import { useSessionStore } from '@/stores/session-store';
import {
  Repeat,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

const MOCK_DUE_QUEUE: AyahTarget[] = [
  {
    surahNumber: 1,
    surahNameArabic: 'الفاتحة',
    ayahNumber: 2,
    globalAyahNumber: 2,
    pageNumber: 1,
    juzNumber: 1,
    textUthmani: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    firstWord: 'ٱلْحَمْدُ',
    dueReason: 'مستحقة للمراجعة اليوم (R = 86%)',
  },
  {
    surahNumber: 2,
    surahNameArabic: 'البقرة',
    ayahNumber: 5,
    globalAyahNumber: 12,
    pageNumber: 2,
    juzNumber: 1,
    textUthmani: 'أُو۟لَٰٓئِكَ عَلَىٰ هُدًۭى مِّن رَّبِّهِمْ ۖ وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ',
    firstWord: 'أُو۟لَٰٓئِكَ',
    dueReason: 'مستحقة للمراجعة اليوم (R = 82%)',
  },
  {
    surahNumber: 112,
    surahNameArabic: 'الإخلاص',
    ayahNumber: 1,
    globalAyahNumber: 6222,
    pageNumber: 604,
    juzNumber: 30,
    textUthmani: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    firstWord: 'قُلْ',
    dueReason: 'تثبيت استقرار الذاكرة (R = 89%)',
  },
];

export const RetentionGuide: React.FC = () => {
  const {
    retentionQueue,
    retentionQueueIndex,
    setRetentionQueue,
    nextRetentionCard,
    prevRetentionCard,
    currentAyah,
    setCurrentAyah,
    setGhostTextLevel,
  } = useActiveRecallStore();

  const { setCurrentPage, setCurrentSurah } = useSessionStore();
  const { lastFsrsRating } = useRecitationStore();

  useEffect(() => {
    if (retentionQueue.length === 0) {
      setRetentionQueue(MOCK_DUE_QUEUE);
      // Enforce Full Concealment Level 1 for retention to test pure recall
      setGhostTextLevel('level1_concealed');
    }
  }, [retentionQueue.length, setRetentionQueue, setGhostTextLevel]);

  const activeCard = currentAyah || retentionQueue[retentionQueueIndex] || MOCK_DUE_QUEUE[0];

  const handleSelectCard = (card: AyahTarget) => {
    setCurrentAyah(card);
    setCurrentPage(card.pageNumber);
    setCurrentSurah(card.surahNumber);
  };

  return (
    <div
      data-testid="retention-guide"
      className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-2xl p-4 mb-4 shadow-sm"
      dir="rtl"
    >
      {/* Top Banner: Queue summary and navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-arabic font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
              ورد المراجعة اليومي المتباعد (FSRS Due Queue)
            </h3>
            <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              استرجع الآيات من الذاكرة الخالصة دون نص ظاهر (Level 1 Enforced)
            </p>
          </div>
        </div>

        {/* Card Counter & Queue Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              prevRetentionCard();
              const prev = retentionQueue[retentionQueueIndex - 1];
              if (prev) handleSelectCard(prev);
            }}
            disabled={retentionQueueIndex <= 0}
            className="p-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border text-mushaf-ink disabled:opacity-30"
            title="البطاقة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-arabic font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            بطاقة {retentionQueueIndex + 1} من {retentionQueue.length || 3}
          </span>

          <button
            onClick={() => {
              nextRetentionCard();
              const next = retentionQueue[retentionQueueIndex + 1];
              if (next) handleSelectCard(next);
            }}
            disabled={retentionQueueIndex >= (retentionQueue.length || 3) - 1}
            className="p-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface border border-mushaf-border text-mushaf-ink disabled:opacity-30"
            title="البطاقة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Card Prompt: Identifier + Anchor Clue without Full Text */}
      <div className="bg-mushaf-parchment dark:bg-darkMushaf-surface rounded-xl p-3 border border-mushaf-border dark:border-darkMushaf-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-mushaf-emerald/15 text-mushaf-emerald font-bold text-xs">
              سورة {activeCard.surahNameArabic}
            </span>
            <span className="text-xs font-semibold text-mushaf-ink">
              الآية رقم {activeCard.ayahNumber} (صفحة {activeCard.pageNumber})
            </span>
          </div>
          <p className="text-xs text-mushaf-ink-muted flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>{activeCard.dueReason || 'مستحقة للمراجعة وفق معادلة الاسترجاع FSRS'}</span>
          </p>
        </div>

        {/* Anchor Clue */}
        <div className="flex items-center gap-2 bg-mushaf-surface dark:bg-darkMushaf-card px-3 py-1.5 rounded-lg border border-mushaf-gold/30">
          <span className="text-xs font-arabic text-mushaf-ink-muted">المطلع / المفتاح:</span>
          <span className="font-uthmani text-base font-bold text-mushaf-gold">
            {activeCard.firstWord || 'بداية الآية'}
          </span>
        </div>
      </div>

      {lastFsrsRating && (
        <div className="mt-2 text-xs font-arabic text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>تم تسجيل التقييم (درجة {lastFsrsRating}) وتحديث استقرار FSRS في قاعدة البيانات المحلية.</span>
        </div>
      )}
    </div>
  );
};
