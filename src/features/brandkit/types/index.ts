export interface BrandKitTemplate {
  id: string;
  name: string;
  category: string;
  type: BrandKitModuleType;
  thumbnailUrl?: string;
  previewUrls?: string[];
  orientation: 'landscape' | 'portrait' | 'square';
  tags: string[];
}

export interface SavedDesign {
  id: string;
  templateId: string;
  brandId: string;
  name: string;
  type: BrandKitModuleType;
  previewUrl?: string;
  customizations?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type BrandKitModuleType =
  | 'settings'
  | 'logo-files'
  | 'brand-guides'
  | 'profile-icons'
  | 'business-cards'
  | 'facebook-covers'
  | 'instagram-posts'
  | 'instagram-stories'
  | 'presentations'
  | 'animations'
  | 'qr-code'
  | 'invoices'
  | 'design-tool'
  | 'mockups';

export interface BrandKitModuleConfig {
  id: BrandKitModuleType;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  categories: string[];
  hasTabs: boolean;
  tabLabels?: { templates: string; saved: string; extra?: string };
  orientation: 'landscape' | 'portrait' | 'square' | 'mixed';
  comingSoon?: boolean;
}

export interface LogoFileVariant {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  logoFilter?: string;
  invertLogo?: boolean;
}

export interface QRCodeConfig {
  data: string;
  logoImage?: string;
  fillBackground: boolean;
  color: string;
  bwMode: boolean;
  size: number;
}

export interface AnimationConfig {
  id: string;
  name: string;
  type: 'looping' | 'intro' | 'outro';
  cssAnimation: string;
  duration: string;
}

export interface BrandKitColor {
  hex: string;
  role: string;
}
