// BrandKit — the normalized adapter contract the slot resolver reads.
//
// This is NOT a duplicate of the v3 `Brand` type (`@/shared/types/brand`).
// It's the Anti-Corruption Layer: a small, opinionated shape that
// captures only what the editor's slot resolver needs, with priority-
// chain logic concentrated in the single function `brandToBrandKit`.
//
// Architecture rationale:
//   • v3 `Brand` carries deprecation history (legacy flat fields
//     coexist with canonical v3 fields) and dual storage (neutrals as
//     both `ColorToken[]` AND raw `string[]`).
//   • The resolver shouldn't have to know any of that. It reads
//     `BrandKit.colors.primary.hex`, full stop.
//   • Future v4 / v5 schema migrations are a one-function change in
//     `brandToBrandKit`. Resolver call sites stay untouched.

import { z } from 'zod';
import { HexColorSchema } from '@/features/editor/schema';

/**
 * URL/path accepted by the renderer. Covers:
 *   • Absolute URLs       — http://… https://…
 *   • Data URIs           — data:image/svg+xml;…
 *   • Blob URLs           — blob:… (runtime-created)
 *   • Root-relative paths — /brands/raqm/logo.svg (seed brands)
 *   • Document-relative   — ./assets/logo.svg
 *
 * The strict `z.string().url()` only accepts the first three forms;
 * loosening here matches the reality of the seed brands and the
 * brand-assets pipeline (which writes `/brands/<slug>/<file>` for
 * locally-served assets) without weakening to a no-op string.
 */
const RendererUrlSchema = z.string().refine(
  (s) =>
    /^https?:\/\//i.test(s) ||
    /^data:/i.test(s) ||
    /^blob:/i.test(s) ||
    /^\.{0,2}\//.test(s),
  {
    message:
      'Must be an absolute URL, data URI, blob URL, or root-/relative- path',
  },
);

/** A resolved brand asset (logo) — URL + format the renderer can use. */
export const LogoAssetSchema = z.object({
  url: RendererUrlSchema,
  format: z.enum(['svg', 'png', 'pdf', 'webp', 'jpg']),
  /** Aspect ratio (width / height). Optional — only known if the source
   *  asset metadata had dimensions. */
  aspectRatio: z.number().positive().optional(),
});
export type LogoAsset = z.infer<typeof LogoAssetSchema>;

const ColorWithNameSchema = z.object({
  hex: HexColorSchema,
  name: z.string().optional(),
});

const FontFaceSchema = z.object({
  family: z.string().min(1),
  weights: z.array(z.number().int().positive()).optional(),
});

/**
 * Diagnostic warnings emitted during `brandToBrandKit`. Surfaces
 * brands with missing or fallback-resolved fields. Phase 3 just
 * populates this; future "brand health" UI displays it.
 */
const DiagnosticsSchema = z.object({
  warnings: z.array(z.string()).default([]),
});

export const BrandKitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  colors: z.object({
    primary: ColorWithNameSchema,
    secondary: ColorWithNameSchema.optional(),
    accent: ColorWithNameSchema.optional(),
    /** Always exactly 6 entries, lightest → darkest. Normalization is
     *  performed by `normalizeNeutrals` in `./neutrals.ts`. */
    neutrals: z.array(HexColorSchema).length(6),
  }),

  typography: z.object({
    heading: FontFaceSchema,
    body: FontFaceSchema,
  }),

  logos: z.object({
    primary: LogoAssetSchema.optional(),
    secondary: LogoAssetSchema.optional(),
    wordmark: LogoAssetSchema.optional(),
    iconmark: LogoAssetSchema.optional(),
    mono: z
      .object({
        black: LogoAssetSchema.optional(),
        white: LogoAssetSchema.optional(),
      })
      .default({}),
  }),

  spacing: z.object({
    /** Base spacing unit in px. Mapped from `Brand.uiStyle.spacing`:
     *  compact → 4, comfortable → 8, spacious → 12. */
    unit: z.number().int().positive(),
    cornerRadius: z.number().int().min(0),
  }),

  /** Diagnostic warnings produced during conversion. Empty when the
   *  source brand was fully defined. */
  _diagnostics: DiagnosticsSchema.default({ warnings: [] }),
});

export type BrandKit = z.infer<typeof BrandKitSchema>;
