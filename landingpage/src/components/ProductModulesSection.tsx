import { motion } from 'framer-motion';
import { productModules } from '@/data/content';
import { ProductModuleCard } from '@/components/ProductModuleCard';
import { Reveal, RevealStagger } from '@/components/fancy/Reveal';

/**
 * Product modules — the headline "strong block" of the page.
 *
 * Full-width dark panel with a subtle inner grid texture, eyebrow,
 * massive headline, three intro paragraph, then a 6-card grid of
 * product modules. Heavy reveal animations, parallax-feeling vertical
 * spacing.
 */
export const ProductModulesSection = () => {
  return (
    <section className="section">
      <div className="container-tight">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="strong-block px-6 sm:px-12 md:px-16 lg:px-20 py-20 md:py-32"
        >
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

          <div className="relative" id="features">
            <Reveal className="max-w-3xl">
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
            </Reveal>

            <RevealStagger
              className="mt-16 md:mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.1}
            >
              {productModules.map((module) => (
                <ProductModuleCard key={module.title} {...module} />
              ))}
            </RevealStagger>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
