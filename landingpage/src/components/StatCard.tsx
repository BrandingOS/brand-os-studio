import type { StatData } from '@/types';
import { Counter } from '@/components/fancy/Counter';
import { RevealItem } from '@/components/fancy/Reveal';

interface StatCardProps extends StatData {
  index: number;
}

/**
 * Stat block — v5.1.
 *
 * Refined sizes (no longer 8xl absurdity). Each block has its own
 * scroll trigger via RevealItem. Numbers animate from 0 → target with
 * the existing Counter spring.
 */
export const StatCard = ({ value, label, index }: StatCardProps) => (
  <RevealItem index={index}>
    <div className="border-t-2 border-foreground pt-6">
      <div className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
        <Counter value={value} />
      </div>
      <div className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xs">
        {label}
      </div>
    </div>
  </RevealItem>
);
