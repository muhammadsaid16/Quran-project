/**
 * Performance & Hardware Resource Profiler for Quran Cognitive OS.
 * Measures Real-Time Factor (RTF), memory consumption, and streaming CTC chunk latency.
 */

export interface RTFBenchmarkResult {
  audioDurationSeconds: number;
  inferenceDurationSeconds: number;
  rtf: number;
  passed: boolean;
  targetMaxRTF: number;
}

export interface MemoryProfileResult {
  initialMemoryMB: number;
  peakMemoryMB: number;
  memoryDeltaMB: number;
  passed: boolean;
  maxMemoryCeilingMB: number;
}

export interface LatencyProfileResult {
  chunkDurationMs: number;
  processingTimeMs: number;
  latencyRatio: number;
  passed: boolean;
  targetMaxLatencyMs: number;
}

export class PerformanceProfiler {
  public static readonly DESKTOP_MAX_RTF = 0.35;
  public static readonly MOBILE_MAX_RTF = 0.65;
  public static readonly MEMORY_CEILING_MB = 150;
  public static readonly CHUNK_LATENCY_CEILING_MS = 40;

  /**
   * Calculate Real-Time Factor (RTF)
   * RTF = Processing Time / Audio Length. Lower is faster. (RTF < 1.0 means faster than real-time).
   */
  public static evaluateRTF(audioDurationSec: number, processingTimeSec: number, isMobile: boolean = false): RTFBenchmarkResult {
    const rtf = processingTimeSec / (audioDurationSec || 0.001);
    const target = isMobile ? this.MOBILE_MAX_RTF : this.DESKTOP_MAX_RTF;
    return {
      audioDurationSeconds: audioDurationSec,
      inferenceDurationSeconds: processingTimeSec,
      rtf: Math.round(rtf * 1000) / 1000,
      passed: rtf <= target,
      targetMaxRTF: target,
    };
  }

  /**
   * Monitor peak heap memory footprint during intensive audio batch processing
   */
  public static evaluateMemory(
    beforeBytes: number,
    afterBytes: number,
    peakBytes: number
  ): MemoryProfileResult {
    const toMB = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 100) / 100;
    const initialMB = toMB(beforeBytes);
    const peakMB = toMB(peakBytes);
    const deltaMB = Math.round((peakMB - initialMB) * 100) / 100;

    return {
      initialMemoryMB: initialMB,
      peakMemoryMB: peakMB,
      memoryDeltaMB: deltaMB,
      passed: deltaMB <= this.MEMORY_CEILING_MB,
      maxMemoryCeilingMB: this.MEMORY_CEILING_MB,
    };
  }

  /**
   * Evaluate single 100ms-200ms audio chunk streaming latency
   */
  public static evaluateChunkLatency(chunkMs: number, processingMs: number): LatencyProfileResult {
    return {
      chunkDurationMs: chunkMs,
      processingTimeMs: processingMs,
      latencyRatio: Math.round((processingMs / chunkMs) * 1000) / 1000,
      passed: processingMs <= this.CHUNK_LATENCY_CEILING_MS,
      targetMaxLatencyMs: this.CHUNK_LATENCY_CEILING_MS,
    };
  }
}
