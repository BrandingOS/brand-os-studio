import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
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

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
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

interface RevealStaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

/** @deprecated Use <RevealItem index={i} /> directly inside a plain div. */
export function RevealStagger({ children, className = '' }: RevealStaggerProps) {
  return <div className={className}>{children}</div>;
}

/** @deprecated kept so old <motion.div variants={revealItem}> compiles. */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
