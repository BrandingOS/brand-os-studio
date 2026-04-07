import { motion } from 'framer-motion';
import type { ProductModuleData } from '@/types';
import { SpotlightCard } from '@/components/fancy/SpotlightCard';
import { revealItem } from '@/components/fancy/Reveal';

interface ProductModuleCardProps extends ProductModuleData {
  featured?: boolean;
}

/**
 * Product module card with optional border-beam halo on the featured one.
 * Cursor-following spotlight on every card.
 */
export const ProductModuleCard = ({
  icon: Icon,
  title,
  description,
  image,
  featured = false,
}: ProductModuleCardProps) => {
  return (
    <motion.div variants={revealItem} className={featured ? 'md:col-span-2' : ''}>
      <SpotlightCard
        className={`overflow-hidden flex flex-col h-full ${featured ? 'border-beam' : ''}`}
      >
        <div className="p-7 md:p-8 flex-1">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-violet/20 to-pink/20 border border-violet/30">
            <Icon className="h-5 w-5 text-violet" />
          </div>
          <h4 className="mt-5 font-display text-xl font-bold tracking-tight text-foreground">
            {title}
          </h4>
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">{description}</p>
        </div>
        <div className="border-t border-border relative">
          <img
            src={image}
            alt={`Illustration of ${title.toLowerCase()}`}
            loading="lazy"
            className={`w-full object-cover ${featured ? 'h-48' : 'h-36'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--bg))]/40 to-transparent pointer-events-none" />
        </div>
      </SpotlightCard>
    </motion.div>
  );
};
