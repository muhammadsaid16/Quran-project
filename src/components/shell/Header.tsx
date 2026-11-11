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
  Trophy,
} from 'lucide-react';

import { InstallOfflineModal } from './InstallOfflineModal';

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
    isOfflinePackageInstalled,
    isInstallModalOpen,
    setInstallModalOpen,
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
    { id: 'achievements', label: 'الإنجازات', icon: <Trophy className="w-4 h-4" /> },
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
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-mushaf-surface dark:bg-darkMushaf-bg border-b border-mushaf-border dark:border-darkMushaf-border transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4" dir="rtl">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-mushaf-parchment dark:bg-darkMushaf-card border border-mushaf-border dark:border-darkMushaf-border flex items-center justify-center shadow-xs p-1 flex-shrink-0 transition-transform hover:scale-105">
            <svg
              viewBox="0 0 512 400"
              className="w-full h-full"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="شعار المحراب - باب الإتقان"
            >
              {/* Mihrab */}
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M112 340 V180 C112 100 174 48 256 20 C338 48 400 100 400 180 V340"
                  stroke="#174C3D"
                  className="stroke-[#174C3D] dark:stroke-[#34D399]"
                  strokeWidth="18"
                />
                <path
                  d="M145 340 V183 C145 124 191 83 256 57 C321 83 367 124 367 183 V340"
                  stroke="#C29B53"
                  className="stroke-[#C29B53] dark:stroke-[#E0BA53]"
                  strokeWidth="7"
                />
                <path
                  d="M100 340 H412"
                  stroke="#174C3D"
                  className="stroke-[#174C3D] dark:stroke-[#34D399]"
                  strokeWidth="15"
                />
              </g>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-arabic font-bold text-base sm:text-lg text-mushaf-ink dark:text-darkMushaf-ink leading-tight whitespace-nowrap">
                باب الإتقان
              </h1>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-mushaf-gold/20 text-mushaf-gold dark:text-darkMushaf-gold border border-mushaf-gold/30 whitespace-nowrap">
                ع٢٫٠
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
            title={isMounted ? `تتابع الإنجاز اليومي: ${streakDays.toLocaleString('ar-EG')} يومًا` : undefined}
          >
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span suppressHydrationWarning className="font-arabic">
              {isMounted ? streakDays.toLocaleString('ar-EG') : '٠'} يومًا
            </span>
          </div>

          {/* Daily Goal Progress */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted border-l border-r border-mushaf-border/60 dark:border-darkMushaf-border px-2.5 whitespace-nowrap">
            <span>الهدف:</span>
            <span suppressHydrationWarning className="font-bold text-mushaf-ink dark:text-darkMushaf-ink">
              {isMounted ? `${todayRecitedCount.toLocaleString('ar-EG')}/${dailyGoal.toLocaleString('ar-EG')} آية` : `٠/${dailyGoal.toLocaleString('ar-EG')} آية`}
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

          {/* PWA & Offline Package Install Button */}
          {isMounted && (
            <button
              onClick={() => setInstallModalOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow transition-all whitespace-nowrap ${
                isOfflinePackageInstalled
                  ? 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/25'
                  : 'bg-mushaf-emerald text-white hover:bg-emerald-700 animate-pulse'
              }`}
              title="تثبيت التطبيق وتحميل الموارد للعمل بدون إنترنت (أوفلاين)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isOfflinePackageInstalled ? 'مثبت (أوفلاين)' : 'تثبيت'}</span>
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
            className="p-1.5 rounded-lg text-xs flex items-center text-mushaf-emerald dark:text-darkMushaf-emerald bg-mushaf-emerald/10 border border-mushaf-emerald/20 flex-shrink-0 cursor-pointer hover:bg-mushaf-emerald/20 transition-colors"
            onClick={() => setInstallModalOpen(true)}
            title={isMounted && !isOnline ? 'أنت غير متصل (يعمل محليًا بالكامل) - اضغط لإدارة الموارد' : 'PWA جاهز للعمل بدون إنترنت - اضغط لإدارة الموارد'}
          >
            {isMounted && !isOnline ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5" />}
          </div>

        </div>

      </div>

      {/* Offline Resources & Installation Modal */}
      <InstallOfflineModal
        isOpen={isInstallModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </header>
  );
};
