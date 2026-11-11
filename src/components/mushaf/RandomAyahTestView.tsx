'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { getScopeAyahs, buildAyahQuiz, AyahItem, RandomAyahQuiz } from '@/data/random-ayah-test';
import { SURAHS } from '@/data/surahs';
import {
  Shuffle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Trophy,
  RotateCcw,
  Check,
} from 'lucide-react';

export const RandomAyahTestView: React.FC = () => {
  const { currentSurah, currentPage } = useSessionStore();

  const [scope, setScope] = useState<'page' | 'surah' | 'juz' | 'all'>('page');

  // Derive current Juz from page number (Medina standard: ~20 pages per juz)
  const currentJuz = useMemo(() => {
    return Math.min(30, Math.max(1, Math.ceil(currentPage / 20)));
  }, [currentPage]);

  // Mastered set of ayah verse_keys in this session
  const [completedVerseKeys, setCompletedVerseKeys] = useState<Set<string>>(new Set());

  // Current active quiz
  const [currentQuiz, setCurrentQuiz] = useState<RandomAyahQuiz | null>(null);

  // Visibility states for answers
  const [showPrev, setShowPrev] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Score stats
  const [streak, setStreak] = useState(0);

  // Get full pool for selected scope
  const pool = useMemo(() => {
    return getScopeAyahs(scope, currentSurah, currentPage, currentJuz);
  }, [scope, currentSurah, currentPage, currentJuz]);

  // Remaining un-mastered ayahs in the current pool
  const remainingAyahs = useMemo(() => {
    return pool.filter((a) => !completedVerseKeys.has(a.verse_key));
  }, [pool, completedVerseKeys]);

  // Load next random un-mastered ayah
  const pickNextRandomAyah = (unmasteredList: AyahItem[]) => {
    setShowPrev(false);
    setShowNext(false);
    if (unmasteredList.length === 0) {
      setCurrentQuiz(null);
      return;
    }
    const randIdx = Math.floor(Math.random() * unmasteredList.length);
    const chosen = unmasteredList[randIdx];
    setCurrentQuiz(buildAyahQuiz(chosen));
  };

  // Reset session when scope or target page/surah changes
  useEffect(() => {
    setCompletedVerseKeys(new Set());
    setStreak(0);
    pickNextRandomAyah(pool);
  }, [scope, currentSurah, currentPage, pool]);

  const handleCorrect = () => {
    if (!currentQuiz) return;
    const nextCompleted = new Set(completedVerseKeys);
    nextCompleted.add(currentQuiz.centerAyah.verse_key);
    setCompletedVerseKeys(nextCompleted);
    setStreak((s) => s + 1);

    const nextRemaining = pool.filter((a) => !nextCompleted.has(a.verse_key));
    pickNextRandomAyah(nextRemaining);
  };

  const handleIncorrect = () => {
    setStreak(0);
    setShowPrev(true);
    setShowNext(true);
  };

  const handleRestart = () => {
    setCompletedVerseKeys(new Set());
    setStreak(0);
    pickNextRandomAyah(pool);
  };

  const totalCount = pool.length;
  const completedCount = completedVerseKeys.size;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllCompleted = totalCount > 0 && completedCount >= totalCount;

  const currentSurahMeta = SURAHS[currentSurah - 1];
  const scopeLabel =
    scope === 'page'
      ? `الصفحة ${currentPage}`
      : scope === 'surah'
      ? `سورة ${currentSurahMeta?.nameArabic || currentSurah}`
      : scope === 'juz'
      ? `الجزء ${currentJuz}`
      : 'المصحف كاملاً';

  return (
    <div
      data-testid="random-ayah-test-guide"
      className="bg-mushaf-surface dark:bg-darkMushaf-card border-2 border-mushaf-gold/40 dark:border-darkMushaf-gold/30 rounded-3xl p-5 mb-5 shadow-mushaf"
      dir="rtl"
    >
      {/* Header and Scope Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
            <Shuffle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-arabic font-bold text-base text-mushaf-ink dark:text-darkMushaf-ink flex items-center gap-2">
              <span>اختبار الاستحضار العشوائي (كسر النغمة)</span>
              <span className="text-xs bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                السابق والتالي
              </span>
            </h3>
            <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              اختبار عشوائي لجميع آيات ({scopeLabel}) للتأكد من استحضار الآية السابقة والتالية لكل آية دون لحن مسبق.
            </p>
          </div>
        </div>

        {/* Scope Tabs & Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border text-xs font-arabic">
            <button
              onClick={() => setScope('page')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                scope === 'page'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              الصفحة ({currentPage})
            </button>
            <button
              onClick={() => setScope('surah')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                scope === 'surah'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              السورة
            </button>
            <button
              onClick={() => setScope('juz')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                scope === 'juz'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              الجزء ({currentJuz})
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-mushaf-emerald text-white font-bold shadow-sm'
                  : 'text-mushaf-ink-muted hover:text-mushaf-ink'
              }`}
            >
              المصحف كاملاً
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Milestone Bar */}
      <div className="mb-4 bg-mushaf-parchment dark:bg-darkMushaf-surface p-3 rounded-2xl border border-mushaf-border">
        <div className="flex items-center justify-between text-xs font-arabic mb-1.5">
          <span className="font-bold text-mushaf-ink dark:text-darkMushaf-ink flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-mushaf-gold" />
            <span>إنجاز آيات {scopeLabel}:</span>
            <span className="text-mushaf-emerald font-bold">
              {completedCount} من {totalCount} آية ({progressPercent}%)
            </span>
          </span>

          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
            🔥 استحضار متتالي بدون خطأ: {streak}
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-mushaf-emerald to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Completion Ceremony Banner (عند إنجاز كل آيات النطاق) */}
      {isAllCompleted ? (
        <div className="py-8 px-4 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-arabic font-bold text-emerald-800 dark:text-emerald-200 mb-1">
            مُبارك! تم إتقان استحضار جميع آيات {scopeLabel} بنجاح! 🌟
          </h2>
          <p className="text-xs sm:text-sm font-arabic text-emerald-900/80 dark:text-emerald-300/80 max-w-lg mx-auto mb-4">
            لقد أثبتّ قدرتك على استدعاء الآيات السابقة والتالية لجميع آيات هذا النطاق عشوائياً، مما يؤكد رسوخ الحفظ وكسر قيد النغمة والرتم التتابعي تماماً.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRestart}
              className="px-5 py-2 rounded-xl bg-mushaf-emerald hover:bg-emerald-700 text-white font-arabic font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الاختبار لتثبيت إضافي</span>
            </button>
          </div>
        </div>
      ) : currentQuiz ? (
        /* Quiz Arena */
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            
            {/* 1. Previous Ayah (السابقة) */}
            <div className="md:col-span-4 p-4 rounded-2xl bg-mushaf-parchment/80 dark:bg-darkMushaf-surface/80 border border-mushaf-border flex flex-col justify-between text-center relative">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-arabic font-bold text-mushaf-ink-muted flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>الآية السابقة ({currentQuiz.prevAyah ? `${currentQuiz.prevAyah.surah}:${currentQuiz.prevAyah.ayah}` : 'بداية السورة'})</span>
                  </span>
                  <button
                    onClick={() => setShowPrev(!showPrev)}
                    className="text-[10px] text-mushaf-gold dark:text-darkMushaf-gold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPrev ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPrev ? 'إخفاء' : 'كشف للتأكد'}</span>
                  </button>
                </div>

                {currentQuiz.prevAyah ? (
                  <p
                    className={`font-uthmani text-base sm:text-lg leading-relaxed transition-all select-none ${
                      showPrev
                        ? 'text-mushaf-ink dark:text-darkMushaf-ink'
                        : 'text-transparent bg-mushaf-ink/10 rounded-xl p-2 blur-[5px]'
                    }`}
                  >
                    {currentQuiz.prevAyah.text_uthmani}
                  </p>
                ) : (
                  <span className="text-xs text-mushaf-ink-muted italic block py-4">
                    لا توجد آية سابقة (هذه فاتحة السورة)
                  </span>
                )}
              </div>

              <span className="text-[10px] text-mushaf-ink-muted/80 block mt-2 border-t border-mushaf-border/40 pt-1">
                المطلوب: اذكر الآية التي قبلها غيباً
              </span>
            </div>

            {/* 2. Center Ayah (الآية المحورية المعروضة) */}
            <div className="md:col-span-4 p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border-2 border-amber-500/50 flex flex-col justify-between text-center shadow-sm">
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs font-arabic font-bold text-amber-900 dark:text-amber-200 bg-amber-500/20 px-3 py-0.5 rounded-full">
                    {currentQuiz.surahName} • الآية {currentQuiz.centerAyah.ayah} (صفحة {currentQuiz.centerAyah.page})
                  </span>
                </div>

                <p className="font-uthmani text-xl sm:text-2xl font-bold text-mushaf-ink dark:text-darkMushaf-ink leading-[2.2] py-2">
                  {currentQuiz.centerAyah.text_uthmani}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-amber-500/20">
                <span className="text-[11px] font-arabic text-amber-800 dark:text-amber-300">
                  متبقي {remainingAyahs.length} آية للاختبار
                </span>
              </div>
            </div>

            {/* 3. Next Ayah (التالية) */}
            <div className="md:col-span-4 p-4 rounded-2xl bg-mushaf-parchment/80 dark:bg-darkMushaf-surface/80 border border-mushaf-border flex flex-col justify-between text-center relative">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-arabic font-bold text-mushaf-ink-muted flex items-center gap-1">
                    <span>الآية التالية ({currentQuiz.nextAyah ? `${currentQuiz.nextAyah.surah}:${currentQuiz.nextAyah.ayah}` : 'خاتمة المصحف'})</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                  <button
                    onClick={() => setShowNext(!showNext)}
                    className="text-[10px] text-mushaf-gold dark:text-darkMushaf-gold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showNext ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showNext ? 'إخفاء' : 'كشف للتأكد'}</span>
                  </button>
                </div>

                {currentQuiz.nextAyah ? (
                  <p
                    className={`font-uthmani text-base sm:text-lg leading-relaxed transition-all select-none ${
                      showNext
                        ? 'text-mushaf-ink dark:text-darkMushaf-ink'
                        : 'text-transparent bg-mushaf-ink/10 rounded-xl p-2 blur-[5px]'
                    }`}
                  >
                    {currentQuiz.nextAyah.text_uthmani}
                  </p>
                ) : (
                  <span className="text-xs text-mushaf-ink-muted italic block py-4">
                    لا توجد آية تالية (خاتمة المصحف الشريف)
                  </span>
                )}
              </div>

              <span className="text-[10px] text-mushaf-ink-muted/80 block mt-2 border-t border-mushaf-border/40 pt-1">
                المطلوب: اذكر الآية التي بعدها غيباً
              </span>
            </div>

          </div>

          {/* Action Footer: Self-Evaluation */}
          <div className="mt-4 pt-3 border-t border-mushaf-border/60 dark:border-darkMushaf-border flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-arabic text-mushaf-ink-muted">
              اقرأ الآية السابقة والتالية بصوتك، ثم اكشف النص للتحقق من حفظك:
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleIncorrect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 text-xs font-arabic font-bold transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>تعثرت / لم أتذكر</span>
              </button>

              <button
                onClick={handleCorrect}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-mushaf-emerald hover:bg-emerald-700 text-white text-xs font-arabic font-bold shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>استحضرتُ كلاهما بنجاح! 🎯</span>
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
