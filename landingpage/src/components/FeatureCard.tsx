import type { FeatureCardData } from '@/types';
import { RevealItem } from '@/components/fancy/Reveal';

interface FeatureCardProps extends FeatureCardData {
  index: number;
}

/**
 * Numbered pain-point card — v5.1.
 *
 * Each card uses its OWN scroll trigger (RevealItem) so fast-scroll users
 * never get stranded with invisible cards. The "01/02/03" tag is now in
 * accent orange, and hover lifts the card with an accent border.
 */
export const FeatureCard = ({ icon: Icon, title, desc, index }: FeatureCardProps) => (
  <RevealItem index={index} className="h-full">
    <div className="card-soft p-8 md:p-10 h-full transition-all duration-500 hover:border-accent-pop">
      <div className="flex items-start justify-between">
        <span className="font-mono text-sm tracking-widest text-accent-pop font-semibold">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <h3 className="mt-12 h-card">{title}</h3>
      <p className="mt-3 text-base text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </RevealItem>
);
