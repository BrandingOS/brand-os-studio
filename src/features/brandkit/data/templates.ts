import type { BrandKitTemplate, AnimationConfig, LogoFileVariant } from '../types';

export const LOGO_VARIANTS: LogoFileVariant[] = [
  {
    id: 'regular',
    name: 'Regular',
    description: 'Primary logo on white background',
    bgColor: '#ffffff',
  },
  {
    id: 'inverse',
    name: 'Inverse',
    description: 'Logo on brand color background',
    bgColor: 'brand-primary',
    invertLogo: true,
  },
  {
    id: 'black',
    name: 'Black',
    description: 'Single-color black logo',
    bgColor: '#ffffff',
    logoFilter: 'grayscale(100%) brightness(0)',
  },
  {
    id: 'white',
    name: 'White',
    description: 'White logo on dark background',
    bgColor: '#1a1a2e',
    logoFilter: 'grayscale(100%) brightness(100)',
    invertLogo: true,
  },
];

export const ANIMATIONS: AnimationConfig[] = [
  { id: 'slide-in', name: 'Slide In', type: 'intro', cssAnimation: 'slideInFromLeft', duration: '0.8s' },
  { id: 'fade-in', name: 'Fade In', type: 'intro', cssAnimation: 'fadeIn', duration: '1s' },
  { id: 'scale-up', name: 'Scale Up', type: 'intro', cssAnimation: 'scaleUp', duration: '0.6s' },
  { id: 'bounce-in', name: 'Bounce In', type: 'intro', cssAnimation: 'bounceIn', duration: '0.8s' },
  { id: 'slide-loop', name: 'Slide Loop', type: 'looping', cssAnimation: 'slideLoop', duration: '2s' },
  { id: 'pulse', name: 'Pulse', type: 'looping', cssAnimation: 'pulse', duration: '1.5s' },
  { id: 'rotate', name: 'Rotate', type: 'looping', cssAnimation: 'rotate360', duration: '3s' },
  { id: 'float', name: 'Float', type: 'looping', cssAnimation: 'float', duration: '2s' },
  { id: 'slide-out', name: 'Slide Out', type: 'outro', cssAnimation: 'slideOutRight', duration: '0.8s' },
  { id: 'fade-out', name: 'Fade Out', type: 'outro', cssAnimation: 'fadeOut', duration: '1s' },
  { id: 'scale-down', name: 'Scale Down', type: 'outro', cssAnimation: 'scaleDown', duration: '0.6s' },
  { id: 'zoom-out', name: 'Zoom Out', type: 'outro', cssAnimation: 'zoomOut', duration: '0.8s' },
];

function generateTemplates(
  type: string,
  categories: string[],
  count: number,
  orientation: 'landscape' | 'portrait' | 'square'
): BrandKitTemplate[] {
  const names: Record<string, string[]> = {
    'brand-guides': ['Simple', 'Simple Gradient', 'Bold Minimalism', 'Noise Gradients', 'Clean Modern', 'Geometric Lines', 'Swiss Style', 'Typographic', 'Nature Blend', 'Elegant Mono'],
    'profile-icons': ['Circle Standard', 'Rounded Square', 'Circle Transparent', 'Square Flat', 'Circle Gradient', 'Rounded Minimal', 'Circle Bold', 'Square Pattern', 'Circle Outline', 'Rounded Shadow', 'Circle Inverse', 'Square Inverse'],
    'business-cards': ['Classic Clean', 'Bold Gradient', 'Lux Gold', 'Minimalist Edge', 'Modern Geo', 'Vintage Craft', 'Photo Blend', 'Bold Stripe', 'Pixel Grid', 'Neo Brutalist', 'Tarot Style', 'Dark Elegant'],
    'facebook-covers': ['Wide Gradient', 'Minimal Banner', 'Bold Statement', 'Modern Wave', 'Photo Blend', 'Geometric Band', 'Vintage Strip', 'Neo Pattern'],
    'instagram-posts': ['Tech Grid', 'Fashion Frame', 'Sport Action', 'Minimal Quote', 'Bold Statement', 'Food Mood', 'Real Estate', 'Neo Pattern', 'Photo Filter', 'Gradient Card'],
    'instagram-stories': ['Story Minimal', 'Story Bold', 'Story Gradient', 'Story Photo', 'Story Modern', 'Story Vintage', 'Story Neo', 'Story Text'],
    'presentations': ['Corporate Clean', 'Bold Deck', 'Natural Flow', 'Minimalist Slides', 'Modern Pitch', 'Vintage Report', 'Neo Presentation', 'Creative Portfolio'],
    'invoices': ['Clean Invoice', 'Bold Invoice', 'Minimalist Bill', 'Modern Statement', 'Vintage Receipt', 'Neo Invoice', 'Corporate Bill', 'Elegant Statement'],
    'mockups': ['Phone Screen', 'T-Shirt Front', 'Laptop Screen', 'Business Card Stack', 'Poster Frame', 'Mug Design', 'Tote Bag', 'Billboard', 'App Interface', 'Stationery Set'],
  };

  const typeNames = names[type] || Array.from({ length: count }, (_, i) => `Template ${i + 1}`);

  return typeNames.slice(0, count).map((name, i) => ({
    id: `${type}-${i + 1}`,
    name,
    category: categories[i % categories.length] || 'All',
    type: type as BrandKitTemplate['type'],
    orientation,
    tags: [type, categories[i % categories.length] || 'general'].filter(Boolean),
  }));
}

export const TEMPLATE_LIBRARY: Record<string, BrandKitTemplate[]> = {
  'brand-guides': generateTemplates('brand-guides', ['Minimalist', 'Maximalist', 'Bold', 'Natural', 'Modern', 'Minimalist'], 10, 'landscape'),
  'profile-icons': generateTemplates('profile-icons', ['Regular', 'Transparent', 'Inverse', 'Rounded', 'Regular', 'Transparent'], 12, 'square'),
  'business-cards': generateTemplates('business-cards', ['Minimalist', 'Gradient', 'Lux', 'Minimalist', 'Modern', 'Vintage', 'Bold', 'Bold', 'Modern', 'Bold', 'Lux', 'Minimalist'], 12, 'landscape'),
  'facebook-covers': generateTemplates('facebook-covers', ['Maximalist', 'Minimalist', 'Bold', 'Modern', 'Modern', 'Minimalist', 'Vintage', 'Bold'], 8, 'landscape'),
  'instagram-posts': generateTemplates('instagram-posts', ['Tech', 'Fashion', 'Sport', 'Minimalist', 'Bold', 'Food', 'Minimalist', 'Bold', 'Modern', 'Maximalist'], 10, 'square'),
  'instagram-stories': generateTemplates('instagram-stories', ['Minimalist', 'Bold', 'Maximalist', 'Modern', 'Modern', 'Vintage', 'Bold', 'Minimalist'], 8, 'portrait'),
  'presentations': generateTemplates('presentations', ['Minimalist', 'Bold', 'Natural', 'Minimalist', 'Modern', 'Vintage', 'Bold', 'Maximalist'], 8, 'landscape'),
  'invoices': generateTemplates('invoices', ['Minimalist', 'Bold', 'Minimalist', 'Modern', 'Vintage', 'Bold', 'Minimalist', 'Maximalist'], 8, 'portrait'),
  'mockups': generateTemplates('mockups', ['Devices', 'Apparel', 'Devices', 'Print', 'Print', 'Print', 'Apparel', 'Environment', 'Devices', 'Print'], 10, 'landscape'),
};

export function getTemplatesForModule(moduleType: string): BrandKitTemplate[] {
  return TEMPLATE_LIBRARY[moduleType] || [];
}

export function filterTemplatesByCategory(templates: BrandKitTemplate[], category: string): BrandKitTemplate[] {
  if (category === 'All') return templates;
  return templates.filter(t => t.category === category);
}
