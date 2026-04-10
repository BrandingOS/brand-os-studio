import type { StatData } from '@/types';
import { Counter } from '@/components/fancy/Counter';

interface StatCardProps extends StatData {
  index: number;
}

/**
 * Stat block — v5.
 *
 * NO RevealItem wrapper. The Counter component has its own useInView
 * trigger that fires the count-up animation when the number scrolls
 * into view. Wrapping it in RevealItem caused a conflict: RevealItem
 * started at opacity:0, so the Counter was counting up invisibly —
 * when the RevealItem finally revealed, the number had already jumped
 * to its final value instead of animating. Now the card is always
 * visible and the Counter's spring animation IS the entrance effect.
 */
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
