/**
 * Attach an element to the scroll driver.
 *
 * ```tsx
 * <figure {...useScrollVar('travel')}>   // element now carries --bi-p
 * ```
 *
 * The element gets a `--bi-p` that runs 0 → 1 as it moves, and CSS decides what
 * that means — a translate, a scale, an opacity, a colour mix. Keeping the
 * meaning in CSS is what lets one hook serve a pinned hero and a parallaxing
 * photograph without either of them knowing about the other.
 */
import { useEffect, useRef } from 'react';
import { observeScroll, type ScrollMode } from './scrollDriver';
import { prefersReducedMotion } from './useReveal';

export function useScrollVar(mode: ScrollMode = 'travel') {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Honoured by not observing — same rule as `useReveal`. The resting state
    // is the designed state, so there is nothing to fall back to.
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    return observeScroll(el, mode);
  }, [mode]);

  return { ref: ref as React.RefObject<never>, 'data-scroll': mode };
}
