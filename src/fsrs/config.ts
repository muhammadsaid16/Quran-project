/**
 * Quran Cognitive OS v2.0 — FSRS Configuration & Engine Setup
 * Configures the Free Spaced Repetition Scheduler with target retention of 90% (R=0.90).
 */

import {
  fsrs,
  generatorParameters,
  FSRS,
  FSRSParameters,
} from 'ts-fsrs';

export const DEFAULT_REQUEST_RETENTION = 0.90; // R = 0.90 (90% target retention)
export const DEFAULT_MAXIMUM_INTERVAL = 36500; // 100 years max interval
export const DEFAULT_ENABLE_FUZZ = false; // Strictly deterministic scheduling for reproducible testing
export const DEFAULT_ENABLE_SHORT_TERM = true;

export interface FSRSConfigOptions {
  requestRetention?: number;
  maximumInterval?: number;
  enableFuzz?: boolean;
  enableShortTerm?: boolean;
  learningSteps?: Array<`${number}m` | `${number}h` | `${number}d`>;
  relearningSteps?: Array<`${number}m` | `${number}h` | `${number}d`>;
}

/**
 * Creates an FSRS instance configured with the specified parameters.
 * Defaults to 90% target retention (R=0.90) and deterministic intervals (enable_fuzz = false).
 */
export function createFsrsEngine(options?: FSRSConfigOptions): FSRS {
  const request_retention = options?.requestRetention ?? DEFAULT_REQUEST_RETENTION;
  const maximum_interval = options?.maximumInterval ?? DEFAULT_MAXIMUM_INTERVAL;
  const enable_fuzz = options?.enableFuzz ?? DEFAULT_ENABLE_FUZZ;
  const enable_short_term = options?.enableShortTerm ?? DEFAULT_ENABLE_SHORT_TERM;

  const params: Partial<FSRSParameters> = {
    request_retention,
    maximum_interval,
    enable_fuzz,
    enable_short_term,
  };

  if (options?.learningSteps) {
    params.learning_steps = options.learningSteps;
  }
  if (options?.relearningSteps) {
    params.relearning_steps = options.relearningSteps;
  }

  const generatedParams = generatorParameters(params);
  return fsrs(generatedParams);
}

/**
 * Global default FSRS engine instance configured for Quran Cognitive OS (R=0.90)
 */
export const defaultFsrsEngine: FSRS = createFsrsEngine();

/**
 * Calculates theoretical retrievability R(t) given stability S (in days) and elapsed time t (in days).
 * Uses power decay formulation: R(t) = (1 + factor * t / S)^(-1)
 * If S <= 0 or t <= 0, handles edge conditions appropriately.
 */
export function calculateRetrievability(
  stability: number,
  elapsedDays: number,
  factor = 0.19 // Standard FSRS decay factor mapping 90% at t = S
): number {
  if (stability <= 0) return 0.0;
  if (elapsedDays <= 0) return 1.0;

  // Formula: R(t) = (1 + factor * (t / S))^(-1)
  const retrievability = Math.pow(1 + factor * (elapsedDays / stability), -1);
  return Math.max(0.0, Math.min(1.0, Math.round(retrievability * 10000) / 10000));
}
