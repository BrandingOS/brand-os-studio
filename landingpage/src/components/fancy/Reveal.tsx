import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Reveal — wraps any content in a scroll-triggered fade-up.
 *
 * Each Reveal manages its OWN viewport trigger, so it never gets stuck
 * waiting on a parent's stagger orchestration. Crucial: the previous
 * version used a parent RevealStagger that orchestrated children via
 * variants — if the user scrolled past quickly, the parent's once:true
 * fired but mid-stagger items never got their visible state and stayed
 * at opacity 0 permanently. This version makes every reveal independent.
 */
interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Initial fade-up offset in px. Defaults to 24. */
  y?: number;
  /** Optional manual delay in seconds. */
  delay?: number;
  /** Animation duration in seconds. Defaults to 0.7. */
  duration?: number;
  /** How much of the element must be in view to trigger. Defaults to 0.05. */
  amount?: number;
}

export function Reveal({
  children,
  className = '',
  y = 20,
  delay = 0,
  duration = 0.45,
  amount = 0.12,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealItem — for use INSIDE a grid where you want a stagger feel.
 *
 * Each item has its OWN whileInView trigger. The `index` prop adds a
 * small delay derived from index, so items reveal in sequence as they
 * enter the viewport — but each one is independent, so even if the user
 * scrolls past a card it still triggers when it enters view (vs the old
 * parent-stagger pattern that would leave fast-scrolled items stuck at
 * opacity 0).
 *
 * Drop-in replacement for `<motion.div variants={revealItem}>` inside a
 * RevealStagger parent.
 */
interface RevealItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
  /** Delay per index, in seconds. Defaults to 0.08. */
  staggerDelay?: number;
  y?: number;
  amount?: number;
}

export function RevealItem({
  children,
  className = '',
  index = 0,
  staggerDelay = 0.04,
  y = 20,
  amount = 0.12,
}: RevealItemProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration: 0.45,
        delay: index * staggerDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Legacy compatibility ────────────────────────────────────────────
//
// The old `RevealStagger` + `revealItem` variant pattern is kept as a
// thin wrapper for backwards compatibility, but it now uses the same
// per-item independent triggers internally. New code should use
// <RevealItem index={i} /> directly.

interface RevealStaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

/** @deprecated Use <RevealItem index={i} /> directly inside a plain div. */
export function RevealStagger({ children, className = '' }: RevealStaggerProps) {
  return <div className={className}>{children}</div>;
}

/** @deprecated kept so old <motion.div variants={revealItem}> compiles, but
 *  it no longer actually drives orchestration — wrap in <RevealItem> instead. */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
