'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query.
 *
 * The three queries that matter for this app:
 *  - `prefers-reduced-motion` — replace slides and springs with short
 *    cross-fades. Reduced motion is not the absence of feedback; it is a
 *    gentler equivalent of it.
 *  - `prefers-reduced-transparency` — frost the translucent surfaces.
 *  - `prefers-contrast: more` — near-solid backgrounds with a defined border.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** True when the user asked the system to reduce motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** True when the user asked the system to reduce transparency. */
export function useReducedTransparency(): boolean {
  return useMediaQuery('(prefers-reduced-transparency: reduce)');
}

/** True when the user asked the system for more contrast. */
export function usePrefersMoreContrast(): boolean {
  return useMediaQuery('(prefers-contrast: more)');
}
