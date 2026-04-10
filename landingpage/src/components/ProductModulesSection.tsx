import { productModules } from '@/data/content';
import { ProductModuleCard } from '@/components/ProductModuleCard';
import { Reveal } from '@/components/fancy/Reveal';
import { ArrowRight } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * ProductModulesSection — "Why Brand OS" + the all-in-one feature grid.
 *
 * LIGHT surface — user explicitly asked for this NOT to be dark. Warm
 * cream bg matching the rest of the landing, with a subtle orange radial
 * glow behind the heading. Cards are white with photo on top (16:10),
 * orange icon chip, dark text.
 */
export const ProductModulesSection = () => {
  const { open } = useEarlyAccess();

  return (
    <section className="section" id="features">
      <div className="container-tight">
        {/* ── Why Brand OS intro ──────────────────────────────────── */}
        <Reveal y={32} duration={0.55}>
          <div className="mx-auto max-w-3xl text-center mb-16 md:mb-20">
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-accent-pop" />
              Why Brand OS
            </span>
            <h2 className="h-section mt-6">
              More than guidelines —
              <br />
              <span className="text-accent-pop">your brand OS.</span>
            </h2>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Live brand logic that auto-applies to every output — from
              slides and posts to print and your website. One source of
              truth, used everywhere.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={open}
                className="btn-primary group"
              >
                Get Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </Reveal>

        {/* ── Feature grid heading — no Reveal wrapper here because
            the cards below have their own scroll-triggered motion.
            A wrapper would create a "double load" feel. */}
        <div className="text-center mb-12">
          <h3 className="h-section">
            All-in-one branding{' '}
            <span className="text-accent-pop">powerhouse.</span>
          </h3>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto">
            Nine modules, one connected system.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {productModules.map((module, i) => (
            <ProductModuleCard key={module.title} index={i} {...module} />
          ))}
        </div>
      </div>
    </section>
  );
};
