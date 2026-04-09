import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionSplitProps {
  index: number;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * Two-column setup-step layout — v5 Relume style.
 *
 * Big numbered pill, big title, generous subtitle on one side. Big
 * framed image on the other side. Side flips per index. Whole thing
 * fades in from below on scroll. Spacious, editorial, restrained.
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
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="grid items-center gap-12 md:gap-20 md:grid-cols-2"
    >
      <div className={reverse ? 'md:order-2' : ''}>
        <div className="num-pill mb-8">
          {String(index + 1).padStart(2, '0')}
        </div>
        <h3 className="font-display font-bold tracking-tight text-4xl md:text-5xl leading-[1.05]">
          {title}
        </h3>
        <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md">
          {subtitle}
        </p>
      </div>
      <div className={reverse ? 'md:order-1' : ''}>
        {children ?? (
          <div className="surface aspect-[4/3] grid place-items-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Visual preview
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
