import SectionSplit from "@/components/sections/SectionSplit";
import { setupSteps } from "../data/content";

export const SetupSection = () => {
  return (
    <section className="section bg-dot-grid" id="setup">
      <div className="container-tight">
        <h2 data-animate className="text-3xl font-semibold text-center mb-10">
          Set It Up Once. Brand Everything.
        </h2>
        <div className="space-y-10">
          {setupSteps.map((step, index) => (
            <SectionSplit key={index} title={step.title} subtitle={step.subtitle}>
              <img 
                src={step.image} 
                alt={`Grayscale illustration of ${step.title.toLowerCase()}`} 
                loading="lazy" 
                className="rounded-2xl w-full h-auto object-cover card-soft" 
              />
            </SectionSplit>
          ))}
        </div>
      </div>
    </section>
  );
};