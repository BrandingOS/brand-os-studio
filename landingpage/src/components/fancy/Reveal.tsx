import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Reveal — wraps any content in a scroll-triggered fade-up animation.
 *
 * Uses framer-motion's `whileInView` so it fires once when the element
 * enters the viewport. Stagger by passing different `delay` values, or
 * group children inside a `RevealStagger` parent.
 */
interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function Reveal({ children, className = '', delay = 0, y = 24 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.7,
            delay,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealStagger — auto-staggers all motion children inside.
 * Use with `<motion.div>` children to inherit the parent stagger.
 */
export function RevealStagger({
  children,
  className = '',
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
