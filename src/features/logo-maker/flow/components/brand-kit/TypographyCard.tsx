import { KitCard } from './KitCard';
import { DEFAULT_TYPOGRAPHY } from '../../utils/brand-context';

export function TypographyCard() {
  const t = DEFAULT_TYPOGRAPHY;
  return (
    <KitCard title="Typography" meta="Google Fonts · commercial use">
      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Heading</p>
          <p
            className="text-2xl leading-none"
            style={{ fontFamily: t.heading.family, fontWeight: 700 }}
          >
            Aa Bb Cc
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
            {t.heading.family.split(',')[0]} · {t.heading.weights.join(', ')}
          </p>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Body</p>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: t.body.family, fontWeight: 400 }}
          >
            The quick brown fox jumps over the lazy dog.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
            {t.body.family.split(',')[0]} · {t.body.weights.join(', ')}
          </p>
        </div>
      </div>
    </KitCard>
  );
}
