import { painPoints } from '@/data/content';
import { FeatureCard } from '@/components/FeatureCard';
import { Reveal, RevealStagger } from '@/components/fancy/Reveal';

export const PainPointsSection = () => {
  return (
    <section id="pain" className="section relative">
      <div className="container-tight relative z-10">
        <Reveal className="max-w-3xl">
          <span className="eyebrow">The problem</span>
          <h2 className="h-section mt-6 text-foreground">
            Before Brand OS — chaos.
            <br />
            <span className="gradient-text-cyan">After — control.</span>
          </h2>
        </Reveal>

        <RevealStagger className="mt-16 grid gap-6 md:grid-cols-3">
          {painPoints.map((feature, index) => (
            <FeatureCard key={feature.title} index={index} {...feature} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
};
