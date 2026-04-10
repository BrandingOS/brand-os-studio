/**
 * Built-in business card templates — variable-based.
 *
 * Every color, font, and text field is bound to either a brand variable
 * or a content variable. When applied to a brand, they auto-adapt.
 */
import type { TemplateDefinition } from '../types';

const CARD = { width: 1050, height: 600, orientation: 'landscape' as const };

const CONTENT_VARS = [
  { path: 'content.fullName',  label: 'Full Name',  type: 'text' as const, defaultValue: 'Jane Smith',       source: 'content' as const, group: 'Contact' },
  { path: 'content.jobTitle',  label: 'Job Title',  type: 'text' as const, defaultValue: 'Vice President',   source: 'content' as const, group: 'Contact' },
  { path: 'content.email',     label: 'Email',      type: 'text' as const, defaultValue: 'jane@company.com', source: 'content' as const, group: 'Contact' },
  { path: 'content.phone',     label: 'Phone',      type: 'text' as const, defaultValue: '+1 234 56789',     source: 'content' as const, group: 'Contact' },
  { path: 'content.website',   label: 'Website',    type: 'text' as const, defaultValue: 'www.company.com',  source: 'content' as const, group: 'Contact' },
];

export const BUSINESS_CARD_TEMPLATES: TemplateDefinition[] = [
  // 1. Classic Clean
  {
    id: 'vt-bc-classic-clean',
    version: 1,
    meta: { name: 'Classic Clean', type: 'business-card', category: 'Minimalist', tags: ['clean', 'professional', 'minimal'] },
    canvas: CARD,
    pages: [{
      id: 'front',
      background: { type: 'solid', value: '#ffffff' },
      elements: [
        { id: 'logo', type: 'logo', position: { x: 6, y: 8 }, size: { width: 20, height: 12 }, variant: 'full', src: '{{brand.logo}}', adaptToBackground: false },
        { id: 'name', type: 'text', position: { x: 6, y: 40 }, size: { width: 88, height: 10 },
          content: '{{content.fullName}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 22, fontWeight: 600, color: '#1a1a1a' } },
        { id: 'title', type: 'text', position: { x: 6, y: 52 }, size: { width: 88, height: 7 },
          content: '{{content.jobTitle}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 14, fontWeight: 400, color: '{{brand.colors.primary}}' } },
        { id: 'email', type: 'text', position: { x: 6, y: 70 }, size: { width: 45, height: 5 },
          content: '{{content.email}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 11, color: '#666666' } },
        { id: 'phone', type: 'text', position: { x: 6, y: 78 }, size: { width: 45, height: 5 },
          content: '{{content.phone}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 11, color: '#666666' } },
        { id: 'website', type: 'text', position: { x: 55, y: 70 }, size: { width: 40, height: 5 },
          content: '{{content.website}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 11, color: '#666666', textAlign: 'right' } },
        { id: 'accent', type: 'shape', position: { x: 0, y: 93 }, size: { width: 100, height: 7 },
          shape: 'rect', style: { fill: '{{brand.colors.primary}}' } },
      ],
    }],
    variables: CONTENT_VARS,
  },

  // 2. Bold Gradient
  {
    id: 'vt-bc-bold-gradient',
    version: 1,
    meta: { name: 'Bold Gradient', type: 'business-card', category: 'Bold', tags: ['gradient', 'bold', 'modern'] },
    canvas: CARD,
    pages: [{
      id: 'front',
      background: { type: 'gradient', value: '{{brand.colors.primary}}', gradientTo: '{{brand.colors.secondary}}', gradientAngle: 135 },
      elements: [
        { id: 'logo', type: 'logo', position: { x: 6, y: 8 }, size: { width: 18, height: 12 }, variant: 'full', src: '{{brand.logo.light}}', adaptToBackground: true },
        { id: 'name', type: 'text', position: { x: 6, y: 45 }, size: { width: 88, height: 12 },
          content: '{{content.fullName}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 26, fontWeight: 700, color: '#ffffff' } },
        { id: 'title', type: 'text', position: { x: 6, y: 58 }, size: { width: 88, height: 7 },
          content: '{{content.jobTitle}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 14, color: 'rgba(255,255,255,0.8)' } },
        { id: 'divider', type: 'divider', position: { x: 6, y: 70 }, size: { width: 30, height: 1 },
          style: { color: 'rgba(255,255,255,0.4)', thickness: 1 } },
        { id: 'email', type: 'text', position: { x: 6, y: 76 }, size: { width: 50, height: 5 },
          content: '{{content.email}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 11, color: 'rgba(255,255,255,0.7)' } },
        { id: 'phone', type: 'text', position: { x: 6, y: 84 }, size: { width: 50, height: 5 },
          content: '{{content.phone}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 11, color: 'rgba(255,255,255,0.7)' } },
      ],
    }],
    variables: CONTENT_VARS,
  },

  // 3. Dark Elegant
  {
    id: 'vt-bc-dark-elegant',
    version: 1,
    meta: { name: 'Dark Elegant', type: 'business-card', category: 'Elegant', tags: ['dark', 'elegant', 'luxury'] },
    canvas: CARD,
    pages: [{
      id: 'front',
      background: { type: 'solid', value: '#0a0a0f' },
      elements: [
        { id: 'accent-line', type: 'shape', position: { x: 6, y: 8 }, size: { width: 15, height: 0.5 },
          shape: 'rect', style: { fill: '{{brand.colors.primary}}' } },
        { id: 'brand-name', type: 'text', position: { x: 6, y: 14 }, size: { width: 50, height: 7 },
          content: '{{brand.name}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 12, fontWeight: 500, color: '{{brand.colors.primary}}', textTransform: 'uppercase', letterSpacing: 3 } },
        { id: 'name', type: 'text', position: { x: 6, y: 42 }, size: { width: 88, height: 12 },
          content: '{{content.fullName}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 24, fontWeight: 600, color: '#ffffff' } },
        { id: 'title', type: 'text', position: { x: 6, y: 56 }, size: { width: 88, height: 7 },
          content: '{{content.jobTitle}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 13, color: 'rgba(255,255,255,0.5)' } },
        { id: 'email', type: 'text', position: { x: 6, y: 76 }, size: { width: 45, height: 5 },
          content: '{{content.email}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 10, color: 'rgba(255,255,255,0.4)' } },
        { id: 'phone', type: 'text', position: { x: 55, y: 76 }, size: { width: 40, height: 5 },
          content: '{{content.phone}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right' } },
        { id: 'bottom-accent', type: 'shape', position: { x: 0, y: 95 }, size: { width: 100, height: 5 },
          shape: 'rect', style: { fill: '{{brand.colors.primary}}', opacity: 0.3 } },
      ],
    }],
    variables: CONTENT_VARS,
  },
];
