// Unit tests for convertToTemplate, including the round-trip property
// against applyBrandToDocument.

import { describe, expect, it } from 'vitest';
import { applyBrandToDocument } from '../applyBrandToDocument';
import { convertToTemplate } from '../convertToTemplate';
import type { BrandKit } from '../BrandKit';
import type {
  BrandOSDocument,
  GroupLayer,
  Page,
  ShapeLayer,
  TextLayer,
} from '@/features/editor/schema';

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

function makeText(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: 'l-text',
    name: 't',
    kind: 'text',
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    text: '',
    fontFamily: 'Helvetica',
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color: '#000000',
    ...overrides,
  };
}

function makeShape(overrides: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: 'l-shape',
    name: 's',
    kind: 'shape',
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    shape: 'rectangle',
    fill: '#000000',
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
    ...overrides,
  };
}

function makeDoc(layers: TextLayer['kind'] extends never ? never : Page['layers']): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'd1',
    contentType: 'social-post',
    brandId: 'b1',
    masterPages: [],
    pages: [
      {
        id: 'p1',
        name: 'p1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers,
      },
    ],
    metadata: {},
  };
}

// ─── Direct conversion tests ────────────────────────────────────────────

describe('convertToTemplate — direct conversions', () => {
  const kit = makeBrandKit();

  it('replaces a hex matching brand primary with brand.color.primary slot', () => {
    const text = makeText({ color: '#3366ff' });
    const result = convertToTemplate(makeDoc([text]), kit);
    expect((result.pages[0].layers[0] as TextLayer).color).toEqual({
      type: 'brand.color.primary',
    });
  });

  it('replaces secondary and accent matches', () => {
    const a = makeText({ id: 'a', color: '#ff6633' });
    const b = makeText({ id: 'b', color: '#33cc66' });
    const result = convertToTemplate(makeDoc([a, b]), kit);
    expect((result.pages[0].layers[0] as TextLayer).color).toEqual({
      type: 'brand.color.secondary',
    });
    expect((result.pages[0].layers[1] as TextLayer).color).toEqual({
      type: 'brand.color.accent',
    });
  });

  it('replaces a neutral hex with the matching neutral SlotRef + neutralIndex', () => {
    const text = makeText({ color: '#777777' }); // neutrals[3]
    const result = convertToTemplate(makeDoc([text]), kit);
    expect((result.pages[0].layers[0] as TextLayer).color).toEqual({
      type: 'brand.color.neutral',
      neutralIndex: 3,
    });
  });

  it('leaves a non-brand literal hex as-is', () => {
    const text = makeText({ color: '#abcdef' });
    const result = convertToTemplate(makeDoc([text]), kit);
    expect((result.pages[0].layers[0] as TextLayer).color).toBe('#abcdef');
  });

  it('replaces font family matches', () => {
    const heading = makeText({ id: 'h', fontFamily: 'Inter, sans-serif' });
    const body = makeText({ id: 'b', fontFamily: 'Georgia, serif' });
    const result = convertToTemplate(makeDoc([heading, body]), kit);
    expect((result.pages[0].layers[0] as TextLayer).fontFamily).toEqual({
      type: 'brand.font.heading',
    });
    expect((result.pages[0].layers[1] as TextLayer).fontFamily).toEqual({
      type: 'brand.font.body',
    });
  });

  it('replaces shape fill and stroke when they match brand values', () => {
    const shape = makeShape({ fill: '#3366ff', stroke: '#111111' });
    const result = convertToTemplate(makeDoc([shape]), kit);
    expect((result.pages[0].layers[0] as ShapeLayer).fill).toEqual({
      type: 'brand.color.primary',
    });
    expect((result.pages[0].layers[0] as ShapeLayer).stroke).toEqual({
      type: 'brand.color.neutral',
      neutralIndex: 5,
    });
  });

  it('handles case-insensitive hex matching', () => {
    const text = makeText({ color: '#3366FF' }); // uppercase
    const result = convertToTemplate(makeDoc([text]), kit);
    expect((result.pages[0].layers[0] as TextLayer).color).toEqual({
      type: 'brand.color.primary',
    });
  });

  it('replaces page background when it matches a brand color', () => {
    const doc = makeDoc([]);
    doc.pages[0].background = '#3366ff';
    const result = convertToTemplate(doc, kit);
    expect(result.pages[0].background).toEqual({ type: 'brand.color.primary' });
  });

  it('recurses into group children', () => {
    const inner = makeText({ id: 'inner', color: '#3366ff' });
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
    const result = convertToTemplate(makeDoc([group]), kit);
    expect(
      ((result.pages[0].layers[0] as GroupLayer).children[0] as TextLayer).color,
    ).toEqual({ type: 'brand.color.primary' });
  });

  it('does not mutate the input document', () => {
    const text = makeText({ color: '#3366ff' });
    const doc = makeDoc([text]);
    const snapshot = JSON.parse(JSON.stringify(doc));
    convertToTemplate(doc, kit);
    expect(doc).toEqual(snapshot);
  });
});

// ─── Round-trip property ───────────────────────────────────────────────

describe('round-trip: applyBrandToDocument(convertToTemplate(doc, kit), kit) ≡ apply(doc, kit)', () => {
  const kit = makeBrandKit();

  it('text layer with brand-matching color and font round-trips losslessly', () => {
    const text = makeText({
      color: '#3366ff',
      fontFamily: 'Inter, sans-serif',
    });
    const doc = makeDoc([text]);
    const tpl = convertToTemplate(doc, kit);
    const reapplied = applyBrandToDocument(tpl, kit);
    const direct = applyBrandToDocument(doc, kit);
    expect(reapplied).toEqual(direct);
  });

  it('a doc with mixed brand-matching and literal values round-trips', () => {
    const branded = makeText({ id: 'a', color: '#3366ff', fontFamily: 'Inter, sans-serif' });
    const oneOff = makeText({ id: 'b', color: '#abcdef', fontFamily: 'Comic Sans MS' });
    const doc = makeDoc([branded, oneOff]);
    const reapplied = applyBrandToDocument(convertToTemplate(doc, kit), kit);
    expect(reapplied).toEqual(doc);
  });

  it('shape fill + stroke round-trip', () => {
    const shape = makeShape({ fill: '#33cc66', stroke: '#777777' });
    const doc = makeDoc([shape]);
    expect(applyBrandToDocument(convertToTemplate(doc, kit), kit)).toEqual(doc);
  });
});

// ─── Documented limitation: one-font brand round-trip ───────────────────

describe('round-trip — slot identity collision (documented limitation)', () => {
  it('one-font brand: heading and body resolve to the same family — round-trip pulls body to heading', () => {
    // When heading.family === body.family, a body-slotted layer's
    // resolved literal equals the heading-resolved literal. On
    // convert-back we can only pick one slot — heading wins per the
    // ordering rule documented in convertToTemplate.ts.
    const kit: BrandKit = {
      ...makeBrandKit(),
      typography: {
        heading: { family: 'Inter, sans-serif' },
        body: { family: 'Inter, sans-serif' }, // same as heading
      },
    };
    const body = makeText({ id: 'b', fontFamily: { type: 'brand.font.body' } });
    const doc: BrandOSDocument = {
      schemaVersion: 1,
      id: 'd2',
      contentType: 'social-post',
      brandId: 'b1',
      masterPages: [],
      pages: [
        {
          id: 'p2',
          name: 'p2',
          width: 1080,
          height: 1080,
          background: '#ffffff',
          masterPageId: null,
          layers: [body],
        },
      ],
      metadata: {},
    };
    // applyBrandToDocument resolves body → 'Inter, sans-serif' (literal).
    // convertToTemplate matches first → brand.font.heading.
    // Round-trip pulls the slot identity from body → heading.
    const after = convertToTemplate(applyBrandToDocument(doc, kit), kit);
    expect((after.pages[0].layers[0] as TextLayer).fontFamily).toEqual({
      type: 'brand.font.heading',
    });
  });
});
