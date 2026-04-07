import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionSplitProps {
  index: number;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * Two-column setup-step layout with motion reveal.
 * Image flips side per index. Numbered tag in violet.
 */
export default function SectionSplit({
  index,
  title,
  subtitle,
  children,
}: SectionSplitProps) {
  const reverse = index % 2 === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="grid items-center gap-12 md:gap-20 md:grid-cols-2"
    >
      <div className={reverse ? 'md:order-2' : ''}>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-violet/40 bg-violet/10 font-mono text-sm font-semibold text-violet">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="mt-6 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
          {title}
        </h3>
        <p className="mt-4 text-base md:text-lg text-fg-muted leading-relaxed max-w-md">
          {subtitle}
        </p>
      </div>
      <div className={reverse ? 'md:order-1' : ''}>
        {children ?? (
          <div className="surface aspect-[4/3] grid place-items-center">
            <span className="text-xs uppercase tracking-widest text-fg-dim">
              Visual preview
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
