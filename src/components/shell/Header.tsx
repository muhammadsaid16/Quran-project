'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore, ThemeMode, ViewMode } from '@/stores/session-store';
import { useHeatmapStore } from '@/stores/heatmap-store';
import { usePWAStore } from '@/stores/pwa-store';
import {
  BookOpen,
  LayoutDashboard,
  Activity,
  Flame,
  Sun,
  Moon,
  Eye,
  Wifi,
  WifiOff,
  Download,
  HardDrive,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    theme,
    setTheme,
    activeView,
    setActiveView,
    streakDays,
    todayRecitedCount,
    dailyGoal,
  } = useSessionStore();

  const { reviewDuePagesCount } = useHeatmapStore();
  const {
    isOnline,
    isInstallable,
    isStoragePersisted,
    initPWA,
    promptInstall,
  } = usePWAStore();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initPWA();
  }, [initPWA]);

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'mushaf', label: 'المصحف الشريف', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'heatmap', label: 'خريطة الذاكرة', icon: <Activity className="w-4 h-4" /> },
  ];

  const handleCycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'high-contrast'];
    const nextIndex = (order.indexOf(theme) + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="w-4 h-4 text-mushaf-gold" />;
    if (theme === 'high-contrast') return <Eye className="w-4 h-4 text-emerald-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  const getThemeTitle = () => {
    if (theme === 'dark') return 'الوضع الحالي: ليلي (اضغط للتبديل)';
    if (theme === 'high-contrast') return 'الوضع الحالي: عالي التباين (اضغط للتبديل)';
    return 'الوضع الحالي: نهاري (اضغط للتبديل)';
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-mushaf-surface/90 dark:bg-darkMushaf-bg/90 border-b border-mushaf-border dark:border-darkMushaf-border transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4" dir="rtl">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-mushaf-emerald to-emerald-800 flex items-center justify-center text-mushaf-gold shadow-md flex-shrink-0">
            <span className="font-uthmani text-xl sm:text-2xl font-bold leading-none">ق</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-arabic font-bold text-base sm:text-lg text-mushaf-ink dark:text-darkMushaf-ink leading-tight whitespace-nowrap">
                Quran Cognitive OS
              </h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-mushaf-gold/20 text-mushaf-gold dark:text-darkMushaf-gold border border-mushaf-gold/30 whitespace-nowrap">
                PWA v2.0
              </span>
            </div>
            <p className="text-[11px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hidden xl:block leading-tight">
              الاسترجاع النشط • التسميع الصوتي المباشر • خوارزمية FSRS
            </p>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="flex items-center gap-1 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border dark:border-darkMushaf-border flex-shrink-0">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-arabic font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-mushaf-surface dark:bg-darkMushaf-card text-mushaf-emerald dark:text-darkMushaf-emerald shadow-sm font-bold border border-mushaf-border/60 dark:border-darkMushaf-border'
                    : 'text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                {item.id === 'heatmap' && isMounted && reviewDuePagesCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-recall-warning text-white text-[10px] flex items-center justify-center font-bold">
                    {reviewDuePagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Left Utilities: Streak, Due, Theme & PWA Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          
          {/* Streak Badge */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-semibold whitespace-nowrap"
            title={isMounted ? `تتابع الإنجاز اليومي: ${streakDays} يومًا` : undefined}
          >
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span suppressHydrationWarning className="font-arabic">
              {isMounted ? streakDays : 0} يومًا
            </span>
          </div>

          {/* Daily Goal Progress */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted border-l border-r border-mushaf-border/60 dark:border-darkMushaf-border px-2.5 whitespace-nowrap">
            <span>الهدف:</span>
            <span suppressHydrationWarning className="font-bold text-mushaf-ink dark:text-darkMushaf-ink">
              {isMounted ? `${todayRecitedCount}/${dailyGoal} آية` : `0/${dailyGoal} آية`}
            </span>
          </div>

          {/* Compact Single Cycle Theme Button */}
          <button
            onClick={handleCycleTheme}
            className="p-1.5 rounded-lg bg-mushaf-parchment dark:bg-darkMushaf-surface hover:bg-mushaf-gold/15 text-mushaf-ink dark:text-darkMushaf-ink border border-mushaf-border dark:border-darkMushaf-border transition-colors flex items-center justify-center"
            title={getThemeTitle()}
            aria-label="تبديل المظهر"
          >
            {getThemeIcon()}
          </button>

          {/* PWA Install Button (shown when installable) */}
          {isMounted && isInstallable && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-mushaf-emerald text-white text-xs font-semibold shadow hover:bg-emerald-700 transition-colors animate-pulse whitespace-nowrap"
              title="تثبيت التطبيق على جهازك للعمل بدون إنترنت"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">تثبيت</span>
            </button>
          )}

          {/* Persistent Storage Status */}
          {isMounted && isStoragePersisted && (
            <div
              className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] whitespace-nowrap"
              title="تخزين محلي دائم مفعل"
            >
              <HardDrive className="w-3 h-3" />
              <span>مساحة دائمة</span>
            </div>
          )}

          {/* PWA Offline Readiness Indicator */}
          <div
            suppressHydrationWarning
            className="p-1.5 rounded-lg text-xs flex items-center text-mushaf-emerald dark:text-darkMushaf-emerald bg-mushaf-emerald/10 border border-mushaf-emerald/20 flex-shrink-0"
            title={isMounted && !isOnline ? 'أنت غير متصل (يعمل محليًا بالكامل)' : 'PWA جاهز للعمل بدون إنترنت (Local-First)'}
          >
            {isMounted && !isOnline ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5" />}
          </div>

        </div>

      </div>
    </header>
  );
};
