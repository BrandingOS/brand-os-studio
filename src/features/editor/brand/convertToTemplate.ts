// convertToTemplate — inverse of applyBrandToDocument. Replaces
// concrete values that match a brand kit's literals with the
// corresponding SlotRefs, producing a brand-agnostic template.
//
// Pure function; no DOM, no Fabric, no side effects. Same hosting
// constraints as applyBrandToDocument — runs in Edge Functions.
//
// Round-trip property:
//   convertToTemplate(applyBrandToDocument(template, brandKit), brandKit)
//   should equal `template`, modulo:
//     • Slot-identity ambiguity when two slots resolve to the same
//       literal (e.g. one-font brand where heading.family ===
//       body.family — both `brand.font.heading` and `brand.font.body`
//       SlotRefs resolve to the same family, and on convert-back we
//       can only pick one; we pick the first match in source order).
//     • Logos and image src — these aren't resolved through SlotRef
//       literals at the document layer so they pass through unchanged.
//
// `applyBrandToDocument(convertToTemplate(doc, brandKit), brandKit)`
// always equals the apply-output of `doc` for properly-templated
// documents.

import type {
  BrandOSDocument,
  GroupLayer,
  Layer,
  Page,
  ShapeLayer,
  SlotRef,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';
import type { BrandKit } from './BrandKit';

/**
 * Replace literal values in `doc` that match `brandKit` values with
 * the corresponding SlotRefs. Non-matching literals are left intact —
 * they're intentional one-off design choices.
 *
 * Walks the same surfaces as applyBrandToDocument: page layers,
 * master page layers, page backgrounds, group children.
 */
export function convertToTemplate(
  doc: BrandOSDocument,
  brandKit: BrandKit,
): BrandOSDocument {
  const next = clone(doc);
  const lookups = buildLookups(brandKit);

  for (const page of [...next.pages, ...next.masterPages]) {
    convertPage(page, lookups);
  }
  return next;
}

// ─── Lookups ────────────────────────────────────────────────────────────

interface BrandLookups {
  /** Hex (lowercase) → SlotRef. */
  hex: Map<string, SlotRef>;
  /** Font family → SlotRef. First-match wins on collision. */
  font: Map<string, SlotRef>;
}

function buildLookups(brandKit: BrandKit): BrandLookups {
  const hex = new Map<string, SlotRef>();
  // Insert order matters: when the same hex appears in multiple slots
  // (e.g. primary and a neutral), the FIRST entry wins. We seed
  // semantic slots before neutrals so primary/secondary/accent take
  // precedence over an accidental neutral collision.
  hex.set(normalizeHex(brandKit.colors.primary.hex), { type: 'brand.color.primary' });
  if (brandKit.colors.secondary) {
    hex.set(normalizeHex(brandKit.colors.secondary.hex), {
      type: 'brand.color.secondary',
    });
  }
  if (brandKit.colors.accent) {
    hex.set(normalizeHex(brandKit.colors.accent.hex), {
      type: 'brand.color.accent',
    });
  }
  for (let i = 0; i < brandKit.colors.neutrals.length; i++) {
    const norm = normalizeHex(brandKit.colors.neutrals[i]);
    if (!hex.has(norm)) {
      hex.set(norm, { type: 'brand.color.neutral', neutralIndex: i });
    }
  }

  const font = new Map<string, SlotRef>();
  // Heading first — when heading.family === body.family (one-font brand),
  // round-tripping a body-slotted layer gets pulled to heading. Documented
  // limitation; preserved by ordering.
  font.set(brandKit.typography.heading.family, { type: 'brand.font.heading' });
  if (!font.has(brandKit.typography.body.family)) {
    font.set(brandKit.typography.body.family, { type: 'brand.font.body' });
  }

  return { hex, font };
}

function normalizeHex(hex: string): string {
  return hex.toLowerCase().trim();
}

// ─── Conversion ─────────────────────────────────────────────────────────

function convertPage(page: Page, lookups: BrandLookups): void {
  if (typeof page.background === 'string') {
    const slot = lookups.hex.get(normalizeHex(page.background));
    if (slot) page.background = clone(slot);
  }
  for (const layer of page.layers) convertLayer(layer, lookups);
}

function convertLayer(layer: Layer, lookups: BrandLookups): void {
  switch (layer.kind) {
    case 'text':
      convertTextLayer(layer, lookups);
      break;
    case 'shape':
      convertShapeLayer(layer, lookups);
      break;
    case 'svg':
      convertSvgLayer(layer, lookups);
      break;
    case 'group':
      convertGroupLayer(layer, lookups);
      break;
    case 'image':
    case 'logo':
      // No SlotRef-bearing ResolvedValue fields on these. Image src
      // is handled at render time; logo variant resolves through
      // pickLogoOnBackground.
      break;
  }
}

function convertTextLayer(layer: TextLayer, lookups: BrandLookups): void {
  if (typeof layer.fontFamily === 'string') {
    const slot = lookups.font.get(layer.fontFamily);
    if (slot) layer.fontFamily = clone(slot);
  }
  if (typeof layer.color === 'string') {
    const slot = lookups.hex.get(normalizeHex(layer.color));
    if (slot) layer.color = clone(slot);
  }
}

function convertShapeLayer(layer: ShapeLayer, lookups: BrandLookups): void {
  if (typeof layer.fill === 'string') {
    const slot = lookups.hex.get(normalizeHex(layer.fill));
    if (slot) layer.fill = clone(slot);
  }
  if (typeof layer.stroke === 'string') {
    const slot = lookups.hex.get(normalizeHex(layer.stroke));
    if (slot) layer.stroke = clone(slot);
  }
}

function convertSvgLayer(layer: SvgLayer, lookups: BrandLookups): void {
  for (const key of Object.keys(layer.fillOverrides)) {
    const value = layer.fillOverrides[key];
    if (typeof value === 'string') {
      const slot = lookups.hex.get(normalizeHex(value));
      if (slot) layer.fillOverrides[key] = clone(slot);
    }
  }
}

function convertGroupLayer(layer: GroupLayer, lookups: BrandLookups): void {
  for (const child of layer.children) convertLayer(child, lookups);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
