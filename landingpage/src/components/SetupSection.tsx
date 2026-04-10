import SectionSplit from '@/components/SectionSplit';
import { setupSteps } from '@/data/content';
import { Reveal } from '@/components/fancy/Reveal';

export const SetupSection = () => {
  return (
    <section className="section bg-dot-grid border-t border-border" id="setup">
      <div className="container-tight">
        <Reveal className="max-w-3xl mb-20 md:mb-28">
          <span className="eyebrow">How it works</span>
          <h2 className="h-section mt-6">
            Set it up once.
            <br />
            Brand everything.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Three steps from a folder of files to a fully self-syncing brand
            system that runs every output you ever ship.
          </p>
        </Reveal>

        <div className="space-y-16 md:space-y-40">
          {setupSteps.map((step, index) => (
            <SectionSplit
              key={step.title}
              index={index}
              title={step.title}
              subtitle={step.subtitle}
            >
              <div className="card-soft overflow-hidden">
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
