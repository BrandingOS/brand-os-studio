import type {
  BrandAsset,
  ColorSystem,
  LogoSystemRefs,
  TypographySystem,
} from './brandAssets';

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
  /** Canonical brand asset library. Includes logos, images, fonts, docs. */
  brandAssets?: BrandAsset[];

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
  secondary?: LogoVariant;
  wordmark: LogoVariant;
  iconmark: LogoVariant;
  blackVersion: LogoVariant;
  whiteVersion: LogoVariant;
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