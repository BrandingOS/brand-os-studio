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

/**
 * Visual style, rules and positioning are CLOSED enumerations where the product
 * can act on them — an open string would put us back to parsing prose. All
 * three subsystems are optional: skipping a Core decision is a supported state,
 * not an invalid brand.
 */
const visualStyle = z
  .object({
    descriptors: z
      .array(
        // Mirrors `StyleDescriptor` in identity.ts — widened additively in
        // 002 R1. A test asserts the two stay in step with the product's
        // style vocabulary.
        z.enum([
          'minimal',
          'maximal',
          'modern',
          'classic',
          'retro',
          'futuristic',
          'elegant',
          'luxury',
          'bold',
          'playful',
          'organic',
          'geometric',
          'brutalist',
          'editorial',
          'technical',
          'corporate',
          'artisanal',
        ]),
      )
      .optional(),
    cornerStyle: z.enum(['sharp', 'soft', 'rounded', 'pill']).optional(),
    density: z.enum(['tight', 'balanced', 'airy']).optional(),
    contrast: z.enum(['low', 'medium', 'high']).optional(),
    imageryStyle: z
      .enum(['photographic', 'illustrated', 'abstract', 'mixed', 'none'])
      .optional(),
    motion: z.enum(['still', 'subtle', 'expressive']).optional(),
  })
  .passthrough();

const brandRules = z
  .object({
    logo: z
      .object({
        minSizePx: z.number().optional(),
        clearSpaceRatio: z.number().optional(),
        allowedBackgrounds: z
          .array(z.enum(['light', 'dark', 'brand', 'photo']))
          .optional(),
        prohibited: z
          .array(z.enum(['stretch', 'recolor', 'rotate', 'outline', 'shadow']))
          .optional(),
      })
      .passthrough()
      .optional(),
    color: z
      .object({
        neverPair: z.array(z.tuple([hex, hex])).optional(),
        requireContrastRatio: z.number().optional(),
      })
      .passthrough()
      .optional(),
    type: z
      .object({
        minBodySizePx: z.number().optional(),
        allowedWeights: z.array(z.number()).optional(),
      })
      .passthrough()
      .optional(),
    voice: z
      .object({
        avoidTerms: z.array(z.string()).optional(),
        preferTerms: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const positioning = z
  .object({
    category: z.string().optional(),
    differentiator: z.string().optional(),
    audiences: z
      .array(
        z
          .object({
            label: z.string(),
            descriptor: z.string().optional(),
            priority: z.enum(['primary', 'secondary']),
          })
          .passthrough(),
      )
      .optional(),
    competitors: z
      .array(z.object({ name: z.string(), note: z.string().optional() }).passthrough())
      .optional(),
  })
  .passthrough();

/**
 * The authority/provenance sidecar. Keys are NOT validated against the
 * CoreFieldPath registry here — `sanitizeIdentityMeta` drops unknown keys on
 * read (INV-1), which is self-healing; rejecting the whole brand because a
 * renamed path left stale metadata behind would be a far worse failure mode.
 */
const coreValueMeta = z
  .object({
    authority: z.enum(['suggested', 'provisional', 'confirmed', 'official']),
    provenance: z.enum(['user-entered', 'ai-suggested', 'inferred', 'imported']),
    setBy: z.string().nullable(),
    setAt: z.string(),
    promotedBy: z.string().optional(),
    promotedAt: z.string().optional(),
  })
  .passthrough();

const identityMeta = z.record(coreValueMeta);

/** Business Info — every field optional; it must never block creation. */
const businessInfo = z
  .object({
    legalName: z.string().optional(),
    displayName: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    industry: z.string().optional(),
    foundedYear: z.number().int().optional(),
    contact: z
      .object({
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        address: z.object({}).passthrough().optional(),
      })
      .passthrough()
      .optional(),
    links: z
      .array(
        z
          .object({
            kind: z.enum([
              'website',
              'linkedin',
              'instagram',
              'x',
              'facebook',
              'youtube',
              'tiktok',
              'other',
            ]),
            url: z.string(),
            label: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    audienceSummary: z.string().optional(),
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
    visualStyle: visualStyle.optional(),
    rules: brandRules.optional(),
    positioning: positioning.optional(),
  }),
  identityMeta: identityMeta.optional(),
  businessInfo: businessInfo.optional(),
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
