import { PhonemeErrorRateCalculator, type PERMetrics } from './phoneme-error-rate.ts';

export type RecitationSpeed = 'Tahqiq' | 'Tadwir' | 'Hadr';
export type NoiseCondition = 'Clean_30dB' | 'Moderate_15dB' | 'Harsh_5dB';
export type MicQuality = 'Studio_0pct' | 'Good_2pct' | 'Degraded_5pct' | 'Poor_10pct';

export interface BenchmarkScenario {
  speed: RecitationSpeed;
  noise: NoiseCondition;
  mic: MicQuality;
  targetMaxPER: number;
}

export interface BenchmarkScenarioResult {
  scenario: BenchmarkScenario;
  metrics: PERMetrics;
  passed: boolean;
  notes: string;
}

export class AcousticBenchmarkSuite {
  /**
   * Defined target matrix: acceptable maximum PER per environmental condition.
   */
  public static readonly BENCHMARK_MATRIX: BenchmarkScenario[] = [
    { speed: 'Tadwir', noise: 'Clean_30dB', mic: 'Studio_0pct', targetMaxPER: 0.05 },
    { speed: 'Tahqiq', noise: 'Clean_30dB', mic: 'Studio_0pct', targetMaxPER: 0.05 },
    { speed: 'Hadr', noise: 'Clean_30dB', mic: 'Studio_0pct', targetMaxPER: 0.12 },
    { speed: 'Tadwir', noise: 'Moderate_15dB', mic: 'Good_2pct', targetMaxPER: 0.15 },
    { speed: 'Tadwir', noise: 'Harsh_5dB', mic: 'Degraded_5pct', targetMaxPER: 0.28 },
    { speed: 'Hadr', noise: 'Harsh_5dB', mic: 'Poor_10pct', targetMaxPER: 0.35 },
  ];

  /**
   * Deterministic pseudo-random generator (LCG) for reproducible benchmarks.
   */
  private static seededRandom(seed: number): () => number {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /**
   * Simulates synthetic hypothesis phonemes subject to speed variations,
   * acoustic noise insertions/substitutions, and microphone packet drops.
   */
  public static simulateRecitation(
    canonicalTokens: string[],
    speed: RecitationSpeed,
    noise: NoiseCondition,
    mic: MicQuality,
    seed: number = 42
  ): string[] {
    const random = this.seededRandom(seed);
    const result: string[] = [];

    // Drop probability based on microphone quality
    let dropProb = 0.0;
    if (mic === 'Good_2pct') dropProb = 0.02;
    if (mic === 'Degraded_5pct') dropProb = 0.05;
    if (mic === 'Poor_10pct') dropProb = 0.10;

    // Noise error probability (substitution or insertion)
    let noiseSubProb = 0.0;
    let noiseInsProb = 0.0;
    if (noise === 'Moderate_15dB') {
      noiseSubProb = 0.04;
      noiseInsProb = 0.02;
    } else if (noise === 'Harsh_5dB') {
      noiseSubProb = 0.10;
      noiseInsProb = 0.06;
    }

    // Speed effects (Hadr fast speech elision; Tahqiq prolongs madd)
    let hadrElideProb = speed === 'Hadr' ? 0.02 : 0.0;

    for (let i = 0; i < canonicalTokens.length; i++) {
      const token = canonicalTokens[i];

      // Check packet drop
      if (random() < dropProb) {
        continue; // Omitted due to mic drop
      }

      // Check Hadr fast speech elision
      if (random() < hadrElideProb) {
        continue;
      }

      // Check noise substitution
      if (random() < noiseSubProb) {
        result.push('ـ'); // Substituted with generic carrier phoneme
      } else {
        result.push(token);
      }

      // Check noise spurious insertion
      if (random() < noiseInsProb) {
        result.push('ء'); // Spurious glottal stop from breath/noise
      }
    }

    return result;
  }

  /**
   * Run the full acoustic matrix evaluation against a canonical phoneme token set.
   */
  public static evaluateMatrix(canonicalTokens: string[]): BenchmarkScenarioResult[] {
    const results: BenchmarkScenarioResult[] = [];

    for (const scenario of this.BENCHMARK_MATRIX) {
      const simulatedHyp = this.simulateRecitation(
        canonicalTokens,
        scenario.speed,
        scenario.noise,
        scenario.mic
      );
      const metrics = PhonemeErrorRateCalculator.calculate(canonicalTokens, simulatedHyp);
      const passed = metrics.per <= scenario.targetMaxPER;

      results.push({
        scenario,
        metrics,
        passed,
        notes: `PER: ${(metrics.per * 100).toFixed(2)}% (Target: <= ${(scenario.targetMaxPER * 100).toFixed(0)}%) | Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`,
      });
    }

    return results;
  }
}
