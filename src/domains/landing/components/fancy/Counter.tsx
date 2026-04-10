import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

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

  const showsRange = value.includes('\u2013') || value.includes('-');
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
