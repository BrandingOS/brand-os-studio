// Enums for the logo-maker flow. Values align with spec §3.4.
//
// Industry and Vibe `value`s are URL-safe slugs so they can round-trip
// through the Zustand store, query params, and the AI prompt without
// additional encoding. Labels are the human-facing strings.

import type { CreationMode, Industry, Vibe } from './state/types';

export interface ModeSpec {
  id: CreationMode;
  label: string;
  description: string;
  meta: string;
  badge?: string;
  iconName: 'sparkles' | 'grid' | 'pen-tool' | 'upload';
  shortcut: '1' | '2' | '3' | '4';
}

export const MODES: ModeSpec[] = [
  {
    id: 'ai',
    label: 'AI magic',
    description: 'Describe your brand, get 30+ options in seconds. Edit anything.',
    meta: '~60 seconds · No design skills needed',
    badge: 'Recommended',
    iconName: 'sparkles',
    shortcut: '1',
  },
  {
    id: 'wizard',
    label: 'Guided wizard',
    description: 'Step-by-step with smart suggestions. Pick industry, style, colors, icons.',
    meta: '~5 minutes · Most control over output',
    iconName: 'grid',
    shortcut: '2',
  },
  {
    id: 'canvas',
    label: 'Blank canvas',
    description: 'Design from scratch. Full SVG editor with shapes, text, icons, grids.',
    meta: 'For designers · Export SVG/PNG/PDF',
    iconName: 'pen-tool',
    shortcut: '3',
  },
  {
    id: 'upload',
    label: 'I have a logo',
    description: 'Upload existing logo → AI vectorizes, cleans, variants, brand kit.',
    meta: 'PNG, JPG, SVG · Auto-vectorize included',
    iconName: 'upload',
    shortcut: '4',
  },
];

interface IndustrySpec {
  value: Industry;
  label: string;
}

export const INDUSTRIES: IndustrySpec[] = [
  { value: 'saas-tech', label: 'SaaS / Tech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'food-beverage', label: 'Food & Beverage' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'health-wellness', label: 'Health & Wellness' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'creative-agency', label: 'Creative Agency' },
  { value: 'media-publishing', label: 'Media & Publishing' },
  { value: 'travel', label: 'Travel' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'legal', label: 'Legal' },
  { value: 'construction', label: 'Construction' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'pets', label: 'Pets' },
  { value: 'children-family', label: 'Children & Family' },
  { value: 'religion-spiritual', label: 'Religion & Spiritual' },
  { value: 'sports', label: 'Sports' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'crypto-web3', label: 'Crypto & Web3' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'other', label: 'Other' },
];

interface VibeSpec {
  value: Vibe;
  label: string;
}

export const VIBES: VibeSpec[] = [
  { value: 'modern', label: 'Modern' },
  { value: 'bold', label: 'Bold' },
  { value: 'playful', label: 'Playful' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'organic', label: 'Organic' },
  { value: 'retro', label: 'Retro' },
  { value: 'futuristic', label: 'Futuristic' },
  { value: 'handcrafted', label: 'Handcrafted' },
  { value: 'geometric', label: 'Geometric' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'edgy', label: 'Edgy' },
];

export const MAX_VIBES = 3;
export const MIN_VIBES = 1;

export const DESCRIPTION_MIN_CHARS_AI = 60;
export const DESCRIPTION_MAX_CHARS = 400;
export const NAME_MIN_CHARS = 2;
export const NAME_MAX_CHARS = 40;
// Letters (Unicode), numbers, spaces, hyphens, ampersand, period — the common set.
export const NAME_PATTERN = /^[\p{L}\p{N}\s\-&.]+$/u;
