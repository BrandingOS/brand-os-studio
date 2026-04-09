import { stats } from '@/data/content';
import { StatCard } from '@/components/StatCard';
import { Reveal, RevealStagger } from '@/components/fancy/Reveal';

export const StatisticsSection = () => {
  return (
    <section className="section bg-secondary/40 border-y border-border">
      <div className="container-tight">
        <Reveal className="max-w-3xl mb-16 md:mb-24">
          <span className="eyebrow">By the numbers</span>
          <h2 className="h-section mt-6">
            Brand consistency
            <br />
            moves the numbers.
          </h2>
        </Reveal>

        <RevealStagger className="grid gap-12 md:gap-8 md:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
};
