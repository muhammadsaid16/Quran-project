import { describe, it, expect } from 'vitest';
import { runMilestone7PWAGate } from './pwa-offline-journey';

describe('Milestone 7: PWA Hardening & Full Offline Quality Assurance', () => {
  it(
    'executes complete offline recitation journey under airplane mode with zero network leakage and 50-cycle memory stability',
    { timeout: 90000 },
    async () => {
      const result = await runMilestone7PWAGate(process.cwd());
      if (!result.passed) {
        console.error('FAILED CHECKS:', JSON.stringify(result, null, 2));
      }

      expect(result.passed).toBe(true);
      expect(result.metrics.manifestValid).toBe(true);
      expect(result.metrics.cacheStoragePopulated).toBe(true);
      expect(result.metrics.offlineRecitationSuccess).toBe(true);
      expect(result.metrics.offlineDecodedTokens.length).toBeGreaterThan(5);
      expect(result.metrics.offlineRecallAccuracy).toBe(100);
      expect(result.metrics.offlineNetworkRequests).toBe(0);
      expect(result.metrics.consecutiveCyclesPassed).toBe(50);
      expect(result.metrics.heapGrowthDeltaMb).toBeLessThanOrEqual(25);

      for (const check of result.checks) {
        expect(check.passed).toBe(true);
      }
    }
  );
});
