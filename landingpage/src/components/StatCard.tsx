import type { StatData } from '@/types';

export const StatCard = ({ value, label }: StatData) => (
  <div data-animate className="border-l border-border pl-6 md:pl-8">
    <div className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-none">
      {value}
    </div>
    <div className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-xs">
      {label}
    </div>
  </div>
);
