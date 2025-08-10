import { painPointFeatures, sectionMetadata } from "@/data/landing";
import { FeatureCard } from "@/shared/components/FeatureCard";

export const PainPointsSection = () => {
  const section = sectionMetadata.painPoints;

  return (
    <section id={section.id} className={section.className}>
      <div className="container-tight">
        <h2 data-animate className="text-3xl font-semibold text-center">
          {section.headline}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {painPointFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};