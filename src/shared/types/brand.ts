import type {
  BrandAsset,
  ColorSystem,
  LogoSystemRefs,
  TypographySystem,
} from './brandAssets';
import type { BrandIdentity } from '@/domain/brand/identity';
import type { Typescale } from './typescale';
import type { DeckKind, PresentationTheme } from '@/shared/presentation/theme/types';
import type { Deck as DeckV2 } from '@/shared/presentation/v2/types';

export interface Brand {
  id: string;
  slug: string;
  name: string;

  // ─── v3 unified fields ─────────────────────────────────────────────
  /** Schema version — present on migrated brands. Absent = pre-v3 legacy. */
  schemaVersion?: number;
  /** Canonical logo system — references into `assets[]` by id. */
  logoSystem?: LogoSystemRefs;
  /** Canonical color system — collapses primaryColor + guidelines.colorPalette. */
  colorSystem?: ColorSystem;
  /** Canonical typography — collapses fonts + guidelines.typography. */
  typography?: TypographySystem;
  /** Structured typescale (fonts + multi-surface ladders + semantic map). */
  typescale?: Typescale;
  /** Canonical brand asset library. Includes logos, images, fonts, docs. */
  brandAssets?: BrandAsset[];
  /**
   * Canonical identity blob (migration 013 `brands.identity` column, or the
   * localStorage snapshot for guests). Written one-way by the canonical write
   * path (`toLegacyBrandPatch`) and read by `fromLegacyBrand` to recover the
   * fields that have NO legacy column home — accent/neutrals, numeric font
   * weights, and rich voice. Absent on brands never touched by a canonical
   * write; those fall back to the legacy-derived identity. */
  identity?: BrandIdentity;
  /** Schema version of the stored `identity` blob. */
  identitySchemaVersion?: number;
  /**
   * Brand Core DNA authority/provenance sidecar (migration 016
   * `brands.identity_meta`). A map keyed by CoreFieldPath — see
   * `src/domain/brand/coreMeta.ts`. Typed loosely here because the legacy
   * `Brand` type is the transport shape, not the domain: `fromLegacyBrand`
   * sanitizes it against the closed path registry on read.
   */
  identityMeta?: Record<string, unknown>;
  /**
   * Reusable company facts (migration 016 `brands.business_info`). A concept
   * distinct from Core DNA; carried here so the legacy boundary round-trips it
   * losslessly.
   */
  businessInfo?: import('@/domain/brand/identity').BusinessInfo;
  /**
   * Onboarding progress (migration 022 `brands.onboarding`, spec 002).
   *
   * Absent means the brand was not created by onboarding — every brand that
   * predates 002 — and is treated as finished. See
   * `src/shared/onboarding/onboardingState.ts`, which is the only module that
   * interprets this shape.
   */
  onboarding?: import('@/shared/onboarding/onboardingState').OnboardingState;

  // ─── Legacy fields (read-only from v3 onward) ──────────────────────
  // Kept for back-compat with existing consumers; new writes should target
  // the v3 fields above. Derived getters may populate these at read time.
  /** @deprecated use logoSystem.primary via useBrandLogo('primary') */
  logo?: string;
  /** @deprecated use logoSystem */
  logoAssets?: BrandLogoAssets;
  /** @deprecated use colorSystem.primary.hex */
  primaryColor: string;
  /** @deprecated use colorSystem.secondary?.hex */
  secondaryColor?: string;
  /** @deprecated use typography.primary.family */
  fonts: {
    primary: string;
    secondary?: string;
  };

  tone: string;
  audience: string;
  strategy?: string;
  guidelines?: BrandGuidelines;
  /**
   * Brand Board UI-style snapshot. Written by the Brand Board editor on
   * Save so radius/shadow/spacing/weight choices survive page refresh.
   * Optional — a brand that was never opened in Brand Board has no
   * entry here and the editor falls back to defaults.
   */
  uiStyle?: BrandUIStyle;
  /**
   * WRITE CARRIER for `visualStyle.descriptors` — the brand's style words.
   *
   * Same arrangement as `guidelines.strategy.summary`: the value is canonical
   * (`identity.visualStyle`) with no legacy column, and this lets a surface
   * that patches through `brandStore.update` reach `changeBrandVisualStyle`.
   * Routed, so it never reaches the service as a stored field.
   */
  visualStyle?: { descriptors?: string[] };
  /** Extra brand colors chosen in Brand Board beyond primary/secondary. */
  accentColor?: string;
  /** Six neutral shades (lightest → darkest) generated from primary hue. */
  neutrals?: string[];
  /** @deprecated use brandAssets (v3) */
  assets: Asset[];
  /** Per-deck Customize theme overrides. Each deck kind owns its own theme; brand typescale + brandPalette are the defaults when an override is undefined. */
  presentationThemes?: Partial<Record<DeckKind, PresentationTheme>>;
  /** v2 decks — Deck OS instances built from templates (Pitch Deck,
   *  Quarterly Review, etc.). Each is a typed-data Deck object the
   *  v2 engine renders. The v1 `presentationThemes` field continues
   *  to drive the legacy /pitch-deck route until Phase 4 migration. */
  decks?: DeckV2[];
  isPublic?: boolean;
  publicUrl?: string;
  customDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandUIStyle {
  borderRadius: number;
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'bold';
  spacing: 'compact' | 'comfortable' | 'spacious';
  weight: 'light' | 'regular' | 'bold';
}

/** Logo assets for different use cases */
export interface BrandLogoAssets {
  /** Full logo (icon + wordmark combined) */
  full?: string;
  /** Icon/symbol only (for favicons, app icons, small spaces) */
  icon?: string;
  /** Text/wordmark only */
  wordmark?: string;
  /** Alternate version (horizontal, stacked, etc.) */
  alternate?: string;
  /** Monochrome/dark version */
  dark?: string;
  /** Light/white version for dark backgrounds */
  light?: string;
}

export interface BrandGuidelines {
  strategy?: BrandStrategy;
  /** Free-form About sections captured at onboarding (Mission, Vision,
   *  custom headings like "Brand Promise", …). The canonical strategy
   *  fields above stay the queryable subset; this preserves everything
   *  the user wrote so Setup/About can render it all. */
  aboutSections?: Array<{ id: string; title: string; content: string }>;
  logoSystem?: LogoSystem;
  colorPalette?: ExtendedColorPalette;
  typography?: ExtendedTypography;
  voiceAndTone?: VoiceAndTone;
  iconography?: Iconography;
  socialMedia?: SocialMediaSpecs;
  stationery?: Stationery;
  applications?: BrandApplications;
  language?: LanguageSpecs;
}

export interface BrandStrategy {
  mission: string;
  vision: string;
  values: string[];
  positioning: string;
  personality: string[];
  targetAudience: string;
  /**
   * WRITE CARRIER for `strategy.summary`, which has no legacy home.
   *
   * `summary` is canonical-only — it lives in the identity blob and is read
   * from there. This field exists so a surface that patches through
   * `brandStore.update` can carry it to `changeBrandStrategy`, the same way
   * mission and the rest travel under `guidelines.strategy`. Never persisted
   * as part of the mirror: `splitCorePatch` routes the whole key and it never
   * reaches the service.
   */
  summary?: string;
}

export interface LogoSystem {
  primary: LogoVariant;
  /**
   * Non-primary roles are OPTIONAL. Brand seeds and user uploads should
   * leave a role unset rather than aliasing it to the primary URL — a
   * "wordmark" entry pointing at the same image as primary just creates
   * lookalike duplicates everywhere the variants are surfaced. The
   * `dedupeLogoSystem` helper enforces this on read/migration.
   */
  secondary?: LogoVariant;
  wordmark?: LogoVariant;
  iconmark?: LogoVariant;
  blackVersion?: LogoVariant;
  whiteVersion?: LogoVariant;
  clearSpace: string;
  minSize: string;
  usage: LogoUsageRule[];
}

export interface LogoVariant {
  url: string;
  description: string;
  usage: string;
}

export interface LogoUsageRule {
  do: string;
  dont: string;
  example?: string;
}

export interface ExtendedColorPalette {
  primary: ColorDefinition;
  secondary?: ColorDefinition;
  accent?: ColorDefinition;
  neutral: ColorDefinition[];
  semantic: {
    success: ColorDefinition;
    warning: ColorDefinition;
    error: ColorDefinition;
    info: ColorDefinition;
  };
}

export interface ColorDefinition {
  hex: string;
  rgb: string;
  cmyk: string;
  pantone?: string;
  name: string;
  usage: string;
}

export interface ExtendedTypography {
  primary: FontDefinition;
  secondary?: FontDefinition;
  accent?: FontDefinition;
  scale: FontScale;
  hierarchy: TypographyHierarchy;
}

export interface FontDefinition {
  family: string;
  weights: number[];
  fallbacks: string[];
  url?: string;
  usage: string;
}

export interface FontScale {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  body: string;
  bodyLarge: string;
  bodySmall: string;
  caption: string;
  overline: string;
}

export interface TypographyHierarchy {
  headings: TypographyRule[];
  body: TypographyRule[];
  ui: TypographyRule[];
}

export interface TypographyRule {
  element: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  usage: string;
}

export interface VoiceAndTone {
  brandVoice: string;
  toneAttributes: string[];
  communicationStyle: string;
  doAndDonts: {
    do: string[];
    dont: string[];
  };
  examples: VoiceExample[];
}

export interface VoiceExample {
  context: string;
  good: string;
  bad: string;
}

export interface Iconography {
  style: string;
  weight: string;
  cornerRadius: string;
  examples: IconExample[];
  usage: string;
}

export interface IconExample {
  category: string;
  icons: Array<{
    name: string;
    url: string;
    usage: string;
  }>;
}

export interface SocialMediaSpecs {
  platforms: SocialPlatform[];
  guidelines: string;
}

export interface SocialPlatform {
  name: string;
  profileImage: { width: number; height: number };
  coverImage: { width: number; height: number };
  postImage: { width: number; height: number };
  guidelines: string;
}

export interface Stationery {
  businessCard: StationeryItem;
  letterhead: StationeryItem;
  envelope: StationeryItem;
  presentation: StationeryItem;
}

export interface StationeryItem {
  description: string;
  specifications: string;
  template?: string;
  guidelines: string;
}

export interface BrandApplications {
  digital: ApplicationExample[];
  print: ApplicationExample[];
  packaging: ApplicationExample[];
  environmental: ApplicationExample[];
}

export interface ApplicationExample {
  name: string;
  description: string;
  image?: string;
  specifications: string;
  guidelines: string;
}

export interface LanguageSpecs {
  primary: string;
  secondary?: string[];
  direction: 'ltr' | 'rtl';
  localization: LocalizationRule[];
}

export interface LocalizationRule {
  language: string;
  adaptations: string[];
  examples: string[];
}

export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string;
  neutral: string[];
}

export interface Typography {
  primary: FontDefinition;
  secondary?: FontDefinition;
  scale: FontScale;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'font' | 'logo' | 'document' | 'icon' | 'template' | 'video' | 'reference';
  category: 'logo' | 'color' | 'typography' | 'icon' | 'stationery' | 'social' | 'application' | 'photo' | 'reference' | 'mockup';
  /** How the asset is stored */
  source: 'upload' | 'url' | 'embed';
  /** For upload: data URL or public path. For url/embed: the remote URL */
  url: string;
  size: number;
  tags: string[];
  metadata?: {
    dimensions?: { width: number; height: number };
    format?: string;
    colorMode?: string;
    /** Original filename for uploads */
    originalName?: string;
    /** For embed sources — keeps the link live/updated */
    embedUrl?: string;
    /**
     * Hash of the material, carried over from the staged `BrandAsset`.
     *
     * `stageAsset` de-duplicates by this: identical bytes resolve to the same
     * asset instead of a second copy. It has to survive the round trip, because
     * after a reload the only view of an asset is the Library projection — drop
     * it here and re-uploading the same image quietly creates a duplicate.
     */
    contentHash?: string;
    /** Bumped on each replacement; used for cache-busting downstream. */
    version?: number;
  };
  createdAt: Date;

  // ─── Brand Library (migration 017) ─────────────────────────────────
  // The Library is ONE home for every piece of brand-owned material —
  // uploads, generated media, and references alike. These fields are what
  // make an asset row a Library item rather than a bare file record. All
  // optional, so an asset created before 017 still satisfies the type.
  /** Where this material came from. */
  origin?: 'uploaded' | 'generated' | 'reference';
  /** Folder membership; null/undefined = unfiled. */
  folderId?: string | null;
  isFavorite?: boolean;
  /** Mutually exclusive with isFavorite (enforced by a DB CHECK). */
  isDisliked?: boolean;
  /** Eligible as AI creation context when true. */
  useAsReference?: boolean;
  /** Set = archived: hidden from default views, fully recoverable. */
  archivedAt?: Date | null;
  /**
   * Set = TOMBSTONED. The row survives as an inert lineage record (id, name,
   * origin) so saved work that referenced it never dangles. Not versioning:
   * there is no history and no restore.
   */
  deletedAt?: Date | null;
  /** Generation provenance for generative media (origin === 'generated'). */
  provenance?: AssetProvenance;
  /**
   * The pre-migration `brand.assets[]` / `brand.brandAssets[]` id, preserved so
   * logoSystem AssetRefs still resolve during convergence. Dropped once nothing
   * reads it.
   */
  legacyRefId?: string | null;
}

/**
 * Why a generated asset exists. Written once at creation and immutable except
 * for `relations`, which accrues as the asset is used.
 */
export interface AssetProvenance {
  kind: 'generated';
  prompt?: string;
  /** Library item ids used as references/inputs. */
  inputRefs?: string[];
  contextUsed?: {
    core?: string[];
    businessInfo?: boolean;
    contextSignals?: number;
  };
  model?: string;
  /** ISO timestamp. */
  generatedAt: string;
  relations?: {
    placedInDesignIds?: string[];
    derivedFromAssetId?: string;
  };
}

/** A per-brand organisational grouping of Library items. */
export interface BrandFolder {
  id: string;
  brandId: string;
  name: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandInput {
  name: string;
  slug?: string; // Optional, will be auto-generated if not provided
  workspaceId?: string; // Workspace to create brand in (uses personal workspace if omitted)
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  fonts: {
    primary: string;
    secondary?: string;
  };
  tone: string;
  audience: string;
}