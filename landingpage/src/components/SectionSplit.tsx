import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface SectionSplitProps {
  index: number;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * Two-column setup-step layout — v5 cinematic variant.
 *
 * Sexier scroll-driven motion:
 * - Photo: subtle parallax (±40px) + gentle scale-up on entrance.
 * - Text: slides in from the side with a clip-path reveal.
 * - Number pill: scale + blur pop for personality.
 */
export default function SectionSplit({
  index,
  title,
  subtitle,
  children,
}: SectionSplitProps) {
  const reverse = index % 2 === 1;
  const ref = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax on the photo column
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const photoScale = useTransform(scrollYProgress, [0, 0.5], [0.96, 1]);

  const textX = reverse ? 30 : -30;

  return (
    <div ref={ref} className="grid items-center gap-12 md:gap-20 md:grid-cols-2">
      {/* Text — slide from side + clip reveal */}
      <motion.div
        className={reverse ? 'md:order-2' : ''}
        initial={{ opacity: 0, x: textX }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="num-pill mb-8"
          initial={{ opacity: 0, scale: 0.6, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {String(index + 1).padStart(2, '0')}
        </motion.div>

        <h3 className="font-display font-bold tracking-tight text-4xl md:text-5xl leading-[1.05]">
          {title}
        </h3>
        <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md">
          {subtitle}
        </p>
      </motion.div>

      {/* Photo — parallax + scale entrance */}
      <motion.div
        className={reverse ? 'md:order-1' : ''}
        style={{ y: photoY, scale: photoScale }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
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
