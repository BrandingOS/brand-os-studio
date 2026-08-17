/**
 * A number that arrives by counting.
 *
 * Only worth doing where the number IS the content — the bento's variant count,
 * where the tile is the number and a caption. Counting a number that sits
 * inside a sentence is a distraction, so this is a component you reach for
 * rather than a behaviour applied to every digit on the page.
 *
 * Starts when the number is actually on screen, not on mount: a count that
 * finished while the reader was eleven sections above it is a static number
 * with extra machinery behind it.
 */
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useReveal';

export function CountUp({
  value,
  ms = 900,
  className,
  style,
}: {
  value: number;
  ms?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // Reduced motion, or no observer to arrange it with, starts at the answer.
  const [shown, setShown] = useState(() => prefersReducedMotion());
  const [n, setN] = useState(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      setN(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, value]);

  useEffect(() => {
    if (!shown || prefersReducedMotion()) {
      setN(value);
      return;
    }
    let frame = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      // Eased at the end, so it settles rather than stopping.
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [shown, value, ms]);

  return (
    <span ref={ref} className={className} style={style}>
      {n}
    </span>
  );
}
