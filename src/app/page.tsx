'use client';

import React from 'react';
import { useSessionStore } from '@/stores/session-store';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { MushafViewer } from '@/components/mushaf/MushafViewer';
import { MemoryHeatmapView } from '@/components/heatmap/MemoryHeatmapView';

export default function Home() {
  const { activeView } = useSessionStore();

  return (
    <div className="w-full">
      {activeView === 'dashboard' && <DashboardView />}
      {activeView === 'mushaf' && <MushafViewer />}
      {activeView === 'heatmap' && <MemoryHeatmapView />}
    </div>
  );
}
