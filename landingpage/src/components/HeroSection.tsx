import { ArrowRight } from 'lucide-react';
import { EarlyAccessForm } from '@/components/EarlyAccessForm';

const heroImage =
  'https://i.pinimg.com/1200x/18/ec/a2/18eca28a85c40aa0b255742cbe3a0656.jpg';

/**
 * Hero — Relume-style.
 *
 * Massive editorial display headline. Eyebrow tag. Generous spacing.
 * Two-row CTA: email form + secondary "see how it works" link.
 * Hero image lives below, full-width, framed by a thin border.
 *
 * No glass tiles. No ripple animations. No floating decorations.
 * The headline does the heavy lifting. Type leads. Everything else recedes.
 */
export const HeroSection = () => {
  return (
    <section className="pt-20 md:pt-28 pb-20 md:pb-28">
      <div className="container-tight">
        {/* ── Top: text block ─────────────────────────────────────── */}
        <div className="max-w-5xl">
          <span className="eyebrow" data-animate>
            Brand OS &nbsp;·&nbsp; Now in private preview
          </span>

          <h1 className="display-lg mt-8" data-animate>
            Build a brand once.
            <br />
            <span className="text-muted-foreground">Use it everywhere.</span>
          </h1>

          <p
            className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            data-animate
          >
            Create your brand system once — Brand OS syncs your logo, colors, type
            and voice across every asset, automatically. One source of truth, used
            everywhere.
          </p>

          {/* Early access — primary CTA */}
          <div id="early-access" className="mt-10 max-w-xl scroll-mt-32" data-animate>
            <EarlyAccessForm />
            <p className="mt-3 text-sm text-muted-foreground">
              Be first in line. No spam — just one launch email.
            </p>
          </div>

          {/* Secondary link */}
          <a
            href="#setup"
            className="group mt-10 inline-flex items-center gap-2 text-sm font-medium text-foreground"
            data-animate
          >
            See how it works
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* ── Bottom: hero image, full bleed of the container ────── */}
        <div className="mt-20 md:mt-28" data-animate>
          <div className="surface overflow-hidden">
            <img
              src={heroImage}
              alt="Brand OS product preview"
              loading="eager"
              className="w-full aspect-[16/9] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
