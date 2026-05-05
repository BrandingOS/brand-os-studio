// Phase 6.1 — color analysis tests.
import { describe, expect, it } from 'vitest';
import {
  analyzeDocumentColors,
  rankBrandColors,
  normalizeHex,
} from './analyzeBrandColors';
import type { BrandOSDocument } from '@/features/editor/schema';

const docWithColors = (
  background: string,
  layers: Array<{ kind: 'text'; color: string } | { kind: 'shape'; fill: string }>,
): BrandOSDocument =>
  ({
    schemaVersion: 1,
    id: '11111111-1111-1111-1111-111111111111',
    contentType: 'social-post',
    brandId: 'brand-raqm',
    masterPages: [],
    metadata: {},
    pages: [{
      id: '22222222-2222-2222-2222-222222222222',
      name: 'P', width: 1080, height: 1080,
      background,
      layers: layers.map((l, i) => l.kind === 'text'
        ? {
            id: `33333333-3333-3333-3333-${String(i).padStart(12, '0')}`,
            kind: 'text', name: 'Headline',
            transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
            text: 'x', fontFamily: 'Inter', fontSize: 24, fontWeight: 400,
            textAlign: 'left', lineHeight: 1.2, color: l.color,
          }
        : {
            id: `33333333-3333-3333-3333-${String(i).padStart(12, '0')}`,
            kind: 'shape', name: 'Block',
            transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
            shape: 'rectangle', fill: l.fill,
          }),
    }],
  } as BrandOSDocument);

describe('normalizeHex', () => {
  it('lowercases 6-digit hex', () => {
    expect(normalizeHex('#FFAA00')).toBe('#ffaa00');
  });
  it('expands 3-digit shorthand', () => {
    expect(normalizeHex('#fff')).toBe('#ffffff');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });
  it('strips alpha from 8-digit hex', () => {
    expect(normalizeHex('#abcdef88')).toBe('#abcdef');
  });
  it('strips alpha from 4-digit hex', () => {
    expect(normalizeHex('#fff8')).toBe('#ffffff');
  });
  it('returns null for non-hex strings', () => {
    expect(normalizeHex('transparent')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('#zzz')).toBeNull();
  });
});

describe('analyzeDocumentColors', () => {
  it('counts page.background', () => {
    const counts = analyzeDocumentColors(docWithColors('#ffffff', []));
    expect(counts.get('#ffffff')).toBe(1);
  });

  it('counts text.color and shape.fill', () => {
    const counts = analyzeDocumentColors(docWithColors('#fff', [
      { kind: 'text', color: '#ff0000' },
      { kind: 'shape', fill: '#00ff00' },
      { kind: 'shape', fill: '#ff0000' },
    ]));
    expect(counts.get('#ffffff')).toBe(1);    // background
    expect(counts.get('#ff0000')).toBe(2);    // text + one shape
    expect(counts.get('#00ff00')).toBe(1);
  });

  it('skips SlotRefs (objects, not strings)', () => {
    const doc = docWithColors('#fff', []);
    // Inject a SlotRef directly into the layer color field.
    doc.pages[0].layers = [{
      ...doc.pages[0].layers[0],
      id: '33333333-3333-3333-3333-000000000099',
      kind: 'text', name: 'Bound',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
      text: 'x', fontFamily: 'Inter', fontSize: 24, fontWeight: 400,
      textAlign: 'left', lineHeight: 1.2,
      // The SlotRef shape — analyzer must NOT count this as a literal hex.
      color: { slotRef: true, role: 'primary', neutralIndex: undefined } as never,
    }] as never;
    const counts = analyzeDocumentColors(doc);
    expect(counts.size).toBe(1);    // only the background
    expect(counts.get('#ffffff')).toBe(1);
  });

  it('walks group children recursively', () => {
    const doc = docWithColors('#fff', []);
    doc.pages[0].layers = [{
      id: '33333333-3333-3333-3333-000000000077',
      kind: 'group',
      name: 'Group',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
      children: [{
        id: '33333333-3333-3333-3333-000000000088',
        kind: 'shape', name: 'Inner',
        transform: { x: 0, y: 0, width: 50, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, visible: true, locked: false, brandLocked: false,
        shape: 'rectangle', fill: '#ff00ff',
      }],
    }] as never;
    const counts = analyzeDocumentColors(doc);
    expect(counts.get('#ff00ff')).toBe(1);
  });

  it('returns empty map for an empty layer list', () => {
    const doc = docWithColors('not-a-color', []);
    const counts = analyzeDocumentColors(doc);
    expect(counts.size).toBe(0);
  });

  it('normalizes case + shorthand into one bucket', () => {
    const counts = analyzeDocumentColors(docWithColors('#FFF', [
      { kind: 'shape', fill: '#ffffff' },
      { kind: 'shape', fill: '#fff' },
    ]));
    expect(counts.get('#ffffff')).toBe(3);
  });
});

describe('rankBrandColors', () => {
  it('merges multiple docs into a sorted ranked list', () => {
    const a = new Map([['#ff0000', 3], ['#00ff00', 1]]);
    const b = new Map([['#ff0000', 2], ['#0000ff', 5]]);
    const ranked = rankBrandColors([a, b]);
    // Ties at count=5: blue sorts before red alphabetically.
    expect(ranked).toEqual([
      { hex: '#0000ff', count: 5 },
      { hex: '#ff0000', count: 5 },
      { hex: '#00ff00', count: 1 },
    ]);
  });

  it('honors limit', () => {
    const counts = new Map([
      ['#ff0000', 5], ['#00ff00', 4], ['#0000ff', 3], ['#ffffff', 2],
    ]);
    const ranked = rankBrandColors([counts], { limit: 2 });
    expect(ranked).toHaveLength(2);
    expect(ranked.map((r) => r.hex)).toEqual(['#ff0000', '#00ff00']);
  });

  it('breaks ties alphabetically (deterministic)', () => {
    const counts = new Map([['#zzzzzz' as never, 0], ['#0000ff', 3], ['#0000aa', 3]]);
    const ranked = rankBrandColors([counts]);
    // Among the ties at 3, hex sort puts #0000aa before #0000ff.
    expect(ranked[0].hex).toBe('#0000aa');
    expect(ranked[1].hex).toBe('#0000ff');
  });
});
