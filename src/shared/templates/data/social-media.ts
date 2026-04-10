/**
 * Built-in social media templates — variable-based.
 * Auto-adapts to any brand's colors, fonts, and logo.
 */
import type { TemplateDefinition } from '../types';

const POST = { width: 1080, height: 1080 };
const STORY = { width: 1080, height: 1920 };
const COVER = { width: 1640, height: 624 };

const SOCIAL_CONTENT_VARS = [
  { path: 'content.headline', label: 'Headline', type: 'text' as const, defaultValue: 'Your headline here', source: 'content' as const, group: 'Content' },
  { path: 'content.body', label: 'Body Text', type: 'text' as const, defaultValue: 'Add your message or description here.', source: 'content' as const, group: 'Content' },
  { path: 'content.cta', label: 'Call to Action', type: 'text' as const, defaultValue: 'Learn More →', source: 'content' as const, group: 'Content' },
];

export const SOCIAL_MEDIA_TEMPLATES: TemplateDefinition[] = [
  // ─── Instagram Posts ─────────────────────────────────────────
  {
    id: 'vt-ig-quote-card',
    version: 1,
    meta: { name: 'Quote Card', type: 'social-post', category: 'Minimalist', tags: ['quote', 'instagram', 'minimal'] },
    canvas: POST,
    pages: [{
      id: 'main',
      background: { type: 'solid', value: '{{brand.colors.primary}}' },
      elements: [
        { id: 'logo', type: 'logo', position: { x: 8, y: 6 }, size: { width: 15, height: 8 }, variant: 'icon', src: '{{brand.logo}}' },
        { id: 'quote', type: 'text', position: { x: 8, y: 30 }, size: { width: 84, height: 30 },
          content: '{{content.headline}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 42, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 } },
        { id: 'attribution', type: 'text', position: { x: 8, y: 75 }, size: { width: 84, height: 6 },
          content: '— {{brand.name}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 16, color: 'rgba(255,255,255,0.6)' } },
        { id: 'cta', type: 'text', position: { x: 8, y: 88 }, size: { width: 84, height: 5 },
          content: '{{content.cta}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 14, fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 2 } },
      ],
    }],
    variables: SOCIAL_CONTENT_VARS,
  },
  {
    id: 'vt-ig-bold-stat',
    version: 1,
    meta: { name: 'Bold Stat', type: 'social-post', category: 'Bold', tags: ['statistics', 'instagram', 'bold'] },
    canvas: POST,
    pages: [{
      id: 'main',
      background: { type: 'solid', value: '#0a0a0f' },
      elements: [
        { id: 'stat', type: 'text', position: { x: 10, y: 25 }, size: { width: 80, height: 25 },
          content: '{{content.headline}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 72, fontWeight: 800, color: '{{brand.colors.primary}}' } },
        { id: 'desc', type: 'text', position: { x: 10, y: 55 }, size: { width: 70, height: 15 },
          content: '{{content.body}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 20, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 } },
        { id: 'accent', type: 'shape', position: { x: 10, y: 50 }, size: { width: 20, height: 0.4 },
          shape: 'rect', style: { fill: '{{brand.colors.primary}}' } },
        { id: 'logo', type: 'logo', position: { x: 10, y: 85 }, size: { width: 12, height: 7 }, variant: 'icon', src: '{{brand.logo}}' },
        { id: 'brand', type: 'text', position: { x: 25, y: 86 }, size: { width: 50, height: 5 },
          content: '{{brand.name}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 14, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 3 } },
      ],
    }],
    variables: SOCIAL_CONTENT_VARS,
  },

  // ─── Instagram Stories ───────────────────────────────────────
  {
    id: 'vt-story-headline',
    version: 1,
    meta: { name: 'Story Headline', type: 'social-story', category: 'Bold', tags: ['story', 'instagram', 'headline'] },
    canvas: STORY,
    pages: [{
      id: 'main',
      background: { type: 'gradient', value: '{{brand.colors.primary}}', gradientTo: '{{brand.colors.secondary}}', gradientAngle: 180 },
      elements: [
        { id: 'logo', type: 'logo', position: { x: 8, y: 4 }, size: { width: 12, height: 4 }, variant: 'icon', src: '{{brand.logo}}' },
        { id: 'headline', type: 'text', position: { x: 8, y: 35 }, size: { width: 84, height: 20 },
          content: '{{content.headline}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 48, fontWeight: 800, color: '#ffffff', lineHeight: 1.15 } },
        { id: 'body', type: 'text', position: { x: 8, y: 58 }, size: { width: 84, height: 10 },
          content: '{{content.body}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 } },
        { id: 'cta-bar', type: 'shape', position: { x: 20, y: 82 }, size: { width: 60, height: 6 },
          shape: 'rect', style: { fill: '#ffffff', borderRadius: 50 } },
        { id: 'cta-text', type: 'text', position: { x: 20, y: 82.5 }, size: { width: 60, height: 5 },
          content: '{{content.cta}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 16, fontWeight: 600, color: '{{brand.colors.primary}}', textAlign: 'center' } },
      ],
    }],
    variables: SOCIAL_CONTENT_VARS,
  },

  // ─── Facebook Covers ─────────────────────────────────────────
  {
    id: 'vt-fb-gradient',
    version: 1,
    meta: { name: 'Gradient Cover', type: 'social-cover', category: 'Modern', tags: ['facebook', 'cover', 'gradient'] },
    canvas: COVER,
    pages: [{
      id: 'main',
      background: { type: 'gradient', value: '{{brand.colors.primary}}', gradientTo: '{{brand.colors.secondary}}', gradientAngle: 135 },
      elements: [
        { id: 'logo', type: 'logo', position: { x: 5, y: 15 }, size: { width: 15, height: 20 }, variant: 'full', src: '{{brand.logo}}' },
        { id: 'headline', type: 'text', position: { x: 5, y: 45 }, size: { width: 55, height: 18 },
          content: '{{content.headline}}',
          style: { fontFamily: '{{brand.fonts.secondary}}', fontSize: 32, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 } },
        { id: 'tagline', type: 'text', position: { x: 5, y: 72 }, size: { width: 45, height: 10 },
          content: '{{content.body}}',
          style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 14, color: 'rgba(255,255,255,0.6)' } },
        { id: 'accent-circle', type: 'shape', position: { x: 75, y: 10 }, size: { width: 30, height: 50 },
          shape: 'circle', style: { fill: '{{brand.colors.secondary}}', opacity: 0.15 } },
      ],
    }],
    variables: SOCIAL_CONTENT_VARS,
  },
];
