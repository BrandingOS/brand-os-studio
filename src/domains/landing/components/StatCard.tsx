import type { StatData } from '@/domains/landing/types';
import { Counter } from '@/domains/landing/components/fancy/Counter';

interface StatCardProps extends StatData {
  index: number;
}

export const StatCard = ({ value, label }: StatCardProps) => (
  <div className="border-t-2 border-foreground pt-6">
    <div className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
      <Counter value={value} />
    </div>
    <div className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xs">
      {label}
    </div>
  </div>
);
