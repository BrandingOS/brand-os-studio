import type { StatData } from '@/types';

export const StatCard = ({ value, label }: StatData) => (
  <div data-animate className="text-center">
    <div className="text-4xl font-semibold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);
