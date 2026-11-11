/**
 * Page-turn geometry.
 *
 * The mushaf reads right-to-left, so the NEXT page sits to the LEFT. The
 * spread therefore has two slots:
 *
 *   - slot A — the page facing the reader at rest.
 *   - slot B — the neighbouring page waiting behind it.
 *
 * A single progress value `t` (0 → 1) drives both:
 *
 *   t = 0  →  A is centred, B is parked off to the side.
 *   t = 1  →  B is centred, A has slid away.
 *
 * `dir` says which side B is on: +1 when B is the NEXT page (to the left),
 * -1 when B is the PREVIOUS page (to the right).
 *
 * The functions here are pure so the geometry can be tested without a browser.
 */

export type TurnDirection = 1 | -1;

/** Horizontal drag before the gesture commits to a direction. */
export const DIRECTION_HYSTERESIS_PX = 10;
/** Fraction of the page that must be dragged for a slow drag to commit. */
export const COMMIT_FRACTION = 0.35;
/** Minimum flick speed (px/s) that commits a turn regardless of distance. */
export const FLICK_VELOCITY = 350;
/** Rubber-banding constant: how hard the edges resist. */
export const RUBBERBAND_CONSTANT = 0.55;

export interface SlotTransforms {
  /** The transform of the page facing the reader. */
  a: string;
  /** The transform of the neighbouring page. */
  b: string;
  /** The opacity of the page facing the reader. */
  aOpacity: number;
  /** The opacity of the neighbouring page. */
  bOpacity: number;
}

/**
 * The transforms of both slots for a given progress.
 *
 * The outgoing page dims slightly as it leaves, and the incoming page rises
 * out of the dim — a depth cue, not a hard cross-fade.
 */
export function slotTransforms(
  t: number,
  dir: TurnDirection,
  width: number
): SlotTransforms {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    a: `translate3d(${dir * t * width}px, 0, 0)`,
    b: `translate3d(${-dir * (1 - t) * width}px, 0, 0)`,
    aOpacity: 1 - clamped * 0.35,
    bOpacity: 0.35 + clamped * 0.65,
  };
}

/**
 * The progress a drag has reached, given the horizontal offset from where the
 * finger went down.
 *
 * Dragging LEFT (a negative offset) moves toward the next page, which is what
 * feels natural in a right-to-left mushaf.
 */
export function dragProgress(
  dx: number,
  width: number,
  startT: number,
  canTurn: boolean
): number {
  const raw = startT - dx / width;
  // The page may be pulled a little past its resting point, but no further:
  // past that the surface resists instead of following the finger.
  if (canTurn) return Math.max(-0.35, Math.min(1.15, raw));
  return raw;
}

/**
 * Decides whether releasing the finger commits the turn.
 *
 * A flick always commits: the momentum says where the reader was going. A
 * slow drag commits only once it has passed a third of the page.
 */
export function shouldCommitTurn(options: {
  /** Progress reached at release (0..1). */
  t: number;
  /** Release velocity in progress units per second. */
  velocity: number;
  /** Is there a page to turn to at all? */
  canTurn: boolean;
}): boolean {
  if (!options.canTurn) return false;
  const flickSpeed = Math.abs(options.velocity) * 1000;
  const projected = options.t + projectEnd(options.velocity);
  return flickSpeed > FLICK_VELOCITY || projected > COMMIT_FRACTION;
}

/** Where the flick was heading. Mirrors Apple's deceleration projection. */
function projectEnd(velocity: number): number {
  const rate = 0.998;
  return (velocity / 1000) * (rate / (1 - rate));
}
