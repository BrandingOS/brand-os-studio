import SectionSplit from "@/components/sections/SectionSplit";
import { setupSteps } from "../data/content";

/**
 * SetupSection — three-step "set it up once" walkthrough.
 *
 * Each step uses its named photo from src/assets/landing/. Photos are
 * framed in a thin orange-tinted border, full-bleed inside the frame,
 * with a tiny step number badge in the top-left corner so the steps
 * read as 1 / 2 / 3 without needing extra copy.
 */
export const SetupSection = () => {
  return (
    <section className="section bg-dot-grid" id="setup">
      <div className="container-tight">
        <div className="text-center mb-12" data-animate>
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent-pop)/0.35)] bg-[hsl(var(--accent-pop)/0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--accent-pop))]">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--accent-pop))]" />
            How it works
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">
            Set it up once.{" "}
            <span className="text-[hsl(var(--accent-pop))]">Brand everything.</span>
          </h2>
        </div>

        <div className="space-y-12">
          {setupSteps.map((step, index) => (
            <SectionSplit key={index} title={step.title} subtitle={step.subtitle}>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[hsl(0_0%_5%)] shadow-elegant">
                {/* Step number badge */}
                <div className="absolute left-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--accent-pop)/0.5)] bg-[hsl(0_0%_6%)] text-xs font-bold text-[hsl(var(--accent-pop))] shadow-lg">
                  {index + 1}
                </div>
                <div className="relative aspect-[16/10] w-full">
                  <img
                    src={step.image}
                    alt={step.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </div>
                {/* Hairline accent */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-pop)/0.55)] to-transparent" />
              </div>
            </SectionSplit>
          ))}
        </div>
      </div>
    </section>
  );
};