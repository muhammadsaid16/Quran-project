/**
 * Quran Cognitive OS v2.0 — Phoneme Vocabulary & Tajweed Distance Metric
 * Provides tokenization and phonetic distance metrics tailored for
 * Zipformer 3.2 CTC 251-unit phoneme vocabulary and canonical Quran Tajweed rules.
 */

export const ZIPFORMER_TOKENS: readonly string[] = [
  "<blank>","ؙ","ء","ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ـ","ف","ق","ك","ل","م","ن","ه","و","ي","َ","ُ","ِ","ٲ","ڇ","ں","ۜ","ۥ","ۦ","۪","۾","ءَ","ءُ","ءِ","اا","بَ","بُ","بِ","بڇ","تت","تَ","تُ","تِ","ثَ","ثُ","ثِ","جَ","جُ","جِ","جڇ","حح","حَ","حُ","حِ","خَ","خُ","خِ","دَ","دُ","دِ","دڇ","ذَ","ذُ","ذِ","رر","رَ","رُ","رِ","ر۪","زَ","زُ","زِ","سس","سَ","سُ","سِ","شَ","شُ","شِ","صَ","صُ","صِ","ضَ","ضُ","ضِ","طَ","طُ","طِ","طڇ","ظَ","ظُ","ظِ","عَ","عُ","عِ","غَ","غُ","غِ","ــ","فف","فَ","فُ","فِ","قَ","قُ","قِ","قڇ","كك","كَ","كُ","كِ","لل","لَ","لُ","لِ","لۜ","مَ","مُ","مِ","نؙ","نَ","نُ","نِ","نۜ","هَ","هُ","هِ","وو","وَ","وُ","وِ","يي","يَ","يُ","يِ","ۥۥ","ۦۦ","ااۜ","ببَ","ببُ","ببِ","ببڇ","تتَ","تتُ","تتِ","ثثَ","ثثُ","ثثِ","ججَ","ججُ","ججِ","ججڇ","ححَ","ححِ","خخَ","خخِ","ددَ","ددُ","ددِ","ددڇ","ذذَ","ذذُ","ذذِ","ررَ","ررُ","ررِ","ززَ","ززُ","ززِ","سسَ","سسُ","سسِ","ششَ","ششُ","ششِ","صصَ","صصُ","صصِ","ضضَ","ضضُ","ضضِ","ططَ","ططُ","ططِ","ظظَ","ظظُ","ظظِ","ععَ","ععُ","ععِ","ففَ","ففُ","ففِ","ققَ","ققُ","ققِ","ققڇ","ككَ","ككُ","ككِ","للَ","للُ","للِ","ممم","ننن","ههَ","ههُ","ههِ","ووو","ووَ","ووُ","ووِ","ييي","ييَ","ييُ","ييِ","ںںں","۾۾۾","اااا","وووَ","وووُ","وووِ","يييَ","يييُ","ۥۥۥۥ","ۦۦۦۦ","ااااا","ممممَ","ممممُ","ممممِ","ننننَ","ننننُ","ننننِ","ييييي","ۥۥۥۥۥ","ۦۦۦۦۦ","اااااا","ۥۥۥۥۥۥ","ۦۦۦۦۦۦ"
];

const VOCAB_SET = new Set<string>(ZIPFORMER_TOKENS.filter((t) => t !== '<blank>'));

// Emphatic and similar articulation point pairs (Makharij)
const SIMILAR_ARTICULATION_PAIRS: ReadonlyMap<string, Set<string>> = new Map([
  ['ت', new Set(['ط', 'د'])],
  ['ط', new Set(['ت', 'د'])],
  ['د', new Set(['ت', 'ط', 'ض'])],
  ['ض', new Set(['د', 'ظ'])],
  ['س', new Set(['ص', 'ز', 'ث'])],
  ['ص', new Set(['س', 'ز'])],
  ['ز', new Set(['س', 'ص', 'ذ'])],
  ['ذ', new Set(['ظ', 'ز', 'ث'])],
  ['ظ', new Set(['ذ', 'ض', 'ط'])],
  ['ث', new Set(['ذ', 'س'])],
  ['ح', new Set(['ه', 'خ'])],
  ['ه', new Set(['ح', 'ء'])],
  ['ع', new Set(['ء', 'غ', 'ح'])],
  ['ء', new Set(['ع', 'ه', 'ا'])],
  ['ق', new Set(['ك', 'غ'])],
  ['ك', new Set(['ق'])],
]);

export class PhonemeVocabulary {
  /**
   * Tokenizes a reference or hypothesis phoneme string into tokens matching
   * the Zipformer CTC vocabulary via longest-prefix matching.
   */
  public static tokenize(phonemeStr: string): string[] {
    if (!phonemeStr) return [];
    // Tokenize word-by-word to preserve phonetic word boundary integrity
    const words = phonemeStr.trim().split(/\s+/);
    const tokens: string[] = [];

    for (const word of words) {
      if (!word) continue;
      let i = 0;
      while (i < word.length) {
        let matched = '';
        const maxWindow = Math.min(10, word.length - i);

        for (let len = maxWindow; len >= 1; len--) {
          const candidate = word.slice(i, i + len);
          if (VOCAB_SET.has(candidate)) {
            matched = candidate;
            break;
          }
        }

        if (matched) {
          tokens.push(matched);
          i += matched.length;
        } else {
          // Fallback to single character if unrepresented
          tokens.push(word[i]);
          i++;
        }
      }
    }

    return tokens;
  }

  /**
   * Extracts the primary consonant base from a phoneme token (ignoring shaddah / diacritics / madd).
   */
  public static getBaseConsonant(token: string): string {
    const stripped = token.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06EDۦۥڇں۾ؙ۪ۜٲـ]/g, '');
    return stripped[0] || token[0] || '';
  }

  /**
   * Checks whether two tokens are Madd variants (elongations of the same vowel).
   * E.g. 'اا' vs 'اااا' vs 'اااااا', or 'ۥۥ' vs 'ۥۥۥۥ', or 'ۦۦ' vs 'ۦۦۦۦ'.
   */
  public static isMaddVariant(a: string, b: string): boolean {
    const isAlifA = /^ا+$/.test(a);
    const isAlifB = /^ا+$/.test(b);
    if (isAlifA && isAlifB) return true;

    const isWawA = /^[وۥ]+$/.test(a);
    const isWawB = /^[وۥ]+$/.test(b);
    if (isWawA && isWawB) return true;

    const isYaaA = /^[يۦ]+$/.test(a);
    const isYaaB = /^[يۦ]+$/.test(b);
    if (isYaaA && isYaaB) return true;

    return false;
  }

  /**
   * Checks whether two tokens are Nasalization (Ghunnah / Tanween) variants.
   * E.g. 'ںںں' vs 'ن', '۾۾۾' vs 'م', 'نَ' vs 'ں'.
   */
  public static isGhunnahVariant(a: string, b: string): boolean {
    const isNoonA = a.includes('ں') || a.includes('ن');
    const isNoonB = b.includes('ں') || b.includes('ن');
    if (isNoonA && isNoonB) return true;

    const isMeemA = a.includes('۾') || a.includes('م');
    const isMeemB = b.includes('۾') || b.includes('م');
    if (isMeemA && isMeemB) return true;

    return false;
  }

  /**
   * Checks whether two tokens differ only by a Qalqalah marker ('ڇ').
   * E.g. 'دڇ' vs 'د', 'قڇ' vs 'ق'.
   */
  public static isQalqalahVariant(a: string, b: string): boolean {
    const cleanA = a.replace(/ڇ/g, '');
    const cleanB = b.replace(/ڇ/g, '');
    return cleanA === cleanB && cleanA.length > 0;
  }

  /**
   * Computes phonetic distance between two tokens, taking Tajweed rules and
   * Arabic articulatory phonetics into account.
   * Returns:
   *  0.0: Exact match
   *  0.15: Madd duration variance (allowed under varying recitation speeds)
   *  0.20: Qalqalah or Ghunnah assimilation variance
   *  0.30: Diacritic / Harakah variance on identical consonant base
   *  0.50: Similar articulation point (Makhraj) substitution (e.g. ت vs ط, س vs ص)
   *  1.0: Full phonetic mismatch / substitution
   */
  public static getPhonemeDistance(a: string, b: string): number {
    if (a === b) return 0.0;

    // 1. Madd variant
    if (this.isMaddVariant(a, b)) {
      return 0.15;
    }

    // 2. Qalqalah variant
    if (this.isQalqalahVariant(a, b)) {
      return 0.20;
    }

    // 3. Ghunnah / Assimilation variant
    if (this.isGhunnahVariant(a, b)) {
      return 0.20;
    }

    // 4. Same base consonant, different diacritic/harakah
    const baseA = this.getBaseConsonant(a);
    const baseB = this.getBaseConsonant(b);
    if (baseA && baseB && baseA === baseB) {
      return 0.30;
    }

    // 5. Similar articulation points
    if (baseA && baseB && SIMILAR_ARTICULATION_PAIRS.get(baseA)?.has(baseB)) {
      return 0.50;
    }

    // 6. Generic substitution
    return 1.0;
  }
}
