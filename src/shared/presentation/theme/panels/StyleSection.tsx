// src/shared/presentation/theme/panels/StyleSection.tsx
//
// Four segmented control rows: background kind, border radius, shadow,
// logo placement. Each writes a sub-field into `theme.style`.

import type {
  PresentationTheme,
  DeckBgKind,
  DeckRadiusKind,
  DeckShadowKind,
  DeckLogoPlacement,
} from '../types';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const BG_KINDS: { value: DeckBgKind; label: string }[] = [
  { value: 'solid',    label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'pattern',  label: 'Pattern' },
];

const RADII: { value: DeckRadiusKind; label: string }[] = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'soft',  label: 'Soft' },
  { value: 'pill',  label: 'Pill' },
];

const SHADOWS: { value: DeckShadowKind; label: string }[] = [
  { value: 'none',   label: 'None' },
  { value: 'soft',   label: 'Soft' },
  { value: 'lifted', label: 'Lifted' },
];

const LOGO_POS: { value: DeckLogoPlacement; label: string }[] = [
  { value: 'tl',     label: 'TL' },
  { value: 'tr',     label: 'TR' },
  { value: 'bl',     label: 'BL' },
  { value: 'br',     label: 'BR' },
  { value: 'hidden', label: 'Off' },
];

export function StyleSection({ theme, onPatch }: Props) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Group
        label="Background"
        options={BG_KINDS}
        value={theme.style.bgKind}
        onChange={(v) => onPatch({ style: { ...theme.style, bgKind: v } })}
      />
      <Group
        label="Border radius"
        options={RADII}
        value={theme.style.borderRadius}
        onChange={(v) =>
          onPatch({ style: { ...theme.style, borderRadius: v } })
        }
      />
      <Group
        label="Shadow"
        options={SHADOWS}
        value={theme.style.shadow}
        onChange={(v) => onPatch({ style: { ...theme.style, shadow: v } })}
      />
      <Group
        label="Logo placement"
        options={LOGO_POS}
        value={theme.style.logoPlacement}
        onChange={(v) =>
          onPatch({ style: { ...theme.style, logoPlacement: v } })
        }
      />
    </section>
  );
}

function Group<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'inline-flex',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid hsl(var(--border))',
        }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: 11,
                border: 'none',
                background: active ? 'hsl(var(--primary))' : 'transparent',
                color: active
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--foreground))',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
