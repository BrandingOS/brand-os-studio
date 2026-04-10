import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * HeroSection — v5, editorial split "Brand Once. Use Forever."
 *
 * Ported from the main-app hero the user approved (Image #32) with:
 *  - Top pills: "Input" / "Output"
 *  - Bottom pills: "Logo · Color · Type" / "Slides · Posts · Print · Web"
 *  - Subtitle: "Set it up once. Brand everything."
 *  - Balanced spacing: same gap above and below the headline row
 *  - No product mockup — just text + pills + badge + subtitle + CTAs
 *  - No bg-dot-grid on the section itself (moved to App.tsx outer wrapper
 *    so the pattern starts behind the navbar)
 *
 * Uses framer-motion entrance stagger + useEarlyAccess for the CTA.
 */
const ease = [0.22, 1, 0.36, 1] as const;

export const HeroSection = () => {
  const { open } = useEarlyAccess();

  return (
    <section className="relative overflow-hidden">
      {/* Subtle warm glow behind center badge */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 44% 44% at 50% 50%, hsl(var(--accent-pop) / 0.09), transparent 70%)',
        }}
      />

      <div className="container-tight relative z-10">
        <div className="mx-auto max-w-5xl pt-28 pb-16 md:pt-36 md:pb-20">

          {/* ── Eyebrow pill ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="flex justify-center"
          >
            <div className="glass-surface inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 shadow-soft">
              <span className="text-xs font-medium tracking-wide text-foreground">
                Set it up once
              </span>
              <ArrowRight className="h-3 w-3 text-accent-pop" />
              <span className="text-xs font-medium tracking-wide text-foreground">
                Brand everything
              </span>
            </div>
          </motion.div>

          {/* ── Headline row ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease }}
            className="hero-headline"
          >
            <h1 className="hero-word">
              Brand once.<br />Use forever.
            </h1>
          </motion.div>

          {/* ── Subtitle ─────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease }}
            className="text-center max-w-lg mx-auto mt-12 text-base md:text-lg text-muted-foreground leading-relaxed"
          >
            BrandOS connects your strategy, identity, and outputs into{' '}
            <span className="text-accent-pop font-semibold">one source of truth</span>.
          </motion.p>

          {/* ── CTAs ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.30, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button type="button" onClick={open} className="btn-primary-lg group">
              Get Early Access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#setup"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              See how the system works
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>
      </div>

      <style>{HERO_STYLES}</style>
    </section>
  );
};

const HERO_STYLES = `
/* ── Headline ─────────────────────────────────────────────────── */
.hero-headline {
  text-align: center;
  margin: 2.5rem auto;
}
.hero-word {
  font-family: var(--font-display, ui-sans-serif), system-ui, sans-serif;
  font-size: clamp(2.75rem, 7vw, 6rem);
  line-height: 0.92; font-weight: 900;
  letter-spacing: -0.04em; text-transform: uppercase;
  color: hsl(var(--foreground)); margin: 0;
}
`;
