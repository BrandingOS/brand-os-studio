/**
 * Shared section machinery — the reveal preset, the scroll-linked
 * word-reveal Statement, and the chapter header row every chapter
 * opens with. One source so all nine chapters breathe the same way.
 */
import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';

export const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.9, ease: [0.19, 1, 0.22, 1] as const },
};

/* ── Scroll-linked word reveal ──────────────────────────────────── */

function Word({
  progress,
  range,
  serif,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  serif?: boolean;
  children: string;
}) {
  const opacity = useTransform(progress, range, [0.13, 1]);
  return (
    <motion.span
      style={{ opacity }}
      className={serif ? 'serif-accent' : undefined}
    >
      {children}{' '}
    </motion.span>
  );
}

/** Words wrapped in *asterisks* render in the editorial italic cut. */
export function Statement({
  text,
  className = 'display-chapter max-w-5xl',
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.4'],
  });
  const tokens = text.split(' ').map((raw) => {
    const serif = raw.startsWith('*') && raw.replace(/[.,—?!'’]/g, '').endsWith('*');
    return { serif, word: serif ? raw.replace(/\*/g, '') : raw };
  });
  return (
    <p ref={ref} className={className}>
      {tokens.map((t, i) => (
        <Word
          key={i}
          progress={scrollYProgress}
          range={[i / tokens.length, Math.min(1, (i + 1.6) / tokens.length)]}
          serif={t.serif}
        >
          {t.word}
        </Word>
      ))}
    </p>
  );
}

/* ── Chapter header row — label-rule left, whisper right ────────── */

export function ChapterHead({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <motion.div {...reveal} className="microlabel flex items-center justify-between">
      <span className="label-rule opacity-70">{label}</span>
      {hint && <span className="hidden opacity-45 sm:block">{hint}</span>}
    </motion.div>
  );
}
