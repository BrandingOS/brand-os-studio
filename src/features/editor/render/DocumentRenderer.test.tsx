// Phase 8.1 — DocumentRenderer unit tests.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DocumentRenderer } from './DocumentRenderer';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';

const PAGE_ID = '22222222-2222-2222-2222-222222222222';

const baseDoc: BrandOSDocument = {
  schemaVersion: 1,
  id: '11111111-1111-1111-1111-111111111111',
  contentType: 'social-post',
  brandId: 'brand-x',
  masterPages: [],
  metadata: { name: 'Hello' },
  pages: [
    {
      id: PAGE_ID,
      name: 'P',
      width: 1080,
      height: 1080,
      background: '#ffffff',
      masterPageId: null,
      layers: [],
    },
  ],
} as BrandOSDocument;

const brandKit: BrandKit = {
  id: 'brand-x',
  name: 'X',
  colors: {
    primary: { hex: '#ff0000', name: 'Red' },
    neutrals: ['#fafafa', '#e5e5e5', '#a3a3a3', '#525252', '#262626', '#000000'],
  },
  typography: {
    heading: { family: 'Inter' },
    body: { family: 'Roboto' },
  },
  logos: { mono: {} },
  spacing: { unit: 8, cornerRadius: 8 },
  _diagnostics: { warnings: [] },
} as unknown as BrandKit;

afterEach(() => cleanup());

describe('DocumentRenderer', () => {
  it('renders a page wrapper with the page background', () => {
    const { container } = render(<DocumentRenderer doc={baseDoc} />);
    const page = container.querySelector(`[data-page-id="${PAGE_ID}"]`) as HTMLElement;
    expect(page).not.toBeNull();
    expect(page.style.background).toBe('rgb(255, 255, 255)');
  });

  it('renders text layer content with literal color + font', () => {
    const doc: BrandOSDocument = {
      ...baseDoc,
      pages: [
        {
          ...baseDoc.pages[0],
          layers: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              kind: 'text',
              name: 'Headline',
              text: 'Hello world',
              fontFamily: 'Inter',
              fontSize: 48,
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: 0,
              textAlign: 'left',
              direction: 'ltr',
              color: '#0000ff',
              transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: true, locked: false, brandLocked: false,
            },
          ],
        },
      ],
    } as BrandOSDocument;
    const { container, getByText } = render(<DocumentRenderer doc={doc} />);
    const text = getByText('Hello world');
    expect(text).not.toBeNull();
    expect((text as HTMLElement).style.color).toBe('rgb(0, 0, 255)');
    expect(container.querySelector('[data-layer-kind="text"]')).not.toBeNull();
  });

  it('resolves SlotRefs against the brandKit', () => {
    const doc: BrandOSDocument = {
      ...baseDoc,
      pages: [
        {
          ...baseDoc.pages[0],
          layers: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              kind: 'text',
              name: 'Headline',
              text: 'Brand-bound',
              fontFamily: { type: 'brand.font.heading' },
              fontSize: 48,
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: 0,
              textAlign: 'left',
              direction: 'ltr',
              color: { type: 'brand.color.primary' },
              transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: true, locked: false, brandLocked: false,
            },
          ],
        },
      ],
    } as BrandOSDocument;
    const { getByText } = render(<DocumentRenderer doc={doc} brandKit={brandKit} />);
    const node = getByText('Brand-bound') as HTMLElement;
    expect(node.style.color).toBe('rgb(255, 0, 0)');
    expect(node.style.fontFamily).toContain('Inter');
  });

  it('renders a shape with fill + cornerRadius', () => {
    const doc: BrandOSDocument = {
      ...baseDoc,
      pages: [
        {
          ...baseDoc.pages[0],
          layers: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              kind: 'shape',
              name: 'Block',
              shape: 'rectangle',
              fill: '#00ff00',
              stroke: null,
              strokeWidth: 0,
              cornerRadius: 12,
              transform: { x: 10, y: 20, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: true, locked: false, brandLocked: false,
            },
          ],
        },
      ],
    } as BrandOSDocument;
    const { container } = render(<DocumentRenderer doc={doc} />);
    const shape = container.querySelector('[data-layer-kind="shape"]') as HTMLElement;
    expect(shape.style.background).toBe('rgb(0, 255, 0)');
    expect(shape.style.borderRadius).toBe('12px');
    expect(shape.style.left).toBe('10px');
    expect(shape.style.top).toBe('20px');
  });

  it('renders ellipse shape as 50% rounded', () => {
    const doc: BrandOSDocument = {
      ...baseDoc,
      pages: [
        {
          ...baseDoc.pages[0],
          layers: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              kind: 'shape',
              name: 'Dot',
              shape: 'ellipse',
              fill: '#000000',
              stroke: null,
              strokeWidth: 0,
              cornerRadius: 0,
              transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: true, locked: false, brandLocked: false,
            },
          ],
        },
      ],
    } as BrandOSDocument;
    const { container } = render(<DocumentRenderer doc={doc} />);
    const shape = container.querySelector('[data-layer-kind="shape"]') as HTMLElement;
    expect(shape.style.borderRadius).toBe('50%');
  });

  it('skips invisible layers', () => {
    const doc: BrandOSDocument = {
      ...baseDoc,
      pages: [
        {
          ...baseDoc.pages[0],
          layers: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              kind: 'shape',
              name: 'Hidden',
              shape: 'rectangle',
              fill: '#ff00ff',
              stroke: null,
              strokeWidth: 0,
              cornerRadius: 0,
              transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: false, locked: false, brandLocked: false,
            },
          ],
        },
      ],
    } as BrandOSDocument;
    const { container } = render(<DocumentRenderer doc={doc} />);
    expect(container.querySelector('[data-layer-kind="shape"]')).toBeNull();
  });

  it('shows page indicator on multi-page documents', () => {
    const doc: BrandOSDocument = {
      ...baseDoc,
      pages: [
        baseDoc.pages[0],
        {
          ...baseDoc.pages[0],
          id: '22222222-2222-2222-2222-bbbbbbbbbbbb',
        },
      ],
    } as BrandOSDocument;
    const { container } = render(<DocumentRenderer doc={doc} />);
    expect(container.textContent ?? '').toContain('1 / 2');
    expect(container.textContent ?? '').toContain('2 / 2');
  });

  it('does NOT show page indicator on single-page documents', () => {
    const { container } = render(<DocumentRenderer doc={baseDoc} />);
    // single-page doc has no figcaption sibling
    expect(container.querySelector('figcaption')).toBeNull();
  });

  it('respects fitToWidth by scaling oversized pages down', () => {
    const { container } = render(<DocumentRenderer doc={baseDoc} fitToWidth={540} />);
    const page = container.querySelector(`[data-page-id="${PAGE_ID}"]`) as HTMLElement;
    // Page is 1080 wide; with fitToWidth=540 → scale 0.5 → rendered 540 wide.
    expect(page.style.width).toBe('540px');
    expect(page.style.height).toBe('540px');
  });
});
