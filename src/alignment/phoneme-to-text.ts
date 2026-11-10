/**
 * Quran Cognitive OS v2.0 — Phoneme Token Stream to Graphemic Arabic Text Converter
 * 
 * Converts Zipformer CTC phoneme units (e.g. بِسمِ للَااهِ ررَحِۦۦۦۦم) into clean,
 * readable Arabic text for Voice Active Recall comparison and review.
 */

const LETTER_MAP: Record<string, string> = {
  'ٲ': 'ا', // ٲ alef with wavy hamza
  'ں': 'ن', // ں noon ghunna
  'ۥ': 'و', // ۥ small waw (madd of oo)
  'ۦ': 'ي', // ۦ small yeh (madd of ee)
};

// Phonetic markers with no direct graphemic counterpart:
// harakat 064B-065F + dagger alef 0670, annotation signs 06D6-06DC/06DF-06E8/06EA-06ED,
// ؙ (0619), ڇ qalqalah marker (0687), ۾ sakt marker (06FE), tatweel (0640)
const STRIP_MARKS = /[ً-ٰٟۖ-ۜ۟-۪ۨ-ؙۭڇ۾ـ]/g;

export interface PhonemesToTextOptions {
  hamza?: 'smart' | 'ء' | string;
  keepLam?: 'smart' | boolean;
}

/**
 * Converts a sequence or string of phonemes into legible Arabic text.
 */
export function phonemesToText(
  tokens: string | string[],
  options: PhonemesToTextOptions = {}
): string {
  const { hamza = 'smart', keepLam = 'smart' } = options;

  let s = Array.isArray(tokens) ? tokens.join('') : String(tokens);
  if (!s || s.trim().length === 0) return '';

  // 1. Map special Quranic phonetic letter forms to base graphemes
  s = s.replace(/[ٲںۥۦ]/g, (ch) => LETTER_MAP[ch] ?? ch);

  // 2. Strip pronunciation annotation markers
  s = s.replace(STRIP_MARKS, '');

  // 3. Smart Hamza normalization
  if (hamza === 'smart') {
    s = s.replace(/(?<!ا)ء(?!ا)/g, 'ا');
  } else if (hamza !== 'ء') {
    s = s.replace(/ء/g, hamza);
  }

  // 4. Collapse elongation runs and manage geminated lams
  if (keepLam === 'smart') {
    s = s.replace(/ل{2,}(?!ا)/g, 'ل');
    s = s.replace(/ل{3,}(?=ا)/g, 'لل');
    s = s.replace(/(?!ل)(.)\1+/g, '$1');
  } else if (keepLam === true) {
    s = s.replace(/(?!ل)(.)\1+/g, '$1').replace(/ل{2,}/g, 'لل');
  } else {
    s = s.replace(/(.)\1+/g, '$1');
  }

  return s.trim();
}

/**
 * Formats the detected phoneme sequence of a single word into human-readable Arabic text.
 * Returns null if no phonemes were detected (e.g. omission).
 */
export function formatDetectedWord(detectedPhonemes: string | undefined): string | null {
  if (!detectedPhonemes || detectedPhonemes.trim().length === 0) {
    return null;
  }
  const converted = phonemesToText(detectedPhonemes);
  return converted.length > 0 ? converted : null;
}
