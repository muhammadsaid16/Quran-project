'use client';

import { getAchievementDefinition } from '@/db/achievements';
import { tierColors } from '@/db/achievement-engine';
import { UserAchievement } from '@/db/schema';
import { toArabicNumerals } from '@/components/mushaf/AyahMarker';
import {
  Mic, Target, Award, Trophy, Calendar, CheckCircle2, Star, Zap,
  BookOpen, Crown, Flag, Shield, Lock, TrendingUp, Share2, Sparkles,
} from 'lucide-react';
import {
  ACHIEVEMENT_TRANSLATIONS,
  TIER_LABELS_ARABIC,
} from './achievement-translations';

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
  BookOpen, Crown, Flag, Shield, Sparkles,
};

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievementId,
  data,
  currentProgress = 0,
  totalProgress,
  onClick,
  compact = false,
}) => {
  const definition = getAchievementDefinition(achievementId);
  if (!definition) return null;

  const colors = tierColors(definition.tier);
  const Icon = ICON_MAP[definition.icon] || Target;
  const unlocked = !!data;

  const translation = ACHIEVEMENT_TRANSLATIONS[definition.id];
  const title = translation?.title || definition.title;
  const description = translation?.description || definition.description;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        dir="rtl"
        className={`relative flex items-center gap-2.5 p-2 rounded-xl border transition-all font-arabic ${
          unlocked
            ? colors.bg + ' ' + colors.border + ' shadow-sm'
            : 'bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
        } ${onClick ? 'hover:shadow-md cursor-pointer' : ''}`}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
          unlocked
            ? colors.text + ' bg-white dark:bg-slate-900 shadow-xs border border-black/5 dark:border-white/10'
            : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
        }`}>
          {unlocked ? <Icon className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
        </div>
        <div className="text-right flex-1 min-w-0">
          <div className="text-xs font-bold leading-none mb-1 text-mushaf-ink dark:text-white truncate">
            {title}
          </div>
          <div className="text-[10px] text-mushaf-ink-muted dark:text-slate-300 truncate">
            {unlocked
              ? description
              : `${toArabicNumerals(currentProgress)} / ${toArabicNumerals(definition.threshold)}`}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all font-arabic ${
        unlocked
          ? `${colors.border} ${colors.bg} shadow-md dark:shadow-slate-950/40 hover:border-mushaf-gold dark:hover:border-mushaf-gold`
          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkMushaf-card/60 hover:border-slate-300 dark:hover:border-slate-700'
      } ${onClick ? 'hover:scale-[1.015] hover:shadow-lg cursor-pointer' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3.5">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 transition-transform group-hover:scale-105 ${
            unlocked
              ? colors.text + ' bg-white/90 dark:bg-slate-900/90 shadow-sm border border-black/5 dark:border-white/10'
              : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60'
          }`}>
            {unlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
          </div>

          <div className="flex-1 text-right min-w-0">
            <h3 className="text-sm font-bold text-mushaf-ink dark:text-white mb-1 truncate">
              {title}
            </h3>
            <p className="text-xs text-mushaf-ink-muted dark:text-slate-300 mb-3 leading-relaxed">
              {description}
            </p>

            {unlocked ? (
              <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30">
                    مُنجَز ✓
                  </span>
                  <span className="text-[10px] text-mushaf-gold dark:text-darkMushaf-gold hidden group-hover:inline-flex items-center gap-0.5">
                    <Share2 className="w-3 h-3" />
                    <span>مشاركة</span>
                  </span>
                </div>
                <div className="text-[10px] text-mushaf-ink-muted dark:text-slate-400 font-medium">
                  {new Date(data!.unlockedAt).toLocaleDateString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-mushaf-ink-muted dark:text-slate-300">
                  <Target className="w-3.5 h-3.5 text-mushaf-gold dark:text-yellow-400" />
                  <span>{toArabicNumerals(currentProgress)} / {toArabicNumerals(definition.threshold)}</span>
                </div>
                {totalProgress !== undefined && (
                  <div className="flex items-center gap-1 text-[10px] text-mushaf-ink-muted dark:text-slate-400">
                    <TrendingUp className="w-3 h-3 text-mushaf-emerald dark:text-emerald-400" />
                    <span>الأفضل: {toArabicNumerals(totalProgress)}</span>
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
