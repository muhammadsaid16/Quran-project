'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAchievementStore } from '@/stores/achievement-store';
import { ACHIEVEMENT_DEFINITIONS } from '@/db/achievements';
import { achievementSortKey } from '@/db/achievements';
import type { AchievementCategory, AchievementDefinition, UserAchievement } from '@/db/schema';
import { toArabicNumerals } from '@/components/mushaf/AyahMarker';
import { AchievementCard } from './AchievementCard';
import { CATEGORY_LABELS_ARABIC } from './achievement-translations';
import { AchievementCelebrationModal } from './AchievementCelebrationModal';

const CATEGORY_ORDER: Record<AchievementCategory, number> = {
  memorization: 0,
  consistency: 1,
  accuracy: 2,
  completion: 3,
  special: 4,
};

export const AchievementsView: React.FC = () => {
  const { unlocked, evaluations, notifications, clearNotifications, load } = useAchievementStore();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');
  const [celebrationAchievement, setCelebrationAchievement] = useState<{
    definition: AchievementDefinition;
    data?: UserAchievement;
    isNewlyUnlocked?: boolean;
  } | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  // Check if a new notification arrived to auto-open celebration modal
  useEffect(() => {
    const newNotif = notifications.find((n) => n.isNew);
    if (newNotif) {
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === newNotif.achievementId);
      if (def) {
        const data = unlocked.find((u) => u.achievementId === def.id);
        setCelebrationAchievement({
          definition: def,
          data,
          isNewlyUnlocked: true,
        });
        clearNotifications();
      }
    }
  }, [notifications, unlocked, clearNotifications]);

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
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 select-none" dir="rtl">
      {/* Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-arabic text-mushaf-ink dark:text-darkMushaf-ink">
            الإنجازات والأوسمة
          </h1>
          <p className="text-sm font-arabic text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mt-1">
            تم فتح {toArabicNumerals(unlockedCount)} من أصل {toArabicNumerals(ACHIEVEMENT_DEFINITIONS.length)} إنجاز
            <span className="mx-2 text-mushaf-gold dark:text-darkMushaf-gold">•</span>
            <span>انقر على أي وسام للمعاينة أو المشاركة كصورة PNG</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs border rounded-xl border-mushaf-border dark:border-darkMushaf-border p-1 bg-mushaf-surface dark:bg-darkMushaf-card">
          <FilterChip label="الكل" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
          {(['memorization', 'consistency', 'accuracy', 'completion', 'special'] as AchievementCategory[]).map((cat) => (
            <FilterChip
              key={cat}
              label={CATEGORY_LABELS_ARABIC[cat] || cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Achievement Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleDefinitions.map((def) => {
          const data = unlockedData.get(def.id);
          const evaluation = evaluations.find((e) => e.definition.id === def.id);
          return (
            <AchievementCard
              key={def.id}
              achievementId={def.id}
              data={data}
              currentProgress={evaluation ? evaluation.currentProgress : 0}
              totalProgress={data?.totalProgress}
              onClick={() => {
                setCelebrationAchievement({
                  definition: def,
                  data,
                  isNewlyUnlocked: false,
                });
              }}
            />
          );
        })}
      </div>

      {/* Celebration & Share Modal */}
      {celebrationAchievement && (
        <AchievementCelebrationModal
          definition={celebrationAchievement.definition}
          data={celebrationAchievement.data}
          isNewlyUnlocked={celebrationAchievement.isNewlyUnlocked}
          onClose={() => setCelebrationAchievement(null)}
        />
      )}
    </div>
  );
};

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg font-arabic transition-all text-xs ${
      active
        ? 'bg-mushaf-emerald text-white font-bold shadow-xs'
        : 'text-mushaf-ink-muted dark:text-darkMushaf-ink-muted hover:text-mushaf-ink dark:hover:text-darkMushaf-ink hover:bg-mushaf-gold/10'
    }`}
  >
    {label}
  </button>
);
