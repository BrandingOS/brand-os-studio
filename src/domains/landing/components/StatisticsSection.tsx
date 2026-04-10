import { stats } from '@/domains/landing/data/content';
import { StatCard } from '@/domains/landing/components/StatCard';
import { Reveal } from '@/domains/landing/components/fancy/Reveal';

export const StatisticsSection = () => {
  return (
    <section className="section bg-secondary/40 border-y border-border">
      <div className="container-tight">
        <Reveal className="max-w-3xl mb-16 md:mb-20">
          <span className="eyebrow">By the numbers</span>
          <h2 className="h-section mt-6">
            Brand consistency
            <br />
            moves the numbers.
          </h2>
        </Reveal>

        <div className="grid gap-12 md:gap-10 md:grid-cols-3">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} index={i} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};
