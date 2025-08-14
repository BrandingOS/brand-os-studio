export interface Brand {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  fonts: {
    primary: string;
    secondary?: string;
  };
  tone: string;
  audience: string;
  strategy?: string;
  guidelines?: BrandGuidelines;
  assets: Asset[];
  createdAt: Date;
  updatedAt: Date;
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
  type: 'image' | 'font' | 'logo' | 'document' | 'icon' | 'template';
  category: 'logo' | 'color' | 'typography' | 'icon' | 'stationery' | 'social' | 'application';
  url: string;
  size: number;
  tags: string[];
  metadata?: {
    dimensions?: { width: number; height: number };
    format?: string;
    colorMode?: string;
  };
  createdAt: Date;
}

export interface CreateBrandInput {
  name: string;
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