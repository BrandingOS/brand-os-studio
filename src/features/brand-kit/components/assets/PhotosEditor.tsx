/**
 * Editing the brand's photography, from inside the Brand Kit.
 *
 * The Photos card was the worst-behaved card in the kit. It showed twelve
 * copies of a stock 3D render on one brand and an empty "SLOT A" chip on the
 * other, counted both as finished, downloaded the application's own
 * `index.html` named `photo-1.html`, and offered an editor whose every control
 * — a headline, three colour swatches, three "Select image" buttons — changed
 * nothing at all (D14, D46, D1, D12, D10). This panel is the other end of that:
 * every control here changes something visible, and what it changes is real.
 *
 * Four rules it exists to keep:
 *
 *  • **A photograph is a file in the brand's Library, and nothing else.** There
 *    are no slots to fill and no stock to fall back on. The rows below ARE
 *    `brand.brandAssets` — the same projection `brandToMockBrand.mapPhotos`
 *    reads — so a picture is on this card because the brand owns it.
 *
 *  • **Removing a photo from the kit never removes it from the brand.** The
 *    Library is where the file lives; the kit is one arrangement of it. A
 *    texture, a screenshot or a headshot can leave the Photos card at no cost,
 *    exactly as an item leaves a folder without leaving the disk. That is what
 *    `PhotoDirection.hidden` is, and why the confirmation says so in words.
 *
 *  • **A brand's photography is the files PLUS how they are treated.** The
 *    treatment is chosen here, on the actual pictures, and the tile, the export
 *    and this preview all realise the same shadow → highlight ramp
 *    (`photoExport.rampFor`) — in CSS here and in canvas pixels there.
 *
 *  • **Nothing is written without a confirmation naming what changes.** An
 *    upload is a write to the brand's Library, so it is deferred to Save and
 *    listed by name; the arrangement (order, treatment, what is shown, the art
 *    direction) is kit state and is written in the same gesture.
 *
 * One deliberate deviation from the W2 write rule, and the reason: the Setup
 * chain (`brandToMockBrand` → `mockBrandToPatch`) cannot carry this change.
 * `mockBrandToPatch` has no `photos` case at all — `MockBrand.photos` is a
 * read-only PROJECTION of the Library — so a patch built that way would be an
 * empty diff at best and a destructive one at worst. Photographs are added the
 * way every other Library upload is added, through `useAssetUpload`, which is
 * the same `stageAsset` authority the Setup chain itself reaches for one layer
 * down.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DsButton, DsConfirmDialog, DsInput, DsModal, DsTextArea } from '@/shared/ds';
import { AssetSourcePopover } from '@/shared/upload/AssetSourcePopover';
import { useAssetUpload } from '@/shared/assets/useAssetUpload';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import {
  EMPTY_DIRECTION,
  PHOTO_TREATMENTS,
  hasRealPhotos,
  isPhotoSourceBroken,
  nameFromSource,
  rampFor,
  readPhotoDirection,
  treatmentCss,
  writePhotoDirection,
  type PhotoDirection,
  type PhotoTreatmentId,
} from '../../data/photoExport';
import './assets.css';

/** How many photographs the card itself shows. `mapPhotos` slices to six. */
const CARD_CAPACITY = 6;

/** One candidate photograph: a Library image, plus what the kit does with it. */
type Row = {
  /** The Library asset id — the id the kit, the export and the order all use. */
  id: string;
  src: string;
  name: string;
  treatment: PhotoTreatmentId | 'inherit';
  shown: boolean;
  /** A file the user just chose. It reaches the Library on Save, not before. */
  pending?: File;
};

export type PhotosEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The brand as the kit renders it. */
  brand: MockBrand;
  /** The canonical brand — the only thing that can actually be written. */
  sourceBrand?: Brand | null;
  /** Live preview: the kit repaints from this while the panel is open. */
  onBrandChange?: (next: MockBrand) => void;
};

/**
 * Every image the brand owns that could be photography.
 *
 * Read from the canonical brand rather than from `MockBrand.photos`, which is
 * capped at six — the panel must be able to show the seventh picture, or it
 * could never be the place you choose WHICH six.
 */
function candidates(brand: MockBrand, sourceBrand?: Brand | null): Array<{ id: string; src: string; name: string }> {
  const assets = sourceBrand?.brandAssets;
  if (assets?.length) {
    return assets
      .filter(
        (a) =>
          a.kind === 'image' &&
          // The same two exclusions `mapPhotos` makes: a link migrated with the
          // fallback kind, and anything that is really a logo.
          a.role !== 'reference' &&
          !String(a.role ?? '').startsWith('logo'),
      )
      .map((a) => ({
        id: a.id,
        src: Object.values(a.formats ?? {})[0]?.url ?? '',
        name: a.name?.trim() || '',
      }))
      .filter((a) => a.src);
  }
  return (brand.photos ?? [])
    .filter((p) => p.src)
    .map((p) => ({ id: p.id, src: p.src, name: '' }));
}

function rowsFrom(brand: MockBrand, sourceBrand: Brand | null | undefined, direction: PhotoDirection): Row[] {
  const hidden = new Set(direction.hidden ?? []);
  const rank = new Map((direction.order ?? []).map((id, i) => [id, i]));
  return candidates(brand, sourceBrand)
    .map((c, i) => ({
      id: c.id,
      src: c.src,
      name: c.name || nameFromSource(c.src, i),
      treatment: (direction.treatments?.[c.id] ?? 'inherit') as Row['treatment'],
      shown: !hidden.has(c.id),
    }))
    .sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

/** The rows back into the shape the kit, the tiles and the export read. */
function toDirection(rows: Row[], note: string, defaultTreatment: PhotoTreatmentId): PhotoDirection {
  const treatments: Record<string, PhotoTreatmentId> = {};
  for (const r of rows) if (r.treatment !== 'inherit') treatments[r.id] = r.treatment;
  return {
    note,
    defaultTreatment,
    treatments,
    order: rows.map((r) => r.id),
    hidden: rows.filter((r) => !r.shown).map((r) => r.id),
  };
}

export function PhotosEditor({ open, onClose, brand, sourceBrand, onBrandChange }: PhotosEditorProps) {
  const stored = useMemo(
    () => (sourceBrand?.id ? readPhotoDirection(sourceBrand.id) : EMPTY_DIRECTION),
    [sourceBrand?.id],
  );
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(brand, sourceBrand, stored));
  const [note, setNote] = useState(stored.note);
  const [defaultTreatment, setDefaultTreatment] = useState<PhotoTreatmentId>(stored.defaultTreatment);
  const [original, setOriginal] = useState<Row[]>(rows);
  const [originalNote, setOriginalNote] = useState(stored.note);
  const [originalDefault, setOriginalDefault] = useState<PhotoTreatmentId>(stored.defaultTreatment);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { upload } = useAssetUpload(sourceBrand?.id);

  // Re-seed whenever the panel opens: it must show the brand as it is NOW, not
  // a draft somebody abandoned three cards ago.
  useEffect(() => {
    if (!open) return;
    const direction = sourceBrand?.id ? readPhotoDirection(sourceBrand.id) : EMPTY_DIRECTION;
    const seeded = rowsFrom(brand, sourceBrand, direction);
    setRows(seeded);
    setOriginal(seeded);
    setNote(direction.note);
    setOriginalNote(direction.note);
    setDefaultTreatment(direction.defaultTreatment);
    setOriginalDefault(direction.defaultTreatment);
    setConfirming(false);
    setError(null);
    // `brand` deliberately absent — reopening re-seeds, a repaint does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceBrand?.id]);

  // Object URLs for pending uploads are the panel's own; release them so a
  // long editing session does not hold every file the user changed their mind
  // about.
  useEffect(
    () => () => {
      for (const r of rows) if (r.pending && r.src.startsWith('blob:')) URL.revokeObjectURL(r.src);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const shown = useMemo(() => rows.filter((r) => r.shown), [rows]);

  /** The kit behind the panel, repainted from the draft's order and choices. */
  const preview = useMemo<MockBrand>(() => {
    const byId = new Map((brand.photos ?? []).map((p) => [p.id, p]));
    const photos = shown
      .slice(0, CARD_CAPACITY)
      .map((r, i) => byId.get(r.id) ?? { id: r.id, src: r.src, slot: 'ABCDEF'[i] ?? 'F' });
    return { ...brand, photos } as MockBrand;
  }, [brand, shown]);

  useEffect(() => {
    if (!open) return;
    onBrandChange?.(preview);
  }, [open, preview, onBrandChange]);

  const setRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const move = useCallback((id: string, by: -1 | 1) => {
    setRows((prev) => {
      const at = prev.findIndex((r) => r.id === id);
      const to = at + by;
      if (at < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(at, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const addFile = useCallback((file: File) => {
    // A provisional id, replaced by the one the Library returns on Save — the
    // Library owns asset identity, and inventing one here would mean the kit's
    // order and treatments pointed at a photo that does not exist.
    const id = `pending:${file.name}:${file.size}:${file.lastModified}`;
    setRows((prev) => {
      if (prev.some((r) => r.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          src: URL.createObjectURL(file),
          name: file.name.replace(/\.[a-z0-9]{1,5}$/i, ''),
          treatment: 'inherit',
          shown: true,
          pending: file,
        },
      ];
    });
  }, []);

  /** What Save will do, in the user's own words. */
  const changes = useMemo(() => {
    const out: string[] = [];
    for (const row of rows) {
      if (row.pending) {
        out.push(`Add ${row.name} to this brand's Library as a photograph`);
        continue;
      }
      const before = original.find((o) => o.id === row.id);
      if (!before) continue;
      if (before.shown !== row.shown) {
        out.push(
          row.shown
            ? `Show ${row.name} on the Photos card`
            : `Remove ${row.name} from the Photos card — the file stays in your Library`,
        );
      }
      if (before.treatment !== row.treatment) {
        out.push(`${row.name} is now shown ${treatmentWord(row.treatment)}`);
      }
    }
    const orderChanged = original
      .filter((o) => rows.some((r) => r.id === o.id))
      .map((o) => o.id)
      .join('|') !== rows.filter((r) => !r.pending).map((r) => r.id).join('|');
    if (orderChanged) out.push('Reorder the photographs');
    if (note.trim() !== originalNote.trim()) {
      out.push(originalNote.trim() ? 'Rewrite the art direction' : 'Write the art direction');
    }
    if (defaultTreatment !== originalDefault) {
      out.push(`Every photograph is now shown ${treatmentWord(defaultTreatment)} by default`);
    }
    return out;
  }, [rows, original, note, originalNote, defaultTreatment, originalDefault]);

  const canWrite = Boolean(sourceBrand?.id);

  const save = useCallback(async () => {
    if (!sourceBrand?.id) return;
    setSaving(true);
    setError(null);
    try {
      // Uploads first: the arrangement has to be written against the ids the
      // Library actually minted, never the provisional ones.
      const settled: Row[] = [];
      for (const row of rows) {
        if (!row.pending) {
          settled.push(row);
          continue;
        }
        const asset = await upload(row.pending, { kind: 'image', silent: true });
        if (!asset) {
          throw new Error(`${row.name} could not be uploaded.`);
        }
        settled.push({ ...row, id: asset.id, src: row.src, pending: undefined });
      }
      writePhotoDirection(sourceBrand.id, toDirection(settled, note, defaultTreatment));
      setRows(settled);
      setOriginal(settled);
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The photography could not be saved.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }, [rows, note, defaultTreatment, sourceBrand, upload, onClose]);

  const empty = rows.length === 0;

  return (
    <>
      <DsModal
        open={open}
        onClose={onClose}
        eyebrow="Brand assets"
        title="Photos"
        secondaryActions={
          <AssetSourcePopover
            brandId={sourceBrand?.id}
            categories={['photo', 'application', 'social']}
            multiple
            onPick={(source) => {
              if (source.kind === 'file') addFile(source.file);
              // An asset picked from the grid is already in the Library, so
              // "adding" it is showing it — there is nothing to upload.
              else setRow(source.asset.id, { shown: true });
            }}
            trigger={
              <DsButton tone="tertiary" size="sm">
                Add a photo
              </DsButton>
            }
          />
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
              {saving ? 'Saving…' : 'Save photography'}
            </DsButton>
          </>
        }
      >
        <div className="bka-photos">
          <section className="bka-photos-direction">
            <DsTextArea
              label="Art direction"
              rows={3}
              value={note}
              placeholder="Daylight, real people, no stock. Shoot wide with room for type."
              aria-label="Art direction"
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="bka-photos-treatments" role="radiogroup" aria-label="Default treatment">
              {PHOTO_TREATMENTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={t.id === defaultTreatment}
                  className="bka-photos-treatment"
                  data-active={t.id === defaultTreatment}
                  title={t.hint}
                  onClick={() => setDefaultTreatment(t.id)}
                >
                  <span className="bka-photos-ramp" style={{ background: rampSwatch(t.id, brand) }} />
                  {t.label}
                </button>
              ))}
            </div>
            <p className="bka-photos-note">
              Every photograph is shown this way unless it says otherwise. The card shows the first{' '}
              {CARD_CAPACITY}.
            </p>
          </section>

          {empty ? (
            <p className="bka-photos-note" data-testid="photos-editor-empty">
              This brand has no photographs yet. Add one from your Library — or upload one, and it
              joins the Library too.
            </p>
          ) : (
            <ul className="bka-photos-list">
              {rows.map((row, index) => {
                const effective = row.treatment === 'inherit' ? defaultTreatment : row.treatment;
                const css = treatmentCss(effective, brand);
                const broken = isPhotoSourceBroken(row.src);
                return (
                  <li key={row.id} className="bka-photos-row" data-shown={row.shown}>
                    <span className="bka-photos-thumb" aria-hidden>
                      {broken ? (
                        <span className="bka-photos-thumb-broken">missing</span>
                      ) : (
                        <>
                          <img src={row.src} alt="" style={{ filter: css.filter }} />
                          {css.overlays.map((o) => (
                            <span
                              key={o.mixBlendMode}
                              className="bka-photos-thumb-overlay"
                              style={{ background: o.background, mixBlendMode: o.mixBlendMode }}
                            />
                          ))}
                        </>
                      )}
                    </span>

                    <span className="bka-photos-meta">
                      <DsInput
                        value={row.name}
                        aria-label={`Name for photo ${index + 1}`}
                        onChange={(e) => setRow(row.id, { name: e.target.value })}
                      />
                      <span className="bka-photos-sub">
                        {row.pending ? 'Not in the Library yet' : broken ? 'This file is missing' : 'In your Library'}
                      </span>
                    </span>

                    <span className="bka-photos-row-treatments" role="radiogroup" aria-label={`Treatment for ${row.name}`}>
                      {[{ id: 'inherit' as const, label: 'Default' }, ...PHOTO_TREATMENTS].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={t.id === row.treatment}
                          aria-label={`${t.label} for ${row.name}`}
                          className="bka-photos-treatment bka-photos-treatment--sm"
                          data-active={t.id === row.treatment}
                          onClick={() => setRow(row.id, { treatment: t.id as Row['treatment'] })}
                        >
                          {t.label}
                        </button>
                      ))}
                    </span>

                    <span className="bka-photos-actions">
                      <button
                        type="button"
                        aria-label={`Move ${row.name} up`}
                        disabled={index === 0}
                        onClick={() => move(row.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${row.name} down`}
                        disabled={index === rows.length - 1}
                        onClick={() => move(row.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={
                          row.shown ? `Remove ${row.name} from the card` : `Show ${row.name} on the card`
                        }
                        aria-pressed={!row.shown}
                        onClick={() => setRow(row.id, { shown: !row.shown })}
                      >
                        {row.shown ? '×' : '+'}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {!hasRealPhotos(preview) && !empty ? (
            <p className="bka-photos-note">
              Nothing is shown on the card right now — the Photos section will read as empty.
            </p>
          ) : null}
          {!canWrite ? (
            <p className="bka-photos-note">
              This brand is not stored yet, so photography can be previewed here but not saved.
            </p>
          ) : null}
          {error ? (
            <p className="bka-photos-note" role="alert" style={{ color: 'var(--ds-danger-fg)' }}>
              {error}
            </p>
          ) : null}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={confirming}
        title="Change this brand's photography?"
        description={
          <>
            Photography is used wherever the brand shows pictures — the kit, the guideline and every
            export. Removing a photograph from the card never deletes it from your Library.
            <ul className="bka-photos-change">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Change the photography"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function treatmentWord(id: PhotoTreatmentId | 'inherit'): string {
  if (id === 'inherit') return 'with the default treatment';
  const t = PHOTO_TREATMENTS.find((p) => p.id === id);
  return t ? `in ${t.label}` : id;
}

/** A treatment's ramp, drawn as a gradient — the swatch IS what it does. */
function rampSwatch(id: PhotoTreatmentId, brand: MockBrand): string {
  const ramp = rampFor(id, brand);
  if (!ramp) return 'linear-gradient(135deg, #b8b8bc, #f2f2f4)';
  return `linear-gradient(135deg, ${ramp.shadow}, ${ramp.highlight})`;
}
