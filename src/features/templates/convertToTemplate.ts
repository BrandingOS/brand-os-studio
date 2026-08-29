// convertToTemplate — Phase 4.2 helper.
//
// When the user saves a design as a template, any LITERAL color or
// font that matches the brand kit's resolved values gets converted
// BACK into a SlotRef. This makes the saved template brand-agnostic
// — when another brand opens it, the SlotRefs resolve to that
// brand's kit, not the original user's hardcoded hex.
//
// Scope:
//   • text.color: literal hex matching one of the kit's color slots
//     → corresponding SlotRef.
//   • text.fontFamily: literal family matching kit.typography.{heading,body}.family
//     → corresponding SlotRef.
//   • shape.fill / shape.stroke: literal hex matching → SlotRef.
//   • page.background: literal hex matching → SlotRef.
//   • Recursive into group.children.
//
// Anything that doesn't match a kit value stays a literal — that's
// the user's intentional ad-hoc choice, not a brand binding.
//
// A document's `body` gets the same treatment for the same reason, and
// one more. A template-instance body holds the DELIVERABLE'S CONTENT —
// for an invoice that is a client's name, their billing address, the
// invoice number, every line item and what was charged for it. A saved
// template is a starting point for other documents, and a public one is
// read by an admin reviewer before it reaches anyone else. Neither is a
// place for one customer's invoice. The content is reset to the kind's
// defaults here, at the data layer, so no caller can submit it by
// forgetting to — which is why `kit` is nullable: the only caller used
// to skip this whole function when there was no brand kit to convert
// against, and that path must not be a way around the reset.

import type {
  BrandOSDocument,
  Layer,
  Page,
  ResolvedValue,
  SlotRef,
} from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import { defaultContentFor } from '@/features/brandkit/content';

/**
 * The name a template's placeholder content is written against. A
 * template is brand-agnostic by definition, so it cannot be the author's
 * brand — and it must not be, or the defaults would carry their name and
 * their domain into everyone else's copy.
 */
const PLACEHOLDER_BRAND = { name: 'Brand' };

export function convertToTemplate(
  doc: BrandOSDocument,
  kit: BrandKit | null | undefined,
): BrandOSDocument {
  const colorMap = kit ? buildColorMap(kit) : new Map<string, SlotRef>();
  const fontMap = kit ? buildFontMap(kit) : new Map<string, SlotRef>();
  return {
    ...doc,
    pages: doc.pages.map((p) => convertPage(p, colorMap, fontMap)),
    masterPages: doc.masterPages.map((p) => convertPage(p, colorMap, fontMap)),
    ...(doc.body ? { body: convertBody(doc.body) } : {}),
  };
}

/**
 * Reset a layerless renderer's payload to its kind's defaults.
 *
 * The design picks (which brand colour, which logo, which typeface) are
 * KEPT: they are choices about the template, and they are already
 * brand-relative. The content is not.
 */
function convertBody(body: NonNullable<BrandOSDocument['body']>): BrandOSDocument['body'] {
  switch (body.kind) {
    case 'template-instance':
      return {
        ...body,
        content: defaultContentFor(body.content.kind, PLACEHOLDER_BRAND),
      };
    default:
      return body;
  }
}

function convertPage(
  page: Page,
  colorMap: Map<string, SlotRef>,
  fontMap: Map<string, SlotRef>,
): Page {
  return {
    ...page,
    background: convertColorValue(page.background, colorMap),
    layers: page.layers.map((l) => convertLayer(l, colorMap, fontMap)),
  };
}

function convertLayer(
  layer: Layer,
  colorMap: Map<string, SlotRef>,
  fontMap: Map<string, SlotRef>,
): Layer {
  switch (layer.kind) {
    case 'text':
      return {
        ...layer,
        color: convertColorValue(layer.color, colorMap),
        fontFamily: convertFontValue(layer.fontFamily, fontMap),
      };
    case 'shape':
      return {
        ...layer,
        fill: layer.fill === null ? null : convertColorValue(layer.fill, colorMap),
        stroke: layer.stroke === null ? null : convertColorValue(layer.stroke, colorMap),
      };
    case 'group':
      return {
        ...layer,
        children: layer.children.map((c) => convertLayer(c, colorMap, fontMap)),
      };
    case 'image':
    case 'svg':
    case 'logo':
    default:
      return layer;
  }
}

function convertColorValue(
  value: ResolvedValue,
  colorMap: Map<string, SlotRef>,
): ResolvedValue {
  // Already a SlotRef? Pass through.
  if (typeof value !== 'string') return value;
  const normalized = value.toLowerCase();
  return colorMap.get(normalized) ?? value;
}

function convertFontValue(
  value: ResolvedValue,
  fontMap: Map<string, SlotRef>,
): ResolvedValue {
  if (typeof value !== 'string') return value;
  // Match on the first family in the stack (e.g. "Inter, sans-serif"
  // → match key "inter").
  const head = value.split(',')[0]?.trim().toLowerCase();
  if (!head) return value;
  return fontMap.get(head) ?? value;
}

function buildColorMap(kit: BrandKit): Map<string, SlotRef> {
  const m = new Map<string, SlotRef>();
  m.set(kit.colors.primary.hex.toLowerCase(), { type: 'brand.color.primary' });
  if (kit.colors.secondary) {
    m.set(kit.colors.secondary.hex.toLowerCase(), { type: 'brand.color.secondary' });
  }
  if (kit.colors.accent) {
    m.set(kit.colors.accent.hex.toLowerCase(), { type: 'brand.color.accent' });
  }
  kit.colors.neutrals.forEach((hex, i) => {
    m.set(hex.toLowerCase(), { type: 'brand.color.neutral', neutralIndex: i as 0 | 1 | 2 | 3 | 4 | 5 });
  });
  return m;
}

function buildFontMap(kit: BrandKit): Map<string, SlotRef> {
  const m = new Map<string, SlotRef>();
  m.set(kit.typography.heading.family.toLowerCase(), { type: 'brand.font.heading' });
  m.set(kit.typography.body.family.toLowerCase(), { type: 'brand.font.body' });
  return m;
}
