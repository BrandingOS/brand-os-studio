/**
 * ProductModulesSection — "Why Brand OS" + the all-in-one feature grid.
 *
 * Light surface (was panel-dark before — user explicitly asked for it
 * NOT to be dark). Warm cream background to match the rest of the new
 * landing, with a soft warm vignette behind the heading. Single orange
 * accent on the eyebrow + the "Why Brand OS" headline highlight.
 */
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { productModules } from "../data/content";
import { ProductModuleCard } from "./ProductModuleCard";

export const ProductModulesSection = () => {
  return (
    <section className="modules-section relative">
      <div className="modules-section-bg" aria-hidden="true" />

      <div className="container-tight relative z-10">
        {/* "Why Brand OS" intro card */}
        <div className="modules-intro" data-animate>
          <span className="modules-eyebrow">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--accent-pop))]" />
            Why Brand OS
          </span>
          <h2 className="modules-headline">
            More than guidelines —{" "}
            <span className="text-[hsl(var(--accent-pop))]">your brand OS.</span>
          </h2>
          <p className="modules-subhead">
            Live brand logic that auto-applies to every output — from slides and
            posts to print and your website. One source of truth, used everywhere.
          </p>
          <div className="mt-6">
            <Button
              variant="hero"
              shape="pill"
              className="modules-cta"
            >
              Explore Modules
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-20 md:mt-24" id="features">
          <div className="text-center mb-12" data-animate>
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
              All-in-one branding{" "}
              <span className="text-[hsl(var(--accent-pop))]">powerhouse.</span>
            </h3>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto">
              Nine modules, one connected system.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productModules.map((module, index) => (
              <ProductModuleCard key={index} {...module} />
            ))}
          </div>
        </div>
      </div>

      <style>{MODULES_STYLES}</style>
    </section>
  );
};

const MODULES_STYLES = `
.modules-section {
  background: #FCFBF9;          /* matches the rest of the light landing */
  padding-top: 6rem;
  padding-bottom: 6rem;
  position: relative;
}
@media (min-width: 768px) {
  .modules-section { padding-top: 8rem; padding-bottom: 8rem; }
}

.modules-section-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 40% at 50% 18%,
      hsl(var(--accent-pop) / 0.07) 0%,
      transparent 60%),
    radial-gradient(circle, hsl(20 8% 75% / 0.40) 1px, transparent 1.4px) 0 0 / 28px 28px;
}

/* ── Intro card ───────────────────────────────────────────────── */
.modules-intro {
  text-align: center;
  max-width: 48rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.modules-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid hsl(var(--accent-pop) / 0.35);
  background: hsl(var(--accent-pop) / 0.08);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: hsl(var(--accent-pop));
}

.modules-headline {
  margin-top: 1.25rem;
  font-size: clamp(2rem, 5vw, 3.75rem);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: hsl(0 0% 8%);
}

.modules-subhead {
  margin-top: 1.25rem;
  margin-left: auto;
  margin-right: auto;
  max-width: 36rem;
  font-size: 1rem;
  line-height: 1.65;
  color: hsl(0 0% 35%);
}
@media (min-width: 640px) {
  .modules-subhead { font-size: 1.0625rem; }
}

.modules-cta {
  background: hsl(var(--accent-pop)) !important;
  color: #fff !important;
  border: 1px solid hsl(var(--accent-pop)) !important;
  height: 2.75rem;
  padding: 0 1.4rem;
  font-weight: 600;
  box-shadow: 0 12px 32px -10px hsl(var(--accent-pop) / 0.55);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.modules-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 40px -10px hsl(var(--accent-pop) / 0.70);
}
`;
