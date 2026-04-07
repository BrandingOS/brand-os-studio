import { stats } from '@/data/content';
import { StatCard } from '@/components/StatCard';

export const StatisticsSection = () => {
  return (
    <section className="section bg-secondary bg-dot-grid">
      <div className="container-tight grid gap-8 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </section>
  );
};
