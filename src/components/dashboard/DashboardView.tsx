'use client';

import React from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useActiveRecallStore, RecallMode } from '@/stores/active-recall-store';
import { useHeatmapStore } from '@/stores/heatmap-store';
import { usePWAStore } from '@/stores/pwa-store';
import {
  BookOpen,
  Brain,
  Repeat,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Calendar,
  Sparkles,
  ChevronLeft,
  ShieldCheck,
  HardDrive,
  Download,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { setActiveView, streakDays, todayRecitedCount, dailyGoal } =
    useSessionStore();
  const { startRecallSession } = useActiveRecallStore();
  const {
    totalMemorizedPages,
    masteredPagesCount,
    reviewDuePagesCount,
    highRiskPagesCount,
  } = useHeatmapStore();
  const {
    isOnline,
    isInstallable,
    isStoragePersisted,
    storageEstimate,
    promptInstall,
    requestPersistentStorage,
  } = usePWAStore();

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleStartMode = (mode: RecallMode) => {
    startRecallSession(mode);
    setActiveView('mushaf');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      
      {/* Hero Welcome & Daily Progress Summary */}
      <div className="bg-gradient-to-r from-mushaf-emerald via-emerald-800 to-mushaf-emerald text-white rounded-2xl p-6 sm:p-8 shadow-mushaf relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute -left-10 -bottom-10 opacity-10 pointer-events-none">
          <span className="font-uthmani text-[180px] leading-none">۞</span>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-mushaf-gold-light text-xs font-arabic mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام الاسترجاع المعرفي للقرآن الكريم (V2.0)</span>
          </div>

          <h1 className="font-arabic font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-tight mb-2">
            مرحبًا بك في جلسة التسميع اليومية
          </h1>

          <p className="font-arabic text-emerald-100 text-sm sm:text-base leading-relaxed mb-6">
            استرجع آيات الذكر الحكيم عبر التسميع الصوتي المباشر دون نصوص معالجة، وجدول مراجعاتك وفق خوارزمية تكرار متباعد ذكية (FSRS).
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleStartMode('retention')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-mushaf-gold hover:bg-yellow-500 text-mushaf-ink font-arabic font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Repeat className="w-4 h-4" />
              <span>بدء ورد المراجعة اليومي ({reviewDuePagesCount} صفحات مستحقة)</span>
            </button>

            <button
              onClick={() => handleStartMode('acquisition')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-arabic font-semibold text-sm border border-white/20 transition-all"
            >
              <Brain className="w-4 h-4" />
              <span>حفظ مقطع جديد (Acquisition)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Mastered Pages */}
        <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              الصفحات المتقنة
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-uthmani text-3xl font-bold text-mushaf-ink dark:text-darkMushaf-ink">
              {masteredPagesCount}
            </span>
            <span className="text-xs font-arabic text-emerald-600 font-semibold">
              ≥ 95% استرجاع
            </span>
          </div>
          <p className="text-[11px] text-mushaf-ink-muted mt-1">من إجمالي {totalMemorizedPages} صفحة محفوظة</p>
        </div>

        {/* Due Today Queue */}
        <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              المستحق اليوم (FSRS)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-uthmani text-3xl font-bold text-amber-600 dark:text-amber-400">
              {reviewDuePagesCount}
            </span>
            <span className="text-xs font-arabic text-amber-600 font-semibold">
              صفحة مستحقة
            </span>
          </div>
          <p className="text-[11px] text-mushaf-ink-muted mt-1">تستند إلى ثبات الذاكرة واستقرارها</p>
        </div>

        {/* High Risk / Weak Connections */}
        <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              مواضع تحتاج تثبيت
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-uthmani text-3xl font-bold text-red-600 dark:text-red-400">
              {highRiskPagesCount}
            </span>
            <span className="text-xs font-arabic text-red-600 font-semibold">
              &lt; 85% استرجاع
            </span>
          </div>
          <p className="text-[11px] text-mushaf-ink-muted mt-1">تحتوي على تعثرات أو نسيان سابق</p>
        </div>

        {/* Daily Streak */}
        <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
              تتابع الورد اليومي
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-uthmani text-3xl font-bold text-orange-600 dark:text-orange-400">
              {streakDays}
            </span>
            <span className="text-xs font-arabic text-orange-600 font-semibold">
              يومًا متواصلًا
            </span>
          </div>
          <p className="text-[11px] text-mushaf-ink-muted mt-1">اليوم: {todayRecitedCount} / {dailyGoal} آية</p>
        </div>

      </div>

      {/* Learning Modes Selection Section */}
      <div>
        <h2 className="font-arabic font-bold text-lg text-mushaf-ink dark:text-darkMushaf-ink mb-3">
          أنماط الاسترجاع النشط المعتمدة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Acquisition Mode Card */}
          <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-5 hover:border-mushaf-gold transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-arabic font-bold text-base text-mushaf-ink dark:text-darkMushaf-ink mb-1">
                وضع الحفظ الجديد (Acquisition)
              </h3>
              <p className="font-arabic text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted leading-relaxed mb-4">
                قراءة المقطع، ثم إخفاؤه تدريجيًا عبر 3 مستويات من النص الشبح (Ghost Text)، وتسميعه صوتيًا مع تحديد مواضع التردد والخطأ لحظيًا.
              </p>
            </div>
            <button
              onClick={() => handleStartMode('acquisition')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-emerald hover:text-white text-mushaf-emerald dark:text-darkMushaf-emerald border border-mushaf-emerald/30 text-xs font-arabic font-bold transition-all"
            >
              <span>بدء حفظ جديد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Retention Mode Card */}
          <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-5 hover:border-mushaf-gold transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="font-arabic font-bold text-base text-mushaf-ink dark:text-darkMushaf-ink mb-1">
                وضع المراجعة المتباعدة (Retention)
              </h3>
              <p className="font-arabic text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted leading-relaxed mb-4">
                استخراج المقاطع المستحقة للمراجعة اليوم بواسطة FSRS، إخفاء النص كليًا، تسميع أعمى من الذاكرة، ثم تحديث موعد التكرار بناء على أدائك الصوتي.
              </p>
            </div>
            <button
              onClick={() => handleStartMode('retention')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-arabic font-bold transition-all"
            >
              <span>مراجعة المستحق ({reviewDuePagesCount})</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Transition Mode Card */}
          <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-5 hover:border-mushaf-gold transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <h3 className="font-arabic font-bold text-base text-mushaf-ink dark:text-darkMushaf-ink mb-1">
                اختبار الروابط والانتقال (Transition)
              </h3>
              <p className="font-arabic text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted leading-relaxed mb-4">
                اختبار قوة الوصل بين نهاية كل آية وبداية التالية، وبخاصة فواصل نهايات الصفحات التي تعد الموضع الأكثر عرضة للتعثر والانقطاع.
              </p>
            </div>
            <button
              onClick={() => handleStartMode('transition')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-arabic font-bold transition-all"
            >
              <span>اختبار روابط الصفحات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Local-First Architecture & PWA Storage Panel */}
      <div className="bg-mushaf-surface dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-mushaf-border/60 dark:border-darkMushaf-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-arabic font-bold text-sm text-mushaf-ink dark:text-darkMushaf-ink">
                حالة التشغيل دون اتصال (100% Local-First Offline PWA)
              </h3>
              <p className="font-arabic text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                يعمل نموذج الذكاء الاصطناعي (Zipformer INT8) ومحرك FSRS وقاعدة البيانات محلياً على جهازك دون إرسال أي صوت للخوادم.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMounted && isInstallable && (
              <button
                onClick={promptInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mushaf-emerald hover:bg-emerald-700 text-white text-xs font-arabic font-bold transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت التطبيق</span>
              </button>
            )}

            {isMounted && !isStoragePersisted && (
              <button
                onClick={requestPersistentStorage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-border text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border text-xs font-arabic font-semibold transition-all"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>تفعيل التخزين الدائم</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-arabic">
          <div className="flex items-center gap-2 text-mushaf-ink dark:text-darkMushaf-ink bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60 p-2.5 rounded-lg border border-mushaf-border/40 dark:border-darkMushaf-border/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="font-bold">الموديل الصوتي:</span>
              <span className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mr-1">محفوظ في ذاكرة المتصفح (72.7MB INT8)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-mushaf-ink dark:text-darkMushaf-ink bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60 p-2.5 rounded-lg border border-mushaf-border/40 dark:border-darkMushaf-border/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="font-bold">حالة التخزين:</span>
              <span suppressHydrationWarning className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mr-1">
                {isMounted && isStoragePersisted ? 'تخزين دائم معتمد (Persistent Grant)' : 'تخزين قياسي (Standard Storage)'}
                {isMounted && storageEstimate ? ` (~${storageEstimate.usageMB}MB مستخدم)` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-mushaf-ink dark:text-darkMushaf-ink bg-mushaf-parchment/60 dark:bg-darkMushaf-surface/60 p-2.5 rounded-lg border border-mushaf-border/40 dark:border-darkMushaf-border/40">
            {(!isMounted || isOnline) ? (
              <Wifi className="w-4 h-4 text-blue-500 flex-shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold">الاتصال بالشبكة:</span>
              <span suppressHydrationWarning className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mr-1">
                {(!isMounted || isOnline) ? 'متصل (يمكن التسميع بدون نت)' : 'غير متصل (يعمل 100% بكفاءة كاملة)'}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
