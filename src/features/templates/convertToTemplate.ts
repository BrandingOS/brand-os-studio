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

import type {
  BrandOSDocument,
  Layer,
  Page,
  ResolvedValue,
  SlotRef,
} from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';

export function convertToTemplate(
  doc: BrandOSDocument,
  kit: BrandKit,
): BrandOSDocument {
  const colorMap = buildColorMap(kit);
  const fontMap = buildFontMap(kit);
  return {
    ...doc,
    pages: doc.pages.map((p) => convertPage(p, colorMap, fontMap)),
    masterPages: doc.masterPages.map((p) => convertPage(p, colorMap, fontMap)),
  };
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
