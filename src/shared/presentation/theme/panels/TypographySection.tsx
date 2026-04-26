// src/shared/presentation/theme/panels/TypographySection.tsx
//
// Per-role typography editor. One row per role (display, h1, h2, h3,
// h4, body, caption, label). Click a row to expand; edit font, size,
// weight, line-height, color independently. Each field clears via the
// "Inherit from brand" path.

import { useEffect, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import {
  DECK_TYPE_ROLES,
  ROLE_LABEL,
  type DeckTypeRole,
  type PresentationTheme,
  type RoleStyle,
} from '../types';
import { Slider } from '@/components/ui/slider';
import {
  ensureFontLoaded,
  findDeckFont,
  groupedDeckFonts,
  kindLabel,
} from './fontCatalog';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const HEADING_ROLES: DeckTypeRole[] = ['display', 'h1', 'h2', 'h3', 'h4'];
const BODY_ROLES: DeckTypeRole[] = ['body', 'caption', 'label'];
const HEADING_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;
const BODY_WEIGHTS = [400, 500, 600] as const;

export function TypographySection({ theme, onPatch }: Props) {
  // Warm any fonts already saved into the theme so the previews +
  // specimens render in the right family on first paint.
  useEffect(() => {
    Object.values(theme.typography.roles).forEach((r) => {
      if (r?.font) ensureFontLoaded(r.font);
    });
  }, [theme.typography.roles]);

  const setRole = (role: DeckTypeRole, next: RoleStyle) => {
    onPatch({
      typography: {
        roles: { ...theme.typography.roles, [role]: next },
      },
    });
  };

  const clearRole = (role: DeckTypeRole) => {
    const nextRoles = { ...theme.typography.roles };
    delete nextRoles[role];
    onPatch({ typography: { roles: nextRoles } });
  };

  const renderRows = (roles: DeckTypeRole[]) =>
    roles.map((role) => (
      <RoleRow
        key={role}
        role={role}
        value={theme.typography.roles[role]}
        onChange={(next) => setRole(role, next)}
        onClear={() => clearRole(role)}
      />
    ));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <GroupHeader>Heading roles</GroupHeader>
      {renderRows(HEADING_ROLES)}
      <GroupHeader style={{ marginTop: 14 }}>Body roles</GroupHeader>
      {renderRows(BODY_ROLES)}
    </section>
  );
}

/* ───────────────────────── role row ───────────────────────── */

function RoleRow({
  role,
  value,
  onChange,
  onClear,
}: {
  role: DeckTypeRole;
  value: RoleStyle | undefined;
  onChange: (next: RoleStyle) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const v: RoleStyle = value ?? {};
  const hasOverrides = Object.keys(v).length > 0;
  const weights = (HEADING_ROLES as readonly DeckTypeRole[]).includes(role)
    ? HEADING_WEIGHTS
    : BODY_WEIGHTS;

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        background: open ? 'hsl(var(--muted) / 0.4)' : 'transparent',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            {ROLE_LABEL[role]}
          </span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            {summarize(v)}
          </span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {hasOverrides && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }
              }}
              title="Reset to brand default"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 7px',
                fontSize: 10,
                borderRadius: 999,
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--muted-foreground))',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={10} /> Reset
            </span>
          )}
          <ChevronDown
            size={14}
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
          />
        </span>
      </button>
      {open && (
        <div style={{ padding: '4px 12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Font">
            <FontPick
              value={v.font}
              onChange={(font) => {
                if (font) ensureFontLoaded(font);
                onChange({ ...v, font });
              }}
            />
          </Field>
          <Field label={`Size  ${v.sizePx ?? '—'}px`}>
            <Slider
              min={8}
              max={160}
              step={1}
              value={[v.sizePx ?? sizeDefault(role)]}
              onValueChange={([n]) => onChange({ ...v, sizePx: Number(n) })}
            />
          </Field>
          <Field label={`Line-height  ${(v.lineHeight ?? leadingDefault(role)).toFixed(2)}`}>
            <Slider
              min={0.85}
              max={2}
              step={0.05}
              value={[v.lineHeight ?? leadingDefault(role)]}
              onValueChange={([n]) => onChange({ ...v, lineHeight: Number(n) })}
            />
          </Field>
          <Field label="Weight">
            <Segmented
              value={v.weight}
              options={weights.map((w) => ({ value: w, label: String(w) }))}
              onChange={(w) => onChange({ ...v, weight: w })}
            />
          </Field>
          <Field label="Color">
            <ColorRow
              value={v.color}
              onChange={(color) => onChange({ ...v, color })}
              onClear={() => {
                const next = { ...v };
                delete next.color;
                onChange(next);
              }}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── small helpers ───────────────────────── */

function summarize(v: RoleStyle): string {
  if (Object.keys(v).length === 0) return 'Inherit from brand';
  const bits: string[] = [];
  const fontEntry = v.font ? findDeckFont(v.font) : undefined;
  if (fontEntry) bits.push(fontEntry.label);
  if (v.sizePx) bits.push(`${v.sizePx}px`);
  if (v.weight) bits.push(String(v.weight));
  if (v.color) bits.push(v.color.toUpperCase());
  return bits.join(' · ');
}

function sizeDefault(role: DeckTypeRole): number {
  // Just used as the slider's starting position when the user opens
  // the row before setting an explicit size. Doesn't drive rendering.
  return ({ display: 96, h1: 64, h2: 48, h3: 32, h4: 24, body: 18, caption: 14, label: 13 } as const)[role];
}

function leadingDefault(role: DeckTypeRole): number {
  return ({ display: 1.05, h1: 1.10, h2: 1.15, h3: 1.25, h4: 1.30, body: 1.55, caption: 1.45, label: 1.20 } as const)[role];
}

function GroupHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'hsl(var(--muted-foreground))',
        padding: '4px 4px 6px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function FontPick({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (family: string | undefined) => void;
}) {
  const current = findDeckFont(value);
  const grouped = groupedDeckFonts();
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      style={{
        width: '100%',
        padding: '7px 10px',
        border: '1px solid hsl(var(--border))',
        borderRadius: 6,
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        fontFamily: current?.family ?? 'inherit',
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
    <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
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
              color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
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

function ColorRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={value ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 32, height: 32, padding: 0, border: '1px solid hsl(var(--border))', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 11, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
        {value ? value.toUpperCase() : 'Inherit'}
      </span>
      {value && (
        <button
          type="button"
          onClick={onClear}
          title="Inherit from brand"
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            padding: '4px 8px',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            background: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            cursor: 'pointer',
          }}
        >
          Inherit
        </button>
      )}
    </div>
  );
}
