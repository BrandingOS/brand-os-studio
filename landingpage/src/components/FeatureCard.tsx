import type { FeatureCardData } from '@/types';

interface FeatureCardProps extends FeatureCardData {
  index: number;
}

/**
 * Numbered process card — Relume signature.
 *
 * Big "01 / 02 / 03" tag at the top, then title, then body.
 * Thin border that darkens on hover.
 */
export const FeatureCard = ({ icon: Icon, title, desc, index }: FeatureCardProps) => (
  <div data-animate className="process-card">
    <div className="flex items-center justify-between">
      <span className="num-tag">{String(index + 1).padStart(2, '0')}</span>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <h3 className="mt-10 font-display text-2xl font-bold tracking-tight">{title}</h3>
    <p className="mt-3 text-base text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);
