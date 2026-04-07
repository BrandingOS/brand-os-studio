import { stats } from '@/data/content';
import { StatCard } from '@/components/StatCard';
import { Reveal, RevealStagger } from '@/components/fancy/Reveal';

export const StatisticsSection = () => {
  return (
    <section className="section border-t border-border">
      <div className="container-tight">
        <Reveal className="max-w-3xl">
          <span className="eyebrow">Why it matters</span>
          <h2 className="h-section mt-6 text-foreground">
            Brand consistency —
            <br />
            <span className="gradient-text-cyan">moves the numbers.</span>
          </h2>
        </Reveal>

        <RevealStagger className="mt-16 grid gap-12 md:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
};
