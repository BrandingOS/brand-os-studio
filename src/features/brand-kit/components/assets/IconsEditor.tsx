/**
 * Editing the brand's icon set, from inside the Brand Kit.
 *
 * The Icons card had an editor before this one and it did exactly one thing
 * wrong: nothing it changed survived a reload. A tint and a weight were
 * applied live, Save closed the panel, and the next paint recomputed the whole
 * set from the brand's prose — so the user's decision lasted until they blinked
 * (audit D11). The set was never the brand's; it was a suggestion being
 * re-derived forever.
 *
 * So this panel edits FOUR things and all four are stored on the brand:
 *
 *  • **The pack** — which curated vocabulary the set is drawn from
 *    (`data/iconPacks.ts`). Choosing one REPLACES the set, ordered by the
 *    brand's own words, and the confirmation says so in those terms.
 *  • **The set** — add a symbol from the catalogue, remove one you do not
 *    want. Search runs over `searchableIconNames()`, which is the catalogue
 *    minus the braille alphabet, the arrows and the emoji faces: things a
 *    brand can pick, not everything a font contains.
 *  • **The weight** — one weight for the whole set, because a set with two
 *    weights in it is two sets. It is not stored as a field: a UICONS class
 *    name IS its weight (`fi-br-camera` is the bold camera), so `withIconWeight`
 *    rewrites every name and there is exactly one place the answer can live.
 *  • **The tint** — one of the brand's own colours. An icon tint that is not a
 *    brand colour is not a brand decision, so the picker offers the palette
 *    rather than a colour wheel.
 *
 * Two rules it exists to keep, both borrowed from the guideline's
 * `model/brandWrites.ts` (copied deliberately — this must not import it):
 *
 *  • **Every write goes down the Setup chain**: `brandToMockBrand` → mutate
 *    the WHOLE MockBrand → `mockBrandToPatch(next, brand)` →
 *    `useBrandStore.update`. `mockBrandToPatch` diffs a whole MockBrand, so a
 *    hand-built partial emits destructive diffs; the draft always starts from
 *    the projection and only the icon fields are touched.
 *  • **Nothing is written without a confirmation that NAMES the change.** The
 *    icon set is printed in the kit, the guideline and every export, so the
 *    dialog lists what moves — "Bold instead of Regular", "Add Camera" — and
 *    not the word "Save?".
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DsButton, DsConfirmDialog, DsInput, DsModal, DsSegmented, DsSelect } from '@/shared/ds';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
// The four rounded weights this panel can switch between. The Brand Kit page
// loads these too; a stylesheet imported twice is one stylesheet, and without
// them here the editor's own test would measure empty boxes.
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import '@flaticon/flaticon-uicons/css/thin/rounded.css';
import '@flaticon/flaticon-uicons/css/bold/rounded.css';
import '@flaticon/flaticon-uicons/css/solid/rounded.css';
import { ICON_PACKS, iconLabel, iconPack, type IconPackId } from '../../data/iconPacks';
import {
  ICON_WEIGHTS,
  detectIconWeight,
  stripIconPrefix,
  withIconWeight,
  type IconWeightId,
} from '../../data/iconWeights';
import { resolveIconPack, searchableIconNames, suggestIconsForBrand } from '../../data/suggestIcons';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import './assets.css';

/** How many search results a person can actually look at. */
const SEARCH_LIMIT = 48;

/** The set may not be emptied — an empty set is not a decision, it is a hole. */
const MIN_ICONS = 1;

export type IconsEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The brand as the kit renders it. */
  brand: MockBrand;
  /** The canonical brand — the only thing that can actually be written. */
  sourceBrand?: Brand | null;
  /** Live preview: the kit repaints from this while the panel is open. */
  onBrandChange?: (next: MockBrand) => void;
};

type Draft = {
  /** Bare catalogue names, weight-free. The weight is applied on the way out. */
  names: string[];
  weight: IconWeightId;
  tint: string;
  pack: IconPackId;
};

/** The brand's own words, in the order the suggester weighs them. */
function brandText(brand: MockBrand): string {
  const s = brand.strategy;
  return [
    brand.name,
    s?.audience,
    s?.tone,
    s?.positioning,
    s?.mission,
    s?.summary,
    s?.products,
    ...(brand.about ?? []).map((a) => `${a.title} ${a.content}`),
  ]
    .filter((v): v is string => Boolean(v && String(v).trim()))
    .join(' ');
}

/** Every colour the brand owns, deduped, in the order the kit prints them. */
function brandTints(brand: MockBrand): { hex: string; name: string }[] {
  const seen = new Set<string>();
  const out: { hex: string; name: string }[] = [];
  for (const c of [...brand.colors.core, ...brand.colors.accent]) {
    const hex = (c.hex ?? '').trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(hex) || seen.has(hex)) continue;
    seen.add(hex);
    out.push({ hex, name: c.name });
  }
  return out;
}

function draftFrom(brand: MockBrand): Draft {
  const icons = brand.icons.filter((c) => typeof c === 'string' && c.trim());
  const tints = brandTints(brand);
  return {
    names: icons.map(stripIconPrefix),
    weight: icons.length > 0 ? detectIconWeight(icons[0]!) : 'rr',
    tint: (brand.iconTint ?? tints[0]?.hex ?? '#111113').toUpperCase(),
    pack:
      (ICON_PACKS.find((p) => p.id === brand.iconPack)?.id as IconPackId | undefined) ??
      resolveIconPack(brandText(brand), { industry: brand.strategy?.industry }).pack.id,
  };
}

/** The draft as the brand stores it — one weight, applied to every name. */
function storedIcons(draft: Draft): string[] {
  return draft.names.map((n) => withIconWeight(`fi-rr-${n}`, draft.weight));
}

export function IconsEditor({
  open,
  onClose,
  brand,
  sourceBrand,
  onBrandChange,
}: IconsEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(brand));
  // A SNAPSHOT of the set as it was when the panel opened. Re-deriving it from
  // the brand would compare the draft against itself once the live preview has
  // repainted the page, and every change would read as no change.
  const [original, setOriginal] = useState<Draft>(draft);
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever the panel opens: it must show the brand as it is NOW, not
  // the draft someone abandoned three cards ago.
  useEffect(() => {
    if (!open) return;
    const seeded = draftFrom(brand);
    setDraft(seeded);
    setOriginal(seeded);
    setQuery('');
    setConfirming(false);
    setError(null);
    // `brand` deliberately absent — reopening re-seeds, a repaint does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo<MockBrand>(
    () => ({ ...brand, icons: storedIcons(draft), iconPack: draft.pack, iconTint: draft.tint }),
    [brand, draft],
  );

  useEffect(() => {
    if (!open) return;
    onBrandChange?.(preview);
  }, [open, preview, onBrandChange]);

  const tints = useMemo(() => brandTints(brand), [brand]);

  /** The well behind the specimen, chosen so the tint can be SEEN. */
  const wellBg = useMemo(
    () => (contrastRatio(draft.tint, '#FFFFFF') >= 3 ? '#FFFFFF' : '#111113'),
    [draft.tint],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const held = new Set(draft.names);
    const out: string[] = [];
    for (const full of searchableIconNames()) {
      const bare = full.slice('fi-rr-'.length);
      if (held.has(bare)) continue;
      if (!bare.includes(q)) continue;
      out.push(bare);
      if (out.length >= SEARCH_LIMIT) break;
    }
    return out;
  }, [query, draft.names]);

  /** What Save will do, in the user's own words. */
  const changes = useMemo(() => {
    const out: string[] = [];
    if (draft.pack !== original.pack) {
      out.push(
        `Use the ${iconPack(draft.pack).label} pack — ${draft.names.length} icons replacing ${original.names.length}`,
      );
    } else {
      for (const name of draft.names) {
        if (!original.names.includes(name)) out.push(`Add ${iconLabel(name)}`);
      }
      for (const name of original.names) {
        if (!draft.names.includes(name)) out.push(`Remove ${iconLabel(name)}`);
      }
    }
    if (draft.weight !== original.weight) {
      const word = (id: IconWeightId) => ICON_WEIGHTS.find((w) => w.id === id)?.label ?? id;
      out.push(`Draw the whole set ${word(draft.weight)} instead of ${word(original.weight)}`);
    }
    if (draft.tint !== original.tint) {
      out.push(`Tint the set ${draft.tint} (was ${original.tint})`);
    }
    return out;
  }, [draft, original]);

  const choosePack = useCallback(
    (id: string) => {
      const pack = iconPack(id);
      // The pack's own set, ordered by what this brand talks about — the same
      // answer the kit would have offered had the brand been created today.
      const names = suggestIconsForBrand(brandText(brand), 50, { pack: pack.id }).map(
        stripIconPrefix,
      );
      setDraft((d) => ({ ...d, pack: pack.id, names }));
    },
    [brand],
  );

  const addIcon = useCallback((bare: string) => {
    setDraft((d) => (d.names.includes(bare) ? d : { ...d, names: [...d.names, bare] }));
  }, []);

  const removeIcon = useCallback((bare: string) => {
    setDraft((d) =>
      d.names.length <= MIN_ICONS ? d : { ...d, names: d.names.filter((n) => n !== bare) },
    );
  }, []);

  const canWrite = Boolean(sourceBrand?.id);

  const save = useCallback(async () => {
    if (!sourceBrand) return;
    setSaving(true);
    setError(null);
    try {
      // The Setup chain, exactly. The draft starts from the WHOLE projection
      // so the patch diffs a whole brand — see the header.
      const base = brandToMockBrand(sourceBrand);
      const next: MockBrand = {
        ...base,
        icons: storedIcons(draft),
        iconPack: draft.pack,
        iconTint: draft.tint,
      };
      const patch = mockBrandToPatch(next, sourceBrand);
      await useBrandStore.getState().update(sourceBrand.id, patch);
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The icon set could not be saved.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }, [draft, sourceBrand, onClose]);

  const packOptions = useMemo(
    () => ICON_PACKS.map((p) => ({ value: p.id, label: `${p.label} · ${p.icons.length}` })),
    [],
  );

  return (
    <>
      <DsModal
        open={open}
        onClose={onClose}
        eyebrow="Brand assets"
        title="Icons"
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
              {saving ? 'Saving…' : 'Save icons'}
            </DsButton>
          </>
        }
      >
        <div className="bka-icons">
          {/* The specimen — the set as the kit will draw it, at the size the
              question is actually asked at. */}
          <div className="bka-icons-specimen" data-testid="icons-specimen" style={{ background: wellBg }}>
            {draft.names.slice(0, 12).map((bare) => (
              <i
                key={bare}
                className={`fi ${withIconWeight(`fi-rr-${bare}`, draft.weight)}`}
                style={{ color: draft.tint }}
                title={iconLabel(bare)}
                aria-hidden
              />
            ))}
          </div>

          <div className="bka-icons-controls">
            <label className="bka-icons-field">
              <span className="bka-icons-label">Pack</span>
              <DsSelect
                options={packOptions}
                value={draft.pack}
                aria-label="Icon pack"
                onChange={choosePack}
              />
            </label>

            <div className="bka-icons-field">
              <span className="bka-icons-label">Weight</span>
              <DsSegmented
                options={ICON_WEIGHTS.map((w) => ({ value: w.id, label: w.label }))}
                value={draft.weight}
                aria-label="Icon weight"
                onChange={(v) => setDraft((d) => ({ ...d, weight: v as IconWeightId }))}
              />
            </div>

            <div className="bka-icons-field">
              <span className="bka-icons-label">Tint</span>
              <div className="bka-icons-tints">
                {tints.map((t) => (
                  <button
                    key={t.hex}
                    type="button"
                    className="bka-icons-tint"
                    data-active={t.hex === draft.tint}
                    style={{ backgroundColor: t.hex }}
                    aria-label={`Tint the set ${t.name} ${t.hex}`}
                    aria-pressed={t.hex === draft.tint}
                    onClick={() => setDraft((d) => ({ ...d, tint: t.hex }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="bka-icons-note">{iconPack(draft.pack).description}</p>

          {/* The set itself. Every tile is the symbol AND the name it is
              called everywhere else — the tile, the zip and the manifest. */}
          <ul className="bka-icons-set" aria-label="The brand's icon set">
            {draft.names.map((bare) => (
              <li key={bare} className="bka-icons-item">
                <i
                  className={`fi ${withIconWeight(`fi-rr-${bare}`, draft.weight)}`}
                  style={{ color: draft.tint }}
                  aria-hidden
                />
                <span className="bka-icons-item-name">{iconLabel(bare)}</span>
                <button
                  type="button"
                  className="bka-icons-remove"
                  aria-label={`Remove ${iconLabel(bare)}`}
                  disabled={draft.names.length <= MIN_ICONS}
                  onClick={() => removeIcon(bare)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="bka-icons-field">
            <span className="bka-icons-label">Add an icon</span>
            <DsInput
              value={query}
              aria-label="Search icons"
              placeholder="Search the catalogue — camera, shield, receipt…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query.trim().length >= 2 ? (
            results.length > 0 ? (
              <ul className="bka-icons-results" aria-label="Search results">
                {results.map((bare) => (
                  <li key={bare}>
                    <button
                      type="button"
                      className="bka-icons-result"
                      aria-label={`Add ${iconLabel(bare)}`}
                      onClick={() => addIcon(bare)}
                    >
                      <i
                        className={`fi ${withIconWeight(`fi-rr-${bare}`, draft.weight)}`}
                        aria-hidden
                      />
                      <span className="bka-icons-item-name">{iconLabel(bare)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bka-icons-note">Nothing in the catalogue is called that.</p>
            )
          ) : null}

          {!canWrite ? (
            <p className="bka-icons-note">
              This brand is not stored yet, so the set can be previewed here but not saved.
            </p>
          ) : null}
          {error ? (
            <p className="bka-icons-note" role="alert" style={{ color: 'var(--ds-danger-fg)' }}>
              {error}
            </p>
          ) : null}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={confirming}
        title="Change this brand's icons?"
        description={
          <>
            The icon set is printed in the kit, in the brand guideline and in every export that
            uses one.
            <ul className="bka-icons-change">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Change the icons"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
