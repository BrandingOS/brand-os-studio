// src/shared/presentation/theme/panels/TypographySection.tsx
//
// Typography controls for the deck Customize panel.
// Reads from `theme.typography` and dispatches partial-theme patches.
// Heading + body fonts use a curated catalog; picking a font ALSO
// loads the Google Fonts stylesheet so the change is actually visible.

import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { PresentationTheme } from '../types';
import { Slider } from '@/components/ui/slider';
import {
  DECK_FONTS,
  ensureFontLoaded,
  findDeckFont,
  groupedDeckFonts,
  kindLabel,
} from './fontCatalog';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const HEADING_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;
const BODY_WEIGHTS = [400, 500, 600] as const;

export function TypographySection({ theme, onPatch }: Props) {
  const headingFamily = theme.typography.headingFont;
  const bodyFamily = theme.typography.bodyFont;

  // Load any selected font on mount (covers reload — the user chose
  // the font in a previous session and it's already in the theme).
  useEffect(() => {
    if (headingFamily) ensureFontLoaded(headingFamily);
    if (bodyFamily) ensureFontLoaded(bodyFamily);
  }, [headingFamily, bodyFamily]);

  const setHeadingFont = (family: string | undefined) => {
    if (family) ensureFontLoaded(family);
    onPatch({
      typography: { ...theme.typography, headingFont: family },
    });
  };

  const setBodyFont = (family: string | undefined) => {
    if (family) ensureFontLoaded(family);
    onPatch({
      typography: { ...theme.typography, bodyFont: family },
    });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Heading font">
        <FontPick
          value={headingFamily}
          onChange={setHeadingFont}
          previewText="Aa Heading"
        />
      </Field>

      <Field label="Body font">
        <FontPick
          value={bodyFamily}
          onChange={setBodyFont}
          previewText="Aa body copy"
        />
      </Field>

      <Field label={`Scale  ${theme.typography.scaleMultiplier.toFixed(2)}×`}>
        <Slider
          min={0.85}
          max={1.5}
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
          min={0.85}
          max={1.35}
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

/* ── Font dropdown ─────────────────────────────────────────────────── */

function FontPick({
  value,
  onChange,
  previewText,
}: {
  value: string | undefined;
  onChange: (family: string | undefined) => void;
  previewText: string;
}) {
  const current = findDeckFont(value);
  const grouped = groupedDeckFonts();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid hsl(var(--border))',
          borderRadius: 6,
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <option value="">Inherit from brand</option>
        {grouped.map((group) => (
          <optgroup key={group.kind} label={kindLabel(group.kind)}>
            {group.fonts.map((f) => (
              <option key={f.label} value={f.family}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div
        style={{
          padding: '8px 10px',
          border: '1px dashed hsl(var(--border))',
          borderRadius: 6,
          fontFamily: current?.family ?? 'inherit',
          fontSize: 18,
          color: 'hsl(var(--foreground))',
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {previewText}
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */

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

// Side-effect: warm common fonts on first import so the preview row
// in the dropdown reads correctly even before the user picks one.
if (typeof window !== 'undefined') {
  // Don't fan out to all 20 fonts — just the popular Arabic + sans
  // fallbacks the deck is most likely to need first.
  ['Inter', 'Manrope', 'Cairo', 'IBM Plex Arabic', 'Tajawal'].forEach((label) => {
    const f = DECK_FONTS.find((x) => x.label === label);
    if (f) ensureFontLoaded(f.family);
  });
}
