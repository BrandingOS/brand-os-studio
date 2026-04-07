import { stats } from '@/data/content';
import { StatCard } from '@/components/StatCard';

export const StatisticsSection = () => {
  return (
    <section className="section border-t border-border">
      <div className="container-tight">
        <div className="max-w-3xl">
          <span className="eyebrow" data-animate>
            Why it matters
          </span>
          <h2 className="h-section mt-6" data-animate>
            Brand consistency moves the numbers.
          </h2>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};
