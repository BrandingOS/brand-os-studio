import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * HeroSection — v5, light editorial "Brand Once. Use Forever."
 *
 * Ported from the main-app hero and refined: tightened the max-width so
 * dashed lines don't stretch to the screen edges, rebalanced the word
 * sizes, kept the tag-pill rows inside a sensible container so the
 * composition reads as one unified block instead of scattered elements.
 *
 * Cream surface, near-black ink, single orange accent. Same tokens the
 * rest of the v5 page uses.
 */
const ease = [0.22, 1, 0.36, 1] as const;

export const HeroSection = () => {
  const { open } = useEarlyAccess();

  return (
    <section className="hero-v5 relative overflow-hidden">
      <div className="hero-v5-bg" aria-hidden="true" />

      <div className="container-tight relative z-10">
        <div className="mx-auto max-w-5xl pt-28 pb-20 md:pt-36 md:pb-28">
          {/* ── Top tag row ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="hero-v5-tags"
          >
            <span className="hero-v5-pill">Strategy</span>
            <span className="hero-v5-line-grow" />
            <span className="hero-v5-pill">Output</span>
          </motion.div>

          {/* ── Main headline row ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease }}
            className="hero-v5-row"
          >
            <h1 className="hero-v5-word hero-v5-left">
              Brand<br />once.
            </h1>

            <div className="hero-v5-badge-wrap">
              <div className="hero-v5-badge">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10" />
              </div>
            </div>

            <h1 className="hero-v5-word hero-v5-right">
              Use<br />forever.
            </h1>
          </motion.div>

          {/* ── Bottom tag row ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease }}
            className="hero-v5-tags"
          >
            <span className="hero-v5-pill">Logo · Color · Type</span>
            <span className="hero-v5-line-grow" />
            <span className="hero-v5-pill">Slides · Posts · Print · Web</span>
          </motion.div>

          {/* ── Subtitle ─────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
            className="hero-v5-subtitle"
          >
            BrandOS connects your strategy, identity, and outputs into{' '}
            <span className="hero-v5-em">one source of truth</span>.
          </motion.p>

          {/* ── CTAs ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease }}
            className="hero-v5-cta"
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
.hero-v5 { position: relative; }

.hero-v5-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 50% 50% at 50% 50%,
      hsl(var(--accent-pop) / 0.08) 0%,
      hsl(var(--accent-pop) / 0.03) 35%,
      transparent 70%);
}

/* ── Tag rows ─────────────────────────────────────────────────── */
.hero-v5-tags {
  display: flex; align-items: center; justify-content: center;
  gap: 0; max-width: 44rem; margin: 0 auto;
}
.hero-v5-pill {
  display: inline-flex; align-items: center;
  padding: 0.4rem 0.85rem; border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  box-shadow: 0 2px 10px hsl(20 30% 30% / 0.04);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: hsl(var(--foreground)); white-space: nowrap; flex-shrink: 0;
}
.hero-v5-line-grow {
  flex: 1 1 auto; height: 1px; min-width: 2rem;
  background-image: linear-gradient(to right,
    hsl(var(--foreground) / 0.18) 50%, transparent 50%);
  background-size: 6px 1px; background-repeat: repeat-x;
}

/* ── Headline row (grid: left word · badge · right word) ─────── */
.hero-v5-row {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 1.5rem;
  margin: 2.5rem auto 2.5rem; max-width: 52rem;
}
@media (max-width: 720px) {
  .hero-v5-row { grid-template-columns: 1fr; gap: 1rem; text-align: center; }
}

.hero-v5-word {
  font-family: var(--font-display, ui-sans-serif), system-ui, sans-serif;
  font-size: clamp(3rem, 7vw, 6rem);
  line-height: 0.88; font-weight: 900;
  letter-spacing: -0.045em; text-transform: uppercase;
  color: hsl(var(--foreground)); margin: 0;
}
.hero-v5-left  { text-align: right;  justify-self: end; }
.hero-v5-right { text-align: left;   justify-self: start; }
@media (max-width: 720px) {
  .hero-v5-left, .hero-v5-right { text-align: center; justify-self: center; }
}

/* Center badge */
.hero-v5-badge-wrap { display: flex; align-items: center; justify-content: center; }
.hero-v5-badge {
  width: 88px; height: 88px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  background: hsl(var(--foreground));
  color: hsl(var(--accent-pop));
  box-shadow:
    0 0 0 5px hsl(var(--background)),
    0 0 0 6px hsl(var(--border)),
    0 24px 52px hsl(var(--accent-pop) / 0.22);
  position: relative;
}
.hero-v5-badge::after {
  content: ''; position: absolute; top: 7px; right: 7px;
  width: 5px; height: 5px; border-radius: 50%;
  background: hsl(var(--accent-pop));
}
@media (min-width: 768px) {
  .hero-v5-badge { width: 110px; height: 110px; border-radius: 24px; }
}

/* ── Subtitle + CTA ───────────────────────────────────────────── */
.hero-v5-subtitle {
  text-align: center; max-width: 38rem;
  margin: 2.5rem auto 0; font-size: 1.0625rem;
  line-height: 1.65; color: hsl(var(--muted-foreground));
}
.hero-v5-em { color: hsl(var(--accent-pop)); font-weight: 600; }

.hero-v5-cta {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; margin-top: 2rem;
}
@media (min-width: 640px) {
  .hero-v5-cta { flex-direction: row; justify-content: center; gap: 1.25rem; }
}
`;
