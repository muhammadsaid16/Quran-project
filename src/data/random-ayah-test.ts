import corpusData from './quran-corpus.json';
import { SURAHS } from './surahs';

export interface AyahItem {
  id: number;
  surah: number;
  ayah: number;
  verse_key: string;
  page: number;
  juz: number;
  text_uthmani: string;
}

export interface RandomAyahQuiz {
  centerAyah: AyahItem;
  surahName: string;
  prevAyah: AyahItem | null;
  nextAyah: AyahItem | null;
}

const ayahs: AyahItem[] = (corpusData as any).ayahs;

export function getScopeAyahs(
  scope: 'surah' | 'page' | 'juz' | 'all',
  filterSurah: number,
  filterPage: number,
  filterJuz: number
): AyahItem[] {
  if (scope === 'surah') {
    return ayahs.filter((a) => a.surah === filterSurah);
  }
  if (scope === 'page') {
    return ayahs.filter((a) => a.page === filterPage);
  }
  if (scope === 'juz') {
    return ayahs.filter((a) => a.juz === filterJuz);
  }
  return ayahs;
}

export function buildAyahQuiz(target: AyahItem): RandomAyahQuiz {
  const globalIdx = ayahs.findIndex((a) => a.id === target.id);
  const prevAyah = globalIdx > 0 ? ayahs[globalIdx - 1] : null;
  const nextAyah = globalIdx < ayahs.length - 1 ? ayahs[globalIdx + 1] : null;

  const surahMeta = SURAHS[target.surah - 1];
  const surahName = surahMeta ? surahMeta.nameArabic : `سورة ${target.surah}`;

  return {
    centerAyah: target,
    surahName,
    prevAyah,
    nextAyah,
  };
}
