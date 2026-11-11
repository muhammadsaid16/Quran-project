/**
 * Tests for the page-turn geometry.
 *
 * These are the rules that decide whether a mushaf page feels like paper or
 * like a slideshow.
 */

import { describe, it, expect } from 'vitest';
import {
  COMMIT_FRACTION,
  DIRECTION_HYSTERESIS_PX,
  dragProgress,
  shouldCommitTurn,
  slotTransforms,
} from '@/lib/page-turn';

describe('page-turn geometry', () => {
  it('centres the base page and parks the neighbour at rest', () => {
    const { a, b } = slotTransforms(0, 1, 1000);
    expect(a).toBe('translate3d(0px, 0, 0)');
    // The next page waits to the left, ready to slide in.
    expect(b).toBe('translate3d(-1000px, 0, 0)');
  });

  it('slides the base page away and brings the neighbour in', () => {
    const { a, b } = slotTransforms(1, 1, 1000);
    expect(a).toBe('translate3d(1000px, 0, 0)');
    expect(b).toBe('translate3d(0px, 0, 0)');
  });

  it('mirrors the motion for the previous page', () => {
    const { a, b } = slotTransforms(1, -1, 1000);
    // Going back, the current page leaves to the left and the previous page
    // arrives from the right.
    expect(a).toBe('translate3d(-1000px, 0, 0)');
    expect(b).toBe('translate3d(0px, 0, 0)');
  });

  it('dims the outgoing page and lifts the incoming one', () => {
    const rest = slotTransforms(0, 1, 1000);
    const turned = slotTransforms(1, 1, 1000);
    expect(turned.aOpacity).toBeLessThan(rest.aOpacity);
    expect(turned.bOpacity).toBeGreaterThan(rest.bOpacity);
    // Opacity never leaves the valid range, even when the drag overshoots.
    const overshoot = slotTransforms(-0.2, 1, 1000);
    expect(overshoot.aOpacity).toBeLessThanOrEqual(1);
    expect(overshoot.bOpacity).toBeGreaterThanOrEqual(0);
  });

  it('tracks the finger to the left when turning forward', () => {
    // Dragging left by a quarter of the page reveals a quarter of the next.
    expect(dragProgress(-250, 1000, 0, true)).toBeCloseTo(0.25, 5);
    // Dragging right moves back.
    expect(dragProgress(250, 1000, 0, true)).toBeCloseTo(-0.25, 5);
  });

  it('leaves the resistance to the component when there is no page to turn to', () => {
    // With no neighbour the progress is passed through unclamped, and the
    // component rubber-bands it instead.
    expect(dragProgress(-250, 1000, 0, false)).toBeCloseTo(0.25, 5);
  });

  it('commits a slow drag only past the commit fraction', () => {
    expect(
      shouldCommitTurn({ t: COMMIT_FRACTION - 0.1, velocity: 0, canTurn: true })
    ).toBe(false);
    expect(
      shouldCommitTurn({ t: COMMIT_FRACTION + 0.1, velocity: 0, canTurn: true })
    ).toBe(true);
  });

  it('commits a flick even when it barely moved', () => {
    // The momentum says where the reader was going.
    expect(
      shouldCommitTurn({ t: 0.05, velocity: 1.2, canTurn: true })
    ).toBe(true);
  });

  it('never commits when there is no page to turn to', () => {
    expect(
      shouldCommitTurn({ t: 0.9, velocity: 5, canTurn: false })
    ).toBe(false);
  });

  it('waits for a real movement before choosing a direction', () => {
    // Hysteresis: a wobble under the threshold must not flip the page.
    expect(DIRECTION_HYSTERESIS_PX).toBeGreaterThan(0);
  });
});
