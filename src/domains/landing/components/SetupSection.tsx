/**
 * SetupSection — three-step "set it up once" walkthrough.
 *
 * Layout: alternating zig-zag. Step 1 = photo left, text right. Step 2
 * = text left, photo right. Step 3 = photo left, text right. Same as
 * the original SectionSplit pattern but with control over the order so
 * the rhythm reads as a real story.
 *
 * Step number: a soft round badge with a peach background and a
 * monospace orange "01" / "02" / "03" — matches the screenshot the
 * user shared. Big bold dark headline below it, then the subtitle in
 * muted gray. The photo sits in a simple bordered frame on the other
 * side.
 */
import { setupSteps } from "../data/content";

export const SetupSection = () => {
  return (
    <section className="setup-section bg-dot-grid relative" id="setup">
      <div className="container-tight relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20" data-animate>
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent-pop)/0.35)] bg-[hsl(var(--accent-pop)/0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--accent-pop))]">
            <span className="h-1 w-1 rounded-full bg-[hsl(var(--accent-pop))]" />
            How it works
          </span>
          <h2 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Set it up once.{" "}
            <span className="text-[hsl(var(--accent-pop))]">Brand everything.</span>
          </h2>
        </div>

        {/* Steps — alternating layout */}
        <div className="space-y-20 md:space-y-28">
          {setupSteps.map((step, index) => {
            const isReversed = index % 2 === 1;
            const stepNumber = String(index + 1).padStart(2, "0");
            return (
              <div
                key={index}
                data-animate
                className={`grid items-center gap-10 md:gap-16 lg:grid-cols-2 ${
                  isReversed ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Photo column */}
                <div className="relative">
                  <div className="setup-photo-frame">
                    <img
                      src={step.image}
                      alt={step.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  </div>
                </div>

                {/* Text column — round number badge, headline, subtitle */}
                <div className={isReversed ? "lg:pr-6" : "lg:pl-6"}>
                  <div className="setup-step-badge">
                    <span>{stepNumber}</span>
                  </div>
                  <h3 className="setup-step-title">{step.title}</h3>
                  <p className="setup-step-subtitle">{step.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{SETUP_STYLES}</style>
    </section>
  );
};

const SETUP_STYLES = `
.setup-section {
  background: #FCFBF9;
  padding-top: 6rem;
  padding-bottom: 6rem;
}
@media (min-width: 768px) {
  .setup-section { padding-top: 8rem; padding-bottom: 8rem; }
}

/* ── Round step badge — matches the user's screenshot ─────────── */
.setup-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: hsl(var(--accent-pop) / 0.12);
  border: 1px solid hsl(var(--accent-pop) / 0.18);
  box-shadow:
    0 8px 24px hsl(var(--accent-pop) / 0.10),
    inset 0 1px 0 hsl(0 0% 100% / 0.6);
}
.setup-step-badge span {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: hsl(var(--accent-pop));
}

/* ── Step typography ─────────────────────────────────────────── */
.setup-step-title {
  margin-top: 1.5rem;
  font-size: clamp(2rem, 4vw, 3.25rem);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: hsl(0 0% 8%);
}
.setup-step-subtitle {
  margin-top: 1rem;
  font-size: clamp(1rem, 1.4vw, 1.125rem);
  line-height: 1.6;
  color: hsl(0 0% 35%);
  max-width: 32rem;
}

/* ── Photo frame ─────────────────────────────────────────────── */
.setup-photo-frame {
  position: relative;
  aspect-ratio: 4 / 3;
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: hsl(0 0% 6%);
  border: 1px solid hsl(0 0% 0% / 0.08);
  box-shadow:
    0 24px 60px hsl(20 30% 30% / 0.12),
    0 8px 16px hsl(20 30% 30% / 0.06);
}
/* Hairline orange accent at the bottom of the photo frame */
.setup-photo-frame::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  background: linear-gradient(to right,
    transparent,
    hsl(var(--accent-pop) / 0.55),
    transparent);
  pointer-events: none;
}
`;
