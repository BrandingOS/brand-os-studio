import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEarlyAccess } from '@/domains/landing/components/EarlyAccessProvider';

const ease = [0.22, 1, 0.36, 1] as const;

export const HeroSection = () => {
  const { open } = useEarlyAccess();

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 44% 44% at 50% 50%, hsl(var(--accent-pop) / 0.09), transparent 70%)',
        }}
      />

      <div className="container-tight relative z-10">
        <div className="mx-auto max-w-5xl pt-28 pb-16 md:pt-36 md:pb-20">

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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease }}
            className="flex items-center justify-center max-w-[42rem] mx-auto gap-0"
          >
            <span className="hero-dot" />
            <span className="hero-line" />
            <span className="hero-pill">Logo · Color · Type</span>
            <span className="hero-line hero-line-grow" />
            <span className="hero-pill">Slides · Posts · Print · Web</span>
            <span className="hero-line" />
            <span className="hero-dot" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease }}
            className="text-center max-w-lg mx-auto mt-12 text-base md:text-lg text-muted-foreground leading-relaxed"
          >
            BrandingOS connects your strategy, identity, and outputs into{' '}
            <span className="text-accent-pop font-semibold">one source of truth</span>.
          </motion.p>

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
.hero-pill {
  display: inline-flex; align-items: center;
  padding: 0.4rem 0.85rem; border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  box-shadow: var(--shadow-soft);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: hsl(var(--foreground)); white-space: nowrap; flex-shrink: 0;
}
.hero-line {
  flex: 0 0 28px; height: 1px;
  background-image: linear-gradient(to right,
    hsl(var(--foreground) / 0.20) 50%, transparent 50%);
  background-size: 6px 1px; background-repeat: repeat-x;
}
.hero-line-grow { flex: 1 1 auto; }
.hero-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: hsl(var(--accent-pop)); flex-shrink: 0;
}

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
