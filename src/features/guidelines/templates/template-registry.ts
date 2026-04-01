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
    default:
      return MinimalTemplate;
  }
};