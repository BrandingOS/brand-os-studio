import { motion } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  PenTool,
  Palette,
  Type,
  BookOpen,
  LayoutTemplate,
  Share2,
} from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * HeroSection — v5 (Brand Core composition).
 *
 * Layout: STACKED. Text block on top (centered), the visual on its own
 * below (centered). The visual is never beside the text — that was the
 * direct user feedback.
 *
 * Visual: a central "Brand Core" with six modules connected to it by
 * static lines that have real SVG arrowheads pointing into the core.
 * Modules: Logo · Colors · Type · Guidelines · Templates · Exports.
 *
 * Motion: NONE that loops. No spinning ring. No floating chips. No
 * pulsing core. The lines and chips draw in ONCE on mount via
 * framer-motion entrance variants and then sit perfectly still — calm,
 * dignified, premium. Respects prefers-reduced-motion.
 *
 * Conventions: keeps the v5 utilities (display-xl, glass-surface,
 * btn-primary-lg, container-tight, bg-dot-grid, text-accent-pop) so
 * the rest of the v5 page chrome stays cohesive.
 */

interface ChipDef {
  id: string;
  label: string;
  icon: typeof PenTool;
  /** Position around the orbit, in degrees. -90 = top, 0 = right. */
  angle: number;
}

const CHIPS: ChipDef[] = [
  { id: 'logo',       label: 'Logo',       icon: PenTool,        angle: -90  },
  { id: 'colors',     label: 'Colors',     icon: Palette,        angle: -30  },
  { id: 'type',       label: 'Type',       icon: Type,           angle:  30  },
  { id: 'guidelines', label: 'Guidelines', icon: BookOpen,       angle:  90  },
  { id: 'templates',  label: 'Templates',  icon: LayoutTemplate, angle: 150  },
  { id: 'exports',    label: 'Exports',    icon: Share2,         angle: 210  },
];

const CENTER = 300;
const SVG_RADIUS = 235;
const DOM_RADIUS_PCT = (SVG_RADIUS / 600) * 100;

function polarToSvg(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + Math.cos(rad) * radius, y: CENTER + Math.sin(rad) * radius };
}
function polarToPercent(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: 50 + Math.cos(rad) * DOM_RADIUS_PCT,
    top: 50 + Math.sin(rad) * DOM_RADIUS_PCT,
  };
}

export const HeroSection = () => {
  const { open } = useEarlyAccess();
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative pt-20 md:pt-28 pb-24 md:pb-32 bg-dot-grid animate-bg-pan overflow-hidden"
    >
      <div className="container-tight">
        {/* ── Top: text block, centered ───────────────────────────── */}
        <div className="mx-auto text-center max-w-4xl">
          {/* Eyebrow pill — real ArrowRight icon, not a text "→" */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex"
          >
            <div className="glass-surface inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent-pop" />
              <span className="text-xs font-medium tracking-wide text-foreground inline-flex items-center gap-1.5">
                One-time setup
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                Endless consistency
              </span>
            </div>
          </motion.div>

          {/* Editorial headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="display-xl mt-8"
          >
            The operating system
            <br />
            for your <span className="text-accent-pop">brand.</span>
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

          {/* CTAs */}
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
              See how the system works
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>

        {/* ── Below the text: the visual, alone ──────────────────── */}
        <BrandCoreOrbit />
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Brand Core orbit — static composition, draw-in once, then still.  */
/* ═══════════════════════════════════════════════════════════════════ */

function BrandCoreOrbit() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-24 md:mt-28 w-full max-w-2xl aspect-square"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 600 600"
        className="absolute inset-0 w-full h-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Soft halo behind the central core */}
          <radialGradient id="hero-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(var(--foreground))" stopOpacity="0.10" />
            <stop offset="55%"  stopColor="hsl(var(--foreground))" stopOpacity="0.04" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </radialGradient>

          {/* Hairline gradient for the connecting lines */}
          <linearGradient id="hero-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="hsl(var(--foreground))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.20" />
          </linearGradient>

          {/* The arrowhead — sits at the core end of every line, pointing
              inward to show flow INTO the brand core. */}
          <marker
            id="hero-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--foreground))" fillOpacity="0.55" />
          </marker>
        </defs>

        {/* Soft halo */}
        <circle cx={CENTER} cy={CENTER} r="190" fill="url(#hero-core-glow)" />

        {/* Static dashed orbit guide — NO rotation. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={SVG_RADIUS}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.10"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* Inner hairline ring — also static */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="160"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.07"
          strokeWidth="1"
        />

        {/* Connecting lines from each chip to the core, with an arrowhead
            at the core end. Drawn in once on mount via framer-motion. */}
        {CHIPS.map((chip, i) => {
          const outer = polarToSvg(chip.angle, SVG_RADIUS - 28);
          const inner = polarToSvg(chip.angle, 70);
          // Note: line goes FROM chip-side (x1) TO core-side (x2) so the
          // marker-end arrowhead lands on the core.
          return (
            <motion.line
              key={chip.id}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke="url(#hero-line)"
              strokeWidth="1.4"
              strokeLinecap="round"
              markerEnd="url(#hero-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.9,
                delay: 0.5 + i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}

        {/* Central core — solid surface, hairline ring, no pulse. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="58"
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.18"
          strokeWidth="1"
          style={{ filter: 'drop-shadow(0 8px 24px hsl(var(--foreground) / 0.10))' }}
        />
      </svg>

      {/* Central label — sits over the core circle. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 shadow-soft"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-pop" />
          <span className="text-[11px] font-semibold tracking-[0.04em] text-foreground">
            Brand Core
          </span>
        </motion.div>
      </div>

      {/* Orbital chips — DOM elements, horizontal, static.
          Position uses the same polar math as the SVG lines so endpoints
          line up exactly. NO float, NO rotation, NO loop animation. */}
      {CHIPS.map((chip, i) => {
        const Icon = chip.icon;
        const { left, top } = polarToPercent(chip.angle);
        return (
          <motion.div
            key={chip.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.55 + i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-soft whitespace-nowrap"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
              <Icon className="h-3 w-3 text-foreground" />
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              {chip.label}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
