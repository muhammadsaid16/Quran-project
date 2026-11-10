'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSessionStore } from '@/stores/session-store';

// Client-only dynamic imports to completely prevent React SSR hydration mismatches
const DashboardView = dynamic(
  () => import('@/components/dashboard/DashboardView').then((mod) => mod.DashboardView),
  { ssr: false }
);

const MushafViewer = dynamic(
  () => import('@/components/mushaf/MushafViewer').then((mod) => mod.MushafViewer),
  { ssr: false }
);

const MemoryHeatmapView = dynamic(
  () => import('@/components/heatmap/MemoryHeatmapView').then((mod) => mod.MemoryHeatmapView),
  { ssr: false }
);
const AchievementsView = dynamic(
  () => import('@/components/achievements/AchievementsView').then((mod) => mod.AchievementsView),
  { ssr: false }
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { activeView } = useSessionStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="animate-pulse font-arabic text-sm text-mushaf-ink-muted">
          جاري تحميل المصحف الشريف...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {activeView === 'achievements' ? (
        <AchievementsView />
      ) : activeView === 'dashboard' && <DashboardView />}
      {activeView === 'mushaf' && <MushafViewer />}
      {activeView === 'heatmap' && <MemoryHeatmapView />}
    </div>
  );
}
