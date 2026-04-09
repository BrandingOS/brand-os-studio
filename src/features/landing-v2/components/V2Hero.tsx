/**
 * V2Hero — landing v2 hero, dark editorial.
 *
 * Mounted at /v2 (DashboardV2). Same Brand Core composition as the
 * primary landing hero (`src/domains/landing/components/HeroSection.tsx`),
 * adapted to v2's dark theme so both surfaces share one visual language.
 *
 * Concept: a central "Brand Core" with six modules in elegant orbit —
 * Logo, Colors, Type, Guidelines, Templates, Exports. Subtle motion:
 * lines draw in once on mount, the outer orbit ring rotates slowly, the
 * core pulses, and each chip floats out of phase. Respects
 * `prefers-reduced-motion`.
 */
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
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

interface OrbitChip {
  id: string;
  label: string;
  icon: typeof PenTool;
  angle: number;
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

export function V2Hero() {
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/onboarding');
  };

  return (
    <section className="v2-hero relative overflow-hidden">
      {/* Ambient backdrop — gradient + grid kept from the previous v2 hero
          so the rest of the v2 page chrome still feels cohesive. */}
      <div className="absolute inset-0 v2-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 v2-grid-bg opacity-30" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-16 lg:py-32">
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Left — copy + CTAs                                          */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="v2-hero-text">
            <div className="v2-hero-eyebrow">
              <span className="h-px w-8 bg-white/30" aria-hidden />
              <span>Branding operating system</span>
            </div>

            <h1 className="v2-hero-title font-display">
              The operating system
              <br />
              for your brand.
            </h1>

            <p className="v2-hero-subtitle">
              Strategy, identity, assets, and outputs — connected by one source
              of truth. Build the system once. Generate everything from it
              forever.
            </p>

            <form className="v2-hero-cta" onSubmit={handleStart}>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Enter your brand name"
                className="v2-hero-input"
                aria-label="Brand name"
              />
              <button type="submit" className="v2-hero-primary">
                Build my brand
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </form>

            <button
              type="button"
              className="v2-hero-secondary"
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

            <ul className="v2-hero-trust" aria-label="What you get">
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
          <div className="v2-hero-visual">
            <div className="v2-orbit" aria-hidden="true">
              <svg
                viewBox="0 0 600 600"
                className="v2-orbit-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <radialGradient id="v2-core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"  stopColor="rgba(255,255,255,0.18)" />
                    <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  <linearGradient id="v2-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"  stopColor="rgba(255,255,255,0.55)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
                  </linearGradient>
                </defs>

                <circle cx={CENTER} cy={CENTER} r="180" fill="url(#v2-core-glow)" />

                <g className="v2-ring-spin">
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={SVG_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                    strokeDasharray="2 6"
                  />
                </g>

                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="170"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />

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
                      stroke="url(#v2-line)"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      className="v2-line"
                      style={{ animationDelay: `${chip.delay}ms` }}
                    />
                  );
                })}

                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="46"
                  fill="rgba(10,10,12,0.85)"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1"
                  className="v2-core-bg"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="46"
                  fill="none"
                  stroke="rgba(255,255,255,0.34)"
                  strokeWidth="1"
                  className="v2-core-pulse"
                />
              </svg>

              <div className="v2-core-label">
                <Sparkles className="h-4 w-4" />
                <span>Brand Core</span>
              </div>

              {CHIPS.map((chip) => {
                const Icon = chip.icon;
                const { left, top } = polarToPercent(chip.angle);
                return (
                  <div
                    key={chip.id}
                    className="v2-chip v2-chip-enter"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      animationDelay: `${chip.delay}ms`,
                    }}
                  >
                    <span className="v2-chip-icon">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{chip.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Component-scoped styles. Dark variant of the canonical hero. */}
      <style>{`
        .v2-hero { padding-top: 8px; }

        .v2-hero-text {
          opacity: 0;
          transform: translateY(8px);
          animation: v2-fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms forwards;
        }
        .v2-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
          margin-bottom: 1.25rem;
        }
        .v2-hero-title {
          font-size: clamp(2.25rem, 5vw, 4.5rem);
          line-height: 1.02;
          letter-spacing: -0.025em;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .v2-hero-subtitle {
          margin-top: 1.25rem;
          max-width: 32rem;
          font-size: clamp(0.95rem, 1.25vw, 1.0625rem);
          line-height: 1.55;
          color: rgba(255,255,255,0.55);
        }
        .v2-hero-cta {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          max-width: 28rem;
        }
        @media (min-width: 640px) {
          .v2-hero-cta { flex-direction: row; align-items: center; }
        }
        .v2-hero-input {
          height: 3rem;
          padding: 0 1.125rem;
          border-radius: 9999px;
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          transition: background 200ms ease, border-color 200ms ease;
        }
        .v2-hero-input::placeholder { color: rgba(255,255,255,0.35); }
        .v2-hero-input:focus {
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.28);
        }
        .v2-hero-primary {
          height: 3rem;
          padding: 0 1.5rem;
          border-radius: 9999px;
          background: #fff;
          color: #0a0a0c;
          font-size: 0.9rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          cursor: pointer;
          transition: transform 180ms ease, background 200ms ease;
          box-shadow: 0 12px 40px -10px rgba(255,255,255,0.18);
        }
        .v2-hero-primary:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.94);
        }
        .v2-hero-secondary {
          margin-top: 0.875rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          padding: 0.25rem 0;
          background: transparent;
          border: 0;
          cursor: pointer;
          transition: color 200ms ease;
        }
        .v2-hero-secondary:hover { color: #fff; }
        .v2-hero-trust {
          list-style: none;
          padding: 0;
          margin: 1.75rem 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: rgba(255,255,255,0.4);
        }

        .v2-hero-visual {
          position: relative;
          opacity: 0;
          transform: translateY(8px);
          animation: v2-fade-up 800ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
        }
        .v2-orbit {
          position: relative;
          width: 100%;
          max-width: 580px;
          margin: 0 auto;
          aspect-ratio: 1 / 1;
        }
        .v2-orbit-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .v2-ring-spin {
          transform-origin: 300px 300px;
          animation: v2-spin 80s linear infinite;
        }
        .v2-line {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: v2-draw 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .v2-core-pulse {
          transform-origin: 300px 300px;
          animation: v2-pulse 3.4s ease-out infinite;
        }
        .v2-core-bg {
          filter: drop-shadow(0 6px 32px rgba(255,255,255,0.10));
        }

        .v2-core-label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.7rem;
          border-radius: 9999px;
          background: rgba(10,10,12,0.92);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 4px 18px rgba(0,0,0,0.4);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #ffffff;
          white-space: nowrap;
        }

        .v2-chip {
          position: absolute;
          transform: translate(-50%, -50%);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.8rem;
          border-radius: 9999px;
          background: rgba(20,20,24,0.85);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 6px 24px rgba(0,0,0,0.4);
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          opacity: 0;
          will-change: transform, opacity;
        }
        .v2-chip-enter {
          animation:
            v2-chip-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
            v2-chip-float 6s ease-in-out infinite;
        }
        .v2-chip-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 22px;
          width: 22px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.08);
          color: #ffffff;
        }

        @keyframes v2-fade-up {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes v2-draw  { to { stroke-dashoffset: 0; } }
        @keyframes v2-spin  { to { transform: rotate(360deg); } }
        @keyframes v2-pulse {
          0%   { transform: scale(1);    opacity: 0.34; }
          70%  { transform: scale(1.55); opacity: 0;    }
          100% { transform: scale(1.55); opacity: 0;    }
        }
        @keyframes v2-chip-in {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
        }
        @keyframes v2-chip-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%      { transform: translate(-50%, -50%) translateY(-6px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .v2-hero-text, .v2-hero-visual {
            opacity: 1;
            transform: none;
            animation: none;
          }
          .v2-line { stroke-dashoffset: 0; animation: none; }
          .v2-core-pulse, .v2-ring-spin, .v2-chip-enter { animation: none; }
          .v2-chip { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
