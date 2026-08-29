/**
 * Editing the brand's typography, from inside the Brand Kit.
 *
 * The Typography card had an editor already and it asked for nothing: a
 * panel with zero fields, a specimen reading "Your font" in the product's
 * own Inter, and a bold row wearing a text-shadow ghost (audit D36). It
 * showed a font nobody had chosen and could not change the one they had.
 *
 * This panel asks the three questions a typeface decision actually is —
 * **which family, at which weights, on which scale** — and every glyph it
 * draws is set in the family it is asking about, at the weight it is
 * asking about. A specimen drawn in a different face is not a specimen.
 *
 * Five rules it exists to keep:
 *
 *  • **The brand has two type slots and they are POSITIONS.** `fonts[0]`
 *    is what headings are set in, `fonts[1]` is what body copy is set in,
 *    and that is exactly what `mockBrandToPatch` reads. There is no third
 *    slot here because there is nowhere for a third to be stored.
 *
 *  • **Every write goes down the Setup chain** — `brandToMockBrand` →
 *    mutate the WHOLE MockBrand → `mockBrandToPatch(next, brand)` →
 *    `useBrandStore.update`. The draft always starts from
 *    `brandToMockBrand` because the patch diffs a whole brand; a
 *    hand-built partial emits destructive diffs.
 *
 *  • **Weights and the scale have no MockBrand home**, so the chain
 *    cannot carry them: `BrandFont.weights` is free text the projection
 *    prints and `mockBrandToPatch` never reads, and there is no scale on
 *    the projection at all. Both are canonical values on
 *    `brand.typography` — `FontToken.weights` and `FontScaleTokens` —
 *    so they are merged onto the typography token the chain produced,
 *    after it, never instead of it.
 *
 *  • **Uploaded files belong to the family that was uploaded, and to no
 *    other.** `mergeTypography` spreads the existing slot, and the file
 *    branch below it only ever ADDS — so a slot that changes family keeps
 *    the previous family's bytes and the browser then draws GT Super
 *    while the brand says Inter. This panel clears `files` on a slot
 *    whose family changed, and the confirmation says so in words: losing
 *    an uploaded licensed font quietly is not acceptable.
 *
 *  • **A family Google has never heard of is never requested.** `GT Super`
 *    is a foundry face; asking fonts.googleapis.com for it answers 400 and
 *    Chrome prints it (audit D33/D34). `isGoogleFontFamily` decides
 *    offline, before any request, and the family is still listed, still
 *    selectable and still previewed — in its declared fallback, with a
 *    notice saying why and what to do about it (audit D32).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DsBadge,
  DsBanner,
  DsButton,
  DsChip,
  DsConfirmDialog,
  DsInput,
  DsModal,
  DsSelect,
} from '@/shared/ds';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { BrandFont, MockBrand } from '@/features/setup/data/mockBrand';
import { GOOGLE_FONTS } from '@/shared/design-system/googleFonts';
import { GOOGLE_FONT_CATALOG } from '@/shared/typography';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import type { FontScaleTokens, TypographySystem } from '@/shared/types/brandAssets';
import {
  UPLOAD_HINT,
  canonicalGoogleFamily,
  fontSource,
  isGoogleFontFamily,
  parseWeights,
  weightLabel,
  type FontSource,
} from '../../data/fontExport';
import './assets.css';

/* ─── The two slots ────────────────────────────────────────────────── */

type SlotId = 'heading' | 'body';

const SLOTS: ReadonlyArray<{ id: SlotId; index: number; title: string; blurb: string }> = [
  { id: 'heading', index: 0, title: 'Headings', blurb: 'Titles, headlines and display type.' },
  { id: 'body', index: 1, title: 'Body', blurb: 'Paragraphs, labels and UI copy.' },
];

/** The weights a brand may declare. Nine, because that is what a
 *  `font-weight` is; the list is not opinionated about which are useful. */
const ALL_WEIGHTS: readonly number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/* ─── The scale ────────────────────────────────────────────────────── */

/**
 * A type scale is a base size and a ratio; every step is the base times
 * that ratio raised to its own power. The names are the canonical
 * modular-scale ones so the value the brand stores is a value a designer
 * recognises rather than eleven unrelated numbers.
 */
export const SCALE_RATIOS: ReadonlyArray<{ value: string; label: string; ratio: number }> = [
  { value: '1.067', label: 'Minor second · 1.067', ratio: 1.067 },
  { value: '1.125', label: 'Major second · 1.125', ratio: 1.125 },
  { value: '1.200', label: 'Minor third · 1.200', ratio: 1.2 },
  { value: '1.250', label: 'Major third · 1.250', ratio: 1.25 },
  { value: '1.333', label: 'Perfect fourth · 1.333', ratio: 1.333 },
  { value: '1.414', label: 'Augmented fourth · 1.414', ratio: 1.414 },
  { value: '1.500', label: 'Perfect fifth · 1.500', ratio: 1.5 },
  { value: '1.618', label: 'Golden ratio · 1.618', ratio: 1.618 },
];

/**
 * Which STEP each named role sits on.
 *
 * Several roles share a step on purpose — an overline and a caption are
 * the same size and differ in case and tracking, and `bodyLarge` is the
 * first step up, which is also where `h6` lands. A scale has steps; roles
 * are assignments onto them, and pretending there are eleven distinct
 * sizes would invent two the brand never chose.
 */
const SCALE_STEPS: ReadonlyArray<{ key: keyof FontScaleTokens; step: number; label: string }> = [
  { key: 'h1', step: 6, label: 'H1' },
  { key: 'h2', step: 5, label: 'H2' },
  { key: 'h3', step: 4, label: 'H3' },
  { key: 'h4', step: 3, label: 'H4' },
  { key: 'h5', step: 2, label: 'H5' },
  { key: 'h6', step: 1, label: 'H6' },
  { key: 'bodyLarge', step: 1, label: 'Body large' },
  { key: 'body', step: 0, label: 'Body' },
  { key: 'bodySmall', step: -1, label: 'Body small' },
  { key: 'caption', step: -2, label: 'Caption' },
  { key: 'overline', step: -2, label: 'Overline' },
];

/** The four steps the panel DRAWS. The ladder is eleven values; showing
 *  all of them is a table, and what the user needs to judge is the range
 *  — the biggest, the smallest and the body size between them. */
const SHOWN_STEPS: ReadonlyArray<keyof FontScaleTokens> = ['h1', 'h3', 'body', 'caption'];

export function stepSize(base: number, ratio: number, step: number): number {
  return Math.round(base * ratio ** step * 10) / 10;
}

/** The eleven tokens, as the px strings `FontScaleTokens` stores. */
export function buildScaleTokens(base: number, ratio: number): FontScaleTokens {
  const out: FontScaleTokens = {};
  for (const { key, step } of SCALE_STEPS) {
    out[key] = `${stepSize(base, ratio, step)}px`;
  }
  return out;
}

/**
 * A stored size as a number of PIXELS.
 *
 * `FontScaleTokens` is typed as strings and the values in the wild are
 * not one format: the Typescale mirror writes `"48px"`, and a seed brand's
 * guideline scale writes `"3rem/1.1"` — a size and a line height in one
 * token. A bare `parseFloat` reads the second as 3, which would seed the
 * panel with a 1px base and offer to save it.
 */
function pxNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)\s*(px|rem|em)?/i);
  if (!match) return undefined;
  const n = parseFloat(match[1]!);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const unit = (match[2] ?? 'px').toLowerCase();
  return unit === 'px' ? n : n * 16;
}

/**
 * The base and ratio a stored scale IMPLIES.
 *
 * The brand stores eleven sizes, not the two numbers they came from, so
 * reopening the panel has to read them back — otherwise every visit
 * proposes the default and the user's own scale is one Save away from
 * being replaced by it. `body` is the base by definition and `h1` is six
 * steps above it, so the ratio is the sixth root of their quotient; the
 * nearest offered ratio wins, because a scale that came from somewhere
 * else should still land on a name.
 */
export function scaleFromTokens(
  scale: FontScaleTokens | undefined,
): { base: number; ratio: string } {
  const base = pxNumber(scale?.body) ?? 16;
  const h1 = pxNumber(scale?.h1);
  if (!h1 || h1 <= base) return { base, ratio: '1.250' };
  const implied = (h1 / base) ** (1 / 6);
  let best = SCALE_RATIOS[3]!;
  for (const option of SCALE_RATIOS) {
    if (Math.abs(option.ratio - implied) < Math.abs(best.ratio - implied)) best = option;
  }
  return { base, ratio: best.value };
}

/* ─── The families on offer ────────────────────────────────────────── */

/** How many search results the list shows — and how many families the
 *  single preview stylesheet asks for. Both are the same number because
 *  a row nobody can see is a request nobody needed. */
const VISIBLE_MAX = 24;

/**
 * A CSS stack for one family — the family first, then a generic ladder
 * chosen from its NAME. A serif that falls back to Helvetica previews as
 * a different typeface, which for a family we cannot fetch is the only
 * preview there is.
 */
export function previewStack(family: string, fallback?: string): string {
  const name = family.trim().replace(/^['"]|['"]$/g, '');
  if (!name) return 'system-ui, sans-serif';
  const quoted = /^[A-Za-z][A-Za-z0-9-]*$/.test(name) ? name : `'${name}'`;
  const lower = name.toLowerCase();
  const generic = /\b(mono|code|courier|consol)/.test(lower)
    ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
    : /serif|slab|garamond|georgia|times|playfair|baskerville|didot|bodoni|caslon|lora|spectral|cormorant|tiempos|canela|recoleta|super/.test(
          lower,
        ) && !/sans-serif|sans serif/.test(lower)
      ? "Georgia, 'Times New Roman', Times, serif"
      : 'system-ui, -apple-system, Helvetica, Arial, sans-serif';
  return [quoted, fallback?.trim(), generic].filter(Boolean).join(', ');
}

/**
 * ONE stylesheet for every family the list is showing.
 *
 * A `<link>` per row is twenty-four requests for one scroll. The CSS API
 * takes any number of `family=` parameters in a single call, which is what
 * every other font picker in the product does; and only catalogued
 * families go into it, so the list can hold a foundry face without the
 * console filling up (D33/D34).
 */
function useFontPreviewSheet(families: string[]): void {
  const key = useMemo(() => {
    const google = families
      .map((f) => canonicalGoogleFamily(f))
      .filter((f): f is string => Boolean(f));
    return Array.from(new Set(google)).sort().join('|');
  }, [families]);

  useEffect(() => {
    if (!key || typeof document === 'undefined') return;
    const params = key
      .split('|')
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`)
      .join('&');
    const href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
    if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.brandKitFontPreview = 'true';
    document.head.appendChild(link);
  }, [key]);
}

const SOURCE_TONE: Record<FontSource, 'neutral' | 'warning'> = {
  uploaded: 'neutral',
  google: 'neutral',
  unavailable: 'warning',
};

const SOURCE_LABEL: Record<FontSource, string> = {
  uploaded: 'Your files',
  google: 'Google Fonts',
  unavailable: 'Not bundled',
};

/* ─── The draft ────────────────────────────────────────────────────── */

type SlotDraft = {
  family: string;
  weights: number[];
  /** The family this slot held when the panel opened — the only thing
   *  that decides whether its uploaded files are still its own. */
  originalFamily: string;
  /** Whether the brand had uploaded files for the ORIGINAL family. */
  hadFiles: boolean;
  fallback?: string;
};

function draftFor(fonts: BrandFont[], index: number): SlotDraft {
  const font = fonts[index];
  return {
    family: font?.family ?? '',
    weights: parseWeights(font?.weights),
    originalFamily: font?.family ?? '',
    hadFiles: Boolean(font?.files && font.files.length > 0),
    fallback: font?.fallback,
  };
}

/** The projection the kit repaints from while the panel is open. */
function previewBrand(brand: MockBrand, drafts: Record<SlotId, SlotDraft>): MockBrand {
  const fonts = brand.fonts.map((font, i) => {
    const slot = SLOTS.find((s) => s.index === i);
    if (!slot) return font;
    const draft = drafts[slot.id];
    const changed = draft.family !== draft.originalFamily;
    return {
      ...font,
      family: draft.family,
      weights: draft.weights.map((w) => String(w)).join(' · '),
      // Bytes belong to the family they were uploaded for.
      files: changed ? undefined : font.files,
    };
  });
  return { ...brand, fonts };
}

export type TypographyEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The brand as the kit renders it. */
  brand: MockBrand;
  /** The canonical brand — the only thing that can actually be written. */
  sourceBrand?: Brand | null;
  /** Live preview: the kit repaints from this while the panel is open. */
  onBrandChange?: (next: MockBrand) => void;
};

export function TypographyEditor({
  open,
  onClose,
  brand,
  sourceBrand,
  onBrandChange,
}: TypographyEditorProps) {
  const initialScale = useMemo(
    () => scaleFromTokens(sourceBrand?.typography?.scale),
    [sourceBrand],
  );
  const [drafts, setDrafts] = useState<Record<SlotId, SlotDraft>>(() => ({
    heading: draftFor(brand.fonts, 0),
    body: draftFor(brand.fonts, 1),
  }));
  const [base, setBase] = useState(String(initialScale.base));
  const [ratio, setRatio] = useState(initialScale.ratio);
  const [original, setOriginal] = useState({
    drafts: { heading: draftFor(brand.fonts, 0), body: draftFor(brand.fonts, 1) },
    base: initialScale.base,
    ratio: initialScale.ratio,
  });
  const [picking, setPicking] = useState<SlotId | null>(null);
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed on open: the panel shows the brand as it is NOW, never a
  // draft abandoned three cards ago.
  useEffect(() => {
    if (!open) return;
    const seeded = {
      heading: draftFor(brand.fonts, 0),
      body: draftFor(brand.fonts, 1),
    };
    const scale = scaleFromTokens(sourceBrand?.typography?.scale);
    setDrafts(seeded);
    setBase(String(scale.base));
    setRatio(scale.ratio);
    setOriginal({ drafts: seeded, base: scale.base, ratio: scale.ratio });
    setPicking(null);
    setQuery('');
    setConfirming(false);
    setError(null);
    // `brand` deliberately absent — reopening re-seeds, a repaint does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const baseNumber = Math.min(64, Math.max(8, parseFloat(base) || 16));
  const ratioNumber = SCALE_RATIOS.find((r) => r.value === ratio)?.ratio ?? 1.25;

  const preview = useMemo(() => previewBrand(brand, drafts), [brand, drafts]);

  useEffect(() => {
    if (!open) return;
    onBrandChange?.(preview);
  }, [open, preview, onBrandChange]);

  /* The families the list can offer: the brand's own first (a foundry
     family the brand licensed must be selectable, and must be here even
     though nothing can fetch it), then the curated pairing catalogue,
     then the whole of Google when the user types. */
  const suggestions = useMemo(() => {
    const own = [drafts.heading.originalFamily, drafts.body.originalFamily].filter(Boolean);
    const curated = GOOGLE_FONT_CATALOG.map((f) => f.family);
    return Array.from(new Set([...own, ...curated]));
  }, [drafts.heading.originalFamily, drafts.body.originalFamily]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions.slice(0, VISIBLE_MAX);
    const out: string[] = [];
    for (const name of suggestions) {
      if (name.toLowerCase().includes(q)) out.push(name);
    }
    for (const name of GOOGLE_FONTS) {
      if (out.length >= VISIBLE_MAX) break;
      if (name.toLowerCase().includes(q) && !out.includes(name)) out.push(name);
    }
    return out.slice(0, VISIBLE_MAX);
  }, [query, suggestions]);

  // Both chosen families are always previewed, whether or not the list is
  // open — the specimen at the top of the panel is drawn in them.
  const previewFamilies = useMemo(
    () => [drafts.heading.family, drafts.body.family, ...(picking ? results : [])],
    [drafts.heading.family, drafts.body.family, picking, results],
  );
  useFontPreviewSheet(previewFamilies);

  const setSlot = useCallback((id: SlotId, patch: Partial<SlotDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const chooseFamily = useCallback(
    (id: SlotId, family: string) => {
      const canonical = canonicalGoogleFamily(family) ?? family;
      const entry = GOOGLE_FONT_CATALOG.find((f) => f.family === canonical);
      setSlot(id, { family: canonical, fallback: entry?.fallback });
      setPicking(null);
      setQuery('');
    },
    [setSlot],
  );

  const toggleWeight = useCallback(
    (id: SlotId, weight: number) => {
      setDrafts((prev) => {
        const slot = prev[id];
        const has = slot.weights.includes(weight);
        // A family with no weights has no cuts to ship and no cut to draw
        // — the last one cannot be turned off.
        if (has && slot.weights.length === 1) return prev;
        const weights = has
          ? slot.weights.filter((w) => w !== weight)
          : [...slot.weights, weight].sort((a, b) => a - b);
        return { ...prev, [id]: { ...slot, weights } };
      });
    },
    [],
  );

  /** What Save will do, in the user's own words. */
  const changes = useMemo(() => {
    const out: string[] = [];
    for (const slot of SLOTS) {
      const before = original.drafts[slot.id];
      const after = drafts[slot.id];
      if (!before.family && !after.family) continue;
      if (before.family !== after.family) {
        out.push(`${slot.title}: ${before.family || 'none'} → ${after.family}`);
        if (before.hadFiles) {
          out.push(
            `${before.family}'s uploaded files stop being used — re-upload them in Setup → Typography if you go back.`,
          );
        }
      }
      if (before.weights.join() !== after.weights.join()) {
        out.push(
          `${slot.title} weights: ${before.weights.join(' · ')} → ${after.weights.join(' · ')}`,
        );
      }
    }
    if (original.base !== baseNumber || original.ratio !== ratio) {
      const name = SCALE_RATIOS.find((r) => r.value === ratio)?.label ?? ratio;
      out.push(
        `Type scale: ${baseNumber}px base on ${name} — H1 becomes ${stepSize(baseNumber, ratioNumber, 6)}px`,
      );
    }
    return out;
  }, [drafts, original, baseNumber, ratio, ratioNumber]);

  const canWrite = Boolean(sourceBrand?.id);

  const save = useCallback(async () => {
    if (!sourceBrand) return;
    setSaving(true);
    setError(null);
    try {
      // The Setup chain, exactly: the draft starts from the WHOLE
      // projection so the patch diffs a whole brand.
      const chainBrand = brandToMockBrand(sourceBrand);
      const next = previewBrand(chainBrand, drafts);
      const patch = mockBrandToPatch(next, sourceBrand);

      // Weights and the scale have no home on the projection, so they are
      // merged onto the typography token the chain just built — after it,
      // never instead of it. And a slot that changed family loses the
      // previous family's uploaded bytes: `mergeTypography` would carry
      // them across, and the browser would then draw the old face under
      // the new name.
      const carried: TypographySystem =
        patch.typography ?? sourceBrand.typography ?? { primary: { family: drafts.heading.family } };
      const slotToken = (
        id: SlotId,
        existing: TypographySystem['primary'] | undefined,
      ) => {
        const draft = drafts[id];
        const changed = draft.family !== draft.originalFamily;
        const { files: previousFiles, ...rest } = existing ?? {};
        return {
          ...rest,
          family: draft.family,
          weights: draft.weights,
          ...(changed || !previousFiles ? {} : { files: previousFiles }),
        };
      };
      patch.typography = {
        ...carried,
        primary: slotToken('heading', carried.primary),
        ...(drafts.body.family
          ? { secondary: slotToken('body', carried.secondary) }
          : {}),
        scale: buildScaleTokens(baseNumber, ratioNumber),
      };

      await useBrandStore.getState().update(sourceBrand.id, patch);
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The typography could not be saved.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }, [drafts, baseNumber, ratioNumber, sourceBrand, onClose]);

  return (
    <>
      <DsModal
        open={open}
        onClose={onClose}
        eyebrow="Brand assets"
        title="Typography"
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
              {saving ? 'Saving…' : 'Save typography'}
            </DsButton>
          </>
        }
      >
        <div className="bka-type">
          <ScaleSpecimen
            heading={drafts.heading}
            body={drafts.body}
            base={baseNumber}
            ratio={ratioNumber}
          />

          {SLOTS.map((slot) => {
            const draft = drafts[slot.id];
            const source = fontSource({
              name: draft.family,
              files:
                draft.family === draft.originalFamily && draft.hadFiles
                  ? brand.fonts[slot.index]?.files
                  : undefined,
            });
            return (
              <section className="bka-type-slot" key={slot.id}>
                <header className="bka-type-slot-head">
                  <span className="bka-type-slot-title">
                    {slot.title}
                    <span className="bka-type-slot-blurb">{slot.blurb}</span>
                  </span>
                  <DsBadge tone={SOURCE_TONE[source]}>{SOURCE_LABEL[source]}</DsBadge>
                </header>

                <button
                  type="button"
                  className="bka-type-family"
                  data-open={picking === slot.id}
                  aria-label={`Change the ${slot.title.toLowerCase()} typeface`}
                  onClick={() => {
                    setQuery('');
                    setPicking((p) => (p === slot.id ? null : slot.id));
                  }}
                >
                  <span
                    className="bka-type-family-name"
                    style={{ fontFamily: previewStack(draft.family, draft.fallback) }}
                  >
                    {draft.family || 'Choose a typeface'}
                  </span>
                  <span className="bka-type-family-cue">
                    {picking === slot.id ? 'Close' : 'Change'}
                  </span>
                </button>

                {picking === slot.id ? (
                  <div className="bka-type-picker">
                    <DsInput
                      value={query}
                      autoFocus
                      placeholder="Search typefaces — Inter, Playfair, Fraunces…"
                      aria-label={`Search a typeface for ${slot.title}`}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <ul className="bka-type-results">
                      {results.map((name) => (
                        <li key={name}>
                          <button
                            type="button"
                            className="bka-type-result"
                            data-active={name === draft.family}
                            onClick={() => chooseFamily(slot.id, name)}
                          >
                            <span
                              className="bka-type-result-name"
                              style={{ fontFamily: previewStack(name) }}
                            >
                              {name}
                            </span>
                            {isGoogleFontFamily(name) ? null : (
                              <span className="bka-type-result-note">Your own file</span>
                            )}
                          </button>
                        </li>
                      ))}
                      {results.length === 0 ? (
                        <li className="bka-type-note">
                          No typeface matches “{query.trim()}”. {UPLOAD_HINT}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                <div className="bka-type-weights" role="group" aria-label={`${slot.title} weights`}>
                  {ALL_WEIGHTS.map((w) => (
                    <DsChip
                      key={w}
                      active={draft.weights.includes(w)}
                      aria-pressed={draft.weights.includes(w)}
                      title={`${weightLabel(w)} ${w}`}
                      onClick={() => toggleWeight(slot.id, w)}
                    >
                      <span
                        style={{
                          fontFamily: previewStack(draft.family, draft.fallback),
                          fontWeight: w,
                        }}
                      >
                        Aa
                      </span>
                      <span className="bka-type-weight-num">{w}</span>
                    </DsChip>
                  ))}
                </div>

                {source === 'unavailable' ? (
                  <DsBanner tone="warning">
                    {draft.family} is not on Google Fonts, so the download can only ship a note
                    for it. {UPLOAD_HINT}
                  </DsBanner>
                ) : null}
              </section>
            );
          })}

          <section className="bka-type-slot">
            <header className="bka-type-slot-head">
              <span className="bka-type-slot-title">
                Scale
                <span className="bka-type-slot-blurb">
                  One base size and one ratio — every other size follows.
                </span>
              </span>
            </header>
            <div className="bka-type-scale-controls">
              <label className="bka-type-field">
                <span className="bka-type-field-label">Base size</span>
                <DsInput
                  value={base}
                  inputMode="numeric"
                  aria-label="Base size in pixels"
                  onChange={(e) => setBase(e.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={() => setBase(String(baseNumber))}
                />
              </label>
              <label className="bka-type-field">
                <span className="bka-type-field-label">Ratio</span>
                <DsSelect
                  options={SCALE_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
                  value={ratio}
                  aria-label="Scale ratio"
                  onChange={setRatio}
                />
              </label>
            </div>
          </section>

          {!canWrite ? (
            <p className="bka-type-note">
              This brand is not stored yet, so the typography can be previewed here but not saved.
            </p>
          ) : null}
          {error ? (
            <p className="bka-type-note" role="alert" style={{ color: 'var(--ds-danger)' }}>
              {error}
            </p>
          ) : null}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={confirming}
        title="Change this brand's typography?"
        description={
          <>
            The typefaces are used everywhere the brand appears — the kit, the guideline, every
            template and every export.
            <ul className="bka-type-change">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Change the typography"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/* ─── The specimen ─────────────────────────────────────────────────── */

/**
 * The two families and the scale, drawn in themselves.
 *
 * This is the whole point of the panel: the old editor's specimen read
 * "Your font" in the product's Inter (D36), which told the user nothing
 * about their brand and something false about the product. Every line
 * here is set in the family the row names, at the weight it names, at the
 * size the scale gives it — so the change is visible before it is saved.
 */
function ScaleSpecimen({
  heading,
  body,
  base,
  ratio,
}: {
  heading: SlotDraft;
  body: SlotDraft;
  base: number;
  ratio: number;
}) {
  const headingStack = previewStack(heading.family, heading.fallback);
  const bodyStack = previewStack(body.family || heading.family, body.fallback ?? heading.fallback);
  const heaviest = heading.weights[heading.weights.length - 1] ?? 400;
  const lightest = body.weights[0] ?? 400;

  return (
    <div className="bka-type-specimen" data-testid="typography-specimen">
      {SHOWN_STEPS.map((key) => {
        const entry = SCALE_STEPS.find((s) => s.key === key)!;
        const px = stepSize(base, ratio, entry.step);
        const isHeading = entry.step > 0;
        return (
          <div className="bka-type-specimen-row" key={key}>
            <span
              className="bka-type-specimen-text"
              data-role={isHeading ? 'heading' : 'body'}
              style={{
                fontFamily: isHeading ? headingStack : bodyStack,
                fontWeight: isHeading ? heaviest : lightest,
                // Capped so an H1 on the golden ratio does not push the
                // panel wider than the modal; the LABEL still says the
                // real size, so nothing here misreports the scale.
                fontSize: `${Math.min(px, 44)}px`,
                letterSpacing: px >= 32 ? '-0.02em' : undefined,
              }}
            >
              Handgloves
            </span>
            <span className="bka-type-specimen-label">
              {entry.label} · {px}px
            </span>
          </div>
        );
      })}
      {/* Which row is which face. Four lines of Handgloves cannot say it
          on their own, and a specimen that leaves the reader guessing
          which typeface they are looking at is the defect this panel is
          replacing. */}
      <p className="bka-type-specimen-key">
        Headings in {heading.family || 'nothing yet'}
        {body.family ? ` · body in ${body.family}` : ''}
      </p>
    </div>
  );
}
