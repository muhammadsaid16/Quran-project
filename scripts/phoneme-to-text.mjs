/**
 * Phoneme-token stream → graphemic Arabic text, for WER/CER scoring against
 * text references (Quran-Lab quranic-asr-benchmark).
 *
 * The Zipformer phoneme model emits units like بِسمِ للَااهِ ررَحِۦۦۦۦم —
 * phonetic symbols (qalqalah ڇ, madd ۥ/ۦ, ghunnah runs, gemination) that have
 * no direct graphemic equivalent. Rules are calibrated on the canonical
 * 6,236-ayah corpus via scripts/calibrate-phoneme-text.mjs.
 */

// Special letter forms → their plain graphemic base.
// Must run BEFORE mark stripping: ۥ/ۦ live inside the annotation-signs range.
const LETTER_MAP = {
  'ٲ': 'ا', // ٲ alef with wavy hamza
  'ں': 'ن', // ں noon ghunna
  'ۥ': 'و', // ۥ small waw (madd of oo)
  'ۦ': 'ي', // ۦ small yeh (madd of ee)
};

// Phonetic markers with no graphemic counterpart:
// harakat 064B-065F + dagger alef 0670, annotation signs 06D6-06DC/06DF-06E8/06EA-06ED,
// ؙ (0619), ڇ qalqalah marker (0687), ۾ sakt marker (06FE), tatweel (0640)
const STRIP_MARKS = /[ً-ٰٟۖ-ۜ۟-۪ۨ-ؙۭڇ۾ـ]/g;

export function phonemesToText(tokens, { hamza = 'smart', keepLam = 'smart' } = {}) {
  let s = Array.isArray(tokens) ? tokens.join('') : String(tokens);
  s = s.replace(/[ٲںۥۦ]/g, (ch) => LETTER_MAP[ch] ?? ch);
  s = s.replace(STRIP_MARKS, '');
  // Hamza: ء adjacent to alef (ءامن، شاء) keeps the graphemic ء; hamza
  // carried on alef (أحد، الحمد) becomes ا, matching أ→ا normalization.
  if (hamza === 'smart') {
    s = s.replace(/(?<!ا)ء(?!ا)/g, 'ا');
  } else if (hamza !== 'ء') {
    s = s.replace(/ء/g, hamza);
  }
  // Collapse madd/gemination/ghunnah runs: اااا→ا, رر→ر, نننن→ن ...
  if (keepLam === 'smart') {
    // لل before alef = two graphemic lams (الله، لِ+الـ); لل before a
    // consonant = shadda on one lam (الّذي، الّذين).
    s = s.replace(/ل{2,}(?!ا)/g, 'ل');
    s = s.replace(/ل{3,}(?=ا)/g, 'لل');
    s = s.replace(/(?!ل)(.)\1+/g, '$1');
  } else if (keepLam === true) {
    s = s.replace(/(?!ل)(.)\1+/g, '$1').replace(/ل{2,}/g, 'لل');
  } else {
    s = s.replace(/(.)\1+/g, '$1');
  }
  return s;
}

/**
 * Benchmark-style text normalization (README of Quran-Lab/quranic-asr-benchmark):
 * combining marks + Quranic annotation signs + tatweel stripped; hamza forms
 * and alef-maqsura unified. `alefInsensitive` additionally strips alef.
 * Exact score.py is gated; this mirrors the documented rules and the runner's
 * hyps.jsonl output is re-scorable by the official scorer.
 */
export function normalizeText(text, { alefInsensitive = false } = {}) {
  let s = String(text);
  s = s.replace(/[ً-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g, '');
  s = s.replace(/[أإآٱ]/g, 'ا');
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/ؤ/g, 'و');
  s = s.replace(/ئ/g, 'ي');
  if (alefInsensitive) {
    s = s.replace(/ا/g, '');
  }
  return s;
}

/** Levenshtein distance (iterative DP, O(min(m,n)) memory) */
export function editDistance(a, b) {
  if (a === b) return 0;
  const aSeq = Array.isArray(a) ? a : Array.from(a);
  const bSeq = Array.isArray(b) ? b : Array.from(b);
  if (aSeq.length < bSeq.length) return editDistance(bSeq, aSeq);
  let prev = Array.from({ length: bSeq.length + 1 }, (_, i) => i);
  for (let i = 1; i <= aSeq.length; i++) {
    const curr = [i];
    for (let j = 1; j <= bSeq.length; j++) {
      const cost = aSeq[i - 1] === bSeq[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[bSeq.length];
}

export function cer(hyp, ref, opts) {
  const h = normalizeText(hyp, opts);
  const r = normalizeText(ref, opts);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  return editDistance(Array.from(h), Array.from(r)) / r.length;
}