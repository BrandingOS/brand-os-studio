import type { GuidelineTemplate } from '../types/guidelines';
import { MinimalTemplate } from './MinimalTemplate';
import { CorporateTemplate } from './CorporateTemplate';
import { CreativeTemplate } from './CreativeTemplate';
import { ModernTemplate } from './ModernTemplate';

export const GUIDELINE_TEMPLATES: GuidelineTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and modern template with plenty of white space',
    preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop',
    category: 'minimal',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional template suitable for enterprise brands',
    preview: 'https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&h=300&fit=crop',
    category: 'corporate',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold and artistic template for creative agencies',
    preview: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=300&fit=crop',
    category: 'creative',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary template with sleek design elements',
    preview: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop',
    category: 'modern',
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Fun and energetic for youth-focused brands',
    preview: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    category: 'Creative',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Refined and luxurious for premium brands',
    preview: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    category: 'Professional',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Strong and impactful for statement brands',
    preview: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400',
    category: 'Creative',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless and traditional for heritage brands',
    preview: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
    category: 'Professional',
  },
];

export const getTemplateById = (id: string): GuidelineTemplate | undefined => {
  return GUIDELINE_TEMPLATES.find(template => template.id === id);
};

export const getTemplateComponent = (templateId: string) => {
  switch (templateId) {
    case 'minimal':
      return MinimalTemplate;
    case 'corporate':
      return CorporateTemplate;
    case 'creative':
      return CreativeTemplate;
    case 'modern':
      return ModernTemplate;
    case 'playful':
      return CreativeTemplate;
    case 'elegant':
      return CorporateTemplate;
    case 'bold':
      return ModernTemplate;
    case 'classic':
      return MinimalTemplate;
    default:
      return MinimalTemplate;
  }
};