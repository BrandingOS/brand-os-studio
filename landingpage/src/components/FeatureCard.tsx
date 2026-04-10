import { motion } from 'framer-motion';
import type { FeatureCardData } from '@/types';

interface FeatureCardProps extends FeatureCardData {
  index: number;
}

/**
 * Numbered pain-point card — v5 cinematic.
 *
 * Each card does its own scroll-triggered entrance: scale up from 0.95
 * + y offset + slight blur clear. Staggered by index for the wave feel.
 * Hover lifts with an accent border.
 */
export const FeatureCard = ({ icon: Icon, title, desc, index }: FeatureCardProps) => (
  <motion.div
    className="h-full"
    initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(3px)' }}
    whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{
      duration: 0.55,
      delay: index * 0.08,
      ease: [0.22, 1, 0.36, 1],
    }}
  >
    <div className="card-soft p-8 md:p-10 h-full transition-all duration-500 hover:border-accent-pop hover:-translate-y-1 hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <span className="font-mono text-sm tracking-widest text-accent-pop font-semibold">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <h3 className="mt-12 h-card">{title}</h3>
      <p className="mt-3 text-base text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);
