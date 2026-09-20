// Making a layer.
//
// Two things were wrong with inserting before, and both are the same
// mistake: the editor did not know which brand it was in.
//
//   • Every shape was born `#6366f1`. Inserting a rectangle into Raqm —
//     a red brand — gave you an indigo box. For a product whose thesis
//     is that the brand is part of the editor, that is the single most
//     damning detail on the canvas.
//   • Every insert landed at a hardcoded x:100, y:100, off-screen the
//     moment the user had panned or zoomed anywhere.
//
// New layers are painted from the brand kit and placed where the user is
// looking. Colours are written as LITERALS rather than SlotRefs on
// purpose: the Fabric renderer resolves a SlotRef to a placeholder grey
// until `applyBrandToDocument` runs, so inserting a brand-bound shape
// would put a grey box on the canvas — technically more correct and
// visibly worse. `convertToTemplate` maps literals back to SlotRefs when
// a design is saved as a template, so the binding story is unaffected.

import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { ImageLayer, Layer, Page, ShapeLayer, TextLayer } from '@/features/editor/schema';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Used only when there is no brand at all (the standalone editor). */
const NEUTRAL_INK = '#111111';
const NEUTRAL_FILL = '#d8d5d0';

export interface PlaceOptions {
  /** Where the user is looking, in document coordinates. */
  centre: { x: number; y: number };
  page: Page;
}

/**
 * Keep a new layer on the page.
 *
 * Inserting while panned right off the artboard would otherwise drop the
 * layer somewhere the user has to hunt for. The layer is centred on the
 * requested point, then pushed back inside the page bounds.
 */
function place(
  width: number,
  height: number,
  { centre, page }: PlaceOptions,
): { x: number; y: number } {
  const x = centre.x - width / 2;
  const y = centre.y - height / 2;
  const margin = 8;
  return {
    x: Math.round(Math.min(Math.max(x, margin), Math.max(margin, page.width - width - margin))),
    y: Math.round(Math.min(Math.max(y, margin), Math.max(margin, page.height - height - margin))),
  };
}

const base = (name: string, x: number, y: number, width: number, height: number) => ({
  id: newId(),
  name,
  transform: { x, y, width, height, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  visible: true,
  locked: false,
  brandLocked: false,
});

// ─── Colour ────────────────────────────────────────────────────────────

/** The page's background as a hex, for contrast decisions. */
export function pageBackgroundHex(page: Page): string {
  return typeof page.background === 'string' ? page.background : '#ffffff';
}

/**
 * Ink that can actually be read on this page.
 *
 * A brand's primary colour is not automatically legible on the page it
 * is being placed on — a dark brand on a dark page is invisible. This
 * goes through the same contrast helper every other surface in the
 * product uses rather than guessing from luminance.
 */
export function readableInk(kit: BrandKit | null, page: Page): string {
  const bg = pageBackgroundHex(page);
  const candidates = [
    kit?.colors.primary.hex,
    kit?.colors.secondary?.hex,
    kit?.colors.neutrals?.[kit.colors.neutrals.length - 1],
    NEUTRAL_INK,
    '#ffffff',
  ].filter((c): c is string => typeof c === 'string');
  return pickFgOnBackground(bg, candidates) ?? NEUTRAL_INK;
}

/** The fill a new shape takes: the brand's primary, when there is one. */
export function brandFill(kit: BrandKit | null, page: Page): string {
  const primary = kit?.colors.primary.hex;
  if (!primary) return NEUTRAL_FILL;
  // A primary that matches the page exactly would produce an invisible
  // shape; fall to the secondary, then to a neutral, before giving up.
  if (primary.toLowerCase() !== pageBackgroundHex(page).toLowerCase()) return primary;
  return kit?.colors.secondary?.hex ?? kit?.colors.neutrals?.[3] ?? NEUTRAL_FILL;
}

// ─── Shapes ────────────────────────────────────────────────────────────

export type ShapeKind = 'rectangle' | 'ellipse' | 'line' | 'polygon';

export function makeShape(
  shape: ShapeKind,
  kit: BrandKit | null,
  opts: PlaceOptions,
): ShapeLayer {
  const size = Math.round(Math.min(opts.page.width, opts.page.height) * 0.3);
  const width = shape === 'line' ? Math.round(opts.page.width * 0.4) : size;
  const height = shape === 'line' ? 0 : size;
  const { x, y } = place(width, Math.max(height, 2), opts);
  const name = shape[0].toUpperCase() + shape.slice(1);

  if (shape === 'line') {
    return {
      ...base(name, x, y, width, 0),
      kind: 'shape',
      shape: 'line',
      fill: null,
      stroke: readableInk(kit, opts.page),
      strokeWidth: 2,
      cornerRadius: 0,
    } as ShapeLayer;
  }

  return {
    ...base(name, x, y, width, height),
    kind: 'shape',
    shape,
    fill: brandFill(kit, opts.page),
    stroke: null,
    strokeWidth: 0,
    // The brand's own corner radius, so a soft brand gets soft shapes.
    cornerRadius: shape === 'rectangle' ? (kit?.spacing.cornerRadius ?? 0) : 0,
  } as ShapeLayer;
}

// ─── Text ──────────────────────────────────────────────────────────────

export type TextStyleId = 'heading' | 'subheading' | 'body';

interface TextStyleSpec {
  label: string;
  /** Fraction of the page's short edge — so type scales with the format. */
  scale: number;
  weight: number;
  font: 'heading' | 'body';
  sample: string;
}

export const TEXT_STYLES: Record<TextStyleId, TextStyleSpec> = {
  heading: { label: 'Heading', scale: 0.09, weight: 700, font: 'heading', sample: 'Add a heading' },
  subheading: {
    label: 'Subheading',
    scale: 0.05,
    weight: 600,
    font: 'heading',
    sample: 'Add a subheading',
  },
  body: { label: 'Body', scale: 0.028, weight: 400, font: 'body', sample: 'Add a little body text' },
};

/**
 * Text in the brand's own typeface, at a size that suits the format.
 *
 * A fixed 48px heading is enormous on a business card and invisible on a
 * billboard. Sizing from the page's short edge means the same command
 * produces a sensible heading on every deliverable the editor supports.
 */
export function makeText(
  style: TextStyleId,
  kit: BrandKit | null,
  opts: PlaceOptions,
  text?: string,
): TextLayer {
  const spec = TEXT_STYLES[style];
  const shortEdge = Math.min(opts.page.width, opts.page.height);
  const fontSize = Math.max(10, Math.round(shortEdge * spec.scale));
  const width = Math.round(opts.page.width * 0.7);
  const height = Math.round(fontSize * 1.3);
  const { x, y } = place(width, height, opts);
  const family =
    (spec.font === 'heading' ? kit?.typography.heading.family : kit?.typography.body.family) ??
    'Inter, system-ui, sans-serif';

  return {
    ...base(spec.label, x, y, width, height),
    kind: 'text',
    text: text ?? spec.sample,
    fontFamily: family,
    fontSize,
    fontWeight: spec.weight,
    fontStyle: 'normal',
    lineHeight: style === 'body' ? 1.5 : 1.15,
    letterSpacing: style === 'heading' ? -0.02 : 0,
    textAlign: 'left',
    direction: 'auto',
    color: readableInk(kit, opts.page),
  } as TextLayer;
}

// ─── Media ─────────────────────────────────────────────────────────────

export function makeImage(
  src: string,
  opts: PlaceOptions,
  natural?: { width: number; height: number },
): ImageLayer {
  // Land at 60% of the page's width, keeping the image's own proportions
  // when we know them — a portrait photo should not arrive square.
  const width = Math.round(opts.page.width * 0.6);
  const ratio = natural && natural.width > 0 ? natural.height / natural.width : 0.66;
  const height = Math.round(width * ratio);
  const { x, y } = place(width, height, opts);
  return {
    ...base('Image', x, y, width, height),
    kind: 'image',
    src,
    fit: 'cover',
  } as ImageLayer;
}

export function makeLogo(
  variant: 'primary' | 'secondary' | 'wordmark' | 'iconmark' | 'mono.black' | 'mono.white' | 'auto',
  opts: PlaceOptions,
): Layer {
  const width = Math.round(opts.page.width * 0.35);
  const height = Math.round(width * 0.4);
  const { x, y } = place(width, height, opts);
  return {
    ...base('Logo', x, y, width, height),
    kind: 'logo',
    variant,
  } as Layer;
}

export function makeSvg(src: string, opts: PlaceOptions, name = 'Icon'): Layer {
  const size = Math.round(Math.min(opts.page.width, opts.page.height) * 0.18);
  const { x, y } = place(size, size, opts);
  return {
    ...base(name, x, y, size, size),
    kind: 'svg',
    src,
    fillOverrides: {},
  } as Layer;
}
