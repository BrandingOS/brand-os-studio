/**
 * Editing the brand's colours, from inside the Brand Kit.
 *
 * The Colors card used to be read-only: the drilldown showed the palette
 * and the only way to change it was to leave the kit, find Setup, and
 * come back. This panel closes that loop — change a hex, rename a
 * colour, change what it is FOR, add one, remove one — and it writes to
 * the brand itself, not to a copy.
 *
 * Three rules it exists to keep:
 *
 *  • **A role is a POSITION in the Setup projection, so the picker edits
 *    the position.** `core[0]` is Primary, `core[1]` is Secondary,
 *    everything past them is supporting, and `accent[]` is Accent. There
 *    is exactly one Primary and at most one Secondary, so choosing one
 *    demotes whoever held it — the two colours TRADE, nothing is dropped.
 *    (Past Secondary the kit still NAMES a colour from the colour itself
 *    — Background for a near-white, Neutral for a grey — so the row shows
 *    the name the tiles will use, rather than pretending the user picked
 *    it.)
 *
 *  • **Every write goes down the Setup chain**: `brandToMockBrand` →
 *    mutate the whole MockBrand → `mockBrandToPatch(next, brand)` →
 *    `useBrandStore.update`. `mockBrandToPatch` diffs a WHOLE MockBrand,
 *    so the draft always starts from `brandToMockBrand` and only the
 *    palette is touched: a hand-built partial emits destructive diffs.
 *    The generated grey ladder is never sent back — that is the bug that
 *    once turned a three-colour palette into two.
 *
 *  • **Nothing is written without a confirmation that NAMES the change.**
 *    A brand's colours repaint every other surface in the product, so the
 *    dialog lists each change in the user's own words ("Iris #7231FF →
 *    #7A3DFF", "Add Coral as an Accent") rather than saying "Save?".
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DsButton, DsConfirmDialog, DsInput, DsModal, DsSelect } from '@/shared/ds';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import { hexToName } from '@/features/setup/data/colorNames';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import {
  bestTextOn,
  isNearWhite,
  normalizeHex,
  roleForColor,
  usageProportions,
  type PaletteColor,
} from '../../data/colorPaletteExport';
import './assets.css';

/** What the STORAGE can hold. See the header — a role is a position. */
type SlotRole = 'primary' | 'secondary' | 'accent' | 'supporting';

const ROLE_OPTIONS: { value: SlotRole; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'accent', label: 'Accent' },
  { value: 'supporting', label: 'Supporting' },
];

type Row = {
  /** Stable across edits so React keeps focus while the hex changes. */
  key: string;
  hex: string;
  name: string;
  role: SlotRole;
};

export type ColorsEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The brand as the kit renders it. */
  brand: MockBrand;
  /** The canonical brand — the only thing that can actually be written. */
  sourceBrand?: Brand | null;
  /** Live preview: the kit repaints from this while the panel is open. */
  onBrandChange?: (next: MockBrand) => void;
};

let seq = 0;
const nextKey = () => `c${(seq += 1)}`;

function rowsFrom(brand: MockBrand): Row[] {
  const core = brand.colors.core ?? [];
  const accent = brand.colors.accent ?? [];
  return [
    ...core.map((c, i) => ({
      key: nextKey(),
      hex: normalizeHex(c.hex),
      name: c.name,
      role: (i === 0 ? 'primary' : i === 1 ? 'secondary' : 'supporting') as SlotRole,
    })),
    ...accent.map((c) => ({
      key: nextKey(),
      hex: normalizeHex(c.hex),
      name: c.name,
      role: 'accent' as SlotRole,
    })),
  ];
}

/** Rows back into the two arrays the Setup projection stores. */
function toPalette(rows: Row[]): { core: { hex: string; name: string }[]; accent: { hex: string; name: string }[] } {
  const pick = (role: SlotRole) => rows.filter((r) => r.role === role);
  const core = [...pick('primary'), ...pick('secondary'), ...pick('supporting')];
  return {
    core: core.map((r) => ({ hex: r.hex, name: r.name })),
    accent: pick('accent').map((r) => ({ hex: r.hex, name: r.name })),
  };
}

/** The role the KIT will print for a row — derived exactly as the tiles
 *  derive it, so the panel never promises a label the tile will not use. */
function displayedRole(rows: Row[], row: Row): string {
  const ordered = [...rows.filter((r) => r.role === 'primary'), ...rows.filter((r) => r.role === 'secondary'), ...rows.filter((r) => r.role === 'supporting')];
  if (row.role === 'accent') return 'Accent';
  const index = ordered.findIndex((r) => r.key === row.key);
  return roleForColor(row.hex, index < 0 ? 0 : index, 'core');
}

/** A draft palette as the exporters and tiles will read it. */
function paletteOfRows(rows: Row[]): PaletteColor[] {
  return rows.map((r) => ({ hex: r.hex, name: r.name, role: displayedRole(rows, r) }));
}

export function ColorsEditor({
  open,
  onClose,
  brand,
  sourceBrand,
  onBrandChange,
}: ColorsEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(brand));
  // The palette as it was when the panel opened. It has to be a SNAPSHOT
  // with the same keys as `rows`: re-deriving it from the brand mints new
  // keys, so every row would read as newly added and the confirmation
  // would say "Add …" for colours the brand already had.
  const [original, setOriginal] = useState<Row[]>(rows);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever the panel opens: it must show the brand as it is
  // NOW, not the draft someone abandoned three cards ago.
  useEffect(() => {
    if (!open) return;
    const seeded = rowsFrom(brand);
    setRows(seeded);
    setOriginal(seeded);
    setEditingKey(null);
    setAdding(false);
    setConfirming(false);
    setError(null);
    // `brand` deliberately absent — reopening re-seeds, a repaint does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo<MockBrand>(() => {
    const { core, accent } = toPalette(rows);
    return { ...brand, colors: { ...brand.colors, core, accent } };
  }, [rows, brand]);

  // Live preview — the kit behind the panel repaints as the draft changes.
  useEffect(() => {
    if (!open) return;
    onBrandChange?.(preview);
  }, [open, preview, onBrandChange]);

  const palette = useMemo(() => paletteOfRows(rows), [rows]);

  /** What Save will do, in the user's own words. */
  const changes = useMemo(() => {
    const out: string[] = [];
    for (const row of rows) {
      const before = original.find((o) => o.key === row.key);
      if (!before) {
        out.push(`Add ${row.name} ${row.hex} as ${roleWord(row.role)}`);
        continue;
      }
      if (before.hex !== row.hex) out.push(`${before.name} ${before.hex} → ${row.hex}`);
      if (before.name !== row.name) out.push(`Rename ${before.name} to ${row.name}`);
      if (before.role !== row.role) {
        out.push(`${row.name} becomes ${roleWord(row.role)} (was ${roleWord(before.role)})`);
      }
    }
    for (const before of original) {
      if (!rows.some((r) => r.key === before.key)) {
        out.push(`Remove ${before.name} ${before.hex}`);
      }
    }
    return out;
  }, [rows, original]);

  const setRow = useCallback((key: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }, []);

  /** Primary and Secondary are single seats: taking one hands the old
   *  holder the seat you left, so the two TRADE and nothing is dropped. */
  const changeRole = useCallback((key: string, role: SlotRole) => {
    setRows((prev) => {
      const mover = prev.find((r) => r.key === key);
      if (!mover || mover.role === role) return prev;
      const single = role === 'primary' || role === 'secondary';
      return prev.map((r) => {
        if (r.key === key) return { ...r, role };
        if (single && r.role === role) return { ...r, role: mover.role };
        return r;
      });
    });
  }, []);

  /** Removing the Primary promotes an heir rather than leaving the brand
   *  without one — the same rule Setup's logo board keeps. */
  const removeRow = useCallback((key: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const gone = prev.find((r) => r.key === key);
      const rest = prev.filter((r) => r.key !== key);
      if (gone?.role === 'primary' && !rest.some((r) => r.role === 'primary')) {
        const heirIndex = rest.findIndex((r) => r.role === 'secondary');
        const at = heirIndex >= 0 ? heirIndex : 0;
        return rest.map((r, i) => (i === at ? { ...r, role: 'primary' } : r));
      }
      return rest;
    });
    setEditingKey((k) => (k === key ? null : k));
  }, []);

  const addColor = useCallback((hex: string) => {
    const norm = normalizeHex(hex);
    setRows((prev) => {
      const base = hexToName(norm);
      let name = base;
      let n = 2;
      while (prev.some((r) => r.name === name)) {
        name = `${base} ${n}`;
        n += 1;
      }
      return [...prev, { key: nextKey(), hex: norm, name, role: 'supporting' }];
    });
    setAdding(false);
  }, []);

  const canWrite = Boolean(sourceBrand?.id);

  const save = useCallback(async () => {
    if (!sourceBrand) return;
    setSaving(true);
    setError(null);
    try {
      // The Setup chain, exactly. The draft starts from the WHOLE
      // projection so the patch diffs a whole brand — see the header.
      const draft = brandToMockBrand(sourceBrand);
      const { core, accent } = toPalette(rows);
      const next: MockBrand = { ...draft, colors: { ...draft.colors, core, accent } };
      const patch = mockBrandToPatch(next, sourceBrand);
      await useBrandStore.getState().update(sourceBrand.id, patch);
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The palette could not be saved.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }, [rows, sourceBrand, onClose]);

  const editing = rows.find((r) => r.key === editingKey) ?? null;

  return (
    <>
      <DsModal
        open={open}
        onClose={onClose}
        eyebrow="Brand assets"
        title="Colors"
        secondaryActions={
          <DsButton
            tone="tertiary"
            size="sm"
            onClick={() => {
              setEditingKey(null);
              setAdding((a) => !a);
            }}
          >
            {adding ? 'Cancel' : 'Add a colour'}
          </DsButton>
        }
        actions={
          <>
            <DsButton tone="secondary" size="sm" onClick={onClose}>
              Cancel
            </DsButton>
            <DsButton
              tone="primary"
              size="sm"
              disabled={!canWrite || changes.length === 0 || saving}
              onClick={() => setConfirming(true)}
            >
              {saving ? 'Saving…' : 'Save colours'}
            </DsButton>
          </>
        }
      >
        <div className="bka-colors">
          <div className="bka-colors-preview">
            <PalettePreview palette={palette} />
            <p className="bka-colors-note">
              {rows.length} colour{rows.length === 1 ? '' : 's'}. The bar is the usage split the
              kit prints — the biggest share belongs to the Primary.
            </p>
          </div>

          <ul className="bka-colors-list">
            {rows.map((row) => (
              <li
                key={row.key}
                className="bka-colors-row"
                data-editing={row.key === editingKey}
              >
                <button
                  type="button"
                  className="bka-colors-chip"
                  style={{
                    backgroundColor: row.hex,
                    boxShadow: isNearWhite(row.hex)
                      ? `inset 0 0 0 1px ${bestTextOn(row.hex)}33`
                      : undefined,
                  }}
                  aria-label={`Change ${row.name}`}
                  onClick={() => {
                    setAdding(false);
                    setEditingKey((k) => (k === row.key ? null : row.key));
                  }}
                />
                <span className="bka-colors-meta">
                  <DsInput
                    value={row.name}
                    aria-label={`Name for ${row.hex}`}
                    onChange={(e) => setRow(row.key, { name: e.target.value })}
                  />
                  <span className="bka-colors-hex">
                    {row.hex} · shown as {displayedRole(rows, row)}
                  </span>
                </span>
                <DsSelect
                  options={ROLE_OPTIONS}
                  value={row.role}
                  aria-label={`Role for ${row.name}`}
                  onChange={(v) => changeRole(row.key, v as SlotRole)}
                />
                <button
                  type="button"
                  className="bka-colors-remove"
                  aria-label={`Remove ${row.name}`}
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(row.key)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {editing ? (
            <div className="bka-colors-picker">
              <ColorPickerHSV
                key={editing.key}
                hex={editing.hex}
                compact
                commitLabel="Update"
                onChange={(hex) => setRow(editing.key, { hex: normalizeHex(hex) })}
                onCommit={(hex) => {
                  setRow(editing.key, { hex: normalizeHex(hex) });
                  setEditingKey(null);
                }}
                onCancel={() => setEditingKey(null)}
              />
            </div>
          ) : null}

          {adding ? (
            <div className="bka-colors-picker">
              <ColorPickerHSV
                hex="#7231FF"
                compact
                autoFocusHex
                commitLabel="Add"
                onCommit={addColor}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : null}

          {!canWrite ? (
            <p className="bka-colors-note">
              This brand is not stored yet, so the palette can be previewed here but not saved.
            </p>
          ) : null}
          {error ? (
            <p className="bka-colors-note" role="alert" style={{ color: 'var(--ds-danger-fg)' }}>
              {error}
            </p>
          ) : null}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={confirming}
        title="Change this brand's colours?"
        description={
          <>
            The palette is used everywhere the brand appears — the kit, the guideline, every
            template and every export.
            <ul className="bka-colors-change">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Change the colours"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function roleWord(role: SlotRole): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

/** The palette at the proportions the kit prints it. */
function PalettePreview({ palette }: { palette: PaletteColor[] }) {
  const segments = usageProportions(palette).filter((s) => s.pct > 0);
  const rest = palette.slice(segments.length);
  return (
    <div className="bka-colors-preview-bar" data-testid="colors-preview">
      {segments.map(({ color, pct }) => {
        const hex = normalizeHex(color.hex);
        return (
          <div
            key={`${color.name}-${hex}`}
            className="bka-colors-preview-seg"
            style={{ flexGrow: pct, backgroundColor: hex, color: bestTextOn(hex) }}
            title={`${color.name} — ${pct}%`}
          >
            <span className="bka-colors-preview-pct">{pct}%</span>
            <span className="bka-colors-preview-name">{color.name}</span>
          </div>
        );
      })}
      {rest.map((color) => {
        const hex = normalizeHex(color.hex);
        return (
          <div
            key={`rest-${color.name}-${hex}`}
            className="bka-colors-preview-seg"
            style={{ flexGrow: 3, backgroundColor: hex, color: bestTextOn(hex) }}
            title={color.name}
          >
            <span className="bka-colors-preview-name">{color.name}</span>
          </div>
        );
      })}
    </div>
  );
}
