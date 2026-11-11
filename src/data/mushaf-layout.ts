/**
 * Medina Mushaf page layout (pure, framework-free).
 *
 * The scraped dataset in `medina-pages.ts` stores every word with a
 * `wordIndex` that counts ALL raw entries of that ayah: for surahs greater
 * than one it also counts the prepended Basmalah (words 0..3), and it counts
 * standalone waqf marks as separate entries.
 *
 * The reference phoneme dataset (`ordered_quran_phonemes.json`) uses a
 * tighter numbering: only the words of the ayah itself, in order, and without
 * the Basmalah for surahs greater than one.
 *
 * The two index spaces therefore disagree. Anything that maps a reference word
 * onto a rendered word (reveal, error highlighting, word audio) has to
 * translate the index first — see `buildAyahWordIndexMap`.
 */

import { MEDINA_PAGES, MedinaPageData, MushafLine, QuranWord } from './medina-pages';
import { SURAHS } from './surahs';

/** Waqf marks that the Medina Mushaf renders attached to the preceding word. */
export const WAQF_MARKS = new Set(['ۚ', 'ۖ', 'ۗ', 'ۘ', 'ۙ', 'ۜ', 'ۛ']);

/**
 * The Basmalah as it is prepended to ayah 1 of every surah greater than one
 * (except At-Tawbah, which has none).
 */
const BASMALAH_WORDS = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ'];

/**
 * Builds the key that identifies one ayah across the whole Quran.
 *
 * Ayah numbers repeat in every surah, so a bare ayah number is ambiguous
 * (page 604 holds 112:1, 113:1 and 114:1). The composite key keeps reveal
 * state for different surahs apart.
 */
export function ayahStateKey(surahNumber: number, ayahNumber: number): number {
  return surahNumber * 1000 + ayahNumber;
}

/**
 * The string key of one ayah, for maps that must not collide across surahs.
 */
export function ayahKeyOf(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}-${ayahNumber}`;
}

/**
 * Formats a raw quarter indicator (1 to 240 or 'الحزب X') into authentic
 * Medina Quranic Hizb Quarter terminology (e.g. 'نِصۡفُ الحِزۡبِ ٦٠').
 */
export function formatHizbQuarter(raw: string | number | undefined): string {
  if (!raw) return '';
  // Normalize Eastern Arabic-Indic digits (٠-٩) so parsing works for any data shape
  const normalized = String(raw).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const match = normalized.match(/\d+/);
  if (!match) return String(raw);
  const quarter = parseInt(match[0], 10);
  if (isNaN(quarter) || quarter < 1 || quarter > 240) return String(raw);

  const hizbNumber = Math.ceil(quarter / 4);
  const arabicHizb = toArabicNumerals(hizbNumber);
  const quarterInHizb = ((quarter - 1) % 4) + 1;

  switch (quarterInHizb) {
    case 1:
      return `الحِزۡبُ ${arabicHizb}`;
    case 2:
      return `رُبۡعُ الحِزۡبِ ${arabicHizb}`;
    case 3:
      return `نِصۡفُ الحِزۡبِ ${arabicHizb}`;
    case 4:
      return `ثَلَاثَةُ أَرۡبَاعِ الحِزۡبِ ${arabicHizb}`;
    default:
      return `الحِزۡبُ ${arabicHizb}`;
  }
}

/** Converts Western digits to Eastern Arabic-Indic digits. */
export function toArabicNumerals(value: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(value)
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] ?? d)
    .join('');
}

/**
 * Normalizes an Arabic word so that purely orthographic differences
 * (hamza carriers, madda, superscript alef, tatweel) do not prevent a match.
 */
export function normalizeArabicWord(word: string): string {
  return word
    // Harakat, tanween, superscript alef, Quranic annotation signs, tatweel
    .replace(/[\u064B-\u0670\u0653-\u0655\u06D6-\u06ED\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0649\u06CC]/g, '\u064A')
    .replace(/[\u0621\u0654]/g, '');
}

/**
 * Normalizes raw page lines to faithfully adhere to the King Fahd Medina Mushaf:
 * - Page 1 (Al-Fatiha): Injects ornate Surah Header, centers Basmalah on its own line,
 *   and lays out the remaining 6 verses symmetrically.
 * - Pages 2-604: Injects ornate Surah Headers whenever a Surah begins, renders centered
 *   Basmalah lines (except Surah 9 At-Tawbah), cleanly merges waqf pause marks into the
 *   preceding words, and strips inline prepended Basmalah words.
 */
export function normalizePageLines(pageData: MedinaPageData): MushafLine[] {
  const pageNum = pageData.pageNumber;
  const rawLines = pageData.lines;

  // Special authentic layout for Page 1 (Al-Fatiha)
  if (pageNum === 1) {
    const allWords = rawLines.flatMap((l) => (l.type === 'text' ? l.words || [] : []));
    const fatihaMeta = SURAHS[0];
    const result: MushafLine[] = [];
    let lineCounter = 1;

    // Surah Header
    result.push({
      lineNumber: lineCounter++,
      type: 'surah_header',
      surahNumber: 1,
      surahName: fatihaMeta?.nameArabic || 'الفاتحة',
      revelationType: 'مَكِّيَّةٌ',
      ayahCount: 7,
    });

    const ayah1Words = allWords.filter((w) => w.ayahNumber === 1);
    const ayah2Words = allWords.filter((w) => w.ayahNumber === 2);
    const ayah3Words = allWords.filter((w) => w.ayahNumber === 3);
    const ayah4Words = allWords.filter((w) => w.ayahNumber === 4);
    const ayah5Words = allWords.filter((w) => w.ayahNumber === 5);
    const ayah6Words = allWords.filter((w) => w.ayahNumber === 6);
    const ayah7Words = allWords.filter((w) => w.ayahNumber === 7);

    const ayah7Part1 = ayah7Words.slice(0, 4);
    const ayah7Part2 = ayah7Words.slice(4);

    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah1Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah2Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: [...ayah3Words, ...ayah4Words] });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah5Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah6Words });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah7Part1 });
    result.push({ lineNumber: lineCounter++, type: 'text', words: ayah7Part2 });

    return result;
  }

  // General layout for pages 2 to 604
  const result: MushafLine[] = [];
  let lineCounter = 1;
  const surahsHeaded = new Set<number>();

  for (let li = 0; li < rawLines.length; li++) {
    const line = rawLines[li];
    if (line.type === 'surah_header' || line.type === 'basmalah') {
      result.push({ ...line, lineNumber: lineCounter++ });
      continue;
    }

    const words = line.words || [];
    const currentLineWords: typeof words = [];

    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      const sNum = w.surahNumber;

      // Handle Waqf Marks (علامات الوقف): Merge into preceding word rather than creating orphan lines
      if (WAQF_MARKS.has(w.text)) {
        if (currentLineWords.length > 0) {
          let tIdx = currentLineWords.length - 1;
          while (tIdx >= 0 && currentLineWords[tIdx].isAyahMarker) tIdx--;
          if (tIdx >= 0) {
            currentLineWords[tIdx] = { ...currentLineWords[tIdx], waqfMark: w.text };
          }
        } else {
          // Waqf mark at line start belongs to the end of the previous text line
          for (let ri = result.length - 1; ri >= 0; ri--) {
            const prevLine = result[ri];
            if (prevLine.type === 'text' && prevLine.words.length > 0) {
              let tIdx = prevLine.words.length - 1;
              while (tIdx >= 0 && prevLine.words[tIdx].isAyahMarker) tIdx--;
              if (tIdx >= 0) {
                prevLine.words[tIdx] = { ...prevLine.words[tIdx], waqfMark: w.text };
              }
              break;
            }
          }
        }
        continue;
      }

      // If this word is the start of a new surah that hasn't been headed yet
      if (w.ayahNumber === 1 && !surahsHeaded.has(sNum)) {
        // Flush any preceding words from previous surah
        if (currentLineWords.length > 0) {
          result.push({
            lineNumber: lineCounter++,
            type: 'text',
            words: [...currentLineWords],
          });
          currentLineWords.length = 0;
        }

        surahsHeaded.add(sNum);
        const meta = SURAHS[sNum - 1];
        if (meta) {
          result.push({
            lineNumber: lineCounter++,
            type: 'surah_header',
            surahNumber: sNum,
            surahName: meta.nameArabic || meta.name,
            revelationType: meta.revelationType === 'Meccan' ? 'مَكِّيَّةٌ' : 'مَدَنِيَّةٌ',
            ayahCount: meta.ayahCount || meta.ayahsCount,
          });

          // Insert Basmalah for all surahs except Surah 9 (At-Tawbah) and Surah 1 (where Basmalah is verse 1)
          if (sNum !== 9 && sNum !== 1) {
            result.push({
              lineNumber: lineCounter++,
              type: 'basmalah',
              text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
            });
          }
        }
      }

      // In the scraped dataset, surahs greater than one have the Basmalah
      // prepended as ayah 1 words 0..3. Filter those out of the inline verse
      // text so they don't render inline.
      // At-Tawbah (sNum === 9) has NO Basmalah: its first words are real words
      // (براءة من الله ورسوله) and must be kept.
      if (
        sNum > 1 &&
        sNum !== 9 &&
        w.ayahNumber === 1 &&
        w.wordIndex <= 3 &&
        !w.isAyahMarker
      ) {
        continue;
      }

      currentLineWords.push(w);
    }

    if (currentLineWords.length > 0) {
      result.push({
        lineNumber: lineCounter++,
        type: 'text',
        words: [...currentLineWords],
      });
    }
  }

  return result;
}

/**
 * Returns the words the Mushaf actually renders for one ayah, in reading order.
 * Each word keeps its dataset `wordIndex`, which is the index the Mushaf
 * component and the word-by-word audio CDN address.
 */
export function getRenderedAyahWords(
  pageData: MedinaPageData,
  surahNumber: number,
  ayahNumber: number
): QuranWord[] {
  const out: QuranWord[] = [];
  for (const line of normalizePageLines(pageData)) {
    if (line.type !== 'text') continue;
    for (const w of line.words) {
      if (w.isAyahMarker) continue;
      if (w.surahNumber === surahNumber && w.ayahNumber === ayahNumber) out.push(w);
    }
  }
  return out;
}

const renderedWordsCache = new Map<number, Map<string, QuranWord[]>>();

/**
 * Memoized variant of `getRenderedAyahWords` for a page number.
 * Normalizing a page is not cheap, and the recitation loop asks for the same
 * ayah on every token.
 */
export function getRenderedAyahWordsByPage(
  pageNumber: number,
  surahNumber: number,
  ayahNumber: number
): QuranWord[] {
  let perPage = renderedWordsCache.get(pageNumber);
  if (!perPage) {
    perPage = new Map();
    renderedWordsCache.set(pageNumber, perPage);
  }
  const key = `${surahNumber}:${ayahNumber}`;
  const cached = perPage.get(key);
  if (cached) return cached;

  const pageData = MEDINA_PAGES[pageNumber];
  const words = pageData ? getRenderedAyahWords(pageData, surahNumber, ayahNumber) : [];
  perPage.set(key, words);
  return words;
}

let ayahPageIndex: Map<string, number> | null = null;

/**
 * The page an ayah is rendered on.
 *
 * An ayah lives on exactly one page, so the answer is stable. The index is
 * built once and reused.
 */
export function getPageOfAyah(surahNumber: number, ayahNumber: number): number | null {
  if (!ayahPageIndex) {
    ayahPageIndex = new Map<string, number>();
    for (const pageNumber of Object.keys(MEDINA_PAGES)) {
      const page = MEDINA_PAGES[Number(pageNumber)];
      for (const line of page.lines) {
        if (line.type !== 'text' || !line.words) continue;
        for (const w of line.words) {
          const key = `${w.surahNumber}:${w.ayahNumber}`;
          if (!ayahPageIndex.has(key)) ayahPageIndex.set(key, Number(pageNumber));
        }
      }
    }
  }
  return ayahPageIndex.get(`${surahNumber}:${ayahNumber}`) ?? null;
}

/**
 * Maps reference (phoneme dataset) word indices onto rendered page word indices.
 *
 * @param renderedWords words the Mushaf renders for the ayah, in reading order
 * @param referenceWords words of the ayah as listed in the reference dataset
 * @returns for each reference word index the rendered page word index, or -1
 */
export function buildAyahWordIndexMap(
  renderedWords: QuranWord[],
  referenceWords: string[]
): number[] {
  const map: number[] = new Array(referenceWords.length).fill(-1);
  let cursor = 0;

  for (let ri = 0; ri < referenceWords.length; ri++) {
    const target = normalizeArabicWord(referenceWords[ri]);
    let found = -1;

    for (let j = cursor; j < renderedWords.length; j++) {
      if (normalizeArabicWord(renderedWords[j].text) === target) {
        found = j;
        break;
      }
    }
    if (found < 0) {
      // Fall back to a full scan so a locally reordered word still resolves.
      for (let j = 0; j < renderedWords.length; j++) {
        if (normalizeArabicWord(renderedWords[j].text) === target) {
          found = j;
          break;
        }
      }
    }

    if (found >= 0) {
      map[ri] = renderedWords[found].wordIndex;
      cursor = found + 1;
    }
  }

  return map;
}

/**
 * True when the first words of an ayah are the prepended Basmalah rather
 * than real verse text.
 */
export function startsWithBasmalah(words: QuranWord[]): boolean {
  if (words.length < BASMALAH_WORDS.length) return false;
  for (let i = 0; i < BASMALAH_WORDS.length; i++) {
    if (normalizeArabicWord(words[i].text) !== normalizeArabicWord(BASMALAH_WORDS[i])) {
      return false;
    }
  }
  return true;
}
