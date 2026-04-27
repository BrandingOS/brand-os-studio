// BrandOSDocument — the schema-first source of truth for the unified
// editor. Every editor surface, the AI design pipeline, the template
// library, and the brand engine all read and write this shape.
//
// Resolution of `SlotRefSchema` against a `Brand` is documented in
// `src/features/editor/brand/slotResolver.spec.md`. The slot enum here
// IS the contract; the resolver implementation lands in Phase 3.

import { z } from 'zod';

// ─── Primitives ────────────────────────────────────────────────────────────

/** 6 or 8 hex digits (RGB or RGBA), `#` prefix required. */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);

/**
 * Slot references resolve against the v3 Brand schema at render time.
 * Resolution priority chains, dual-source neutrals, and the spacing-tier
 * mapping are all documented in
 * `src/features/editor/brand/slotResolver.spec.md`. The resolver itself
 * lives in `src/features/editor/brand/applyBrand.ts` (Phase 3).
 */
export const SlotRefSchema = z.object({
  type: z.enum([
    'brand.color.primary',
    'brand.color.secondary',
    'brand.color.accent',
    'brand.color.neutral',
    'brand.font.heading',
    'brand.font.body',
    'brand.logo.primary',
    'brand.logo.secondary',
    'brand.logo.wordmark',
    'brand.logo.iconmark',
    'brand.logo.mono.black',
    'brand.logo.mono.white',
    'brand.spacing.unit',
  ]),
  /** Only valid for `brand.color.neutral` — index into the neutral ramp (0 = lightest, 5 = darkest). */
  neutralIndex: z.number().int().min(0).max(5).optional(),
});

export type SlotRef = z.infer<typeof SlotRefSchema>;

/** A value that's either a literal (string/number) or a brand-slot reference. */
export const ResolvedValueSchema = z.union([z.string(), z.number(), SlotRefSchema]);
export type ResolvedValue = z.infer<typeof ResolvedValueSchema>;

// ─── Geometry ──────────────────────────────────────────────────────────────

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
});
export type Transform = z.infer<typeof TransformSchema>;

// ─── Layers ────────────────────────────────────────────────────────────────

const BaseLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  transform: TransformSchema,
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  /** Brand-managed: the value comes from the brand kit and the user cannot override it. */
  brandLocked: z.boolean().default(false),
  /**
   * Optional surface kind used by the brand engine to pick paired
   * tokens via `pickSurfaceTokens` rather than a single hex.
   * See `slotResolver.spec.md` §Surface kinds.
   */
  surfaceKind: z
    .enum(['page', 'card', 'elevated', 'subtle', 'brand', 'brand-secondary', 'inverted'])
    .optional(),
});

export const TextLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('text'),
  text: z.string(),
  fontFamily: ResolvedValueSchema,
  fontSize: z.number(),
  fontWeight: z.number().default(400),
  lineHeight: z.number().default(1.2),
  letterSpacing: z.number().default(0),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  /**
   * Bidi direction. `'auto'` lets the renderer pick based on the first
   * strong directional character (matches the deck-v2 fix at
   * `src/shared/presentation/v2`).
   */
  direction: z.enum(['auto', 'ltr', 'rtl']).default('auto'),
  color: ResolvedValueSchema,
});

export const ShapeLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('shape'),
  shape: z.enum(['rectangle', 'ellipse', 'line', 'polygon']),
  fill: ResolvedValueSchema.nullable(),
  stroke: ResolvedValueSchema.nullable(),
  strokeWidth: z.number().default(0),
  cornerRadius: z.number().default(0),
});

/** An asset src is either a fully-qualified URL or a reference into `brand.brandAssets[]`. */
const AssetSrcSchema = z.union([
  z.string().url(),
  z.object({ assetId: z.string().min(1) }),
]);

export const ImageLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('image'),
  src: AssetSrcSchema,
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
});

export const SvgLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('svg'),
  src: AssetSrcSchema,
  /** Per-fill overrides keyed by SVG path id, resolved through SlotRef. */
  fillOverrides: z.record(z.string(), ResolvedValueSchema).default({}),
});

export const LogoLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('logo'),
  /**
   * Logo variant. `'auto'` routes through `pickLogoOnBackground(brand, bgHex)`
   * from `src/shared/brand/logoOnBackground.ts` at render time — picks
   * the most readable variant against the layer's effective background.
   * Explicit variants (`'primary'`, `'mono.black'`, etc.) bypass auto
   * selection but the renderer still validates contrast and surfaces a
   * warning in the properties panel when readability falls below the
   * floor (1.8 ratio).
   */
  variant: z
    .enum(['primary', 'secondary', 'wordmark', 'iconmark', 'mono.black', 'mono.white', 'auto'])
    .default('auto'),
});

// ─── Group (recursive) ─────────────────────────────────────────────────────

// Forward-declared because GroupLayerSchema references LayerSchema which
// references GroupLayerSchema. Zod's `lazy` handles the cycle; the type
// has to be hand-typed since z.lazy widens to `ZodType<unknown>`.
export interface GroupLayer extends z.infer<typeof BaseLayerSchema> {
  kind: 'group';
  children: Layer[];
}

export const GroupLayerSchema: z.ZodType<GroupLayer> = BaseLayerSchema.extend({
  kind: z.literal('group'),
  children: z.lazy(() => z.array(LayerSchema)),
});

export const LayerSchema = z.discriminatedUnion('kind', [
  TextLayerSchema,
  ShapeLayerSchema,
  ImageLayerSchema,
  SvgLayerSchema,
  LogoLayerSchema,
  GroupLayerSchema,
]);

export type TextLayer = z.infer<typeof TextLayerSchema>;
export type ShapeLayer = z.infer<typeof ShapeLayerSchema>;
export type ImageLayer = z.infer<typeof ImageLayerSchema>;
export type SvgLayer = z.infer<typeof SvgLayerSchema>;
export type LogoLayer = z.infer<typeof LogoLayerSchema>;
export type Layer = z.infer<typeof LayerSchema>;

// ─── Pages and document ────────────────────────────────────────────────────

export const PageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  background: ResolvedValueSchema.default('#ffffff'),
  masterPageId: z.string().uuid().nullable().default(null),
  layers: z.array(LayerSchema),
});
export type Page = z.infer<typeof PageSchema>;

/**
 * Per-document brand resolution record produced by
 * `applyBrandToDocument(..., { mode: 'preview' })`. Maps layer ids
 * (and page ids for the page background field) to the resolved
 * literal values that the renderer or an AI agent would see if the
 * SlotRefs were committed. The original SlotRefs stay in place on
 * the layers — the AI layer reads this annotation to "see" the
 * brand-resolved doc without committing the doc to a specific brand.
 *
 * Lifted to a top-level optional field (out of `metadata`) so the
 * AI layer in Phase 5 has type-safe discoverable access. Non-preview
 * documents serialize without this field — no JSON noise.
 */
export const BrandResolutionSchema = z.object({
  /** ISO 8601 timestamp when the resolution was performed. */
  resolvedAt: z.string().datetime(),
  /** Id of the BrandKit used for resolution. */
  brandKitId: z.string().min(1),
  /**
   * layerId → property path → resolved literal. Property paths
   * include nested keys for SvgLayer.fillOverrides (e.g.
   * `"fillOverrides.#path-1"`).
   */
  layers: z.record(
    z.string(),
    z.record(z.string(), z.union([z.string(), z.number()])),
  ),
  /**
   * pageId → property path → resolved literal. Currently only the
   * `background` field; reserved for future page-level resolved
   * values.
   */
  pages: z.record(
    z.string(),
    z.record(z.string(), z.union([z.string(), z.number()])),
  ),
});
export type BrandResolution = z.infer<typeof BrandResolutionSchema>;

export const BrandOSDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  /** Matches a `ContentTypeConfig.id` (Phase 2). */
  contentType: z.string().min(1),
  /**
   * Brand id. Loosened from UUID to `min(1)` so seed/legacy slug-style
   * IDs (`raqm`, `meridian`) are accepted. Null = standalone-editor flow
   * (BrandChooserDialog → "Start without a brand").
   */
  brandId: z.string().min(1).nullable(),
  masterPages: z.array(PageSchema).default([]),
  pages: z.array(PageSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  /**
   * Optional preview-mode brand resolution annotation. Present when
   * `applyBrandToDocument(..., { mode: 'preview' })` produced this
   * document. Absent on apply-mode documents and on freshly-authored
   * docs.
   */
  brandResolution: BrandResolutionSchema.optional(),
});
export type BrandOSDocument = z.infer<typeof BrandOSDocumentSchema>;
