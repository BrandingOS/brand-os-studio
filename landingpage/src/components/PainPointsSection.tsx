import { painPoints } from '@/data/content';
import { FeatureCard } from '@/components/FeatureCard';

export const PainPointsSection = () => {
  return (
    <section id="pain" className="section border-t border-border">
      <div className="container-tight">
        <div className="max-w-3xl">
          <span className="eyebrow" data-animate>
            The problem
          </span>
          <h2 className="h-section mt-6" data-animate>
            Before Brand OS — chaos. After — control.
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {painPoints.map((feature, index) => (
            <FeatureCard key={feature.title} index={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
