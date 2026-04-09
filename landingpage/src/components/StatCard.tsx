import { motion } from 'framer-motion';
import type { StatData } from '@/types';
import { Counter } from '@/components/fancy/Counter';
import { revealItem } from '@/components/fancy/Reveal';

/**
 * Stat block — v5 Relume style.
 *
 * Massive number with animated counter, thin top divider, label below.
 */
export const StatCard = ({ value, label }: StatData) => (
  <motion.div variants={revealItem} className="border-t border-foreground pt-6">
    <div className="font-display text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] text-foreground">
      <Counter value={value} />
    </div>
    <div className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xs">
      {label}
    </div>
  </motion.div>
);
