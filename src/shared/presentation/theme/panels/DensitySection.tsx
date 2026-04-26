// src/shared/presentation/theme/panels/DensitySection.tsx
//
// Single segmented control for the deck density token.
// Maps directly to `theme.density` → CSS vars `--deck-pad-x|y|gap`.

import type { PresentationTheme, DeckDensity } from '../types';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const DENSITIES: { value: DeckDensity; label: string }[] = [
  { value: 'compact',     label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious',    label: 'Spacious' },
];

export function DensitySection({ theme, onPatch }: Props) {
  return (
    <section>
      <div
        style={{
          display: 'inline-flex',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid hsl(var(--border))',
          width: '100%',
        }}
      >
        {DENSITIES.map(({ value, label }) => {
          const active = theme.density === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPatch({ density: value })}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: 12,
                border: 'none',
                background: active ? 'hsl(var(--primary))' : 'transparent',
                color: active
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--foreground))',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
