import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { ArrowRight, Layout, Printer, Globe, Sparkles } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

import heroImage from '@/assets/landing/hero-mockup.png';

/** True when viewport is ≥ 768px (md breakpoint). */
function useIsMd() {
  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMd;
}

/**
 * HeroSection — v5 (v1-inspired, amplified).
 *
 * Centered massive editorial display headline with a typing reveal,
 * subtitle, and ONE primary "Get Early Access" button that opens the
 * modal. Below: the hero product mockup framed by a soft surface, with
 * three floating glass tiles (Guidelines / Business Card / Website)
 * gently animating, all backed by twin ripple rings.
 *
 * The hero image and tiles get a subtle scroll-driven parallax for
 * the cinematic feel. Parallax is reduced on mobile to avoid jank.
 */
export const HeroSection = () => {
  const { open } = useEarlyAccess();
  const sectionRef = useRef<HTMLElement>(null);
  const isMd = useIsMd();

  // Subtle scroll parallax — reduced on mobile to avoid jank
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, isMd ? -120 : -40]);
  const tilesY = useTransform(scrollYProgress, [0, 1], [0, isMd ? -60 : -20]);

  return (
    <section
      ref={sectionRef}
      className="relative pt-20 md:pt-28 pb-24 md:pb-32 bg-dot-grid animate-bg-pan overflow-hidden"
    >
      <div className="container-tight">
        {/* ── Top: hero text block ──────────────────────────────── */}
        <div className="mx-auto text-center max-w-4xl">
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex"
          >
            <div className="glass-surface inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent-pop" />
              <span className="text-xs font-medium tracking-wide text-foreground">
                One-time setup → Endless consistency
              </span>
            </div>
          </motion.div>

          {/* Editorial headline — refined size */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="display-xl mt-8"
          >
            The operating system
            <br />
            for your <span className="text-accent-pop">brand</span>.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
          >
            Strategy, identity, assets, and outputs — connected by one
            source of truth. Build the system once. Generate everything
            from it, forever.
          </motion.p>

          {/* Primary CTA button — opens modal */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={open}
              className="btn-primary-lg group"
            >
              Get Early Access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#setup"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              See how it works
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>

        {/* ── Bottom: hero mockup with ripple + floating tiles ──── */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-20 md:mt-28 mx-auto max-w-5xl"
        >
          {/* Ripple background */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 md:h-72 md:w-72 rounded-full border border-border/60 animate-ripple-slow" />
            <div
              className="absolute h-64 w-64 md:h-96 md:w-96 rounded-full border border-border/40 animate-ripple-slow"
              style={{ animationDelay: '1.5s' }}
            />
          </div>

          {/* The framed product image with parallax */}
          <motion.div
            style={{ y: imageY }}
            className="relative surface shadow-elegant overflow-hidden"
          >
            <img
              src={heroImage}
              alt="Brand OS dashboard preview"
              loading="eager"
              className="w-full aspect-[16/9] object-cover"
            />
          </motion.div>

          {/* Floating glass tiles with parallax */}
          <motion.div
            style={{ y: tilesY }}
            className="pointer-events-none absolute -right-2 -top-6 hidden md:block animate-float-tile"
          >
            <div className="float-tile">
              <Layout className="h-4 w-4" />
              <span className="text-xs font-medium">Guidelines</span>
            </div>
          </motion.div>
          <motion.div
            style={{ y: tilesY }}
            className="pointer-events-none absolute left-4 -bottom-6 hidden md:block animate-float-tile"
          >
            <div className="float-tile" style={{ animationDelay: '600ms' }}>
              <Printer className="h-4 w-4" />
              <span className="text-xs font-medium">Business Card</span>
            </div>
          </motion.div>
          <motion.div
            style={{ y: tilesY }}
            className="pointer-events-none absolute right-10 -bottom-2 hidden md:block animate-float-tile"
          >
            <div className="float-tile" style={{ animationDelay: '1200ms' }}>
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium">Website</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
