import { productModules } from '@/data/content';
import { ProductModuleCard } from '@/components/ProductModuleCard';
import { Reveal, RevealStagger } from '@/components/fancy/Reveal';

export const ProductModulesSection = () => {
  return (
    <section className="section border-t border-border relative overflow-hidden">
      {/* Subtle violet aurora behind the section */}
      <div
        aria-hidden
        className="aurora-blob aurora-blob-violet"
        style={{
          width: 700,
          height: 700,
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.18,
        }}
      />

      <div className="container-tight relative z-10">
        <Reveal className="max-w-3xl">
          <span className="eyebrow">What you get</span>
          <h2 className="h-section mt-6 text-foreground" id="features">
            More than guidelines —
            <br />
            <span className="gradient-text">your brand OS.</span>
          </h2>
          <p className="mt-6 text-lg text-fg-muted leading-relaxed max-w-2xl">
            Live brand logic that auto-applies to every output — from slides
            and posts to print and your website. One source of truth, used
            everywhere.
          </p>
        </Reveal>

        <RevealStagger className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {productModules.map((module, i) => (
            <ProductModuleCard key={module.title} {...module} featured={i === 0} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
};
