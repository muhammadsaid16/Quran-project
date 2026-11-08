import * as fs from 'node:fs';
import * as path from 'node:path';
import { PhonemeErrorRateCalculator } from './phoneme-error-rate.ts';
import { RecitationErrorClassifier } from './error-classifier.ts';
import { AcousticBenchmarkSuite } from './acoustic-benchmarks.ts';

export interface AudioBenchmarkReport {
  suiteName: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  findings: string[];
  executionTimeMs: number;
}

export function runAudioRecognitionBenchmarkTests(projectRoot: string): AudioBenchmarkReport {
  const startTime = Date.now();
  const findings: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  function assertCheck(name: string, condition: boolean, detail?: string) {
    totalChecks++;
    if (condition) {
      passedChecks++;
    } else {
      failedChecks++;
      findings.push(`[AUDIO BENCHMARK FAILURE] ${name}: ${detail || 'Assertion failed'}`);
    }
  }

  // 1. Unit Verification of Phoneme Error Rate (PER) Mathematics
  const refTokens = ['ب', 'ِ', 'س', 'م', 'ِ', 'ل', 'ل', 'َ', 'ا', 'ه', 'ِ']; // "بِسمِ للَاهِ"
  const perfectHyp = [...refTokens];
  const perfectMetrics = PhonemeErrorRateCalculator.calculate(refTokens, perfectHyp);
  assertCheck('PER on identical sequence is exactly 0.0', perfectMetrics.per === 0.0, `Got PER: ${perfectMetrics.per}`);
  assertCheck('Accuracy on identical sequence is 1.0', perfectMetrics.accuracy === 1.0);
  assertCheck('Matches count equals reference length', perfectMetrics.matches === refTokens.length);

  // Single Substitution: replace 'س' with 'ص'
  const subHyp = ['ب', 'ِ', 'ص', 'م', 'ِ', 'ل', 'ل', 'َ', 'ا', 'ه', 'ِ'];
  const subMetrics = PhonemeErrorRateCalculator.calculate(refTokens, subHyp);
  assertCheck('Single substitution gives S=1, D=0, I=0', subMetrics.substitutions === 1 && subMetrics.deletions === 0 && subMetrics.insertions === 0);
  const expectedSubPER = Math.round((1 / refTokens.length) * 10000) / 10000;
  assertCheck('Single substitution calculates exact PER ratio', subMetrics.per === expectedSubPER, `Expected ${expectedSubPER}, got ${subMetrics.per}`);

  // Single Omission (Deletion): omit 'س'
  const omitHyp = ['ب', 'ِ', 'م', 'ِ', 'ل', 'ل', 'َ', 'ا', 'ه', 'ِ'];
  const omitMetrics = PhonemeErrorRateCalculator.calculate(refTokens, omitHyp);
  assertCheck('Single omission gives D=1, S=0, I=0', omitMetrics.deletions === 1 && omitMetrics.substitutions === 0 && omitMetrics.insertions === 0);

  // Single Insertion: insert 'ء'
  const insHyp = ['ب', 'ِ', 'ء', 'س', 'م', 'ِ', 'ل', 'ل', 'َ', 'ا', 'ه', 'ِ'];
  const insMetrics = PhonemeErrorRateCalculator.calculate(refTokens, insHyp);
  assertCheck('Single insertion gives I=1, S=0, D=0', insMetrics.insertions === 1 && insMetrics.substitutions === 0 && insMetrics.deletions === 0);

  // 2. Real Canonical Quran Verse Alignment (Surah 1:1)
  const phonemesPath = path.join(projectRoot, 'models', 'ordered_quran_phonemes.json');
  if (fs.existsSync(phonemesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(phonemesPath, 'utf-8'));
      const fatihah1 = data['1:1'];
      const canonicalPhonemeStr = fatihah1.aya_phoneme;
      const canonicalTokens = PhonemeErrorRateCalculator.tokenize(canonicalPhonemeStr);

      assertCheck('Tokenize Al-Fatihah 1:1 produces valid phoneme token stream', canonicalTokens.length > 15, `Length: ${canonicalTokens.length}`);

      // 3. Error Classification Suite Verification
      // Scenario A: Correct
      const resCorrect = RecitationErrorClassifier.classify(canonicalTokens, canonicalTokens, 0.95);
      assertCheck('Flawless recitation classified as "Correct"', resCorrect.primaryCategory === 'Correct');

      // Scenario B: Omission (omitting first 3 tokens)
      const omittedTokens = canonicalTokens.slice(3);
      const resOmission = RecitationErrorClassifier.classify(canonicalTokens, omittedTokens, 0.95);
      assertCheck('Skipped opening tokens classified as "Omission"', resOmission.primaryCategory === 'Omission');
      assertCheck('Omission detected in allCategories', resOmission.allCategories.includes('Omission'));

      // Scenario C: Substitution (changing tokens)
      const substitutedTokens = [...canonicalTokens];
      substitutedTokens[0] = 'ت';
      substitutedTokens[1] = 'َ';
      const resSub = RecitationErrorClassifier.classify(canonicalTokens, substitutedTokens, 0.90);
      assertCheck('Replaced phonemes classified as "Substitution"', resSub.allCategories.includes('Substitution'));

      // Scenario D: Repetition (stumbling and repeating initial phrase)
      const stutterOpening = canonicalTokens.slice(0, 5);
      const repetitionTokens = [...stutterOpening, ...canonicalTokens];
      const resRep = RecitationErrorClassifier.classify(canonicalTokens, repetitionTokens, 0.90);
      assertCheck('Stuttering repetition classified as "Repetition"', resRep.allCategories.includes('Repetition'));

      // Scenario E: Sequence Error (reciting 1:2 instead of 1:1)
      const resSeq = RecitationErrorClassifier.classify(canonicalTokens, canonicalTokens, 0.95, {
        targetAyahKey: '1:1',
        recitedAyahKeyCandidate: '1:2',
      });
      assertCheck('Verse transposition classified as "Sequence Error"', resSeq.primaryCategory === 'Sequence Error');

      // Scenario F: Uncertain (low acoustic confidence)
      const resUncertain = RecitationErrorClassifier.classify(canonicalTokens, canonicalTokens, 0.40);
      assertCheck('Low acoustic score (< 0.50) classified as "Uncertain"', resUncertain.primaryCategory === 'Uncertain');

      // 4. Acoustic Benchmark Matrix Evaluation (Speeds + Noise + Mic degradation)
      const matrixResults = AcousticBenchmarkSuite.evaluateMatrix(canonicalTokens);
      for (const res of matrixResults) {
        assertCheck(
          `Matrix Benchmark [${res.scenario.speed} / ${res.scenario.noise} / ${res.scenario.mic}]`,
          res.passed,
          res.notes
        );
        findings.push(`[BENCHMARK] ${res.scenario.speed} + ${res.scenario.noise} + ${res.scenario.mic}: ${res.notes}`);
      }
    } catch (err: unknown) {
      assertCheck('Audio benchmark dataset parsing', false, String(err));
    }
  } else {
    assertCheck('models/ordered_quran_phonemes.json exists for audio benchmarks', false);
  }

  const executionTimeMs = Date.now() - startTime;
  return {
    suiteName: 'Speech Recognition Benchmarks & Phoneme Alignment Test Matrix',
    totalChecks,
    passedChecks,
    failedChecks,
    findings,
    executionTimeMs,
  };
}
