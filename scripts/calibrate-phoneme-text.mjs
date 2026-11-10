#!/usr/bin/env node
/**
 * Calibrates phonemesToText against the canonical corpus: converts every
 * aya_phoneme string back to text and measures CER against aya_text under
 * benchmark normalization. A near-zero CER here means the converter is
 * trustworthy for scoring real decodes on the benchmark.
 *
 * Runs a rule grid (hamza mapping × lam-gemination handling) and reports the
 * best combo plus its worst ayahs. CER is computed space-free (the model's
 * decode stream carries no word boundaries).
 *
 * Usage: node scripts/calibrate-phoneme-text.mjs [--worst N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { phonemesToText, normalizeText, editDistance } from './phoneme-to-text.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'models', 'ordered_quran_phonemes.json'), 'utf-8'));

const worstN = (() => {
  const i = process.argv.indexOf('--worst');
  return i >= 0 ? Number(process.argv[i + 1]) : 15;
})();

const entries = Object.entries(data);
const noSpace = (s) => s.replace(/\s+/g, '');

function evaluate(opts) {
  let edits = 0;
  let refChars = 0;
  let editsAI = 0;
  let refCharsAI = 0;
  let perfectAI = 0;
  const worst = [];
  for (const [key, val] of entries) {
    const hyp = phonemesToText(val.aya_phoneme, opts);
    const h = noSpace(normalizeText(hyp));
    const r = noSpace(normalizeText(val.aya_text));
    const d = editDistance(Array.from(h), Array.from(r));
    edits += d;
    refChars += r.length;

    const hAI = noSpace(normalizeText(hyp, { alefInsensitive: true }));
    const rAI = noSpace(normalizeText(val.aya_text, { alefInsensitive: true }));
    const dAI = editDistance(Array.from(hAI), Array.from(rAI));
    editsAI += dAI;
    refCharsAI += rAI.length;
    if (dAI === 0) perfectAI++;
    if (dAI > 0) worst.push({ key, rate: dAI / Math.max(1, rAI.length), dAI, hyp: hAI, ref: rAI });
  }
  worst.sort((a, b) => b.rate - a.rate || b.dAI - a.dAI);
  return {
    cer: edits / refChars,
    cerAI: editsAI / refCharsAI,
    perfectAI,
    worst,
  };
}

const results = [];
for (const hamza of ['smart', 'ا', 'ء', '']) {
  for (const keepLam of ['smart', true, false]) {
    const r = evaluate({ hamza, keepLam });
    results.push({ opts: { hamza, keepLam }, ...r });
  }
}
results.sort((a, b) => a.cerAI - b.cerAI);

console.log(`ayahs: ${entries.length}\n`);
console.log('hamza→ | keepLam | CER std | CER alef-insens | perfect ayahs (AI)');
for (const r of results) {
  const hz = r.opts.hamza === '' ? '(strip)' : r.opts.hamza;
  console.log(
    `  ${hz.padEnd(6)} | ${String(r.opts.keepLam).padEnd(7)} | ${(100 * r.cer).toFixed(3).padStart(7)}% | ${(100 * r.cerAI).toFixed(3).padStart(14)}% | ${r.perfectAI} (${(100 * r.perfectAI / entries.length).toFixed(1)}%)`
  );
}

const best = results[0];
console.log(`\nbest: ${JSON.stringify(best.opts)} — worst ${worstN} (alef-insensitive):`);
for (const w of best.worst.slice(0, worstN)) {
  console.log(`  ${w.key}  edits=${w.dAI} rate=${(100 * w.rate).toFixed(1)}%`);
  console.log(`    hyp: ${w.hyp}`);
  console.log(`    ref: ${w.ref}`);
}