import { motion } from 'framer-motion';
import type { ProductModuleData } from '@/types';
import { revealItem } from '@/components/fancy/Reveal';

/**
 * Product module card — v5 (lives inside the dark "Why Brand OS" strong block).
 *
 * Dark surface with thin white-on-dark border, icon in a circle outline,
 * title, description, image at the bottom in subtle grayscale. Hover
 * brightens the border.
 */
export const ProductModuleCard = ({
  icon: Icon,
  title,
  description,
  image,
}: ProductModuleData) => {
  return (
    <motion.article
      variants={revealItem}
      className="group relative rounded-[var(--radius)] border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col transition-all duration-500 hover:border-white/30 hover:bg-white/[0.06] hover:-translate-y-1"
    >
      <div className="p-7 flex-1">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="mt-5 font-display text-xl font-bold tracking-tight">
          {title}
        </h4>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">{description}</p>
      </div>
      <div className="border-t border-white/10 relative overflow-hidden">
        <img
          src={image}
          alt={`Illustration of ${title.toLowerCase()}`}
          loading="lazy"
          className="w-full h-36 object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
        />
      </div>
    </motion.article>
  );
};
