'use client';

import React, { useEffect } from 'react';
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

  useEffect(() => {
    initPWA();
  }, [initPWA]);

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'mushaf', label: 'المصحف الشريف', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'heatmap', label: 'خريطة الذاكرة', icon: <Activity className="w-4 h-4" /> },
  ];

  const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'نهاري', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'dark', label: 'ليلي', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'high-contrast', label: 'عالي التباين', icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-mushaf-surface/90 dark:bg-darkMushaf-bg/90 border-b border-mushaf-border dark:border-darkMushaf-border transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" dir="rtl">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mushaf-emerald to-emerald-800 flex items-center justify-center text-mushaf-gold shadow-md">
            <span className="font-uthmani text-2xl font-bold leading-none">ق</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-arabic font-bold text-lg sm:text-xl text-mushaf-ink dark:text-darkMushaf-ink leading-tight">
                Quran Cognitive OS
              </h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-mushaf-gold/20 text-mushaf-gold dark:text-darkMushaf-gold border border-mushaf-gold/30">
                PWA v2.0
              </span>
            </div>
            <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hidden sm:block">
              الاسترجاع النشط • التسميع الصوتي المباشر • خوارزمية FSRS
            </p>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-xl border border-mushaf-border dark:border-darkMushaf-border">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-arabic font-medium transition-all ${
                  isActive
                    ? 'bg-mushaf-surface dark:bg-darkMushaf-card text-mushaf-emerald dark:text-darkMushaf-emerald shadow-sm font-bold border border-mushaf-border/60 dark:border-darkMushaf-border'
                    : 'text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'heatmap' && reviewDuePagesCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-recall-warning text-white text-[10px] flex items-center justify-center font-bold">
                    {reviewDuePagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Left Utilities: Streak, Due, Theme & PWA Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Streak Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-semibold"
            title={`تتابع الإنجاز اليومي: ${streakDays} يومًا`}
          >
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span className="font-arabic">{streakDays} يومًا</span>
          </div>

          {/* Daily Goal Progress */}
          <div className="hidden md:flex items-center gap-2 text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted border-l border-r border-mushaf-border dark:border-darkMushaf-border px-3">
            <span>الهدف اليومي:</span>
            <span className="font-bold text-mushaf-ink dark:text-darkMushaf-ink">
              {todayRecitedCount}/{dailyGoal} آية
            </span>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-mushaf-parchment dark:bg-darkMushaf-surface p-1 rounded-lg border border-mushaf-border dark:border-darkMushaf-border">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === t.id
                    ? 'bg-mushaf-surface dark:bg-darkMushaf-card text-mushaf-gold dark:text-darkMushaf-gold shadow-xs'
                    : 'text-mushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink'
                }`}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* PWA Install Button (shown when installable) */}
          {isInstallable && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-mushaf-emerald text-white text-xs font-semibold shadow hover:bg-emerald-700 transition-colors animate-pulse"
              title="تثبيت التطبيق على جهازك للعمل بدون إنترنت"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تثبيت التطبيق</span>
            </button>
          )}

          {/* Persistent Storage Status */}
          {isStoragePersisted && (
            <div
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px]"
              title="تخزين محلي دائم مفعل (لا يمكن حذفه تلقائياً من المتصفح)"
            >
              <HardDrive className="w-3 h-3" />
              <span>مساحة دائمة</span>
            </div>
          )}

          {/* PWA Offline Readiness Indicator */}
          <div
            className="p-1.5 rounded-lg text-xs flex items-center text-mushaf-emerald dark:text-darkMushaf-emerald bg-mushaf-emerald/10 border border-mushaf-emerald/20"
            title={isOnline ? 'PWA جاهز للعمل بدون إنترنت (Local-First)' : 'أنت غير متصل (يعمل محليًا بالكامل)'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
          </div>

        </div>

      </div>
    </header>
  );
};
