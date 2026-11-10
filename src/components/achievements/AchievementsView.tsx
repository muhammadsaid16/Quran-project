'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAchievementStore } from '@/stores/achievement-store';
import { ACHIEVEMENT_DEFINITIONS } from '@/db/achievements';
import { achievementSortKey } from '@/db/achievements';
import { categoryLabel } from '@/db/achievement-engine';
import type { AchievementCategory } from '@/db/schema';
import { AchievementCard } from './AchievementCard';

const CATEGORY_ORDER: Record<AchievementCategory, number> = {
  memorization: 0,
  consistency: 1,
  accuracy: 2,
  completion: 3,
  special: 4,
};

export const AchievementsView: React.FC = () => {
  const { unlocked, evaluations, load } = useAchievementStore();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  useEffect(() => {
    load();
  }, [load]);

  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  const unlockedData = new Map(unlocked.map((u) => [u.achievementId, u]));

  const unlockedCount = unlocked.length;

  const visibleDefinitions = useMemo(
    () =>
      ACHIEVEMENT_DEFINITIONS.filter(
        (d) => activeCategory === 'all' || d.category === activeCategory
      )
        .slice()
        .sort(
          (a, b) =>
            CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
            achievementSortKey(a) - achievementSortKey(b)
        ),
    [activeCategory]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-mushaf-ink dark:text-darkMushaf-ink">Achievements</h1>
          <p className="text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
            {unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} unlocked
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs border rounded-lg border-mushaf-border dark:border-darkMushaf-border p-1">
          <FilterChip label="الكل" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
          {(['memorization', 'consistency', 'accuracy', 'completion', 'special'] as AchievementCategory[]).map((cat) => (
            <FilterChip
              key={cat}
              label={categoryLabel(cat)}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleDefinitions.map((def) => {
            const data = unlockedData.get(def.id);
            const unlocked = unlockedIds.has(def.id);
            const evaluation = evaluations.find((e) => e.definition.id === def.id);
            return (
              <AchievementCard
                key={def.id}
                achievementId={def.id}
                data={data}
                currentProgress={evaluation ? evaluation.currentProgress : 0}
                totalProgress={data?.totalProgress}
              />
            );
          })}
      </div>
    </div>
  );
};


const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-md transition-all ${
      active
        ? 'bg-mushaf-emerald text-white font-bold'
        : 'text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink hover:bg-mushaf-gold/10'
    }`}
  >
    {label}
  </button>
);
