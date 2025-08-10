import { statistics, sectionMetadata } from "@/data/landing";
import { StatCard } from "@/shared/components/StatCard";

export const StatisticsSection = () => {
  const section = sectionMetadata.stats;

  return (
    <section className={section.className}>
      <div className="container-tight grid gap-8 sm:grid-cols-3">
        {statistics.map((stat) => (
          <StatCard
            key={stat.id}
            value={stat.value}
            label={stat.label}
          />
        ))}
      </div>
    </section>
  );
};