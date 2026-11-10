#!/usr/bin/env npx tsx
/**
 * Benchmark & Comparison Script: FastConformer-Quran (87MB Mixed ONNX) vs Zipformer v3.1
 * Evaluates execution latency, transcribed text, and Tashkeel accuracy on local fixtures.
 */
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sherpa = require('sherpa-onnx');

const root = path.resolve(__dirname, '..');

import { execSync } from 'node:child_process';

interface TestClip {
  id: string;
  wav: string;
  reference: string;
}

let clips: TestClip[] = [
  {
    id: '1:1 (Al-Fatiha)',
    wav: path.join(root, 'fixtures', '001001_16k.wav'),
    reference: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  },
  {
    id: '112:1 (Al-Ikhlas)',
    wav: path.join(root, 'fixtures', '112001_16k.wav'),
    reference: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
  },
];

const customFileArg = process.argv.find((a, i) => i >= 2 && !a.startsWith('-'));
const recordIndex = process.argv.indexOf('--record');

if (recordIndex !== -1) {
  const seconds = Number(process.argv[recordIndex + 1]) || 5;
  const tempWav = '/tmp/quran_test_mic.wav';
  console.log(`\n🎙️  جاري تسجيل ${seconds} ثوانٍ من المايكروفون... اقرأ الآن!`);
  try {
    execSync(`arecord -f S16_LE -r 16000 -c 1 -d ${seconds} "${tempWav}" 2>/dev/null || ffmpeg -y -f alsa -i default -t ${seconds} -ar 16000 -ac 1 "${tempWav}" 2>/dev/null`);
    console.log(`✓ تم التسجيل بنجاح! جاري التحليل...\n`);
    clips = [{
      id: `Live Mic Recording (${seconds}s)`,
      wav: tempWav,
      reference: 'تلاوة حية من المايكروفون',
    }];
  } catch (err) {
    console.error('فشل التسجيل الصوتي المباشر:', err);
  }
} else if (customFileArg) {
  clips = [{
    id: `Custom Audio File: ${path.basename(customFileArg)}`,
    wav: path.resolve(process.cwd(), customFileArg),
    reference: '(ملف خارجي)',
  }];
}

function initFastConformer() {
  const modelPath = path.join(root, 'models', 'fastconformer', 'qurankarim-fastconformer-mixed.onnx');
  const tokensPath = path.join(root, 'models', 'fastconformer', 'tokens.txt');

  return sherpa.createOfflineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      nemoCtc: {
        model: modelPath,
      },
      tokens: tokensPath,
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
    },
  });
}

function initZipformer() {
  const modelPath = path.join(root, 'models', 'zipformer_p_arabic_v3.2.int8.onnx');
  const tokensPath = path.join(root, 'models', 'tokens.txt');

  return sherpa.createOnlineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      zipformer2Ctc: {
        model: modelPath,
      },
      tokens: tokensPath,
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
    },
    decodingMethod: 'greedy_search',
    enableEndpoint: 0,
  });
}

function normalizeArabic(text: string): string {
  return text
    .replace(/[ًٌٍَُِّْـٰ]/g, '') // remove harakat/tashkeel
    .replace(/[إأآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('================================================================');
  console.log('   FastConformer-Quran (87MB) vs Zipformer Quran Benchmark      ');
  console.log('================================================================\n');

  console.log('Initializing FastConformer-Quran (Offline NeMo CTC)...');
  const tFastInit0 = Date.now();
  const fastRecognizer = initFastConformer();
  const fastInitTime = Date.now() - tFastInit0;
  console.log(`✓ FastConformer initialized in ${fastInitTime}ms\n`);

  console.log('Initializing Zipformer Quran (Online CTC)...');
  const tZipInit0 = Date.now();
  const zipRecognizer = initZipformer();
  const zipInitTime = Date.now() - tZipInit0;
  console.log(`✓ Zipformer initialized in ${zipInitTime}ms\n`);

  console.log('----------------------------------------------------------------');

  for (const clip of clips) {
    console.log(`\n▶ Testing Clip: ${clip.id}`);
    console.log(`  Reference (Uthmani): ${clip.reference}`);

    const wave = sherpa.readWave(clip.wav);
    const durationSec = (wave.samples.length / wave.sampleRate).toFixed(2);
    console.log(`  Audio Duration: ${durationSec}s (${wave.samples.length} samples @ 16kHz)`);

    // 1. FastConformer Decode
    const tFast0 = Date.now();
    const fastStream = fastRecognizer.createStream();
    fastStream.acceptWaveform(16000, wave.samples);
    fastRecognizer.decode(fastStream);
    const fastResult = fastRecognizer.getResult(fastStream);
    const fastTimeMs = Date.now() - tFast0;
    const fastRtf = (fastTimeMs / (Number(durationSec) * 1000)).toFixed(3);

    console.log('\n  [FastConformer-Quran Output]:');
    console.log(`    Decoded Text : "${fastResult.text}"`);
    console.log(`    Token Count  : ${fastResult.tokens.length}`);
    console.log(`    Latency      : ${fastTimeMs}ms (RTF: ${fastRtf}x)`);

    const refNorm = normalizeArabic(clip.reference);
    const fastNorm = normalizeArabic(fastResult.text);
    const match = refNorm === fastNorm ? '✓ EXACT MATCH' : '✗ MISMATCH';
    console.log(`    Word Match   : ${match}`);

    // 2. Zipformer Decode
    const tZip0 = Date.now();
    const zipStream = zipRecognizer.createStream();
    zipStream.acceptWaveform(16000, wave.samples);
    while (zipRecognizer.isReady(zipStream)) {
      zipRecognizer.decode(zipStream);
    }
    const zipResult = zipRecognizer.getResult(zipStream);
    const zipTimeMs = Date.now() - tZip0;
    const zipRtf = (zipTimeMs / (Number(durationSec) * 1000)).toFixed(3);

    console.log('\n  [Zipformer Quran v3.1 Output]:');
    console.log(`    Raw Phonemes : ${zipResult.tokens.join(' ')}`);
    console.log(`    Token Count  : ${zipResult.tokens.length}`);
    console.log(`    Latency      : ${zipTimeMs}ms (RTF: ${zipRtf}x)`);
    console.log('----------------------------------------------------------------');
  }

  console.log('\n================================================================');
  console.log('Benchmark completed successfully.');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
