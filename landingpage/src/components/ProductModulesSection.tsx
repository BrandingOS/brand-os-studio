import { productModules } from '@/data/content';
import { ProductModuleCard } from '@/components/ProductModuleCard';

export const ProductModulesSection = () => {
  return (
    <section className="section border-t border-border">
      <div className="container-tight">
        <div className="max-w-3xl">
          <span className="eyebrow" data-animate>
            What you get
          </span>
          <h2 className="h-section mt-6" data-animate id="features">
            More than guidelines — your brand OS.
          </h2>
          <p
            className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl"
            data-animate
          >
            Live brand logic that auto-applies to every output — from slides and
            posts to print and your website. One source of truth, used everywhere.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {productModules.map((module) => (
            <ProductModuleCard key={module.title} {...module} />
          ))}
        </div>
      </div>
    </section>
  );
};
