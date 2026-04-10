/**
 * HeroSection — main app landing, editorial split layout.
 *
 * Reference: the FIX. LEARN. PREVENT. layout (Image #18).
 *
 * Composition:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │            (●)─── STRATEGY ───●          ●─── OUTPUT ───(●) │
 *   │                                                              │
 *   │   BRAND ONCE.       [ BRAND ICON BADGE ]      USE FOREVER.  │
 *   │                                                              │
 *   │  (●)── Logo · Color · Type ──●     ●── Slides · Posts ──(●) │
 *   │                                                              │
 *   │              BrandOS connects ... one source of truth         │
 *   │                                                              │
 *   │                  [ Request Early Access ]                     │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Palette: black surface, white text, single orange accent (the
 * existing --accent-pop token = #F36123).
 *
 * The component still accepts the legacy props (onBrandNameChange,
 * onStartClick, brandName) so the parent Index.tsx doesn't need to
 * change, but the brand-name input is gone — the layout uses a single
 * primary CTA per the reference.
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
    <section className="hero-editorial relative overflow-hidden">
      {/* Atmospheric backdrop — dot grid + soft warm vignette behind
          the central icon, fading to pure black at the edges. */}
      <div className="hero-editorial-bg" aria-hidden="true" />

      <div className="container-tight relative z-10">
        <div className="mx-auto max-w-6xl pt-24 pb-16 md:pt-32 md:pb-20 text-center">
          {/* ── Top tag row — two pills connected by dashed lines ─── */}
          <div className="hero-tag-row" data-animate>
            <span className="hero-tag-dot" />
            <span className="hero-tag-line" />
            <span className="hero-tag-pill">Strategy</span>
            <span className="hero-tag-line hero-tag-line-grow" />
            <span className="hero-tag-pill">Output</span>
            <span className="hero-tag-line" />
            <span className="hero-tag-dot" />
          </div>

          {/* ── Hero text row — left | center icon | right ─────────── */}
          <div className="hero-row mt-10 md:mt-12">
            <h1 className="hero-word hero-word-left" data-animate>
              Brand
              <br />
              once.
            </h1>

            <div className="hero-center" data-animate>
              <div className="hero-center-badge">
                <Sparkles className="h-9 w-9 md:h-11 md:w-11" />
              </div>
            </div>

            <h1 className="hero-word hero-word-right" data-animate>
              Use
              <br />
              forever.
            </h1>
          </div>

          {/* ── Bottom tag row — two pills, dashed connectors ─────── */}
          <div className="hero-tag-row mt-10 md:mt-12" data-animate>
            <span className="hero-tag-dot" />
            <span className="hero-tag-line" />
            <span className="hero-tag-pill">Logo · Color · Type</span>
            <span className="hero-tag-line hero-tag-line-grow" />
            <span className="hero-tag-pill">Slides · Posts · Print · Web</span>
            <span className="hero-tag-line" />
            <span className="hero-tag-dot" />
          </div>

          {/* ── Subtitle ──────────────────────────────────────────── */}
          <p className="hero-subtitle mt-12 md:mt-14" data-animate>
            BrandOS connects your strategy, identity, and outputs into{" "}
            <span className="hero-subtitle-em">one source of truth</span>.
          </p>

          {/* ── CTA row — single orange primary, ghost secondary ──── */}
          <div className="hero-cta-row mt-8" data-animate>
            <Button
              type="button"
              onClick={onStartClick}
              variant="hero"
              shape="pill"
              className="hero-primary-btn"
            >
              Request Early Access
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <a href="#features" className="hero-secondary-link">
              See how the system works
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Component-scoped styles. Black / white / orange palette.
          Light + dark variants — the section is dark by default but
          legacy light surfaces still need to render OK if a parent
          forces light mode. */}
      <style>{HERO_STYLES}</style>
    </section>
  );
};

const HERO_STYLES = `
.hero-editorial {
  background: hsl(0 0% 5%);          /* near-black */
  color: hsl(0 0% 96%);
  position: relative;
}

.hero-editorial-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    /* warm vignette behind the center */
    radial-gradient(ellipse 50% 45% at 50% 48%,
      hsl(var(--accent-pop) / 0.10) 0%,
      hsl(var(--accent-pop) / 0.04) 35%,
      transparent 70%),
    /* dot grid at low opacity */
    radial-gradient(circle, hsl(0 0% 100% / 0.08) 1px, transparent 1.5px) 0 0 / 24px 24px;
}

/* ── Tag row ──────────────────────────────────────────────────── */
.hero-tag-row {
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
  color: hsl(0 0% 70%);
}
.hero-tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid hsl(0 0% 100% / 0.18);
  background: hsl(0 0% 100% / 0.04);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.hero-tag-line {
  flex: 0 0 36px;
  height: 1px;
  background-image: linear-gradient(to right,
    hsl(0 0% 100% / 0.30) 50%,
    transparent 50%);
  background-size: 6px 1px;
  background-repeat: repeat-x;
}
.hero-tag-line-grow {
  flex: 1 1 auto;
}
.hero-tag-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: hsl(var(--accent-pop));
  flex-shrink: 0;
}

/* ── Hero text row ────────────────────────────────────────────── */
.hero-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}
@media (max-width: 720px) {
  .hero-row {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
}

.hero-word {
  font-family: var(--font-display, ui-sans-serif), system-ui, sans-serif;
  font-size: clamp(2.75rem, 6vw, 5.25rem);
  line-height: 0.92;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: hsl(0 0% 96%);
  margin: 0;
}
.hero-word-left  { text-align: right;  justify-self: end; }
.hero-word-right { text-align: left;   justify-self: start; }
@media (max-width: 720px) {
  .hero-word-left, .hero-word-right { text-align: center; justify-self: center; }
}

/* The center icon badge — square with a soft glow + accent border */
.hero-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-center-badge {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg,
    hsl(0 0% 100% / 0.06),
    hsl(0 0% 100% / 0.02));
  border: 1px solid hsl(0 0% 100% / 0.18);
  box-shadow:
    0 0 0 6px hsl(0 0% 100% / 0.03),
    0 24px 60px hsl(var(--accent-pop) / 0.25),
    inset 0 1px 0 hsl(0 0% 100% / 0.10);
  color: hsl(var(--accent-pop));
}
@media (min-width: 768px) {
  .hero-center-badge { width: 120px; height: 120px; border-radius: 26px; }
}

/* ── Subtitle ─────────────────────────────────────────────────── */
.hero-subtitle {
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
  font-size: 1rem;
  line-height: 1.6;
  color: hsl(0 0% 72%);
}
@media (min-width: 640px) {
  .hero-subtitle { font-size: 1.0625rem; }
}
.hero-subtitle-em {
  color: hsl(var(--accent-pop));
  font-weight: 600;
}

/* ── CTA row ──────────────────────────────────────────────────── */
.hero-cta-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .hero-cta-row { flex-direction: row; justify-content: center; gap: 1.25rem; }
}
.hero-primary-btn {
  background: hsl(var(--accent-pop)) !important;
  color: #fff !important;
  border: 1px solid hsl(var(--accent-pop)) !important;
  height: 3rem;
  padding: 0 1.5rem;
  font-weight: 600;
  box-shadow: 0 14px 38px -10px hsl(var(--accent-pop) / 0.55);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.hero-primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 44px -10px hsl(var(--accent-pop) / 0.65);
}
.hero-secondary-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: hsl(0 0% 70%);
  text-decoration: none;
  transition: color 200ms ease;
}
.hero-secondary-link:hover {
  color: hsl(0 0% 96%);
}
`;
