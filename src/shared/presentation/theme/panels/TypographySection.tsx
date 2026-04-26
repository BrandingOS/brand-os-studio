// src/shared/presentation/theme/panels/TypographySection.tsx
//
// Typography controls for the deck Customize panel.
// Reads from `theme.typography` and dispatches partial-theme patches.
// V1: native <input type="text"> for fonts; FontPicker is a follow-up.

import type { CSSProperties, ReactNode } from 'react';
import type { PresentationTheme } from '../types';
import { Slider } from '@/components/ui/slider';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const HEADING_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;
const BODY_WEIGHTS = [400, 500, 600] as const;

export function TypographySection({ theme, onPatch }: Props) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Heading font">
        <input
          type="text"
          value={theme.typography.headingFont ?? ''}
          placeholder="Inherit from brand"
          onChange={(e) =>
            onPatch({
              typography: {
                ...theme.typography,
                headingFont: e.target.value || undefined,
              },
            })
          }
          style={inputStyle}
        />
      </Field>
      <Field label="Body font">
        <input
          type="text"
          value={theme.typography.bodyFont ?? ''}
          placeholder="Inherit from brand"
          onChange={(e) =>
            onPatch({
              typography: {
                ...theme.typography,
                bodyFont: e.target.value || undefined,
              },
            })
          }
          style={inputStyle}
        />
      </Field>

      <Field label={`Scale  ${theme.typography.scaleMultiplier.toFixed(2)}×`}>
        <Slider
          min={0.85}
          max={1.25}
          step={0.05}
          value={[theme.typography.scaleMultiplier]}
          onValueChange={([v]) =>
            onPatch({
              typography: { ...theme.typography, scaleMultiplier: Number(v) },
            })
          }
        />
      </Field>

      <Field label={`Line-height  ${theme.typography.leadingMultiplier.toFixed(2)}×`}>
        <Slider
          min={0.9}
          max={1.2}
          step={0.05}
          value={[theme.typography.leadingMultiplier]}
          onValueChange={([v]) =>
            onPatch({
              typography: { ...theme.typography, leadingMultiplier: Number(v) },
            })
          }
        />
      </Field>

      <Field label="Heading weight">
        <Segmented
          value={theme.typography.headingWeight}
          options={HEADING_WEIGHTS.map((w) => ({ value: w, label: String(w) }))}
          onChange={(w) =>
            onPatch({ typography: { ...theme.typography, headingWeight: w } })
          }
        />
      </Field>
      <Field label="Body weight">
        <Segmented
          value={theme.typography.bodyWeight}
          options={BODY_WEIGHTS.map((w) => ({ value: w, label: String(w) }))}
          onChange={(w) =>
            onPatch({ typography: { ...theme.typography, bodyWeight: w } })
          }
        />
      </Field>
    </section>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
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
              fontSize: 12,
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
  );
}
