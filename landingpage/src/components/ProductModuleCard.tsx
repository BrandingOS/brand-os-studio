import type { ProductModuleData } from '@/types';
import { RevealItem } from '@/components/fancy/Reveal';

interface ProductModuleCardProps extends ProductModuleData {
  index: number;
}

/**
 * Product module card — v5.1.
 *
 * Lives inside the dark "Why Brand OS" strong block. Each card has its
 * own viewport reveal so fast scrollers never see dim cards. Hover
 * brightens the border with the accent orange.
 */
export const ProductModuleCard = ({
  icon: Icon,
  title,
  description,
  image,
  index,
}: ProductModuleCardProps) => {
  return (
    <RevealItem index={index} className="h-full">
      <article className="group relative rounded-[var(--radius)] border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col h-full transition-all duration-500 hover:border-accent-pop/60 hover:bg-white/[0.06] hover:-translate-y-1">
        <div className="p-7 flex-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 group-hover:border-accent-pop/60 transition-colors">
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
            className="w-full h-36 object-cover opacity-70 group-hover:opacity-95 transition-opacity duration-500"
          />
        </div>
      </article>
    </RevealItem>
  );
};
