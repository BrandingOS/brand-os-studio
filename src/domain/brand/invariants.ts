/**
 * Canonical Brand invariants + boundary validation (Stage 2A).
 *
 * Every write into the canonical domain must pass `assertCanonicalBrand`. This is
 * the single parse point the target architecture mandates (challenge C9): a typed
 * value object is only safe if it is validated once at the boundary. Notably,
 * font weights MUST be numbers here — a stringified weight (the legacy drift that
 * commit 46ffb41 only patched at one consumer) fails validation loudly instead of
 * silently corrupting downstream rendering.
 */
import { z } from 'zod';
import type { CanonicalBrand } from './identity';

const hex = z.string().regex(/^#?[0-9a-fA-F]{3,8}$/, 'invalid hex color');

const colorToken = z
  .object({
    hex,
    name: z.string().optional(),
    rgb: z.string().optional(),
    cmyk: z.string().optional(),
    pantone: z.string().optional(),
    usage: z.string().optional(),
  })
  .passthrough();

const colorSystem = z
  .object({
    primary: colorToken,
    secondary: colorToken.optional(),
    accent: colorToken.optional(),
    neutrals: z.array(colorToken).optional(),
  })
  .passthrough();

const fontToken = z
  .object({
    family: z.string().min(1, 'font family required'),
    // Weights MUST be numeric at the domain boundary.
    weights: z.array(z.number()).optional(),
  })
  .passthrough();

const typographySystem = z
  .object({
    primary: fontToken,
    secondary: fontToken.optional(),
    accent: fontToken.optional(),
  })
  .passthrough();

const strategy = z
  .object({
    values: z.array(z.string()),
    personality: z.array(z.string()),
    aboutSections: z.array(
      z.object({ id: z.string(), title: z.string(), content: z.string() }),
    ),
  })
  .passthrough();

const voice = z
  .object({
    personality: z.array(z.string()),
    doList: z.array(z.string()),
    dontList: z.array(z.string()),
    examples: z.array(z.object({ context: z.string(), text: z.string() })),
  })
  .passthrough();

const canonicalBrandSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  identity: z.object({
    colors: colorSystem,
    logos: z.object({}).passthrough(),
    typography: typographySystem,
    strategy,
    voice,
  }),
  isPublic: z.boolean(),
  publicUrl: z.string().optional(),
  identitySchemaVersion: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CanonicalBrandValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

/** Non-throwing validation — returns the list of invariant violations. */
export function validateCanonicalBrand(b: unknown): CanonicalBrandValidation {
  const r = canonicalBrandSchema.safeParse(b);
  if (r.success) return { ok: true };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}

/** Throwing assertion — use at the write boundary. */
export function assertCanonicalBrand(b: unknown): CanonicalBrand {
  // Use zod's own result (reliably narrowed even with strictNullChecks off).
  const r = canonicalBrandSchema.safeParse(b);
  if (r.success) return b as CanonicalBrand;
  const errors = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid CanonicalBrand: ${errors.join('; ')}`);
}
