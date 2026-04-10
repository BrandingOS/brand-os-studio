import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * HeroSection — v5, cinematic editorial entrance.
 *
 * Entrance choreography (~2s):
 *   0.0s  tag pills slide in from sides + dashed line draws (scaleX)
 *   0.3s  big words clip-path reveal from below, staggered L→R
 *   0.4s  center badge pops in with scale + blur + subtle rotation
 *   0.8s  bottom tag row enters
 *   1.0s  subtitle fades up with blur-clear
 *   1.2s  CTA row fades in
 *   1.5s  badge starts a very slow ambient float — subtle, never distracting
 *
 * After entrance: everything is still except the background dot-grid pan
 * and the badge's slow float. No spinning. No looping glow. Calm premium.
 */
const ease = [0.22, 1, 0.36, 1] as const;

export const HeroSection = () => {
  const { open } = useEarlyAccess();
  const sectionRef = useRef<HTMLElement>(null);
  const [badgeRevealed, setBadgeRevealed] = useState(false);

  // Subtle parallax on scroll — the badge scales down gently as user scrolls
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const badgeY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const badgeScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.92]);

  return (
    <section
      ref={sectionRef}
      className="hero-v5 relative overflow-hidden bg-dot-grid animate-bg-pan"
    >
      {/* Warm accent glow behind center */}
      <div className="hero-v5-glow" aria-hidden="true" />

      <div className="container-tight relative z-10">
        <div className="mx-auto max-w-5xl pt-28 pb-20 md:pt-36 md:pb-28">

          {/* ── Top tag row — pills slide in from sides, line draws ── */}
          <div className="hero-v5-tags">
            <motion.span
              className="hero-v5-pill"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease }}
            >
              Strategy
            </motion.span>
            <motion.span
              className="hero-v5-line-grow"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease }}
              style={{ transformOrigin: 'center' }}
            />
            <motion.span
              className="hero-v5-pill"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease }}
            >
              Output
            </motion.span>
          </div>

          {/* ── Main headline — clip-path reveal from below per word ── */}
          <div className="hero-v5-row">
            {/* Left: BRAND ONCE. */}
            <div className="hero-v5-word-wrap hero-v5-left overflow-hidden">
              <motion.h1
                className="hero-v5-word"
                initial={{ clipPath: 'inset(100% 0 0 0)', y: 40 }}
                animate={{ clipPath: 'inset(0% 0 0 0)', y: 0 }}
                transition={{ duration: 0.85, delay: 0.25, ease }}
              >
                Brand<br />once.
              </motion.h1>
            </div>

            {/* Center badge — scale + blur pop with overshoot feel */}
            <motion.div
              className="hero-v5-badge-wrap"
              initial={{ opacity: 0, scale: 0.55, filter: 'blur(12px)', rotate: -10 }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', rotate: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease }}
              onAnimationComplete={() => setBadgeRevealed(true)}
              style={{ y: badgeY, scale: badgeScale }}
            >
              <div className={`hero-v5-badge ${badgeRevealed ? 'hero-v5-badge-float' : ''}`}>
                <Sparkles className="h-8 w-8 md:h-10 md:w-10" />
                {/* Shine sweep — a moving highlight that runs once after reveal */}
                {badgeRevealed && <div className="hero-v5-shine" />}
              </div>
            </motion.div>

            {/* Right: USE FOREVER. */}
            <div className="hero-v5-word-wrap hero-v5-right overflow-hidden">
              <motion.h1
                className="hero-v5-word"
                initial={{ clipPath: 'inset(100% 0 0 0)', y: 40 }}
                animate={{ clipPath: 'inset(0% 0 0 0)', y: 0 }}
                transition={{ duration: 0.85, delay: 0.35, ease }}
              >
                Use<br />forever.
              </motion.h1>
            </div>
          </div>

          {/* ── Bottom tag row ────────────────────────────────────── */}
          <div className="hero-v5-tags">
            <motion.span
              className="hero-v5-pill"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7, ease }}
            >
              Logo · Color · Type
            </motion.span>
            <motion.span
              className="hero-v5-line-grow"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.75, ease }}
              style={{ transformOrigin: 'center' }}
            />
            <motion.span
              className="hero-v5-pill"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7, ease }}
            >
              Slides · Posts · Print · Web
            </motion.span>
          </div>

          {/* ── Subtitle — fade up with blur-clear ───────────────── */}
          <motion.p
            className="hero-v5-subtitle"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.95, ease }}
          >
            BrandOS connects your strategy, identity, and outputs into{' '}
            <span className="hero-v5-em">one source of truth</span>.
          </motion.p>

          {/* ── CTAs — staggered slide up ─────────────────────────── */}
          <div className="hero-v5-cta">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1, ease }}
            >
              <button type="button" onClick={open} className="btn-primary-lg group">
                Get Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
            <motion.a
              href="#setup"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2, ease }}
            >
              See how the system works
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.a>
          </div>
        </div>
      </div>

      <style>{HERO_STYLES}</style>
    </section>
  );
};

const HERO_STYLES = `
.hero-v5 { position: relative; }

.hero-v5-glow {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 44% 44% at 50% 50%,
      hsl(var(--accent-pop) / 0.09) 0%,
      hsl(var(--accent-pop) / 0.03) 40%,
      transparent 70%);
}

/* ── Tag rows ─────────────────────────────────────────────────── */
.hero-v5-tags {
  display: flex; align-items: center; justify-content: center;
  gap: 0; max-width: 42rem; margin: 0 auto;
}
.hero-v5-pill {
  display: inline-flex; align-items: center;
  padding: 0.4rem 0.85rem; border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  box-shadow: var(--shadow-soft);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: hsl(var(--foreground)); white-space: nowrap; flex-shrink: 0;
}
.hero-v5-line-grow {
  flex: 1 1 auto; height: 1px; min-width: 1.5rem;
  background-image: linear-gradient(to right,
    hsl(var(--foreground) / 0.20) 50%, transparent 50%);
  background-size: 6px 1px; background-repeat: repeat-x;
}

/* ── Headline row ─────────────────────────────────────────────── */
.hero-v5-row {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 1.25rem;
  margin: 2rem auto 2rem; max-width: 52rem;
}
@media (max-width: 720px) {
  .hero-v5-row { grid-template-columns: 1fr; gap: 0.75rem; text-align: center; }
}

.hero-v5-word-wrap { overflow: hidden; }
.hero-v5-left  { text-align: right;  justify-self: end; }
.hero-v5-right { text-align: left;   justify-self: start; }
@media (max-width: 720px) {
  .hero-v5-left, .hero-v5-right { text-align: center; justify-self: center; }
}

.hero-v5-word {
  font-family: var(--font-display, ui-sans-serif), system-ui, sans-serif;
  font-size: clamp(3rem, 7.5vw, 6.5rem);
  line-height: 0.86; font-weight: 900;
  letter-spacing: -0.05em; text-transform: uppercase;
  color: hsl(var(--foreground)); margin: 0;
}

/* Center badge — black square with orange sparkle + scroll parallax */
.hero-v5-badge-wrap {
  display: flex; align-items: center; justify-content: center;
  will-change: transform;
}
.hero-v5-badge {
  width: 88px; height: 88px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  background: hsl(var(--foreground));
  color: hsl(var(--accent-pop));
  box-shadow:
    0 0 0 5px hsl(var(--background)),
    0 0 0 6px hsl(var(--border)),
    0 28px 60px hsl(var(--accent-pop) / 0.25);
  position: relative; overflow: hidden;
}
.hero-v5-badge::after {
  content: ''; position: absolute; top: 7px; right: 7px;
  width: 5px; height: 5px; border-radius: 50%;
  background: hsl(var(--accent-pop));
}
@media (min-width: 768px) {
  .hero-v5-badge { width: 112px; height: 112px; border-radius: 24px; }
}

/* Subtle ambient float AFTER the entrance animation completes */
.hero-v5-badge-float {
  animation: hero-float 7s ease-in-out infinite;
}

/* Shine sweep — a single diagonal highlight that runs once */
.hero-v5-shine {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 38%,
    rgba(255, 255, 255, 0.18) 44%,
    rgba(255, 255, 255, 0.22) 50%,
    transparent 56%
  );
  animation: hero-shine 1.4s ease-out forwards;
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

/* ── Keyframes ────────────────────────────────────────────────── */
@keyframes hero-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes hero-shine {
  0%   { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
  30%  { opacity: 1; }
  100% { transform: translateX(200%) skewX(-15deg); opacity: 0; }
}
`;
