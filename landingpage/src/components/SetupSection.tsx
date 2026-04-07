import SectionSplit from '@/components/SectionSplit';
import { setupSteps } from '@/data/content';
import { Reveal } from '@/components/fancy/Reveal';

export const SetupSection = () => {
  return (
    <section className="section border-t border-border" id="setup">
      <div className="container-tight">
        <Reveal className="max-w-3xl">
          <span className="eyebrow">How it works</span>
          <h2 className="h-section mt-6 text-foreground">
            Set it up once.
            <br />
            <span className="gradient-text">Brand everything.</span>
          </h2>
        </Reveal>

        <div className="mt-24 space-y-28 md:space-y-36">
          {setupSteps.map((step, index) => (
            <SectionSplit
              key={step.title}
              index={index}
              title={step.title}
              subtitle={step.subtitle}
            >
              <div className="surface glow-ring overflow-hidden">
                <img
                  src={step.image}
                  alt={`Illustration of ${step.title.toLowerCase()}`}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </SectionSplit>
          ))}
        </div>
      </div>
    </section>
  );
};
