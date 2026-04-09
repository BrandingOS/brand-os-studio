import { painPoints } from '@/data/content';
import { FeatureCard } from '@/components/FeatureCard';
import { Reveal } from '@/components/fancy/Reveal';

export const PainPointsSection = () => {
  return (
    <section id="pain" className="section relative">
      <div className="container-tight">
        <div className="grid items-end gap-10 md:grid-cols-12 mb-16 md:mb-20">
          <Reveal className="md:col-span-7">
            <span className="eyebrow">The problem</span>
            <h2 className="h-section mt-6">
              Before Brand&nbsp;OS — chaos.
              <br />
              After — control.
            </h2>
          </Reveal>
          <Reveal delay={0.15} className="md:col-span-5">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Every brand on every channel demands the same logo, the same
              colors, the same voice. Without a system, every asset is a
              guess — and every guess drifts further from the brand.
            </p>
          </Reveal>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {painPoints.map((feature, index) => (
            <FeatureCard key={feature.title} index={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
