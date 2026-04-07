import { motion } from 'framer-motion';
import type { FeatureCardData } from '@/types';
import { SpotlightCard } from '@/components/fancy/SpotlightCard';
import { revealItem } from '@/components/fancy/Reveal';

interface FeatureCardProps extends FeatureCardData {
  index: number;
}

/**
 * Numbered pain-point card with cursor-following violet spotlight.
 * Lives inside a `RevealStagger` parent so it inherits the stagger.
 */
export const FeatureCard = ({ icon: Icon, title, desc, index }: FeatureCardProps) => (
  <motion.div variants={revealItem}>
    <SpotlightCard className="p-8 md:p-10 h-full">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm tracking-widest text-fg-dim">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet/20 to-pink/20 border border-violet/30">
          <Icon className="h-5 w-5 text-violet" />
        </span>
      </div>
      <h3 className="mt-10 font-display text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-base text-fg-muted leading-relaxed">{desc}</p>
    </SpotlightCard>
  </motion.div>
);
