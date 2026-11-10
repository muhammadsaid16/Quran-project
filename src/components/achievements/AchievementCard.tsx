'use client';

import { getAchievementDefinition } from '@/db/achievements';
import { tierColors } from '@/db/achievement-engine';
import { UserAchievement } from '@/db/schema';
import {
  Mic, Target, Award, Trophy, Calendar, CheckCircle2, Star, Zap,
  BookOpen, Crown, Flag, Shield, Lock, TrendingUp,
} from 'lucide-react';

interface AchievementCardProps {
  achievementId: string;
  data?: UserAchievement;
  currentProgress?: number;
  totalProgress?: number;
  inProgress?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Mic, Target, Award, Trophy, Calendar, CheckCircle2, Star, Zap,
  BookOpen, Crown, Flag, Shield,
};

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievementId,
  data,
  currentProgress,
  totalProgress,
  inProgress = false,
  onClick,
  compact = false,
}) => {
  const definition = getAchievementDefinition(achievementId);
  if (!definition) return null;

  const colors = tierColors(definition.tier);
  const Icon = ICON_MAP[definition.icon] || Target;
  const unlocked = !!data;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`relative flex items-center gap-2 p-2 rounded-xl border transition-all ${
          unlocked
            ? colors.bg + ' ' + colors.border
            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
        } ${onClick ? 'hover:shadow-md cursor-pointer' : ''}`}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          unlocked ? colors.text + ' bg-white dark:bg-slate-900' : 'text-slate-400'
        }`}>
          {unlocked ? <Icon className="w-4.5 h-4.5" /> : <Lock className="w-4 h-4" />}
        </div>
        <div className="text-right flex-1 min-w-0">
          <div className="text-xs font-bold leading-none mb-0.5 text-mushaf-ink dark:text-darkMushaf-ink">
            {definition.title}
          </div>
          <div className="text-[10px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted truncate">
            {unlocked ? definition.description : `${currentProgress} / ${definition.threshold}`}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
        unlocked
          ? colors.border + ' ' + colors.bg
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
      } ${onClick ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer' : ''}`}
    >
      {!unlocked && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
          {definition.tier}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ${
            unlocked
              ? colors.text + ' bg-white dark:bg-slate-900'
              : 'text-slate-400 bg-slate-200 dark:bg-slate-700'
          }`}>
            {unlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>

          <div className="flex-1 text-right">
            <h3 className="text-sm font-bold text-mushaf-ink dark:text-darkMushaf-ink mb-1">
              {definition.title}
            </h3>
            <p className="text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted mb-2">
              {definition.description}
            </p>

            {unlocked ? (
              <div className="flex items-center justify-end gap-1.5">
                <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/70 dark:bg-slate-900/70 text-mushaf-emerald">
                  UNLOCKED
                </div>
                <div className="text-[10px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                  {new Date(data!.unlockedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                  <Target className="w-3.5 h-3.5" />
                  <span>{currentProgress} / {definition.threshold}</span>
                </div>
                {totalProgress !== undefined && (
                  <div className="flex items-center gap-1 text-[10px] text-mushaf-ink-muted dark:text-darkMushaf-ink-muted">
                    <TrendingUp className="w-3 h-3" />
                    <span>Best: {totalProgress}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
