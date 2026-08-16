/**
 * Reveal on arrival — and nothing at all when motion is unwelcome.
 *
 * Two things make this worth a hook rather than a CSS class.
 *
 * First, `prefers-reduced-motion` is honoured by NOT OBSERVING. The lazy
 * approach — attach the observer, then skip the transition in CSS — leaves the
 * content depending on a scroll event to become visible, so any failure of the
 * observer (an element inside an `overflow: hidden` ancestor, a print
 * stylesheet, a headless renderer) hides it permanently. Here the element is
 * marked revealed synchronously on mount and no observer is ever created.
 *
 * Second, it fires ONCE. A reveal that replays every time a section re-enters
 * the viewport turns a long page into a flicker show on the way back up.
 */
import { useEffect, useRef, useState } from 'react';

/** True when the reader has asked for less movement. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface RevealOptions {
  /** Milliseconds to stagger this element behind its siblings. */
  delay?: number;
  /** How much of the element must be on screen. */
  threshold?: number;
}

/**
 * Returns props to spread onto the element that should reveal.
 *
 * ```tsx
 * <p {...useReveal({ delay: 60 })}>…</p>
 * ```
 */
export function useReveal({ delay = 0, threshold = 0.15 }: RevealOptions = {}) {
  const ref = useRef<HTMLElement | null>(null);
  // Reduced motion starts revealed. There is nothing to wait for.
  const [shown, setShown] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // No observer available — show it rather than leave it invisible.
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setShown(true);
        io.disconnect();
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, threshold]);

  return {
    ref: ref as React.RefObject<never>,
    'data-reveal': shown ? 'in' : '',
    style: delay ? ({ '--bi-delay': `${delay}ms` } as React.CSSProperties) : undefined,
  };
}
