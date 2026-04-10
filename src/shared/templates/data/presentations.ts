/**
 * Built-in presentation templates — variable-based.
 * Multi-page templates with slide variants.
 */
import type { TemplateDefinition } from '../types';

const SLIDE = { width: 1920, height: 1080 };

const PRES_VARS = [
  { path: 'content.title', label: 'Presentation Title', type: 'text' as const, defaultValue: 'Quarterly Business Review', source: 'content' as const, group: 'Content' },
  { path: 'content.subtitle', label: 'Subtitle', type: 'text' as const, defaultValue: 'Q1 2026 — Confidential', source: 'content' as const, group: 'Content' },
  { path: 'content.section', label: 'Section Title', type: 'text' as const, defaultValue: 'Key Metrics', source: 'content' as const, group: 'Content' },
  { path: 'content.body', label: 'Body Text', type: 'text' as const, defaultValue: 'Performance summary for this quarter.', source: 'content' as const, group: 'Content' },
];

export const PRESENTATION_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'vt-pres-corporate',
    version: 1,
    meta: { name: 'Corporate Clean', type: 'presentation', category: 'Professional', tags: ['corporate', 'clean', 'pitch'] },
    canvas: SLIDE,
    pages: [
      // Slide 1: Title
      {
        id: 'title',
        name: 'Title Slide',
        background: { type: 'solid', value: '#0a0a0f' },
        elements: [
          { id: 'logo', type: 'logo', position: { x: 5, y: 5 }, size: { width: 10, height: 6 }, variant: 'icon', src: '{{brand.logo}}' },
          { id: 'title', type: 'text', position: { x: 5, y: 35 }, size: { width: 60, height: 15 },
            content: '{{content.title}}',
            style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 48, fontWeight: 700, color: '#ffffff', lineHeight: 1.15 } },
          { id: 'subtitle', type: 'text', position: { x: 5, y: 55 }, size: { width: 50, height: 8 },
            content: '{{content.subtitle}}',
            style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 20, color: 'rgba(255,255,255,0.5)' } },
          { id: 'accent', type: 'shape', position: { x: 0, y: 92 }, size: { width: 100, height: 8 },
            shape: 'rect', style: { fill: '{{brand.colors.primary}}' } },
          { id: 'brand-name', type: 'text', position: { x: 5, y: 93 }, size: { width: 30, height: 5 },
            content: '{{brand.name}}',
            style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 12, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 3 } },
        ],
      },
      // Slide 2: Section divider
      {
        id: 'section',
        name: 'Section Divider',
        background: { type: 'solid', value: '{{brand.colors.primary}}' },
        elements: [
          { id: 'section-num', type: 'text', position: { x: 5, y: 20 }, size: { width: 20, height: 15 },
            content: '01',
            style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 80, fontWeight: 800, color: 'rgba(255,255,255,0.2)' } },
          { id: 'section-title', type: 'text', position: { x: 5, y: 45 }, size: { width: 70, height: 15 },
            content: '{{content.section}}',
            style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 44, fontWeight: 700, color: '#ffffff' } },
          { id: 'divider', type: 'divider', position: { x: 5, y: 65 }, size: { width: 15, height: 0.3 },
            style: { color: 'rgba(255,255,255,0.4)', thickness: 3 } },
        ],
      },
      // Slide 3: Content
      {
        id: 'content',
        name: 'Content Slide',
        background: { type: 'solid', value: '#ffffff' },
        elements: [
          { id: 'heading', type: 'text', position: { x: 5, y: 8 }, size: { width: 70, height: 8 },
            content: '{{content.section}}',
            style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 32, fontWeight: 600, color: '#1a1a1a' } },
          { id: 'accent-line', type: 'shape', position: { x: 5, y: 18 }, size: { width: 8, height: 0.4 },
            shape: 'rect', style: { fill: '{{brand.colors.primary}}' } },
          { id: 'body', type: 'text', position: { x: 5, y: 25 }, size: { width: 55, height: 50 },
            content: '{{content.body}}',
            style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 18, color: '#555555', lineHeight: 1.6 } },
          { id: 'brand-mark', type: 'text', position: { x: 80, y: 92 }, size: { width: 15, height: 4 },
            content: '{{brand.name}}',
            style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 10, color: '#cccccc', textAlign: 'right' } },
        ],
      },
      // Slide 4: Closing
      {
        id: 'closing',
        name: 'Closing Slide',
        background: { type: 'gradient', value: '{{brand.colors.primary}}', gradientTo: '{{brand.colors.secondary}}', gradientAngle: 135 },
        elements: [
          { id: 'logo', type: 'logo', position: { x: 35, y: 20 }, size: { width: 30, height: 18 }, variant: 'full', src: '{{brand.logo}}' },
          { id: 'thanks', type: 'text', position: { x: 15, y: 50 }, size: { width: 70, height: 12 },
            content: 'Thank you',
            style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 52, fontWeight: 700, color: '#ffffff', textAlign: 'center' } },
          { id: 'contact', type: 'text', position: { x: 20, y: 68 }, size: { width: 60, height: 6 },
            content: '{{brand.name}}',
            style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 18, color: 'rgba(255,255,255,0.6)', textAlign: 'center' } },
        ],
      },
    ],
    variables: PRES_VARS,
  },
];
