// applyBrandToDocument — resolves every SlotRef in a BrandOSDocument
// against a BrandKit. Pure function; no DOM, no Fabric, no side
// effects. Safe to run in a Supabase Edge Function for AI-generated
// documents that haven't been mounted in the editor yet.
//
// Two modes:
//
//   • 'apply' (default) — replaces SlotRefs with their resolved
//     literal values in the returned document. The doc becomes
//     "committed" to this brand. Any prior `brandResolution`
//     annotation is stripped.
//
//   • 'preview' — leaves SlotRefs in place but stores a per-layer
//     resolution under the document's typed `brandResolution` field
//     (Phase 3 step 3 lifted this from `metadata._brandResolution`
//     into a top-level optional field for type safety + AI layer
//     discoverability). The original SlotRefs stay so the doc
//     remains brand-agnostic.

import type {
  BrandOSDocument,
  BrandResolution,
  GroupLayer,
  Layer,
  Page,
  ShapeLayer,
  SlotRef,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';
import type { BrandKit } from './BrandKit';

export type ApplyMode = 'apply' | 'preview';

export interface ApplyBrandOptions {
  /** Default `'apply'`. */
  mode?: ApplyMode;
  /**
   * When `true` (default), brand-locked layers' overridden properties
   * are RESTORED from `_lockedBindings` (recorded by the adapter on
   * override per Phase 3 step 4c.2) before slot resolution runs. The
   * effect: a user who literalized `color` on a brandLocked layer
   * gets reverted on the next `applyBrandToDocument` — the
   * brand-managed contract wins.
   *
   * When `false`, `_lockedBindings` is ignored. Used by template-
   * authoring tools and any caller that wants a snapshot of the
   * current literal state regardless of brand-lock recovery.
   *
   * The PropertiesPanel UI also prevents overriding brand-locked
   * properties at the UI layer (Phase 1), but `_lockedBindings`
   * recovery covers any drift that slips through (programmatic
   * mutation, migration import, AI agent emit).
   */
  respectLocks?: boolean;
}

const DEFAULTS: Required<ApplyBrandOptions> = {
  mode: 'apply',
  respectLocks: true,
};

/**
 * Resolve every SlotRef in the document against the BrandKit.
 *
 * Walks page layers, master page layers (so master overlays render
 * brand-resolved when used), and page backgrounds. Group layers
 * recurse into children.
 *
 * Returns a NEW document (input is never mutated). The document
 * schema is not re-parsed — callers that need validation should
 * `BrandOSDocumentSchema.parse(result)` themselves.
 */
export function applyBrandToDocument(
  doc: BrandOSDocument,
  brandKit: BrandKit,
  options: ApplyBrandOptions = {},
): BrandOSDocument {
  const opts = { ...DEFAULTS, ...options };
  const next = clone(doc);

  const annotation: BrandResolution = {
    brandKitId: brandKit.id,
    resolvedAt: new Date().toISOString(),
    layers: {},
    pages: {},
  };

  // Phase 3 step 4c.3 — recover locked bindings BEFORE slot resolution.
  // Any layer with brandLocked=true and a non-empty _lockedBindings has
  // its overridden properties restored to the original SlotRefs. The
  // resolver then walks those SlotRefs alongside any others on the
  // layer. _lockedBindings is cleared after restoration — it has
  // served its purpose.
  if (opts.respectLocks) {
    for (const page of [...next.pages, ...next.masterPages]) {
      for (const layer of page.layers) recoverLockedBindings(layer);
    }
  }

  for (const page of [...next.pages, ...next.masterPages]) {
    resolvePage(page, brandKit, opts, annotation);
  }

  // Stash or strip the preview annotation depending on mode.
  if (opts.mode === 'preview') {
    next.brandResolution = annotation;
  } else {
    delete next.brandResolution;
  }

  return next;
}

// ─── Page-level resolution ──────────────────────────────────────────────

function resolvePage(
  page: Page,
  brandKit: BrandKit,
  opts: Required<ApplyBrandOptions>,
  annotation: BrandResolution,
): void {
  // Page background is also a ResolvedValue.
  if (isSlotRef(page.background)) {
    const resolved = resolveSlotRef(page.background, brandKit);
    if (resolved !== undefined) {
      if (opts.mode === 'apply') {
        page.background = resolved;
      } else {
        annotation.pages[page.id] = {
          ...(annotation.pages[page.id] ?? {}),
          background: resolved,
        };
      }
    }
  }
  for (const layer of page.layers) {
    resolveLayer(layer, brandKit, opts, annotation);
  }
}

// ─── Layer-level resolution ─────────────────────────────────────────────

function resolveLayer(
  layer: Layer,
  brandKit: BrandKit,
  opts: Required<ApplyBrandOptions>,
  annotation: BrandResolution,
): void {
  const resolutions: Record<string, string | number> = {};

  switch (layer.kind) {
    case 'text':
      resolveTextLayer(layer, brandKit, opts, resolutions);
      break;
    case 'shape':
      resolveShapeLayer(layer, brandKit, opts, resolutions);
      break;
    case 'svg':
      resolveSvgLayer(layer, brandKit, opts, resolutions);
      break;
    case 'group':
      resolveGroupLayer(layer, brandKit, opts, annotation);
      break;
    case 'image':
    case 'logo':
      // Image src is a brand asset reference resolved at render time.
      // Logo variant is a render-time pickLogoOnBackground path.
      // Neither uses SlotRef on a ResolvedValue field, so nothing to
      // resolve here.
      break;
  }

  if (opts.mode === 'preview' && Object.keys(resolutions).length > 0) {
    annotation.layers[layer.id] = {
      ...(annotation.layers[layer.id] ?? {}),
      ...resolutions,
    };
  }
}

function resolveTextLayer(
  layer: TextLayer,
  brandKit: BrandKit,
  opts: Required<ApplyBrandOptions>,
  resolutions: Record<string, string | number>,
): void {
  if (isSlotRef(layer.fontFamily)) {
    const resolved = resolveSlotRef(layer.fontFamily, brandKit);
    if (resolved !== undefined) {
      if (opts.mode === 'apply') layer.fontFamily = resolved;
      else resolutions.fontFamily = resolved;
    }
  }
  if (isSlotRef(layer.color)) {
    const resolved = resolveSlotRef(layer.color, brandKit);
    if (resolved !== undefined) {
      if (opts.mode === 'apply') layer.color = resolved;
      else resolutions.color = resolved;
    }
  }
}

function resolveShapeLayer(
  layer: ShapeLayer,
  brandKit: BrandKit,
  opts: Required<ApplyBrandOptions>,
  resolutions: Record<string, string | number>,
): void {
  if (layer.fill && isSlotRef(layer.fill)) {
    const resolved = resolveSlotRef(layer.fill, brandKit);
    if (resolved !== undefined) {
      if (opts.mode === 'apply') layer.fill = resolved;
      else resolutions.fill = resolved;
    }
  }
  if (layer.stroke && isSlotRef(layer.stroke)) {
    const resolved = resolveSlotRef(layer.stroke, brandKit);
    if (resolved !== undefined) {
      if (opts.mode === 'apply') layer.stroke = resolved;
      else resolutions.stroke = resolved;
    }
  }
}

function resolveSvgLayer(
  layer: SvgLayer,
  brandKit: BrandKit,
  opts: Required<ApplyBrandOptions>,
  resolutions: Record<string, string | number>,
): void {
  for (const key of Object.keys(layer.fillOverrides)) {
    const value = layer.fillOverrides[key];
    if (!isSlotRef(value)) continue;
    const resolved = resolveSlotRef(value, brandKit);
    if (resolved === undefined) continue;
    if (opts.mode === 'apply') {
      layer.fillOverrides[key] = resolved;
    } else {
      resolutions[`fillOverrides.${key}`] = resolved;
    }
  }
}

function resolveGroupLayer(
  layer: GroupLayer,
  brandKit: BrandKit,
  opts: Required<ApplyBrandOptions>,
  annotation: BrandResolution,
): void {
  for (const child of layer.children) {
    resolveLayer(child, brandKit, opts, annotation);
  }
}

// ─── Slot resolution ────────────────────────────────────────────────────

/**
 * Resolve a single SlotRef to its concrete value via the BrandKit.
 *
 * Returns `undefined` for slot types that don't produce a literal in
 * this layer (currently: all `brand.logo.*` slots — logos resolve to
 * URLs at render time via `pickLogoOnBackground`, not as ResolvedValue
 * literals here). The caller leaves the SlotRef in place when this
 * happens.
 */
export function resolveSlotRef(
  slot: SlotRef,
  brandKit: BrandKit,
): string | number | undefined {
  switch (slot.type) {
    case 'brand.color.primary':
      return brandKit.colors.primary.hex;
    case 'brand.color.secondary':
      return brandKit.colors.secondary?.hex;
    case 'brand.color.accent':
      return brandKit.colors.accent?.hex;
    case 'brand.color.neutral': {
      const idx = clampNeutralIndex(slot.neutralIndex ?? 2, brandKit.colors.neutrals.length);
      return brandKit.colors.neutrals[idx];
    }
    case 'brand.font.heading':
      return brandKit.typography.heading.family;
    case 'brand.font.body':
      return brandKit.typography.body.family;
    case 'brand.spacing.unit':
      return brandKit.spacing.unit;
    case 'brand.logo.primary':
    case 'brand.logo.secondary':
    case 'brand.logo.wordmark':
    case 'brand.logo.iconmark':
    case 'brand.logo.mono.black':
    case 'brand.logo.mono.white':
      // Render-time resolution; not a literal at this layer.
      return undefined;
  }
}

function clampNeutralIndex(idx: number, length: number): number {
  if (length === 0) return 0;
  return Math.max(0, Math.min(idx, length - 1));
}

function isSlotRef(value: unknown): value is SlotRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Phase 3 step 4c.3 — restore SlotRefs from `_lockedBindings` on
 * brand-locked layers. Recursively applied to group children.
 *
 * For each entry in `_lockedBindings`, write the SlotRef back to the
 * corresponding property path. Top-level paths target direct fields
 * (`color`, `fontFamily`, etc.). Dotted paths target nested
 * SvgLayer.fillOverrides keys (`fillOverrides.<svg-path-id>`).
 *
 * `_lockedBindings` is deleted after restoration — its purpose was
 * carrying the SlotRef through a literal-override window; once the
 * SlotRef is back on the field, the recording is stale.
 *
 * Layers without brandLocked=true are skipped, even if they happen
 * to carry _lockedBindings (e.g. a layer that was locked → unlocked
 * after recording happened). The lock state is the gate.
 */
function recoverLockedBindings(layer: Layer): void {
  // Recurse into group children first; the parent group's `brandLocked`
  // flag doesn't determine its children's recovery.
  if (layer.kind === 'group') {
    for (const child of (layer as { children: Layer[] }).children) {
      recoverLockedBindings(child);
    }
  }
  if (!layer.brandLocked) return;
  const bindings = (layer as { _lockedBindings?: Record<string, SlotRef> })._lockedBindings;
  if (!bindings || Object.keys(bindings).length === 0) return;

  for (const path of Object.keys(bindings)) {
    setLayerPropertyByPath(layer, path, clone(bindings[path]));
  }
  delete (layer as { _lockedBindings?: unknown })._lockedBindings;
}

function setLayerPropertyByPath(layer: Layer, path: string, value: SlotRef): void {
  if (path.startsWith('fillOverrides.')) {
    if (layer.kind !== 'svg') return;
    const key = path.slice('fillOverrides.'.length);
    (layer as { fillOverrides: Record<string, unknown> }).fillOverrides[key] = value;
    return;
  }
  (layer as unknown as Record<string, unknown>)[path] = value;
}

// Re-export the slot-ref test guard so callers (e.g. convertToTemplate)
// can use the same predicate.
export { isSlotRef };
