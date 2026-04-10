import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

/**
 * Counter — animated number that ticks up when scrolled into view.
 *
 * Accepts strings like "80%", "10–20%", "87%". The function extracts
 * the leading numeric value, animates it from 0 → target with a spring,
 * and re-injects the suffix. Triggers once per mount via Intersection
 * Observer (framer-motion's `useInView`).
 */
interface CounterProps {
  value: string;
  className?: string;
}

function parseNumeric(value: string): { num: number; suffix: string } {
  const match = value.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return { num: 0, suffix: value };
  return {
    num: parseFloat(match[1].replace(',', '.')),
    suffix: match[2],
  };
}

export function Counter({ value, className = '' }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  const { num: target, suffix } = parseNumeric(value);

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 24,
    stiffness: 90,
    duration: 1.6,
  });

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionValue.set(target);
  }, [inView, motionValue, target]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      setDisplay(latest);
    });
  }, [springValue]);

  // If the source value contains a range (e.g. "10–20"), display it raw —
  // animating a range looks weird.
  const showsRange = value.includes('–') || value.includes('-');
  if (showsRange) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    );
  }

  const isInteger = Number.isInteger(target);
  const formatted = isInteger ? Math.round(display).toString() : display.toFixed(1);

  return (
    <span ref={ref} className={className}>
      {formatted}
      {suffix}
    </span>
  );
}
