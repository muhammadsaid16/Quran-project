import { WordAlignmentResult } from '@/alignment/types';
import { FSRSRating } from '@/stores/recitation-store';

export interface ReviewStats {
  totalWords: number;
  correct: number;
  substitutions: number;
  omissions: number;
  repetitions: number;
  uncertain: number;
  /** Words with a determinate outcome; uncertain words are excluded. */
  evaluatedWords: number;
  /** Substitutions + omissions + repetitions. Uncertainty is never an error. */
  errorCount: number;
  /** 0-100, correct / evaluated words (100 when nothing could be evaluated). */
  recallAccuracy: number;
}

export function computeReviewStats(words: WordAlignmentResult[]): ReviewStats {
  let correct = 0;
  let substitutions = 0;
  let omissions = 0;
  let repetitions = 0;
  let uncertain = 0;

  for (const word of words) {
    switch (word.status) {
      case 'correct':
        correct++;
        break;
      case 'substitution':
        substitutions++;
        break;
      case 'omission':
        omissions++;
        break;
      case 'repetition':
        repetitions++;
        break;
      case 'uncertain':
        uncertain++;
        break;
    }
  }

  const totalWords = words.length;
  const evaluatedWords = totalWords - uncertain;
  const errorCount = substitutions + omissions + repetitions;
  const recallAccuracy =
    evaluatedWords > 0 ? Math.round((correct / evaluatedWords) * 100) : 100;

  return {
    totalWords,
    correct,
    substitutions,
    omissions,
    repetitions,
    uncertain,
    evaluatedWords,
    errorCount,
    recallAccuracy,
  };
}

export interface SuggestedRating {
  rating: FSRSRating;
  label: string;
}

export function deriveSuggestedRating(stats: ReviewStats): SuggestedRating {
  if (stats.evaluatedWords === 0) {
    return {
      rating: 3,
      label: 'جيد (Good): تعذر تقييم الكلمات بوضوح — لا يوجد دليل على خطأ',
    };
  }

  const stumbles = stats.substitutions + stats.repetitions;

  if (stats.omissions > 1 || stumbles > 2 || stats.recallAccuracy < 70) {
    return { rating: 1, label: 'إعادة (Again): تعثر أو حذف متعدد' };
  }
  if (stats.omissions === 1 || stumbles > 0 || stats.recallAccuracy < 90) {
    return { rating: 2, label: 'صعب (Hard): تم الاسترجاع مع تعثر أو مساعدة' };
  }
  if (stats.recallAccuracy < 98) {
    return { rating: 3, label: 'جيد (Good): تسميع صحيح مع تردد طفيف' };
  }
  return { rating: 4, label: 'سهل (Easy): استرجاع فوري متقن' };
}