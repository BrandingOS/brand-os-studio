export type BrandMood =
  | 'warm'
  | 'cool'
  | 'neutral'
  | 'vibrant'
  | 'muted'
  | 'pastel'
  | 'dark'
  | 'earthy';

export type PricePoint = 'budget' | 'mid-range' | 'premium' | 'luxury';

export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '55+' | 'all-ages';

export type BrandTone =
  | 'casual'
  | 'professional'
  | 'friendly'
  | 'authoritative'
  | 'playful';

export type VisualStyle =
  | 'minimalist'
  | 'modern'
  | 'playful'
  | 'elegant'
  | 'bold'
  | 'organic';

export type LogoStyle = 'wordmark' | 'monogram' | 'symbol';

export interface GeneratedBrand {
  name: string;
  tagline: string;
  description: string;
  industry: string;
  audience: {
    shortDescription: string;
    ageRange: AgeRange;
    pricePoint: PricePoint;
  };
  voice: {
    traits: [string, string, string];
    tone: BrandTone;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutrals: string[];
    mood: BrandMood;
  };
  fonts: {
    heading: string;
    body: string;
    style: string;
  };
  logoConcept: {
    style: LogoStyle;
    description: string;
  };
  personality: {
    values: [string, string, string];
    visualStyle: VisualStyle;
  };
}

export type OnboardingBrandStage = 'prompt' | 'reveal' | 'remix';

export interface OnboardingBrandState {
  stage: OnboardingBrandStage;
  userPrompt: string;
  variations: GeneratedBrand[];
  selectedIndex: number;
  isGenerating: boolean;
  error: string | null;
}
