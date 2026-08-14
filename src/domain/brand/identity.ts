/**
 * Canonical Brand domain — the ONE authoritative representation of a brand's
 * identity (Stage 2A). Framework-free and persistence-free: no React, no
 * Supabase, no localStorage, no `import.meta`. Legacy compatibility lives ONLY
 * in `./fromLegacy` + `./toLegacy` — never inside these types.
 *
 * The value objects (ColorSystem, LogoSystemRefs, TypographySystem, BrandAsset)
 * are reused from `shared/types/brandAssets`. Those v3 shapes are already correct
 * for the target model — colors by role, logos referenced by asset id, numeric
 * font weights. Stage 2A makes them *authoritative* by composing them into a
 * single validated aggregate behind one legacy boundary, rather than inventing a
 * competing fourth representation (which would re-create the very
 * multiple-source-of-truth problem this migration removes — see
 * docs/codebase-intelligence/05-SOURCE-OF-TRUTH.md).
 */
import type {
  ColorSystem,
  LogoSystemRefs,
  TypographySystem,
} from '@/shared/types/brandAssets';

// Re-export the canonical value-object vocabulary from its single home so
// downstream code imports these from the domain, not scattered locations.
export type {
  ColorSystem,
  ColorToken,
  LogoSystemRefs,
  LogoRef,
  LogoUsageRule,
  TypographySystem,
  FontToken,
  BrandAsset,
  BrandAssetKind,
  AssetRef,
  AssetFormat,
  LogoRole,
} from '@/shared/types/brandAssets';

/**
 * Current canonical identity schema version. Stored explicitly on the brand so
 * there is NO per-load migration/derivation (which is what let stale mirrors
 * overwrite fresh values in the legacy system — 05/11).
 */
export const CANONICAL_BRAND_SCHEMA_VERSION = 1;

/** Brand strategy — one authoritative representation (no legacy triple-split). */
export interface Strategy {
  mission?: string;
  vision?: string;
  values: string[];
  positioning?: string;
  personality: string[];
  targetAudience?: string;
  /** Free-form authored About sections, preserved verbatim from onboarding. */
  aboutSections: Array<{ id: string; title: string; content: string }>;
}

/**
 * Brand voice — one authoritative representation. Collapses the legacy
 * three-way split (`tone` scalar / `voiceAndTone.*` / rendered `brand.tone`)
 * into a single object read and written the same way everywhere.
 */
export interface Voice {
  tone?: string;
  personality: string[];
  doList: string[];
  dontList: string[];
  examples: Array<{ context: string; text: string }>;
}

/**
 * Visual style attributes — CLOSED enumerations, never free text.
 *
 * A renderer or an AI prompt has to be able to act on these without
 * interpreting prose, which is why every field is a fixed union rather than a
 * description. `brand.uiStyle` (written today by Brand Board) maps into
 * `cornerStyle`/`density` on read and is retired once no reader remains.
 */
/**
 * The closed visual-style vocabulary.
 *
 * Widened 2026-08-14 (spec 002 R1, owner-approved) from eight members to
 * seventeen. Purely ADDITIVE — every original member survives, so no stored
 * brand is invalidated and no migration is implied.
 *
 * Grouped by the axis each member varies along, which is deliberate: a
 * vocabulary meant to drive filtering and recommendation later must not contain
 * synonym pairs, or two brands that mean the same thing land in different
 * buckets. `illustrative` is excluded because `VisualStyle.imageryStyle`
 * already owns it, and mood words are excluded because `Voice.tone` does.
 *
 * The product-facing labels live in
 * `features/onboarding/vocabulary/vocabularies.ts`, which a test keeps in sync
 * with this union and with the matching `z.enum` in `invariants.ts`.
 */
export type StyleDescriptor =
  // reduction
  | 'minimal'
  | 'maximal'
  // era
  | 'modern'
  | 'classic'
  | 'retro'
  | 'futuristic'
  // register
  | 'elegant'
  | 'luxury'
  | 'bold'
  | 'playful'
  // form
  | 'organic'
  | 'geometric'
  | 'brutalist'
  // discipline
  | 'editorial'
  | 'technical'
  | 'corporate'
  | 'artisanal';

export interface VisualStyle {
  descriptors?: StyleDescriptor[];
  cornerStyle?: 'sharp' | 'soft' | 'rounded' | 'pill';
  density?: 'tight' | 'balanced' | 'airy';
  contrast?: 'low' | 'medium' | 'high';
  imageryStyle?: 'photographic' | 'illustrated' | 'abstract' | 'mixed' | 'none';
  motion?: 'still' | 'subtle' | 'expressive';
}

/**
 * Core brand rules — the MACHINE-CHECKABLE subset only.
 *
 * Narrative do/don'ts stay on `Voice`; this holds what a validator can actually
 * enforce. Deliberately not a rules ENGINE: there is no expression language and
 * no evaluation order, just typed constraints the product can check today.
 */
export type LogoProhibition = 'stretch' | 'recolor' | 'rotate' | 'outline' | 'shadow';

export interface BrandRules {
  logo?: {
    minSizePx?: number;
    clearSpaceRatio?: number;
    allowedBackgrounds?: Array<'light' | 'dark' | 'brand' | 'photo'>;
    prohibited?: LogoProhibition[];
  };
  color?: {
    /** Pairs that must never sit on each other, as [hexA, hexB]. */
    neverPair?: Array<[string, string]>;
    requireContrastRatio?: number;
  };
  type?: {
    minBodySizePx?: number;
    allowedWeights?: number[];
  };
  voice?: {
    avoidTerms?: string[];
    preferTerms?: string[];
  };
}

/**
 * Positioning / audience essentials, structured.
 *
 * `Strategy.positioning` (a sentence) and `Strategy.targetAudience` (a sentence)
 * remain and are the migration source; they become read-compatibility inputs
 * once this is populated. Competitors are LABELS ONLY — this is not a CRM and
 * gains no entity system.
 */
export interface Positioning {
  category?: string;
  differentiator?: string;
  audiences?: Array<{
    label: string;
    descriptor?: string;
    priority: 'primary' | 'secondary';
  }>;
  competitors?: Array<{ name: string; note?: string }>;
}

/**
 * The complete, typed brand identity — everything a brand IS. Value objects are
 * owned by this aggregate; each concept has exactly one authoritative copy with
 * no writable mirror.
 *
 * The three optional subsystems are additive: every existing consumer reads
 * colors/logos/typography/strategy/voice exactly as before.
 */
export interface BrandIdentity {
  colors: ColorSystem;
  logos: LogoSystemRefs;
  typography: TypographySystem;
  strategy: Strategy;
  voice: Voice;
  visualStyle?: VisualStyle;
  rules?: BrandRules;
  positioning?: Positioning;
}

/**
 * Business Info — reusable company facts. A DISTINCT concept from Brand Core
 * DNA (it is what the business IS, not what the brand LOOKS AND SOUNDS like),
 * which is why it sits beside `identity` rather than inside it.
 *
 * Every field is optional: an incomplete Business Info must never block
 * creation. Consumers (business card / letterhead / email signature / invoice
 * renderers) and its zod schema arrive with the Business Info phase; the type
 * exists now so the legacy boundary can carry it losslessly.
 */
export interface BusinessInfo {
  legalName?: string;
  displayName?: string;
  tagline?: string;
  description?: string;
  industry?: string;
  foundedYear?: number;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    };
  };
  links?: Array<{
    kind:
      | 'website'
      | 'linkedin'
      | 'instagram'
      | 'x'
      | 'facebook'
      | 'youtube'
      | 'tiktok'
      | 'other';
    url: string;
    label?: string;
  }>;
  audienceSummary?: string;
}

/**
 * Canonical Brand aggregate root. Assets, Documents, Guidelines, Presentations
 * are SEPARATE lifecycle entities that *reference* a brand — they are not part
 * of this aggregate (Owner Decision 3, docs/target-architecture/05).
 */
export interface CanonicalBrand {
  id: string;
  slug: string;
  name: string;
  identity: BrandIdentity;
  /**
   * Authority + provenance for each Core value, keyed by `CoreFieldPath`.
   *
   * A SIDECAR rather than a wrapper around each value: every existing reader of
   * `identity.colors.primary.hex` keeps working untouched. Absent entries
   * resolve to a documented default (see `coreMeta.ts`), so this is always
   * safe to read and never required to write.
   */
  identityMeta?: import('./coreMeta').IdentityMeta;
  /** Reusable company facts — a distinct concept from Core DNA. */
  businessInfo?: BusinessInfo;
  isPublic: boolean;
  publicUrl?: string;
  /** Explicit stored schema version — no re-derivation on read. */
  identitySchemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
