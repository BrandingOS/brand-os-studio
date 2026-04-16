// Logo-maker flow types. See docs/logo-maker/LOGO_MAKER_SPEC.md §2.3.
// Kept intentionally minimal in Phase 0 — fleshed out in Phase 1.

export type CreationMode = 'ai' | 'wizard' | 'canvas' | 'upload';

export type Industry =
  | 'saas-tech' | 'ecommerce' | 'food-beverage' | 'fashion' | 'health-wellness'
  | 'fitness' | 'beauty' | 'real-estate' | 'finance' | 'education'
  | 'consulting' | 'creative-agency' | 'media-publishing' | 'travel' | 'hospitality'
  | 'entertainment' | 'nonprofit' | 'legal' | 'construction' | 'manufacturing'
  | 'automotive' | 'pets' | 'children-family' | 'religion-spiritual' | 'sports'
  | 'gaming' | 'crypto-web3' | 'sustainability' | 'logistics' | 'other';

export type Vibe =
  | 'modern' | 'bold' | 'playful' | 'luxury' | 'minimal' | 'organic'
  | 'retro' | 'futuristic' | 'handcrafted' | 'geometric' | 'elegant' | 'edgy';

export type LogoConceptType = 'wordmark' | 'icon_text' | 'monogram' | 'emblem';

export interface LogoConcept {
  id: string;
  type: LogoConceptType;
  prompt: string;
  styleNotes: string;
  colorStrategy: 'single color' | 'duotone' | 'gradient' | 'monochrome';
  imageUrl?: string;
  svg?: string;
}

export interface Brief {
  name: string;
  tagline: string;
  description: string;
  industry: Industry | null;
  vibes: Vibe[];
  competitorUrl?: string;
}

export interface BrandKit {
  guidelinesPdfUrl?: string;
  socialProfiles?: Record<string, string>;
  mockups?: { id: string; url: string; label: string }[];
}
