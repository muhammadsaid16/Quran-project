/**
 * Tests for the spring engine and the page-turn physics.
 *
 * The spring is what makes a page turn feel like a physical page rather than
 * a CSS transition, so its properties matter: it must settle, it must honour
 * the velocity it is handed, and it must not overshoot when it is critically
 * damped.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CRITICAL,
  BOUNCY,
  projectMomentum,
  rubberband,
  runSpring,
  springConfig,
} from '@/lib/spring';

describe('spring engine', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('settles on the target value', async () => {
    const values: number[] = [];
    const handle = runSpring({
      from: 0,
      to: 1,
      config: springConfig(CRITICAL),
      onUpdate: (v) => values.push(v),
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));

    expect(handle.value).toBeCloseTo(1, 5);
    expect(handle.active).toBe(false);
    expect(values.length).toBeGreaterThan(1);
  });

  it('does not overshoot when critically damped', async () => {
    let max = -Infinity;
    const handle = runSpring({
      from: 0,
      to: 1,
      config: springConfig(CRITICAL),
      onUpdate: (v) => {
        max = Math.max(max, v);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    handle.stop();

    expect(max).toBeLessThanOrEqual(1.0001);
  });

  it('overshoots when under-damped, because the gesture carried momentum', async () => {
    let max = -Infinity;
    const handle = runSpring({
      from: 0,
      to: 1,
      config: springConfig(BOUNCY),
      onUpdate: (v) => {
        max = Math.max(max, v);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    handle.stop();

    expect(max).toBeGreaterThan(1.001);
  });

  it('starts from the live value when it is retargeted mid-flight', async () => {
    const values: number[] = [];
    const handle = runSpring({
      from: 0,
      to: 1,
      config: springConfig(CRITICAL),
      onUpdate: (v) => values.push(v),
    });

    await new Promise((resolve) => setTimeout(resolve, 120));
    const atRetarget = handle.value;
    handle.retarget(0);

    // The animation continues from where it was, not from the target value.
    expect(atRetarget).toBeGreaterThan(0);
    expect(atRetarget).toBeLessThan(1);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(handle.value).toBeCloseTo(0, 5);
  });

  it('carries the velocity through a reversal instead of cutting to it', async () => {
    const handle = runSpring({
      from: 0,
      to: 1,
      velocity: 4,
      config: springConfig(CRITICAL),
      onUpdate: () => {},
    });

    await new Promise((resolve) => setTimeout(resolve, 60));
    const velocityBefore = handle.velocity;
    handle.retarget(0);

    // The velocity is preserved (blended), so the motion does not slam.
    expect(Math.sign(handle.velocity)).toBe(Math.sign(velocityBefore));
    handle.stop();
  });
});

describe('page-turn physics', () => {
  it('projects a flick further than where the finger let go', () => {
    const projected = projectMomentum(2000);
    expect(projected).toBeGreaterThan(0);
    // A slow, short flick barely moves the endpoint.
    expect(projectMomentum(50)).toBeLessThan(projected);
  });

  it('resists progressively past a boundary instead of stopping hard', () => {
    // The surface always moves less than the finger pulled it.
    expect(Math.abs(rubberband(50, 1000))).toBeLessThan(50);
    expect(Math.abs(rubberband(500, 1000))).toBeLessThan(500);
    // The further past the edge, the smaller the share of the pull that is
    // followed — the resistance grows rather than the movement being cut off.
    const shareNear = Math.abs(rubberband(50, 1000)) / 50;
    const shareFar = Math.abs(rubberband(500, 1000)) / 500;
    expect(shareFar).toBeLessThan(shareNear);
    // The sign is preserved so the surface still points the way it was pulled.
    expect(rubberband(-50, 1000)).toBeLessThan(0);
    expect(rubberband(50, 1000)).toBeGreaterThan(0);
  });

  it('never lets the rubber-banded surface pass the edge entirely', () => {
    for (const overshoot of [10, 100, 1000, 10000]) {
      expect(Math.abs(rubberband(overshoot, 1000))).toBeLessThan(overshoot);
    }
  });
});
