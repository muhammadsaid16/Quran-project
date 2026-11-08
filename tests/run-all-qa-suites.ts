import * as path from 'node:path';
import { runQuranIntegrityTests } from './quran-integrity/quran-integrity.test.ts';
import { runAudioRecognitionBenchmarkTests } from './audio-recognition-benchmarks/audio-benchmarks.test.ts';
import { runOfflinePerformanceTests } from './offline-performance/offline-performance.test.ts';

async function main() {
  const projectRoot = path.resolve(process.cwd());
  console.log('='.repeat(78));
  console.log('  QURAN COGNITIVE OS v2.0 — MASTER QUALITY ASSURANCE TEST SUITE');
  console.log(`  Project Root: ${projectRoot}`);
  console.log(`  Execution Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(78));
  console.log();

  // 1. Quran Integrity Suite
  console.log('>>> [1/3] Executing Quran Text Integrity & Boundary Verification Suite...');
  const integrityReport = runQuranIntegrityTests(projectRoot);
  console.log(`    Total Checks: ${integrityReport.totalChecks} | Passed: ${integrityReport.passedChecks} | Failed: ${integrityReport.failedChecks} (${integrityReport.executionTimeMs}ms)`);
  console.log();

  // 2. Audio Recognition & Alignment Benchmark Matrix
  console.log('>>> [2/3] Executing Speech Recognition Benchmarks & Phoneme Alignment Matrix...');
  const audioReport = runAudioRecognitionBenchmarkTests(projectRoot);
  console.log(`    Total Checks: ${audioReport.totalChecks} | Passed: ${audioReport.passedChecks} | Failed: ${audioReport.failedChecks} (${audioReport.executionTimeMs}ms)`);
  console.log();

  // 3. Offline & Performance Profiling Matrix
  console.log('>>> [3/3] Executing Zero Network Leakage, Performance Profiling & Offline PWA Matrix...');
  const offlineReport = await runOfflinePerformanceTests(projectRoot);
  console.log(`    Total Checks: ${offlineReport.totalChecks} | Passed: ${offlineReport.passedChecks} | Failed: ${offlineReport.failedChecks} (${offlineReport.executionTimeMs}ms)`);
  console.log();

  // Master Summary
  const grandTotal = integrityReport.totalChecks + audioReport.totalChecks + offlineReport.totalChecks;
  const grandPassed = integrityReport.passedChecks + audioReport.passedChecks + offlineReport.passedChecks;
  const grandFailed = integrityReport.failedChecks + audioReport.failedChecks + offlineReport.failedChecks;
  const allFindings = [...integrityReport.findings, ...audioReport.findings, ...offlineReport.findings];

  console.log('='.repeat(78));
  console.log('  QUALITY ASSURANCE VERDICT & CONFORMANCE SUMMARY');
  console.log('='.repeat(78));
  console.log(`  Grand Total Checks : ${grandTotal}`);
  console.log(`  Passed Checks      : ${grandPassed}`);
  console.log(`  Failed Checks      : ${grandFailed}`);
  console.log(`  Overall Result     : ${grandFailed === 0 ? 'ALL CHECKS PASSED' : 'ACTIONABLE FINDINGS IDENTIFIED'}`);
  console.log('-'.repeat(78));
  console.log('  Key Evidence & Findings:');
  for (const f of allFindings) {
    console.log(`  • ${f}`);
  }
  console.log('='.repeat(78));

  if (grandFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running QA suite:', err);
  process.exit(1);
});
