import type { ProductModuleData } from "../types";

/**
 * ProductModuleCard — feature card on the landing page (LIGHT variant).
 *
 * White card on the light landing surface. Photo leads (16:10 letterbox,
 * full-bleed `object-cover`) so the user's named PNGs read clearly.
 * Below the photo: a small orange icon chip, dark title, muted gray
 * description, and a hairline orange accent at the bottom edge of the
 * photo to thread the brand color through the card.
 */
export const ProductModuleCard = ({
  icon: Icon,
  title,
  description,
  image,
}: ProductModuleData) => {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_12px_32px_-12px_hsl(20_30%_30%/0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-14px_hsl(20_30%_30%/0.16)] hover:border-[hsl(var(--accent-pop)/0.30)]"
      data-animate
    >
      {/* Photo well — black bed so the user's dark-themed PNGs sit
          cleanly inside the white card frame. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[hsl(0_0%_5%)]">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {/* Hairline orange accent at the photo's bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-pop)/0.55)] to-transparent" />
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--accent-pop)/0.40)] bg-[hsl(var(--accent-pop)/0.10)] text-[hsl(var(--accent-pop))]">
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="mt-3 text-base font-semibold text-foreground">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};
