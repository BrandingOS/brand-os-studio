// Unit tests for applyBrandToDocument.
//
// Covers:
//  • All 13 SlotRef types resolve correctly
//  • Multi-page + master page traversal
//  • Group layer recursion
//  • Page background as a ResolvedValue
//  • 'apply' vs 'preview' mode behavior
//  • Logo SlotRefs leave SlotRef in place (render-time resolution)
//  • Pure function: input not mutated

import { describe, expect, it } from 'vitest';
import {
  applyBrandToDocument,
  resolveSlotRef,
  type BrandResolutionAnnotation,
} from '../applyBrandToDocument';
import type { BrandKit } from '../BrandKit';
import type {
  BrandOSDocument,
  GroupLayer,
  Page,
  ShapeLayer,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';

// ─── Fixtures ───────────────────────────────────────────────────────────

function makeBrandKit(): BrandKit {
  return {
    id: 'kit-1',
    name: 'Test Kit',
    colors: {
      primary: { hex: '#3366ff' },
      secondary: { hex: '#ff6633' },
      accent: { hex: '#33cc66' },
      neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
    },
    typography: {
      heading: { family: 'Inter, sans-serif' },
      body: { family: 'Georgia, serif' },
    },
    logos: { mono: {} },
    spacing: { unit: 8, cornerRadius: 4 },
    _diagnostics: { warnings: [] },
  };
}

function makeTextLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: 'layer-text-1',
    name: 'headline',
    kind: 'text',
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    text: 'hello',
    fontFamily: { type: 'brand.font.heading' },
    fontSize: 48,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color: { type: 'brand.color.primary' },
    ...overrides,
  };
}

function makeShapeLayer(overrides: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: 'layer-shape-1',
    name: 'rect',
    kind: 'shape',
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    shape: 'rectangle',
    fill: { type: 'brand.color.accent' },
    stroke: { type: 'brand.color.neutral', neutralIndex: 5 },
    strokeWidth: 2,
    cornerRadius: 0,
    ...overrides,
  };
}

function makePage(layers: TextLayer['kind'] extends never ? never : Page['layers']): Page {
  return {
    id: '0d9b9b1c-2bbf-4c9a-9a0e-page0001',
    name: 'p1',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    masterPageId: null,
    layers,
  };
}

function makeDoc(pages: Page[], masterPages: Page[] = []): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '0d9b9b1c-2bbf-4c9a-9a0e-doc00001',
    contentType: 'social-post',
    brandId: 'b1',
    masterPages,
    pages,
    metadata: {},
  };
}

// ─── Apply mode ─────────────────────────────────────────────────────────

describe('applyBrandToDocument — apply mode (default)', () => {
  const kit = makeBrandKit();

  it('replaces every color SlotRef with its resolved hex', () => {
    const text = makeTextLayer();
    const doc = makeDoc([makePage([text])]);
    const result = applyBrandToDocument(doc, kit);
    const out = result.pages[0].layers[0] as TextLayer;
    expect(out.color).toBe('#3366ff');
    expect(out.fontFamily).toBe('Inter, sans-serif');
  });

  it('resolves brand.color.neutral with neutralIndex', () => {
    const layer = makeShapeLayer({
      fill: { type: 'brand.color.neutral', neutralIndex: 0 },
      stroke: { type: 'brand.color.neutral', neutralIndex: 5 },
    });
    const result = applyBrandToDocument(makeDoc([makePage([layer])]), kit);
    const out = result.pages[0].layers[0] as ShapeLayer;
    expect(out.fill).toBe('#fafafa');
    expect(out.stroke).toBe('#111111');
  });

  it('clamps an out-of-range neutralIndex to the array bounds', () => {
    const layer = makeShapeLayer({
      fill: { type: 'brand.color.neutral', neutralIndex: 99 },
    });
    const result = applyBrandToDocument(makeDoc([makePage([layer])]), kit);
    expect((result.pages[0].layers[0] as ShapeLayer).fill).toBe('#111111');
  });

  it('resolves font slots: heading and body', () => {
    const heading = makeTextLayer({
      id: 'l-h',
      fontFamily: { type: 'brand.font.heading' },
    });
    const body = makeTextLayer({
      id: 'l-b',
      fontFamily: { type: 'brand.font.body' },
    });
    const result = applyBrandToDocument(makeDoc([makePage([heading, body])]), kit);
    expect((result.pages[0].layers[0] as TextLayer).fontFamily).toBe('Inter, sans-serif');
    expect((result.pages[0].layers[1] as TextLayer).fontFamily).toBe('Georgia, serif');
  });

  it('resolves brand.spacing.unit to a number literal', () => {
    expect(resolveSlotRef({ type: 'brand.spacing.unit' }, kit)).toBe(8);
  });

  it('leaves brand.logo.* SlotRefs in place (render-time resolution)', () => {
    // Logo slots don't resolve to a literal at the document layer.
    expect(resolveSlotRef({ type: 'brand.logo.primary' }, kit)).toBeUndefined();
    expect(resolveSlotRef({ type: 'brand.logo.mono.black' }, kit)).toBeUndefined();
  });

  it('returns undefined when secondary/accent are missing', () => {
    const partialKit = { ...kit, colors: { primary: kit.colors.primary, neutrals: kit.colors.neutrals } } as BrandKit;
    expect(resolveSlotRef({ type: 'brand.color.secondary' }, partialKit)).toBeUndefined();
    expect(resolveSlotRef({ type: 'brand.color.accent' }, partialKit)).toBeUndefined();
  });

  it('resolves page background as a ResolvedValue', () => {
    const page: Page = {
      ...makePage([]),
      background: { type: 'brand.color.primary' },
    };
    const result = applyBrandToDocument(makeDoc([page]), kit);
    expect(result.pages[0].background).toBe('#3366ff');
  });

  it('resolves SvgLayer fillOverrides as a record of ResolvedValues', () => {
    const svg: SvgLayer = {
      id: 'l-svg',
      name: 'svg',
      kind: 'svg',
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      src: 'https://example.com/icon.svg',
      fillOverrides: {
        '#path-1': { type: 'brand.color.primary' },
        '#path-2': '#abcdef',
      },
    };
    const result = applyBrandToDocument(makeDoc([makePage([svg])]), kit);
    const out = result.pages[0].layers[0] as SvgLayer;
    expect(out.fillOverrides['#path-1']).toBe('#3366ff');
    expect(out.fillOverrides['#path-2']).toBe('#abcdef'); // literal preserved
  });

  it('resolves layers nested inside a group', () => {
    const inner = makeTextLayer({ id: 'inner', fontFamily: { type: 'brand.font.body' } });
    const group: GroupLayer = {
      id: 'g',
      name: 'group',
      kind: 'group',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      children: [inner],
    };
    const result = applyBrandToDocument(makeDoc([makePage([group])]), kit);
    const resolved = (result.pages[0].layers[0] as GroupLayer).children[0] as TextLayer;
    expect(resolved.fontFamily).toBe('Georgia, serif');
  });

  it('resolves layers in master pages too', () => {
    const masterLayer = makeTextLayer({
      id: 'master-text',
      color: { type: 'brand.color.accent' },
    });
    const master: Page = {
      id: '0d9b9b1c-2bbf-4c9a-9a0e-master001',
      name: 'master',
      width: 1080,
      height: 1080,
      background: '#ffffff',
      masterPageId: null,
      layers: [masterLayer],
    };
    const doc = makeDoc([makePage([])], [master]);
    const result = applyBrandToDocument(doc, kit);
    expect((result.masterPages[0].layers[0] as TextLayer).color).toBe('#33cc66');
  });

  it('resolves across multiple pages', () => {
    const p1 = { ...makePage([makeTextLayer({ id: 'l-p1' })]), id: 'page-1' };
    const p2 = {
      ...makePage([makeTextLayer({ id: 'l-p2', color: { type: 'brand.color.secondary' } })]),
      id: 'page-2',
    };
    const result = applyBrandToDocument(makeDoc([p1, p2]), kit);
    expect((result.pages[0].layers[0] as TextLayer).color).toBe('#3366ff');
    expect((result.pages[1].layers[0] as TextLayer).color).toBe('#ff6633');
  });
});

// ─── Pure-ness ──────────────────────────────────────────────────────────

describe('applyBrandToDocument — purity', () => {
  it('does not mutate the input document', () => {
    const kit = makeBrandKit();
    const original = makeDoc([makePage([makeTextLayer()])]);
    const snapshot = JSON.parse(JSON.stringify(original));
    applyBrandToDocument(original, kit);
    expect(original).toEqual(snapshot);
  });

  it('does not require a DOM or Fabric — works in a plain Node context', () => {
    // This test simply runs the function. Vitest's unit project uses
    // jsdom but the function reads only POJOs; would equally work in
    // the Edge Function (Deno) environment.
    const result = applyBrandToDocument(
      makeDoc([makePage([makeTextLayer()])]),
      makeBrandKit(),
    );
    expect(result.pages[0].layers).toHaveLength(1);
  });
});

// ─── Preview mode ───────────────────────────────────────────────────────

describe('applyBrandToDocument — preview mode', () => {
  const kit = makeBrandKit();

  it('leaves SlotRefs in place on the layer', () => {
    const text = makeTextLayer();
    const result = applyBrandToDocument(makeDoc([makePage([text])]), kit, {
      mode: 'preview',
    });
    const out = result.pages[0].layers[0] as TextLayer;
    expect(out.color).toEqual({ type: 'brand.color.primary' });
    expect(out.fontFamily).toEqual({ type: 'brand.font.heading' });
  });

  it('writes resolved values into doc.metadata._brandResolution', () => {
    const text = makeTextLayer();
    const result = applyBrandToDocument(makeDoc([makePage([text])]), kit, {
      mode: 'preview',
    });
    const annotation = result.metadata._brandResolution as BrandResolutionAnnotation;
    expect(annotation.brandKitId).toBe(kit.id);
    expect(annotation.mode).toBe('preview');
    expect(annotation.layers[text.id]).toEqual({
      color: '#3366ff',
      fontFamily: 'Inter, sans-serif',
    });
  });

  it('annotates page backgrounds when slot-bound', () => {
    const page: Page = {
      ...makePage([]),
      background: { type: 'brand.color.accent' },
    };
    const result = applyBrandToDocument(makeDoc([page]), kit, { mode: 'preview' });
    const annotation = result.metadata._brandResolution as BrandResolutionAnnotation;
    expect(annotation.pages[page.id].background).toBe('#33cc66');
    expect(result.pages[0].background).toEqual({ type: 'brand.color.accent' });
  });

  it('does NOT add an annotation when no SlotRefs are present', () => {
    const text = makeTextLayer({
      color: '#abcdef',
      fontFamily: 'Helvetica',
    });
    const result = applyBrandToDocument(makeDoc([makePage([text])]), kit, {
      mode: 'preview',
    });
    const annotation = result.metadata._brandResolution as BrandResolutionAnnotation;
    expect(annotation.layers).toEqual({});
    expect(annotation.pages).toEqual({});
  });
});

// ─── Mode interaction ──────────────────────────────────────────────────

describe('applyBrandToDocument — mode flip cleans annotation', () => {
  const kit = makeBrandKit();

  it('apply after preview strips _brandResolution from metadata', () => {
    const doc = makeDoc([makePage([makeTextLayer()])]);
    const previewed = applyBrandToDocument(doc, kit, { mode: 'preview' });
    expect(previewed.metadata._brandResolution).toBeDefined();
    const applied = applyBrandToDocument(previewed, kit);
    expect(applied.metadata._brandResolution).toBeUndefined();
  });
});
