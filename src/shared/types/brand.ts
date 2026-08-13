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
  };
  createdAt: Date;
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