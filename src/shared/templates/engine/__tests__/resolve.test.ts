import { describe, it, expect } from 'vitest';
import { resolveTemplate } from '../resolve';
import type { TemplateDefinition } from '../../types';
import type { Brand } from '@/shared/types/brand';

const mockBrand: Brand = {
  id: 'test-brand',
  slug: 'acme',
  name: 'Acme Corp',
  primaryColor: '#0066FF',
  secondaryColor: '#00CC88',
  fonts: { primary: 'Inter', secondary: 'Playfair Display' },
  tone: 'Professional',
  audience: 'Tech professionals',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTemplate: TemplateDefinition = {
  id: 'test-template',
  version: 1,
  meta: { name: 'Test', type: 'business-card', category: 'Test', tags: [] },
  canvas: { width: 1050, height: 600 },
  pages: [{
    id: 'page-1',
    background: { type: 'solid', value: '{{brand.colors.primary}}' },
    elements: [
      {
        id: 'title',
        type: 'text',
        position: { x: 10, y: 10 },
        size: { width: 80, height: 10 },
        content: '{{content.fullName}} at {{brand.name}}',
        style: {
          fontFamily: '{{brand.fonts.primary}}',
          fontSize: 24,
          color: '#ffffff',
        },
      },
      {
        id: 'accent',
        type: 'shape',
        position: { x: 0, y: 90 },
        size: { width: 100, height: 10 },
        shape: 'rect',
        style: { fill: '{{brand.colors.secondary}}' },
      },
    ],
  }],
  variables: [
    { path: 'content.fullName', label: 'Full Name', type: 'text', defaultValue: 'Jane Smith', source: 'content' },
  ],
};

describe('resolveTemplate', () => {
  it('resolves brand variables in background', () => {
    const result = resolveTemplate({ template: mockTemplate, brand: mockBrand });
    expect(result.pages[0].background.value).toBe('#0066FF');
  });

  it('resolves brand variables in element styles', () => {
    const result = resolveTemplate({ template: mockTemplate, brand: mockBrand });
    const text = result.pages[0].elements[0] as any;
    expect(text.style.fontFamily).toBe('Inter');
  });

  it('resolves content variables with defaults', () => {
    const result = resolveTemplate({ template: mockTemplate, brand: mockBrand });
    const text = result.pages[0].elements[0] as any;
    expect(text.content).toBe('Jane Smith at Acme Corp');
  });

  it('applies content overrides over defaults', () => {
    const result = resolveTemplate({
      template: mockTemplate,
      brand: mockBrand,
      contentOverrides: { fullName: 'John Doe' },
    });
    const text = result.pages[0].elements[0] as any;
    expect(text.content).toBe('John Doe at Acme Corp');
  });

  it('resolves secondary color in shape fill', () => {
    const result = resolveTemplate({ template: mockTemplate, brand: mockBrand });
    const shape = result.pages[0].elements[1] as any;
    expect(shape.style.fill).toBe('#00CC88');
  });

  it('preserves meta and canvas', () => {
    const result = resolveTemplate({ template: mockTemplate, brand: mockBrand });
    expect(result.meta.name).toBe('Test');
    expect(result.canvas.width).toBe(1050);
  });
});
