import * as path from 'node:path';
import { runQuranIntegrityTests } from './quran-integrity/quran-integrity.test.ts';
import { runAudioRecognitionBenchmarkTests } from './audio-recognition-benchmarks/audio-benchmarks.test.ts';
import { runOfflinePerformanceTests } from './offline-performance/offline-performance.test.ts';
import { runBrowserAudioGate } from './browser-audio-gate/browser-audio-gate.ts';
import { runMilestone7PWAGate } from './milestone-7-pwa/pwa-offline-journey.ts';

async function main() {
  const projectRoot = path.resolve(process.cwd());
  console.log('='.repeat(78));
  console.log('  QURAN COGNITIVE OS v2.0 — MASTER QUALITY ASSURANCE TEST SUITE');
  console.log(`  Project Root: ${projectRoot}`);
  console.log(`  Execution Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(78));
  console.log();

  // 1. Quran Integrity Suite
  console.log('>>> [1/5] Executing Quran Text Integrity & Boundary Verification Suite...');
  const integrityReport = runQuranIntegrityTests(projectRoot);
  console.log(`    Total Checks: ${integrityReport.totalChecks} | Passed: ${integrityReport.passedChecks} | Failed: ${integrityReport.failedChecks} (${integrityReport.executionTimeMs}ms)`);
  console.log();

  // 2. Audio Recognition & Alignment Benchmark Matrix
  console.log('>>> [2/5] Executing Speech Recognition Benchmarks & Phoneme Alignment Matrix...');
  const audioReport = runAudioRecognitionBenchmarkTests(projectRoot);
  console.log(`    Total Checks: ${audioReport.totalChecks} | Passed: ${audioReport.passedChecks} | Failed: ${audioReport.failedChecks} (${audioReport.executionTimeMs}ms)`);
  console.log();

  // 3. Offline & Performance Profiling Matrix
  console.log('>>> [3/5] Executing Zero Network Leakage, Performance Profiling & Offline PWA Matrix...');
  const offlineReport = await runOfflinePerformanceTests(projectRoot);
  console.log(`    Total Checks: ${offlineReport.totalChecks} | Passed: ${offlineReport.passedChecks} | Failed: ${offlineReport.failedChecks} (${offlineReport.executionTimeMs}ms)`);
  console.log();

  // 4. Browser Audio Integration Gate (Real Chromium + WebAssembly + CDP Zero-Leakage)
  console.log('>>> [4/5] Executing Browser Audio Integration Gate (Chromium + WebAssembly + CDP)...');
  const browserGateStart = Date.now();
  const browserGateResult = await runBrowserAudioGate(projectRoot);
  const browserGateDuration = Date.now() - browserGateStart;
  const browserGatePassed = browserGateResult.checks.filter(c => c.passed).length;
  const browserGateFailed = browserGateResult.checks.filter(c => !c.passed).length;
  console.log(`    Total Checks: ${browserGateResult.checks.length} | Passed: ${browserGatePassed} | Failed: ${browserGateFailed} (${browserGateDuration}ms)`);
  console.log();

  // 5. Milestone 7: PWA Hardening & Full Offline Quality Assurance Gate (Airplane Mode + 50 Cycles)
  console.log('>>> [5/5] Executing Milestone 7 PWA Full Offline QA Gate (Airplane Mode + Memory Stress)...');
  const pwaGateStart = Date.now();
  const pwaGateResult = await runMilestone7PWAGate(projectRoot);
  const pwaGateDuration = Date.now() - pwaGateStart;
  const pwaGatePassed = pwaGateResult.checks.filter(c => c.passed).length;
  const pwaGateFailed = pwaGateResult.checks.filter(c => !c.passed).length;
  console.log(`    Total Checks: ${pwaGateResult.checks.length} | Passed: ${pwaGatePassed} | Failed: ${pwaGateFailed} (${pwaGateDuration}ms)`);
  console.log();

  // Master Summary
  const grandTotal = integrityReport.totalChecks + audioReport.totalChecks + offlineReport.totalChecks + browserGateResult.checks.length + pwaGateResult.checks.length;
  const grandPassed = integrityReport.passedChecks + audioReport.passedChecks + offlineReport.passedChecks + browserGatePassed + pwaGatePassed;
  const grandFailed = integrityReport.failedChecks + audioReport.failedChecks + offlineReport.failedChecks + browserGateFailed + pwaGateFailed;
  
  const browserGateFindings = browserGateResult.checks.map(c => `[BROWSER GATE] ${c.name}: ${c.details}`);
  const pwaGateFindings = pwaGateResult.checks.map(c => `[PWA OFFLINE GATE] ${c.name}: ${c.details}`);
  const allFindings = [
    ...integrityReport.findings,
    ...audioReport.findings,
    ...offlineReport.findings,
    ...browserGateFindings,
    ...pwaGateFindings,
  ];

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
