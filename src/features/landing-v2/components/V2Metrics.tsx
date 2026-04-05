import { useCounter } from '../hooks/useV2Reveal';
import { TrendingUp, Eye, Shield, Clock } from 'lucide-react';

const metrics = [
  {
    icon: Eye,
    value: 80,
    suffix: '%',
    label: 'Brand Recognition Boost',
    description: 'Consistent brands are 80% more recognizable across all touchpoints.',
  },
  {
    icon: TrendingUp,
    value: 20,
    prefix: '10–',
    suffix: '%',
    label: 'Revenue Growth',
    description: 'Brand consistency directly correlates with 10–20% revenue growth.',
  },
  {
    icon: Shield,
    value: 87,
    suffix: '%',
    label: 'Consumer Trust',
    description: '87% of consumers say consistency is key to trusting a brand.',
  },
  {
    icon: Clock,
    value: 19,
    suffix: '+',
    label: 'Modules',
    description: 'From business cards to animations — one platform, every brand asset.',
  },
];

function MetricCard({ metric, index }: { metric: typeof metrics[0]; index: number }) {
  const { count, ref } = useCounter(metric.value, 2000);
  const Icon = metric.icon;

  return (
    <div
      ref={ref}
      className={`v2-reveal v2-reveal-delay-${index + 1} v2-glass rounded-2xl p-6 sm:p-8 text-center group hover:bg-white/[0.03] transition-all duration-400`}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5 group-hover:bg-white/[0.06] transition-colors">
        <Icon className="w-4.5 h-4.5 text-white/40" />
      </div>

      {/* Value */}
      <div className="font-display text-4xl sm:text-5xl font-bold v2-gradient-text-accent">
        {metric.prefix || ''}{count}{metric.suffix}
      </div>

      {/* Label */}
      <h3 className="mt-3 text-sm font-semibold text-white/70">{metric.label}</h3>

      {/* Description */}
      <p className="mt-2 text-xs text-white/30 leading-relaxed max-w-[220px] mx-auto">
        {metric.description}
      </p>
    </div>
  );
}

export function V2Metrics() {
  return (
    <section className="relative py-32">
      {/* Top separator */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="v2-separator" />
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="v2-reveal v2-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            Why It Matters
          </span>
          <h2 className="v2-reveal v2-reveal-delay-1 mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-gradient-text">
            Brand consistency isn't optional.
            <br />
            <span className="text-white/40">It's revenue.</span>
          </h2>
        </div>

        {/* Metrics Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, i) => (
            <MetricCard key={i} metric={metric} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
