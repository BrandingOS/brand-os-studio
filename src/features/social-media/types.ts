export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest';

export type PostFormat = 'post' | 'story' | 'cover' | 'reel' | 'profile' | 'banner' | 'pin';

export interface SocialMediaSize {
  platform: SocialPlatform;
  format: PostFormat;
  label: string;
  width: number;
  height: number;
}

export interface SocialTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  platforms: SocialPlatform[];
  formats: PostFormat[];
  thumbnail: string;
  layout: TemplateLayout;
  tags: string[];
  isPro: boolean;
}

export type TemplateCategory =
  | 'quote'
  | 'announcement'
  | 'promotion'
  | 'product'
  | 'event'
  | 'tips'
  | 'stats'
  | 'team'
  | 'testimonial'
  | 'minimal'
  | 'bold'
  | 'gradient'
  | 'photo'
  | 'carousel';

export interface TemplateLayout {
  background: LayoutBackground;
  elements: LayoutElement[];
}

export interface LayoutBackground {
  type: 'solid' | 'gradient' | 'image' | 'brand-primary' | 'brand-secondary';
  value: string;
  opacity?: number;
}

export interface LayoutElement {
  type: 'text' | 'logo' | 'shape' | 'image' | 'divider';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content?: string;
  style?: Record<string, string>;
  brandAware?: boolean;
}

export interface SocialDesign {
  id: string;
  templateId: string;
  brandId: string;
  platform: SocialPlatform;
  format: PostFormat;
  content: DesignContent;
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignContent {
  headline?: string;
  body?: string;
  cta?: string;
  imageUrl?: string;
  backgroundOverride?: string;
  colorOverrides?: Record<string, string>;
}
