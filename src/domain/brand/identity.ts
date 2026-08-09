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
 * The complete, typed brand identity — everything a brand IS. Value objects are
 * owned by this aggregate; each concept has exactly one authoritative copy with
 * no writable mirror.
 */
export interface BrandIdentity {
  colors: ColorSystem;
  logos: LogoSystemRefs;
  typography: TypographySystem;
  strategy: Strategy;
  voice: Voice;
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
  isPublic: boolean;
  publicUrl?: string;
  /** Explicit stored schema version — no re-derivation on read. */
  identitySchemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
