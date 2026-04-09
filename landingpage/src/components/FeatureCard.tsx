import { motion } from 'framer-motion';
import type { FeatureCardData } from '@/types';
import { revealItem } from '@/components/fancy/Reveal';

interface FeatureCardProps extends FeatureCardData {
  index: number;
}

/**
 * Numbered pain-point card — v5 Relume style.
 *
 * Bigger card with a big "01/02/03" tag in the top corner, icon in a
 * thin-bordered circle, h-card title, generous body. Hover lifts the
 * card with a soft shadow ramp.
 */
export const FeatureCard = ({ icon: Icon, title, desc, index }: FeatureCardProps) => (
  <motion.div variants={revealItem} className="card-soft p-8 md:p-10 h-full">
    <div className="flex items-start justify-between">
      <span className="num-tag text-base">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <h3 className="mt-12 h-card">{title}</h3>
    <p className="mt-3 text-base text-muted-foreground leading-relaxed">{desc}</p>
  </motion.div>
);
