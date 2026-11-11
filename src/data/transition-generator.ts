import { MEDINA_PAGES, QuranWord, MedinaPageData } from './medina-pages';
import { SURAHS } from './surahs';
import { TransitionTarget } from '@/stores/active-recall-store';

/**
 * Extracts all words for a given surah and ayah across all pages.
 */
export function getAyahWords(surahNumber: number, ayahNumber: number): QuranWord[] {
  const words: QuranWord[] = [];
  const surahMeta = SURAHS[surahNumber - 1];
  if (!surahMeta) return words;

  for (let p = surahMeta.pageStart; p <= surahMeta.pageEnd; p++) {
    const pageData = MEDINA_PAGES[p];
    if (!pageData) continue;

    for (const line of pageData.lines) {
      if (line.type === 'text' && line.words) {
        for (const w of line.words) {
          if (w.surahNumber === surahNumber && w.ayahNumber === ayahNumber && !w.isAyahMarker) {
            words.push(w);
          }
        }
      }
    }
  }
  return words;
}

/**
 * Finds which page an ayah is located on.
 */
export function getAyahPage(surahNumber: number, ayahNumber: number): number {
  const surahMeta = SURAHS[surahNumber - 1];
  if (!surahMeta) return 1;

  for (let p = surahMeta.pageStart; p <= surahMeta.pageEnd; p++) {
    const pageData = MEDINA_PAGES[p];
    if (!pageData) continue;

    for (const line of pageData.lines) {
      if (line.type === 'text' && line.words) {
        for (const w of line.words) {
          if (w.surahNumber === surahNumber && w.ayahNumber === ayahNumber) {
            return p;
          }
        }
      }
    }
  }
  return surahMeta.pageStart;
}

/**
 * Generates an authentic TransitionTarget connecting (surahNumber, ayahNumber)
 * to the immediately following ayah (or the next surah if at the end).
 */
export function generateTransitionForAyah(surahNumber: number, ayahNumber: number): TransitionTarget | null {
  const fromWords = getAyahWords(surahNumber, ayahNumber);
  if (fromWords.length === 0) return null;

  const surahMeta = SURAHS[surahNumber - 1];
  if (!surahMeta) return null;

  let nextSurah = surahNumber;
  let nextAyah = ayahNumber + 1;

  if (nextAyah > surahMeta.ayahCount) {
    if (surahNumber >= 114) {
      return null; // End of the Quran
    }
    nextSurah = surahNumber + 1;
    nextAyah = 1;
  }

  const toWords = getAyahWords(nextSurah, nextAyah);
  if (toWords.length === 0) return null;

  const fromPage = getAyahPage(surahNumber, ayahNumber);
  const toPage = getAyahPage(nextSurah, nextAyah);

  // Terminal 3-4 words of the current ayah
  const terminalSlice = fromWords.slice(-3);
  const textEnding = `... ${terminalSlice.map((w) => w.text).join(' ')}`;

  // Opening 3-4 words of the next ayah
  const openingSlice = toWords.slice(0, 3);
  const textBeginning = `${openingSlice.map((w) => w.text).join(' ')} ...`;

  return {
    fromAyah: {
      surahNumber,
      ayahNumber,
      textEnding,
      pageNumber: fromPage,
    },
    toAyah: {
      surahNumber: nextSurah,
      ayahNumber: nextAyah,
      textBeginning,
      pageNumber: toPage,
    },
    isPageBoundary: fromPage !== toPage,
  };
}
