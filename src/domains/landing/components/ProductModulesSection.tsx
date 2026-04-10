import { productModules } from '@/domains/landing/data/content';
import { ProductModuleCard } from '@/domains/landing/components/ProductModuleCard';
import { Reveal } from '@/domains/landing/components/fancy/Reveal';
import { ArrowRight } from 'lucide-react';
import { useEarlyAccess } from '@/domains/landing/components/EarlyAccessProvider';

export const ProductModulesSection = () => {
  const { open } = useEarlyAccess();

  return (
    <section className="section" id="features">
      <div className="container-tight">
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
