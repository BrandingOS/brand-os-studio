import SectionSplit from '@/components/SectionSplit';
import { setupSteps } from '@/data/content';

export const SetupSection = () => {
  return (
    <section className="section border-t border-border" id="setup">
      <div className="container-tight">
        <div className="max-w-3xl">
          <span className="eyebrow" data-animate>
            How it works
          </span>
          <h2 className="h-section mt-6" data-animate>
            Set it up once. Brand everything.
          </h2>
        </div>

        <div className="mt-20 space-y-24 md:space-y-32">
          {setupSteps.map((step, index) => (
            <SectionSplit
              key={step.title}
              index={index}
              title={step.title}
              subtitle={step.subtitle}
            >
              <div className="surface overflow-hidden">
                <img
                  src={step.image}
                  alt={`Illustration of ${step.title.toLowerCase()}`}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover grayscale"
                />
              </div>
            </SectionSplit>
          ))}
        </div>
      </div>
    </section>
  );
};
