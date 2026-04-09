import { productModules } from '@/data/content';
import { ProductModuleCard } from '@/components/ProductModuleCard';
import { Reveal } from '@/components/fancy/Reveal';

/**
 * Product modules — the headline "strong block" of the page.
 *
 * Full-bleed dark panel. Each module card now has its own scroll
 * trigger (no more parent stagger that strands fast-scrollers at opacity 0).
 */
export const ProductModulesSection = () => {
  return (
    <section className="section">
      <div className="container-tight">
        <Reveal y={60} duration={1.0}>
          <div className="strong-block px-6 sm:px-12 md:px-16 lg:px-20 py-20 md:py-28">
            {/* Inner subtle grid texture */}
            <div aria-hidden className="absolute inset-0 panel-grid opacity-60 pointer-events-none" />
            {/* Soft top-left highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(80% 60% at 20% 0%, hsl(0 0% 100% / 0.05) 0%, transparent 60%)',
              }}
            />
            {/* Subtle accent glow bottom-right */}
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
              style={{
                background:
                  'radial-gradient(circle, hsl(var(--accent-pop)) 0%, transparent 60%)',
                filter: 'blur(60px)',
              }}
            />

            <div className="relative" id="features">
              <div className="max-w-3xl">
                <span className="eyebrow-light">Why Brand OS</span>
                <h2 className="h-section mt-6 text-[hsl(var(--panel-foreground))]">
                  More than guidelines —
                  <br />
                  your brand OS.
                </h2>
                <p className="mt-6 text-lg md:text-xl text-white/65 leading-relaxed max-w-2xl">
                  Live brand logic that auto-applies to every output — from
                  slides and posts to print and your website. One source of
                  truth, used everywhere.
                </p>
              </div>

              <div className="mt-16 md:mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {productModules.map((module, i) => (
                  <ProductModuleCard key={module.title} index={i} {...module} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
