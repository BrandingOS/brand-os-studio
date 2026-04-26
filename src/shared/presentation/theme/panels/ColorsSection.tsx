// src/shared/presentation/theme/panels/ColorsSection.tsx
//
// Color overrides for the deck Customize panel.
// Each field defaults to a value from `buildBrandPalette(brand)`; the
// "Use brand" button only appears once an override is set, and clears
// it back to the brand default.
//
// CLEARING OVERRIDES.  The store's deepMerge ignores `undefined` patch
// keys (so the previous override would persist).  It DOES write `null`
// through.  Since the panel reads `theme.colors[key] ?? default`, both
// `undefined` and `null` resolve to the brand default — so we cast a
// runtime `null` into the `string | undefined` slot when clearing.
// Discussed in PHASE-C report.

import type { Brand } from '@/shared/types/brand';
import type { PresentationTheme } from '../types';
import { buildBrandPalette } from '@/shared/brand/brandPalette';

interface Props {
  brand: Brand;
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

type ColorKey = 'bg' | 'cardBg' | 'accent';

// Heading + body text colors moved into per-role Typography rows.
// This panel only handles surface + accent colors now.
const FIELDS: Array<{
  key: ColorKey;
  label: string;
  defaultFrom: (b: Brand) => string;
}> = [
  { key: 'bg',     label: 'Page background', defaultFrom: (b) => buildBrandPalette(b).bg.page },
  { key: 'cardBg', label: 'Card background', defaultFrom: (b) => buildBrandPalette(b).bg.surface },
  { key: 'accent', label: 'Accent',          defaultFrom: (b) => buildBrandPalette(b).brand.accent },
];

export function ColorsSection({ brand, theme, onPatch }: Props) {
  const setColor = (key: ColorKey, value: string | null) => {
    // `null` reaches deepMerge and overwrites the previous override.
    // Cast keeps the public Partial<PresentationTheme> shape intact.
    onPatch({
      colors: { ...theme.colors, [key]: value as unknown as string | undefined },
    });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FIELDS.map(({ key, label, defaultFrom }) => {
        const override = theme.colors[key];
        const fallback = defaultFrom(brand);
        const current = override ?? fallback;
        return (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <input
              aria-label={label}
              type="color"
              value={current}
              onChange={(e) => setColor(key, e.target.value)}
              style={{
                width: 32,
                height: 32,
                padding: 0,
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
            <div
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <span style={{ fontSize: 12, color: 'hsl(var(--foreground))' }}>
                {label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                {override ? current : `${current} (from brand)`}
              </span>
            </div>
            {override && (
              <button
                type="button"
                onClick={() => setColor(key, null)}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid hsl(var(--border))',
                  background: 'transparent',
                  color: 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                }}
                title="Use brand default"
              >
                Use brand
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
