import { describe, it, expect } from 'vitest';
import { runBrowserAudioGate } from './browser-audio-gate';

describe('Milestone 0 / 2 Gate: Real Chromium Browser Audio & WASM Integration', () => {
  it(
    'executes real on-device WebAssembly inference and phoneme decoding in headless Chromium with zero network leakage',
    { timeout: 60000 },
    async () => {
      const result = await runBrowserAudioGate(process.cwd());
      if (!result.passed) {
        console.error('FAILED CHECKS:', JSON.stringify(result, null, 2));
      }

      expect(result.passed).toBe(true);
      expect(result.metrics.wasmInitMs).toBeGreaterThan(0);
      expect(result.metrics.modelLoadMs).toBeGreaterThan(0);
      expect(result.metrics.audioDurationMs).toBeGreaterThan(5000);
      expect(result.metrics.recognizedTokens.length).toBeGreaterThan(5);
      expect(result.metrics.networkRequestsDuringAudio).toBe(0);
      expect(result.metrics.realTimeFactor).toBeLessThanOrEqual(0.35);
      expect(result.metrics.peakHeapMb).toBeLessThanOrEqual(350);

      // Verify each check explicitly
      for (const check of result.checks) {
        expect(check.passed).toBe(true);
      }
    }
  );
});
