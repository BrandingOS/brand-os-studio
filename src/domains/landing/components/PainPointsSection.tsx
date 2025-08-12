import { painPoints } from "../data/content";
import { FeatureCard } from "./FeatureCard";

export const PainPointsSection = () => {
  return (
    <section id="pain" className="section">
      <div className="container-tight">
        <h2 data-animate className="text-3xl font-semibold text-center">
          Before Brand OS — Chaos. After — Control.
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};