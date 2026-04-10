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
  Image as ImageIcon,
  Presentation,
  Download,
} from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/**
 * HeroSection — v5, Brand Core Engine.
 *
 * Reference: a central glass-orb "Brand Core Engine" sitting on a glass
 * pedestal, flanked by 4 chips on each side (8 total), with subtle
 * orbital rings tilted around the orb and hairline connectors from each
 * chip into the orb's surface.
 *
 * Layout
 * - Text block on top (eyebrow / headline / subtitle / CTAs), centered.
 * - The visual sits BELOW the text on its own, centered.
 * - Visual is a 3-column grid on lg+ (left chips · orb · right chips).
 *   On mobile the side chips collapse and only the orb is shown so the
 *   composition stays readable on small screens.
 *
 * Theming
 * - Light mode: warm cream atmosphere, glass orb with cream/gold
 *   highlights, subtle warm orbital rings.
 * - Dark mode: deep navy atmosphere with warm amber glow, dark glass
 *   orb with cool highlights, amber/gold orbital rings.
 * - All theme switching via Tailwind `dark:` variants on the existing
 *   v5 design tokens.
 *
 * Motion
 * - Lines, rings, chips, orb all enter ONCE via framer-motion stagger.
 * - No looping animations. After ~2s the composition is perfectly
 *   still — calm, dignified, premium. Respects prefers-reduced-motion.
 */

interface ChipDef {
  id: string;
  label: string;
  icon: typeof PenTool;
}

// Left column (top → bottom). x/y are percentages within the visual
// container. The chip's RIGHT edge anchors to (x, y) so the chip extends
// leftward from that point.
const LEFT_CHIPS: (ChipDef & { x: number; y: number })[] = [
  { id: 'typography', label: 'Typography', icon: Type,           x: 26, y: 18 },
  { id: 'colors',     label: 'Colors',     icon: Palette,        x: 19, y: 38 },
  { id: 'logo',       label: 'Logo',       icon: PenTool,        x: 19, y: 60 },
  { id: 'templates',  label: 'Templates',  icon: LayoutTemplate, x: 26, y: 82 },
];

// Right column (top → bottom). LEFT edge anchors to (x, y).
const RIGHT_CHIPS: (ChipDef & { x: number; y: number })[] = [
  { id: 'guidelines',    label: 'Guidelines',    icon: BookOpen,    x: 74, y: 18 },
  { id: 'social',        label: 'Social Assets', icon: ImageIcon,   x: 81, y: 38 },
  { id: 'presentations', label: 'Presentations', icon: Presentation, x: 81, y: 60 },
  { id: 'exports',       label: 'Exports',       icon: Download,    x: 74, y: 82 },
];

const ALL_CHIPS = [...LEFT_CHIPS, ...RIGHT_CHIPS];

// Visual container is 3:2. SVG viewBox matches so coordinates align.
const VB_W = 1200;
const VB_H = 800;
const ORB_CX = 600;
const ORB_CY = 380; // slightly above middle to leave room for the pedestal
const ORB_R  = 180;

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

        {/* ── Below the text: the orb visual, alone ───────────────── */}
        <BrandCoreEngine />
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Brand Core Engine — central glass orb + 8 satellite chips.        */
/* ═══════════════════════════════════════════════════════════════════ */

function BrandCoreEngine() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="brand-core relative mx-auto mt-20 md:mt-24 w-full max-w-6xl aspect-[3/2]"
    >
      {/* Atmospheric backdrop — soft warm glow center, fades to surface
          color at the edges. Different per theme. */}
      <div className="brand-core-atmosphere absolute inset-0 pointer-events-none" />

      {/* Orbital rings + connecting lines — single absolute SVG so the
          coordinate system is shared and chip positions align with line
          endpoints. */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* ── Orbital rings — tilted ellipses around the orb. Drawn
            BEHIND the orb so they appear to pass behind it.            */}
        <g transform={`translate(${ORB_CX} ${ORB_CY})`}>
          <motion.ellipse
            rx="240"
            ry="74"
            fill="none"
            className="brand-core-ring brand-core-ring-warm"
            strokeWidth="1"
            transform="rotate(-18)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.ellipse
            rx="220"
            ry="62"
            fill="none"
            className="brand-core-ring"
            strokeWidth="1"
            transform="rotate(34)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.ellipse
            rx="250"
            ry="84"
            fill="none"
            className="brand-core-ring brand-core-ring-warm"
            strokeWidth="1"
            transform="rotate(-58)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.ellipse
            rx="210"
            ry="56"
            fill="none"
            className="brand-core-ring"
            strokeWidth="1"
            transform="rotate(72)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>

        {/* ── Connecting hairlines from each chip's inner edge into
            the orb's surface. The chip sits over the start point so the
            line appears to emerge from the chip.                        */}
        {ALL_CHIPS.map((chip, i) => {
          const startX = (chip.x / 100) * VB_W;
          const startY = (chip.y / 100) * VB_H;
          // End point on the orb's circumference, pointing toward the
          // start. Add a small inset so the line doesn't bury into the orb.
          const dx = startX - ORB_CX;
          const dy = startY - ORB_CY;
          const len = Math.hypot(dx, dy) || 1;
          const endX = ORB_CX + (dx / len) * (ORB_R + 4);
          const endY = ORB_CY + (dy / len) * (ORB_R + 4);
          // Subtle curve via quadratic bezier — control point offset
          // perpendicular to the line, consistent direction so all eight
          // curves share a gentle clockwise rhythm.
          const perpX = -dy / len;
          const perpY =  dx / len;
          const curve = 18;
          const midX = (startX + endX) / 2 + perpX * curve;
          const midY = (startY + endY) / 2 + perpY * curve;
          const path = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
          return (
            <motion.path
              key={chip.id}
              d={path}
              fill="none"
              strokeWidth="1.1"
              strokeLinecap="round"
              className="brand-core-line"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.95,
                delay: 0.85 + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}
      </svg>

      {/* ── The glass orb itself — pure CSS sphere with theme-aware
          radial gradients + inset shadows. */}
      <div
        className="brand-core-orb-wrap absolute"
        style={{
          left: `${(ORB_CX / VB_W) * 100}%`,
          top: `${(ORB_CY / VB_H) * 100}%`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="brand-core-orb"
        >
          <div className="brand-core-orb-label">
            <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Brand Core
            </div>
            <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Engine
            </div>
          </div>
        </motion.div>

        {/* The pedestal under the orb */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0.4 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="brand-core-pedestal"
          style={{ transformOrigin: 'center top' }}
        />
      </div>

      {/* ── Chips — DOM elements positioned at the same percentages used
          by the SVG line endpoints, anchored at the orb-facing edge. */}
      {LEFT_CHIPS.map((chip, i) => (
        <Chip key={chip.id} chip={chip} side="left" delay={1.0 + i * 0.07} />
      ))}
      {RIGHT_CHIPS.map((chip, i) => (
        <Chip key={chip.id} chip={chip} side="right" delay={1.0 + i * 0.07} />
      ))}

      {/* All component-scoped styles. Light + dark variants live here so
          the hero is a single drop-in file. */}
      <style>{ORB_STYLES}</style>
    </motion.div>
  );
}

/* ── Chip ────────────────────────────────────────────────────────── */

function Chip({
  chip,
  side,
  delay,
}: {
  chip: ChipDef & { x: number; y: number };
  side: 'left' | 'right';
  delay: number;
}) {
  const Icon = chip.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`brand-core-chip hidden md:inline-flex absolute items-center gap-2.5 ${
        side === 'left' ? 'brand-core-chip-left' : 'brand-core-chip-right'
      }`}
      style={{ left: `${chip.x}%`, top: `${chip.y}%` }}
    >
      <span className="brand-core-chip-icon">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="brand-core-chip-label">{chip.label}</span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Component-scoped styles — light + dark variants in one block.     */
/*  Kept inline so the hero is a single self-contained file.           */
/* ─────────────────────────────────────────────────────────────────── */

const ORB_STYLES = `
.brand-core { position: relative; }

/* ── Atmospheric backdrop ─────────────────────────────────────────── */
.brand-core-atmosphere {
  background:
    radial-gradient(ellipse 60% 50% at 50% 48%,
      rgba(255, 240, 215, 0.55) 0%,
      rgba(252, 247, 235, 0.25) 35%,
      rgba(252, 247, 235, 0) 70%);
}
.dark .brand-core-atmosphere {
  background:
    radial-gradient(ellipse 60% 50% at 50% 48%,
      rgba(243, 97, 35, 0.10) 0%,
      rgba(40, 30, 20, 0.30) 35%,
      rgba(10, 10, 14, 0) 75%);
}

/* ── Orbital rings ────────────────────────────────────────────────── */
.brand-core-ring {
  stroke: hsl(var(--foreground));
  stroke-opacity: 0.18;
}
.brand-core-ring-warm {
  stroke: hsl(var(--accent-pop));
  stroke-opacity: 0.55;
}
.dark .brand-core-ring {
  stroke: rgba(255, 255, 255, 0.18);
}
.dark .brand-core-ring-warm {
  stroke: rgba(243, 168, 100, 0.62);
}

/* ── Connecting hairlines ─────────────────────────────────────────── */
.brand-core-line {
  stroke: hsl(var(--foreground));
  stroke-opacity: 0.28;
}
.dark .brand-core-line {
  stroke: rgba(255, 255, 255, 0.30);
}

/* ── The orb wrapper sits at the orb center; orb is positioned by
      translating both axes by -50%, so its visual center matches the
      SVG's (ORB_CX, ORB_CY). The pedestal sits below it.               */
.brand-core-orb-wrap {
  transform: translate(-50%, -50%);
  width: clamp(220px, 28vw, 360px);
  aspect-ratio: 1 / 1;
}

/* ── The glass orb ────────────────────────────────────────────────── */
.brand-core-orb {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 35% 28%,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(255, 252, 242, 0.55) 22%,
      rgba(244, 232, 210, 0.35) 48%,
      rgba(220, 200, 165, 0.45) 72%,
      rgba(180, 155, 115, 0.45) 100%);
  box-shadow:
    inset -28px -34px 70px rgba(160, 130, 80, 0.28),
    inset 30px 24px 70px rgba(255, 255, 255, 0.75),
    inset 0 0 0 1px rgba(255, 255, 255, 0.55),
    0 50px 100px rgba(80, 55, 20, 0.18),
    0 24px 48px rgba(80, 55, 20, 0.10);
  backdrop-filter: blur(2px);
}
/* Top-left specular highlight */
.brand-core-orb::before {
  content: '';
  position: absolute;
  top: 9%;
  left: 18%;
  width: 46%;
  height: 32%;
  background: radial-gradient(ellipse at center,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(255, 255, 255, 0.20) 55%,
    transparent 100%);
  filter: blur(6px);
  border-radius: 50%;
  pointer-events: none;
}
/* Bottom rim shadow */
.brand-core-orb::after {
  content: '';
  position: absolute;
  bottom: 6%;
  left: 18%;
  right: 18%;
  height: 10%;
  background: radial-gradient(ellipse at center,
    rgba(120, 90, 40, 0.20) 0%,
    transparent 70%);
  filter: blur(8px);
  border-radius: 50%;
  pointer-events: none;
}

.dark .brand-core-orb {
  background:
    radial-gradient(circle at 35% 28%,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(220, 220, 235, 0.10) 18%,
      rgba(60, 50, 70, 0.35) 45%,
      rgba(30, 25, 40, 0.55) 75%,
      rgba(15, 12, 22, 0.7) 100%);
  box-shadow:
    inset -28px -34px 70px rgba(0, 0, 0, 0.65),
    inset 30px 24px 70px rgba(220, 220, 240, 0.10),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 50px 100px rgba(0, 0, 0, 0.55),
    0 0 80px rgba(243, 97, 35, 0.10);
}
.dark .brand-core-orb::before {
  background: radial-gradient(ellipse at center,
    rgba(255, 255, 255, 0.40) 0%,
    rgba(255, 255, 255, 0.08) 55%,
    transparent 100%);
}
.dark .brand-core-orb::after {
  background: radial-gradient(ellipse at center,
    rgba(0, 0, 0, 0.5) 0%,
    transparent 70%);
}

/* Center label inside the orb */
.brand-core-orb-label {
  position: relative;
  z-index: 2;
  text-align: center;
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.4);
}
.dark .brand-core-orb-label {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

/* ── The glass pedestal under the orb ────────────────────────────── */
.brand-core-pedestal {
  position: absolute;
  left: 50%;
  bottom: -8%;
  transform: translateX(-50%);
  width: 62%;
  height: 14%;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at center,
      rgba(255, 255, 255, 0.58) 0%,
      rgba(240, 230, 210, 0.32) 50%,
      rgba(220, 205, 175, 0.18) 78%,
      transparent 100%);
  box-shadow:
    0 18px 40px rgba(80, 55, 20, 0.12),
    0 4px 12px rgba(80, 55, 20, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.dark .brand-core-pedestal {
  background:
    radial-gradient(ellipse at center,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(120, 110, 130, 0.10) 50%,
      rgba(80, 70, 90, 0.05) 78%,
      transparent 100%);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.45),
    0 4px 12px rgba(0, 0, 0, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

/* ── Satellite chips ──────────────────────────────────────────────── */
.brand-core-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.45rem 0.85rem 0.45rem 0.45rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow:
    0 10px 30px rgba(80, 55, 20, 0.08),
    0 1px 2px rgba(80, 55, 20, 0.06);
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
  z-index: 3;
  min-width: 9.5rem;
}
.brand-core-chip-left  { transform: translate(-100%, -50%); justify-content: flex-start; }
.brand-core-chip-right { transform: translate(0, -50%);    justify-content: flex-start; }

.dark .brand-core-chip {
  background: rgba(22, 22, 28, 0.72);
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.30);
  color: rgba(255, 255, 255, 0.92);
}

.brand-core-chip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(245, 240, 230, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: hsl(var(--foreground));
}
.dark .brand-core-chip-icon {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
}
.brand-core-chip-label {
  line-height: 1;
  letter-spacing: 0.01em;
}

/* Smaller breathing room on tablet */
@media (max-width: 1100px) {
  .brand-core-chip { min-width: 8rem; font-size: 11.5px; }
  .brand-core-chip-icon { width: 24px; height: 24px; }
}

/* Reduced motion: skip entrance transforms */
@media (prefers-reduced-motion: reduce) {
  .brand-core-chip,
  .brand-core-orb,
  .brand-core-pedestal,
  .brand-core-line,
  .brand-core-ring { transition: none !important; }
}
`;
