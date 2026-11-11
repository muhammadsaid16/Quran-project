'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MEDINA_PAGES } from '@/data/medina-pages';
import { useSessionStore } from '@/stores/session-store';
import { MedinaPage } from './MedinaPage';
import { CRITICAL, rubberband, runSpring, SpringHandle } from '@/lib/spring';
import {
  DIRECTION_HYSTERESIS_PX,
  dragProgress,
  shouldCommitTurn,
  slotTransforms,
  TurnDirection,
  RUBBERBAND_CONSTANT,
} from '@/lib/page-turn';
import { useReducedMotion } from '@/hooks/useMediaQuery';

/**
 * The Mushaf spread: a page surface you can grab and turn.
 *
 * Design notes (Apple's fluid interfaces):
 *
 *  - Direct manipulation — the page stays glued to the finger. The gesture
 *    tracks the pointer 1:1, and the grab offset is respected.
 *  - Interruptibility — a turn can be grabbed mid-flight. The spring always
 *    continues from the live on-screen value and blends the current velocity,
 *    so reversing never produces a jump.
 *  - Velocity handoff — a flick keeps its momentum when the finger leaves.
 *  - Momentum projection — the resting page is chosen from where the flick was
 *    going, not from where the finger happened to stop.
 *  - Rubber-banding — the first and last pages resist instead of stopping
 *    dead.
 *  - Reduced motion — the page cross-fades instead of sliding.
 *
 * The Mushaf reads right-to-left, so the NEXT page sits to the LEFT: dragging
 * leftward reveals it, exactly like turning a physical mushaf.
 */

interface Slots {
  /** The page in the base slot — the one facing the reader at rest. */
  a: number;
  /** The page in the incoming slot — a ± 1. */
  b: number;
  /** +1 when the incoming page is the NEXT page (to the left, RTL). */
  dir: TurnDirection;
}

interface MushafSpreadProps {
  /** True when the text is concealed for a recitation session. */
  isRecallModeActive?: boolean;
}

export const MushafSpread: React.FC<MushafSpreadProps> = ({ isRecallModeActive = false }) => {
  const currentPage = useSessionStore((s) => s.currentPage);
  const setCurrentPage = useSessionStore((s) => s.setCurrentPage);

  const [slots, setSlots] = useState<Slots>({
    a: currentPage,
    b: currentPage < 604 ? currentPage + 1 : currentPage,
    dir: 1,
  });
  const [dragging, setDragging] = useState(false);
  /** True while a spring is turning the page. */
  const [turning, setTurning] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const slotARef = useRef<HTMLDivElement>(null);
  const slotBRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);

  /** The animated progress: 0 = base page visible, 1 = incoming page visible. */
  const tRef = useRef(0);
  const springRef = useRef<SpringHandle | null>(null);
  const slotsRef = useRef<Slots>(slots);
  const turningRef = useRef(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startT: number;
    dir: 1 | -1 | 0;
    samples: { x: number; time: number }[];
  } | null>(null);

  const reducedMotion = useReducedMotion();

  slotsRef.current = slots;

  /** Writes both slots' transforms. Runs every frame, outside React. */
  const applyTransforms = useCallback((t: number, dir: TurnDirection) => {
    const width = widthRef.current;
    if (!width) return;
    const geometry = slotTransforms(t, dir, width);
    const a = slotARef.current;
    const b = slotBRef.current;
    if (a) {
      a.style.transform = geometry.a;
      a.style.opacity = String(geometry.aOpacity);
    }
    if (b) {
      b.style.transform = geometry.b;
      b.style.opacity = String(geometry.bOpacity);
    }
  }, []);

  /** Measures the surface so the drag can be expressed as a fraction of it. */
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) widthRef.current = entry.contentRect.width;
    });
    observer.observe(surface);
    widthRef.current = surface.getBoundingClientRect().width;
    return () => observer.disconnect();
  }, []);

  /** Restarts a spring from the live value, blending the current velocity. */
  const animateTo = useCallback(
    (to: number, dir: TurnDirection, velocity = 0, onRest?: () => void) => {
      springRef.current?.stop();
      if (reducedMotion) {
        tRef.current = to;
        applyTransforms(to, dir);
        springRef.current = null;
        onRest?.();
        return;
      }
      springRef.current = runSpring({
        from: tRef.current,
        to,
        velocity,
        config: {
          stiffness: (2 * Math.PI / CRITICAL.response) ** 2,
          damping: 2 * CRITICAL.damping * Math.sqrt((2 * Math.PI / CRITICAL.response) ** 2),
          mass: 1,
        },
        onUpdate: (value) => {
          tRef.current = value;
          applyTransforms(value, dir);
        },
        onRest: () => {
          springRef.current = null;
          onRest?.();
        },
      });
    },
    [applyTransforms, reducedMotion]
  );

  /** Finishes a turn: the incoming page becomes the base page. */
  const settleTurn = useCallback(
    (nextPage: number, dir: TurnDirection) => {
      tRef.current = 0;
      setTurning(false);
      setSlots({ a: nextPage, b: neighbourOf(nextPage, dir), dir });
      setCurrentPage(nextPage);
    },
    [setCurrentPage]
  );

  // After the slots change, the resting transform has to be re-applied — the
  // DOM nodes now hold different pages. A layout effect runs before paint, so
  // the old page never flashes back into place.
  useLayoutEffect(() => {
    applyTransforms(tRef.current, slots.dir);
  }, [slots, applyTransforms]);

  // A page change from OUTSIDE the spread (the recitation auto-advance, the
  // dropdown, the next-ayah button) turns the page too.
  useEffect(() => {
    if (turningRef.current) return;
    const { a, b, dir } = slotsRef.current;
    if (currentPage === a) return;

    const step = currentPage > a ? 1 : -1;
    const distance = Math.abs(currentPage - a);

    // A jump across many pages is a navigation, not a page turn.
    if (distance > 1 || !MEDINA_PAGES[currentPage]) {
      tRef.current = 0;
      setTurning(false);
      setSlots({ a: currentPage, b: neighbourOf(currentPage, step), dir: step });
      return;
    }

    turningRef.current = true;
    setTurning(true);
    setSlots({ a, b: currentPage, dir: step });
    animateTo(1, step, 0, () => {
      turningRef.current = false;
      settleTurn(currentPage, step);
    });
    // `b` is only used to detect a turn already in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, animateTo, applyTransforms, settleTurn]);

  /** The page next to `page` in the given direction, clamped to the mushaf. */
  const neighbourOf = (page: number, dir: TurnDirection): number => {
    const target = page + dir;
    return target >= 1 && target <= 604 ? target : page;
  };

  /** Can the reader go further in this direction? */
  const canGo = useCallback(
    (dir: TurnDirection) => {
      const target = slotsRef.current.a + dir;
      return target >= 1 && target <= 604;
    },
    []
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const surface = surfaceRef.current;
    if (!surface) return;

    // Stop the page in its tracks so the reader can grab it mid-turn.
    springRef.current?.stop();
    springRef.current = null;

    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startT: tRef.current,
      dir: 0,
      samples: [{ x: e.clientX, time: performance.now() }],
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const width = widthRef.current;
      if (!drag || !width || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;

      // Decide the direction once, with a little hysteresis so a sloppy
      // horizontal wobble does not flip the page back and forth.
      if (drag.dir === 0) {
        if (Math.abs(dx) < DIRECTION_HYSTERESIS_PX) return;
        const dir: TurnDirection = dx < 0 ? 1 : -1;
        drag.dir = dir;
        setDragging(true);
        setSlots((prev) => ({
          a: prev.a,
          b: canGo(dir) ? prev.a + dir : prev.a,
          dir,
        }));
        // The incoming slot may have just appeared; wait for it to mount.
        requestAnimationFrame(() => applyTransforms(tRef.current, dir));
      }

      const samples = drag.samples;
      samples.push({ x: e.clientX, time: performance.now() });
      while (samples.length > 6) samples.shift();

      const dir = drag.dir;
      const canTurn = canGo(dir);
      const raw = dragProgress(dx, width, drag.startT, canTurn);

      // At the first and last page there is nothing to turn to, so the
      // surface resists instead of stopping dead.
      const t = canTurn
        ? raw
        : rubberband(raw * width, width, RUBBERBAND_CONSTANT) / width;

      tRef.current = t;
      applyTransforms(t, dir);
    },
    [applyTransforms, canGo]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const surface = surfaceRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      setDragging(false);

      try {
        surface?.releasePointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }

      const dir = drag.dir;
      if (dir === 0) {
        applyTransforms(tRef.current, slotsRef.current.dir);
        return;
      }

      // Release velocity, in progress units per second.
      const samples = drag.samples;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = (last.time - first.time) / 1000;
      const velocityPx = dt > 0 ? (last.x - first.x) / dt : 0;
      const velocity = -velocityPx / (widthRef.current || 1);

      // Where would this flick land? A flick commits on its momentum alone.
      const committed = shouldCommitTurn({
        t: tRef.current,
        velocity,
        canTurn: canGo(dir),
      });

      if (committed) {
        const nextPage = slotsRef.current.a + dir;
        turningRef.current = true;
        setTurning(true);
        animateTo(1, dir, velocity, () => {
          turningRef.current = false;
          settleTurn(nextPage, dir);
        });
      } else {
        animateTo(0, dir, velocity);
      }
    },
    [animateTo, applyTransforms, canGo, settleTurn]
  );

  const showIncoming = dragging || turning;

  return (
    <div
      ref={surfaceRef}
      data-testid="mushaf-spread"
      className="relative w-full touch-pan-y select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* The incoming page, waiting behind the base page. */}
      <div
        ref={slotBRef}
        aria-hidden={!showIncoming}
        className="absolute inset-0 will-change-transform"
        style={{ transform: 'translate3d(-100%, 0, 0)', opacity: 0 }}
      >
        {showIncoming && (
          <MedinaPage pageNumber={slots.b} isRecallModeActive={isRecallModeActive} isSecondary />
        )}
      </div>

      {/* The base page. */}
      <div
        ref={slotARef}
        className="relative will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        <MedinaPage pageNumber={slots.a} isRecallModeActive={isRecallModeActive} />
      </div>
    </div>
  );
};
