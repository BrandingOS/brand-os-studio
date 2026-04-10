import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState, type ReactNode } from 'react';

interface SectionSplitProps {
  index: number;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * Two-column setup-step layout — v5.
 *
 * Fix: SINGLE animation trigger per side. Previously the outer text
 * wrapper AND the inner num-pill both had whileInView, causing a
 * double-load feel. Now only ONE motion.div per column handles the
 * entrance, and children (pill, title, subtitle) inherit the parent's
 * visibility. Photo column uses scroll-parallax only, no separate
 * fade entrance.
 */
export default function SectionSplit({
  index,
  title,
  subtitle,
  children,
}: SectionSplitProps) {
  const reverse = index % 2 === 1;
  const ref = useRef<HTMLDivElement>(null);

  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], isMd ? [40, -40] : [12, -12]);

  const textX = reverse ? 30 : -30;

  return (
    <div ref={ref} className="grid items-center gap-12 md:gap-20 md:grid-cols-2">
      {/* Text — single animation trigger for the whole column */}
      <motion.div
        className={reverse ? 'md:order-2' : ''}
        initial={{ opacity: 0, x: textX }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="num-pill mb-8">
          {String(index + 1).padStart(2, '0')}
        </div>
        <h3 className="font-display font-bold tracking-tight text-3xl sm:text-4xl md:text-5xl leading-[1.05]">
          {title}
        </h3>
        <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md">
          {subtitle}
        </p>
      </motion.div>

      {/* Photo — parallax only, no separate fade entrance */}
      <motion.div
        className={reverse ? 'md:order-1' : ''}
        style={{ y: photoY }}
      >
        {children ?? (
          <div className="surface aspect-[4/3] grid place-items-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Visual preview
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
