import type { ProductModuleData } from '@/types';

/**
 * Product module card — Relume light theme.
 *
 * Thin border, white background, image at the bottom in grayscale.
 * No more dark panel / gradient overlay.
 */
export const ProductModuleCard = ({
  icon: Icon,
  title,
  description,
  image,
}: ProductModuleData) => {
  return (
    <article
      className="surface overflow-hidden flex flex-col transition-all duration-300 hover:border-foreground hover:-translate-y-1"
      data-animate
    >
      <div className="p-7 flex-1">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="mt-5 font-display text-xl font-bold tracking-tight">{title}</h4>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="border-t border-border">
        <img
          src={image}
          alt={`Illustration of ${title.toLowerCase()}`}
          loading="lazy"
          className="w-full h-36 object-cover grayscale"
        />
      </div>
    </article>
  );
};
