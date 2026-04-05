import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Intersection Observer hook for V2 scroll-triggered animations.
 * Observes all `.v2-reveal` and `.v2-reveal-scale` and `.v2-draw-line`
 * elements within a container and adds the `revealed` class when visible.
 */
export function useV2Reveal(threshold = 0.12) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    const targets = container.querySelectorAll(
      '.v2-reveal, .v2-reveal-scale, .v2-clip-reveal, .v2-draw-line'
    );
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold]);

  return containerRef;
}

/**
 * Animated counter hook — counts from 0 to target over duration.
 */
export function useCounter(target: number, duration = 2000, startOnReveal = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnReveal);
  const ref = useRef<HTMLDivElement>(null);

  const start = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (startOnReveal && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [startOnReveal]);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return { count, ref, start };
}
