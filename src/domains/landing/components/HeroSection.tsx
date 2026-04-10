/**
 * HeroSection — main app landing, light editorial split.
 *
 * Same editorial split structure as before (left big word · center
 * icon · right big word) but on a LIGHT cream surface instead of black,
 * because the user said the dark version wasn't nice.
 *
 * Palette: warm cream surface (#FCFBF9-ish), near-black ink, single
 * orange accent (the existing --accent-pop token = #F36123). Same three
 * colors as the rest of the new landing.
 *
 * Layout
 *   ┌────────────────────────────────────────────────────────────┐
 *   │   ●─── Strategy ───●            ●─── Output ───●           │
 *   │                                                              │
 *   │   BRAND ONCE.    [ ✦ icon ]    USE FOREVER.                │
 *   │                                                              │
 *   │  ●── Logo · Color · Type ──●  ●── Slides · Posts · Web ──● │
 *   │                                                              │
 *   │      BrandOS connects strategy, identity, and outputs        │
 *   │              into one source of truth.                        │
 *   │                                                              │
 *   │             [ Request Early Access → ]   [ See how → ]        │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Component-scoped <style> block, no global CSS edits, legacy props
 * preserved so Index.tsx doesn't change.
 */
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onBrandNameChange?: (name: string) => void;
  onStartClick: () => void;
  brandName?: string;
}

export const HeroSection = ({ onStartClick }: HeroSectionProps) => {
  return (
    <section className="hero-light relative overflow-hidden">
      <div className="hero-light-bg" aria-hidden="true" />

      <div className="container-tight relative z-10">
        <div className="mx-auto max-w-6xl pt-24 pb-20 md:pt-32 md:pb-24 text-center">
          {/* Top tag row */}
          <div className="hero-light-tags" data-animate>
            <span className="hero-light-dot" />
            <span className="hero-light-line" />
            <span className="hero-light-pill">Strategy</span>
            <span className="hero-light-line hero-light-line-grow" />
            <span className="hero-light-pill">Output</span>
            <span className="hero-light-line" />
            <span className="hero-light-dot" />
          </div>

          {/* Headline row — left word | center icon | right word */}
          <div className="hero-light-row mt-12 md:mt-14">
            <h1 className="hero-light-word hero-light-word-left" data-animate>
              Brand
              <br />
              once.
            </h1>

            <div className="hero-light-center" data-animate>
              <div className="hero-light-badge">
                <Sparkles className="h-9 w-9 md:h-11 md:w-11" />
              </div>
            </div>

            <h1 className="hero-light-word hero-light-word-right" data-animate>
              Use
              <br />
              forever.
            </h1>
          </div>

          {/* Bottom tag row */}
          <div className="hero-light-tags mt-12 md:mt-14" data-animate>
            <span className="hero-light-dot" />
            <span className="hero-light-line" />
            <span className="hero-light-pill">Logo · Color · Type</span>
            <span className="hero-light-line hero-light-line-grow" />
            <span className="hero-light-pill">Slides · Posts · Print · Web</span>
            <span className="hero-light-line" />
            <span className="hero-light-dot" />
          </div>

          {/* Subtitle */}
          <p className="hero-light-subtitle mt-12 md:mt-14" data-animate>
            BrandOS connects your strategy, identity, and outputs into{" "}
            <span className="hero-light-em">one source of truth</span>.
          </p>

          {/* CTA row */}
          <div className="hero-light-cta mt-8" data-animate>
            <Button
              type="button"
              onClick={onStartClick}
              variant="hero"
              shape="pill"
              className="hero-light-primary"
            >
              Request Early Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a href="#features" className="hero-light-secondary">
              See how the system works
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <style>{HERO_LIGHT_STYLES}</style>
    </section>
  );
};

const HERO_LIGHT_STYLES = `
.hero-light {
  background: #FCFBF9;          /* warm cream — matches v5 landing */
  color: hsl(0 0% 8%);
  position: relative;
}

.hero-light-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    /* warm vignette behind the center, ties the icon to the orange */
    radial-gradient(ellipse 55% 50% at 50% 50%,
      hsl(var(--accent-pop) / 0.10) 0%,
      hsl(var(--accent-pop) / 0.04) 35%,
      transparent 70%),
    /* dot grid in soft warm gray */
    radial-gradient(circle, hsl(20 8% 75% / 0.55) 1px, transparent 1.4px) 0 0 / 24px 24px;
}

/* ── Tag row ──────────────────────────────────────────────────── */
.hero-light-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: nowrap;
  max-width: 56rem;
  margin: 0 auto;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: hsl(0 0% 35%);
}
.hero-light-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  border: 1px solid hsl(0 0% 0% / 0.10);
  background: #ffffff;
  box-shadow: 0 2px 14px hsl(20 30% 30% / 0.05);
  white-space: nowrap;
  letter-spacing: 0.08em;
  flex-shrink: 0;
  color: hsl(0 0% 12%);
}
.hero-light-line {
  flex: 0 0 36px;
  height: 1px;
  background-image: linear-gradient(to right,
    hsl(0 0% 0% / 0.18) 50%,
    transparent 50%);
  background-size: 6px 1px;
  background-repeat: repeat-x;
}
.hero-light-line-grow { flex: 1 1 auto; }
.hero-light-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--accent-pop));
  flex-shrink: 0;
}

/* ── Headline row ─────────────────────────────────────────────── */
.hero-light-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1.75rem;
  text-align: center;
}
@media (max-width: 720px) {
  .hero-light-row {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
}

.hero-light-word {
  font-family: var(--font-display, ui-sans-serif), system-ui, sans-serif;
  font-size: clamp(2.75rem, 6vw, 5.5rem);
  line-height: 0.92;
  font-weight: 800;
  letter-spacing: -0.045em;
  text-transform: uppercase;
  color: hsl(0 0% 8%);
  margin: 0;
}
.hero-light-word-left  { text-align: right;  justify-self: end; }
.hero-light-word-right { text-align: left;   justify-self: start; }
@media (max-width: 720px) {
  .hero-light-word-left, .hero-light-word-right {
    text-align: center; justify-self: center;
  }
}

/* Center icon badge — black on cream with orange-glow accent */
.hero-light-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-light-badge {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(0 0% 8%);
  color: hsl(var(--accent-pop));
  box-shadow:
    0 0 0 6px hsl(0 0% 100% / 0.85),
    0 0 0 7px hsl(20 6% 85%),
    0 28px 60px hsl(var(--accent-pop) / 0.30),
    0 18px 36px hsl(0 0% 0% / 0.08);
  position: relative;
}
.hero-light-badge::after {
  /* Tiny orange dot in the corner — makes the badge feel intentional */
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--accent-pop));
}
@media (min-width: 768px) {
  .hero-light-badge { width: 120px; height: 120px; border-radius: 26px; }
}

/* ── Subtitle ─────────────────────────────────────────────────── */
.hero-light-subtitle {
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
  font-size: 1rem;
  line-height: 1.65;
  color: hsl(0 0% 30%);
}
@media (min-width: 640px) {
  .hero-light-subtitle { font-size: 1.0625rem; }
}
.hero-light-em {
  color: hsl(var(--accent-pop));
  font-weight: 600;
}

/* ── CTA row ──────────────────────────────────────────────────── */
.hero-light-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .hero-light-cta { flex-direction: row; justify-content: center; gap: 1.25rem; }
}
.hero-light-primary {
  background: hsl(var(--accent-pop)) !important;
  color: #fff !important;
  border: 1px solid hsl(var(--accent-pop)) !important;
  height: 3rem;
  padding: 0 1.5rem;
  font-weight: 600;
  box-shadow: 0 14px 38px -10px hsl(var(--accent-pop) / 0.55);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.hero-light-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 44px -10px hsl(var(--accent-pop) / 0.70);
}
.hero-light-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: hsl(0 0% 35%);
  text-decoration: none;
  transition: color 200ms ease;
}
.hero-light-secondary:hover { color: hsl(0 0% 8%); }
`;
