import type { ProductModuleData } from "../types";

/**
 * ProductModuleCard — feature card on the landing page.
 *
 * Reworked for the user's named photos: the image area is now a 16:10
 * letterbox using `object-cover` with `object-center`, large enough that
 * the photo's actual content (folder mockups, glow, etc.) reads as the
 * hero of the card instead of being cropped to a thin strip. The icon +
 * title + description live BELOW the image — flipped vs the previous
 * layout — so the photo can lead.
 */
export const ProductModuleCard = ({ icon: Icon, title, description, image }: ProductModuleData) => {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[hsl(0_0%_8%)] panel-dark shadow-elegant transition-transform duration-300 hover:-translate-y-1"
      data-animate
    >
      {/* Photo well — black-on-orange aesthetic, full bleed at the top */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[hsl(0_0%_4%)]">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* Hairline accent at the bottom edge of the photo */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-pop)/0.55)] to-transparent" />
      </div>

      {/* Body — icon, title, description */}
      <div className="p-5">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--accent-pop)/0.4)] bg-[hsl(var(--accent-pop)/0.10)] text-[hsl(var(--accent-pop))]">
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="mt-3 text-base font-semibold text-white">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{description}</p>
      </div>
    </div>
  );
};