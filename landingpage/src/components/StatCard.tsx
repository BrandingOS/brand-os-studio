import { motion } from 'framer-motion';
import type { StatData } from '@/types';
import { Counter } from '@/components/fancy/Counter';
import { revealItem } from '@/components/fancy/Reveal';

export const StatCard = ({ value, label }: StatData) => (
  <motion.div variants={revealItem} className="border-l border-violet/40 pl-6 md:pl-8">
    <div className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-none">
      <Counter value={value} className="gradient-text" />
    </div>
    <div className="mt-4 text-sm md:text-base text-fg-muted leading-relaxed max-w-xs">
      {label}
    </div>
  </motion.div>
);
