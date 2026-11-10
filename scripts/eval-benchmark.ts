#!/usr/bin/env npx tsx
/**
 * Evaluates the Zipformer phoneme model on Quran-Lab/quranic-asr-benchmark.
 *
 * Produces hyps.jsonl ({id, text} per clip) compatible with the official
 * score.py, plus provisional metrics:
 *  - CER (standard + alef-insensitive, space-free) vs benchmark reference_text.
 *    NOTE: phoneme→text conversion has a documented ~8% alef-insensitive floor
 *    (shamsi assimilation, alef-maqsura, hamzat-wasl, muqatta'at letter names)
 *    measured by scripts/calibrate-phoneme-text.mjs — treat CER as an upper bound.
 *  - PER (native, exact) via the alignment engine, for clips whose id maps to a
 *    canonical ayah key (everyayah/qul clean recitations; NOT meaningful for tlog
 *    where real user mistakes are part of the audio).
 *
 * Usage:
 *   npx tsx scripts/eval-benchmark.ts [--data eval/quranic-asr-benchmark]
 *     [--beam] [--limit N] [--outDir eval/quranic-asr-benchmark/runs/<name>]
 *   npx tsx scripts/eval-benchmark.ts --fixtures   # sanity run on local fixtures
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PhonemeAlignmentEngine, StreamingPhonemeToken } from '../src/alignment';
import { phonemesToText, cer } from './phoneme-to-text.mjs';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sherpa = require('sherpa-onnx');

const root = path.resolve(__dirname, '..');

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const hasFlag = (name: string) => process.argv.includes(name);

interface BenchRow {
  id: string;
  source: string;
  reference_text: string;
  audio: string;
}

function decode(wavPath: string, beam: boolean): StreamingPhonemeToken[] {
  const wave = sherpa.readWave(wavPath);
  if (wave.sampleRate !== 16000) {
    throw new Error(`${wavPath}: expected 16kHz, got ${wave.sampleRate}`);
  }
  const recognizer = sherpa.createOnlineRecognizer({
    modelConfig: {
      zipformer2Ctc: {
        model: path.join(root, 'models', 'zipformer_p_arabic_v3.2.int8.onnx'),
      },
      tokens: path.join(root, 'models', 'tokens.txt'),
      numThreads: 2,
      provider: 'cpu',
      debug: 0,
    },
    featConfig: { sampleRate: 16000, featureDim: 80 },
    decodingMethod: beam ? 'modified_beam_search' : 'greedy_search',
    maxActivePaths: 4,
  });
  const stream = recognizer.createStream();
  stream.acceptWaveform(16000, wave.samples);
  while (recognizer.isReady(stream)) {
    recognizer.decode(stream);
  }
  const res = recognizer.getResult(stream);
  const tokens: StreamingPhonemeToken[] = res.tokens.map((t: string, i: number) => ({
    token: t,
    index: i,
    timestampMs: Math.round(((res.timestamps && res.timestamps[i]) ?? 0) * 1000),
  }));
  stream.free();
  recognizer.free();
  return tokens;
}

/** everyayah/qul ids embed the ayah key, e.g. "qul_alnufais/37_43" → 37:43 */
function ayahKeyFromId(id: string): string | undefined {
  const m = id.match(/(\d{1,3})[_:](\d{1,3})/);
  return m ? `${Number(m[1])}:${Number(m[2])}` : undefined;
}

async function main() {
  const engine = new PhonemeAlignmentEngine();
  await engine.initialize();
  const beam = hasFlag('--beam');

  let rows: BenchRow[];
  let dataDir: string;
  if (hasFlag('--fixtures')) {
    dataDir = root;
    rows = [
      { id: 'fixtures/1_1', source: 'fixtures', reference_text: engine.getAyahReference('1:1')!.aya_text, audio: 'fixtures/001001_16k.wav' },
      { id: 'fixtures/112_1', source: 'fixtures', reference_text: engine.getAyahReference('112:1')!.aya_text, audio: 'fixtures/112001_16k.wav' },
    ];
  } else {
    dataDir = path.resolve(root, arg('--data', 'eval/quranic-asr-benchmark')!);
    const jsonlPath = path.join(dataDir, 'benchmark.jsonl');
    if (!fs.existsSync(jsonlPath) || fs.statSync(jsonlPath).size < 1000) {
      console.error(`benchmark.jsonl missing or gated at ${jsonlPath} — download the dataset first (needs HF access).`);
      process.exit(1);
    }
    rows = fs.readFileSync(jsonlPath, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }

  const limit = Number(arg('--limit', '0')) || rows.length;
  rows = rows.slice(0, limit);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.resolve(root, arg('--outDir', `eval/quranic-asr-benchmark/runs/${stamp}${beam ? '-beam' : '-greedy'}`)!);
  fs.mkdirSync(outDir, { recursive: true });
  const hypsPath = path.join(outDir, 'hyps.jsonl');
  const hypsStream = fs.createWriteStream(hypsPath);

  interface Accum { n: number; cerSum: number; cerAISum: number; perSum: number; perN: number; empty: number; }
  const bySource = new Map<string, Accum>();
  const acc = (): Accum => ({ n: 0, cerSum: 0, cerAISum: 0, perSum: 0, perN: 0, empty: 0 });
  const overall = acc();
  const t0 = performance.now();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const wavPath = path.join(dataDir, row.audio);
    let tokens: StreamingPhonemeToken[] = [];
    let decodeError: string | undefined;
    try {
      tokens = decode(wavPath, beam);
    } catch (e) {
      decodeError = e instanceof Error ? e.message : String(e);
    }
    const text = phonemesToText(tokens.map((t) => t.token));
    hypsStream.write(JSON.stringify({ id: row.id, text, ...(decodeError ? { decodeError } : {}) }) + '\n');

    const c = cer(text, row.reference_text);
    const cAI = cer(text, row.reference_text, { alefInsensitive: true });
    let per: number | undefined;
    const key = ayahKeyFromId(row.id);
    if (row.source !== 'tlog_holdout' && key && engine.getAyahReference(key)) {
      per = engine.alignAyah(key, tokens).per;
    }

    for (const a of [overall, bySource.get(row.source) ?? (bySource.set(row.source, acc()), bySource.get(row.source)!)]) {
      a.n++;
      a.cerSum += c;
      a.cerAISum += cAI;
      if (per !== undefined) { a.perSum += per; a.perN++; }
      if (tokens.length === 0) a.empty++;
    }
    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(0);
      console.log(`[${i + 1}/${rows.length}] ${elapsed}s  CER-AI mean ${(100 * overall.cerAISum / overall.n).toFixed(2)}%`);
    }
  }
  hypsStream.end();
  await new Promise<void>((r) => hypsStream.on('finish', () => r()));

  const fmt = (a: Accum) => ({
    clips: a.n,
    cer: +(100 * a.cerSum / a.n).toFixed(2),
    cerAlefInsensitive: +(100 * a.cerAISum / a.n).toFixed(2),
    per: a.perN ? +(100 * a.perSum / a.perN).toFixed(2) : null,
    perClips: a.perN,
    emptyDecodes: a.empty,
  });
  const summary = {
    model: 'zipformer_p_arabic_v3.1.int8 (labeled v3.2)',
    decoding: beam ? 'modified_beam_search' : 'greedy_search',
    conversionFloorCerAI: 8.21,
    overall: fmt(overall),
    bySource: Object.fromEntries([...bySource.entries()].map(([s, a]) => [s, fmt(a)])),
    elapsedSec: +((performance.now() - t0) / 1000).toFixed(1),
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nhyps: ${hypsPath}\nsummary: ${path.join(outDir, 'summary.json')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });