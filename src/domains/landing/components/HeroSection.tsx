/**
 * HeroSection — BrandOS landing hero.
 *
 * Concept: a central "Brand Core" with six branded modules in elegant
 * orbit around it — Logo, Colors, Type, Guidelines, Templates, Exports.
 * Refined editorial composition. The visual makes the message obvious in
 * under two seconds: BrandOS is the operating system that connects every
 * brand decision into one system.
 *
 * Design notes:
 *  - Two-column on lg+ (text left, orbit right). Single column on mobile.
 *  - SVG drives the connecting lines + orbital guides; absolute-positioned
 *    DOM chips sit on top so the icons + labels stay crisp at every size.
 *  - Motion: lines draw in once on mount, then ambient pulse on the core,
 *    a slow ring rotation, and gentle floating on each chip. No GSAP,
 *    no framer-motion — pure CSS keyframes scoped to this component.
 *  - Respects `prefers-reduced-motion`.
 *
 * Drop-in: same exported name + props as the previous hero, so Index.tsx
 * doesn't need to change.
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PenTool,
  Palette,
  Type,
  BookOpen,
  LayoutTemplate,
  Share2,
  Sparkles,
  ArrowRight,
  PlayCircle,
} from 'lucide-react';

interface HeroSectionProps {
  onBrandNameChange: (name: string) => void;
  onStartClick: () => void;
  brandName: string;
}

interface OrbitChip {
  id: string;
  label: string;
  icon: typeof PenTool;
  /** Position on the orbit, in degrees. -90 = top, 0 = right, 90 = bottom. */
  angle: number;
  /** When to start the chip's stagger animation (ms). */
  delay: number;
}

const CHIPS: OrbitChip[] = [
  { id: 'logo',       label: 'Logo',       icon: PenTool,        angle: -90,  delay: 100 },
  { id: 'colors',     label: 'Colors',     icon: Palette,        angle: -30,  delay: 220 },
  { id: 'type',       label: 'Type',       icon: Type,           angle:  30,  delay: 340 },
  { id: 'guidelines', label: 'Guidelines', icon: BookOpen,       angle:  90,  delay: 460 },
  { id: 'templates',  label: 'Templates',  icon: LayoutTemplate, angle: 150,  delay: 580 },
  { id: 'exports',    label: 'Exports',    icon: Share2,         angle: 210,  delay: 700 },
];

// SVG viewBox is 600×600 with the hub at (300, 300). Chip orbit radius
// is 250 units (≈ 41.6% of the box). DOM chip placement uses the same
// math but in percentages so the SVG and the chips line up exactly.
const CENTER = 300;
const SVG_RADIUS = 250;
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

export const HeroSection = ({
  onBrandNameChange,
  onStartClick,
  brandName,
}: HeroSectionProps) => {
  return (
    <section className="brandos-hero relative overflow-hidden">
      <div className="container-tight relative">
        <div className="grid grid-cols-1 items-center gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Left — copy + CTAs                                          */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="brandos-hero-text">
            <div className="brandos-hero-eyebrow">
              <span className="h-px w-8 bg-foreground/40" aria-hidden />
              <span>Branding operating system</span>
            </div>

            <h1 className="brandos-hero-title font-display">
              The operating system
              <br />
              for your brand.
            </h1>

            <p className="brandos-hero-subtitle">
              Strategy, identity, assets, and outputs — connected by one source
              of truth. Build the system once. Generate everything from it
              forever.
            </p>

            <form
              className="brandos-hero-cta"
              onSubmit={(e) => {
                e.preventDefault();
                onStartClick();
              }}
            >
              <Input
                className="brandos-hero-input"
                placeholder="Enter your brand name"
                aria-label="Brand name"
                value={brandName}
                onChange={(e) => onBrandNameChange(e.target.value)}
              />
              <Button
                type="submit"
                variant="hero"
                shape="pill"
                className="brandos-hero-primary"
              >
                Build my brand
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <button
              type="button"
              className="brandos-hero-secondary"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            >
              <PlayCircle className="h-4 w-4" />
              See how the system works
            </button>

            <ul className="brandos-hero-trust" aria-label="What you get">
              <li>Strategy → Identity → Output</li>
              <li>·</li>
              <li>One source of truth</li>
              <li>·</li>
              <li>Built for teams</li>
            </ul>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* Right — orbital visual                                      */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="brandos-hero-visual">
            <div className="brandos-orbit" aria-hidden="true">
              {/* SVG: orbital guides + connecting lines + ambient core */}
              <svg
                viewBox="0 0 600 600"
                className="brandos-orbit-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <radialGradient id="brandos-core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.10" />
                    <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="brandos-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.18" />
                  </linearGradient>
                </defs>

                {/* Soft glow behind the core */}
                <circle cx={CENTER} cy={CENTER} r="180" fill="url(#brandos-core-glow)" />

                {/* Outer orbital guide — slowly rotating */}
                <g className="brandos-ring brandos-ring-spin">
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
                </g>

                {/* Inner orbital guide — solid hairline */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="170"
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.07"
                  strokeWidth="1"
                />

                {/* Connecting lines from each chip into the core.
                    Each line is drawn from the chip's edge inward to a small
                    radius around the core, so the line never sticks INTO the
                    central node. */}
                {CHIPS.map((chip) => {
                  const outer = polarToSvg(chip.angle, SVG_RADIUS - 30);
                  const inner = polarToSvg(chip.angle, 60);
                  return (
                    <line
                      key={chip.id}
                      x1={inner.x}
                      y1={inner.y}
                      x2={outer.x}
                      y2={outer.y}
                      stroke="url(#brandos-line)"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      className="brandos-line"
                      style={{ animationDelay: `${chip.delay}ms` }}
                    />
                  );
                })}

                {/* Central core — pulsing dot */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="46"
                  fill="hsl(var(--background))"
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.18"
                  strokeWidth="1"
                  className="brandos-core-bg"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="46"
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.30"
                  strokeWidth="1"
                  className="brandos-core-pulse"
                />
              </svg>

              {/* Central core label — sits over the SVG */}
              <div className="brandos-core-label">
                <Sparkles className="h-4 w-4" />
                <span>Brand Core</span>
              </div>

              {/* Orbital chips — DOM elements positioned with the same
                  polar math as the SVG lines so endpoints align exactly. */}
              {CHIPS.map((chip) => {
                const Icon = chip.icon;
                const { left, top } = polarToPercent(chip.angle);
                return (
                  <div
                    key={chip.id}
                    className="brandos-chip brandos-chip-enter"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      animationDelay: `${chip.delay}ms`,
                      // The float keyframe is offset per-chip so they
                      // breathe out of phase, keeping the composition alive.
                      // The custom property feeds into the CSS keyframe.
                      ['--brandos-float-delay' as string]: `${chip.delay}ms`,
                    }}
                  >
                    <span className="brandos-chip-icon">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="brandos-chip-label">{chip.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Component-scoped styles. Kept inline so the hero is a
          self-contained drop-in — no global CSS edits required. */}
      <style>{`
        .brandos-hero {
          padding-top: 8px;
        }

        /* ── Left column ───────────────────────────────────────────── */
        .brandos-hero-text {
          opacity: 0;
          transform: translateY(8px);
          animation: brandos-fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms forwards;
        }
        .brandos-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
          margin-bottom: 1.25rem;
        }
        .brandos-hero-title {
          font-size: clamp(2.25rem, 5vw, 4.25rem);
          line-height: 1.02;
          letter-spacing: -0.025em;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin: 0;
        }
        .brandos-hero-subtitle {
          margin-top: 1.25rem;
          max-width: 32rem;
          font-size: clamp(0.95rem, 1.25vw, 1.0625rem);
          line-height: 1.55;
          color: hsl(var(--muted-foreground));
        }
        .brandos-hero-cta {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          max-width: 26rem;
        }
        @media (min-width: 640px) {
          .brandos-hero-cta {
            flex-direction: row;
            align-items: center;
          }
        }
        .brandos-hero-input {
          height: 3rem;
          padding: 0 1.125rem;
          border-radius: 9999px;
          flex: 1;
        }
        .brandos-hero-primary {
          height: 3rem;
          padding: 0 1.5rem;
          flex-shrink: 0;
        }
        .brandos-hero-secondary {
          margin-top: 0.875rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
          padding: 0.25rem 0;
          background: transparent;
          border: 0;
          cursor: pointer;
          transition: color 200ms ease;
        }
        .brandos-hero-secondary:hover {
          color: hsl(var(--foreground));
        }
        .brandos-hero-trust {
          list-style: none;
          padding: 0;
          margin: 1.75rem 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: hsl(var(--muted-foreground) / 0.85);
        }

        /* ── Right column — orbit ──────────────────────────────────── */
        .brandos-hero-visual {
          position: relative;
          opacity: 0;
          transform: translateY(8px);
          animation: brandos-fade-up 800ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
        }
        .brandos-orbit {
          position: relative;
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          aspect-ratio: 1 / 1;
        }
        .brandos-orbit-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        /* Slow rotation on the dashed outer ring — 80 seconds for one
           full revolution so it reads as ambient motion, not a spinner. */
        .brandos-ring-spin {
          transform-origin: 300px 300px;
          animation: brandos-spin 80s linear infinite;
        }

        /* Connecting lines — drawn in once via stroke-dashoffset.
           pathLength="1" normalizes the dash math regardless of length. */
        .brandos-line {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: brandos-draw 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* Core pulse — soft expanding ring around the central node. */
        .brandos-core-pulse {
          transform-origin: 300px 300px;
          animation: brandos-pulse 3.4s ease-out infinite;
        }
        .brandos-core-bg {
          filter: drop-shadow(0 6px 24px hsl(var(--foreground) / 0.10));
        }

        /* Central label — sits over the core circle. */
        .brandos-core-label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.7rem;
          border-radius: 9999px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          box-shadow: 0 4px 14px hsl(var(--foreground) / 0.06);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: hsl(var(--foreground));
          white-space: nowrap;
        }
        .brandos-core-label svg {
          color: hsl(var(--foreground));
        }

        /* Orbital chips — small cards floating at each orbit point. */
        .brandos-chip {
          position: absolute;
          transform: translate(-50%, -50%);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.8rem;
          border-radius: 9999px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          box-shadow: 0 6px 22px hsl(var(--foreground) / 0.06);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: hsl(var(--foreground));
          white-space: nowrap;
          opacity: 0;
          will-change: transform, opacity;
        }
        .brandos-chip-enter {
          animation:
            brandos-chip-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
            brandos-chip-float 6s ease-in-out infinite;
          /* The chip-in keyframe controls entrance; the float keyframe
             takes over after delay. The chip-in delay is set inline. */
        }
        .brandos-chip-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 22px;
          width: 22px;
          border-radius: 9999px;
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
        .brandos-chip-label {
          line-height: 1;
        }

        /* ── Keyframes ─────────────────────────────────────────────── */
        @keyframes brandos-fade-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes brandos-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes brandos-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes brandos-pulse {
          0%   { transform: scale(1);    opacity: 0.30; }
          70%  { transform: scale(1.55); opacity: 0;    }
          100% { transform: scale(1.55); opacity: 0;    }
        }
        @keyframes brandos-chip-in {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
        }
        @keyframes brandos-chip-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%      { transform: translate(-50%, -50%) translateY(-6px); }
        }

        /* ── Reduced motion ────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .brandos-hero-text,
          .brandos-hero-visual {
            opacity: 1;
            transform: none;
            animation: none;
          }
          .brandos-line {
            stroke-dashoffset: 0;
            animation: none;
          }
          .brandos-core-pulse,
          .brandos-ring-spin,
          .brandos-chip-enter {
            animation: none;
          }
          .brandos-chip {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
};
