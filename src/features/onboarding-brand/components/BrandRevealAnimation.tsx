import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, duration = 0.45, className = '' }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerDotsProps {
  colors: string[];
  delay?: number;
}

export function StaggerDots({ colors, delay = 0 }: StaggerDotsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {colors.map((color, i) => (
        <motion.span
          key={`${color}-${i}`}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: delay + i * 0.08,
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="w-7 h-7 rounded-full border border-black/10 shadow-sm"
          style={{ background: color }}
          aria-label={color}
          title={color}
        />
      ))}
    </div>
  );
}
