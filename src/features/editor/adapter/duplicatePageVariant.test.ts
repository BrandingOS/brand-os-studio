// Step 7 — unit tests for the variant transform.
//
// Pure-function tests against `transformLayersForVariant`. The
// adapter integration (insertion at sourceIndex + 1, single-undo)
// is covered separately in FabricAdapter integration tests.

import { describe, expect, it } from 'vitest';
import { transformLayersForVariant } from './duplicatePageVariant';
import type {
  GroupLayer,
  ImageLayer,
  Layer,
  LogoLayer,
  ShapeLayer,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';

const TRANSFORM = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

const baseLayerProps = {
  transform: TRANSFORM,
  opacity: 1,
  visible: true,
  locked: false,
  brandLocked: false,
};

function textL(id: string, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id,
    kind: 'text',
    name: `text-${id}`,
    text: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: -0.01,
    textAlign: 'left',
    direction: 'auto',
    color: '#111111',
    ...baseLayerProps,
    ...overrides,
  } as TextLayer;
}

function shapeL(id: string): ShapeLayer {
  return {
    id,
    kind: 'shape',
    name: `shape-${id}`,
    shape: 'rectangle',
    fill: '#3b82f6',
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 4,
    ...baseLayerProps,
  } as ShapeLayer;
}

function imageL(id: string): ImageLayer {
  return {
    id,
    kind: 'image',
    name: `image-${id}`,
    src: 'https://placehold.co/400x300/png',
    fit: 'cover',
    ...baseLayerProps,
  } as ImageLayer;
}

function svgL(id: string): SvgLayer {
  return {
    id,
    kind: 'svg',
    name: `svg-${id}`,
    src: 'https://example.com/icon.svg',
    fillOverrides: {},
    ...baseLayerProps,
  } as SvgLayer;
}

function logoL(id: string): LogoLayer {
  return {
    id,
    kind: 'logo',
    name: `logo-${id}`,
    variant: 'auto',
    ...baseLayerProps,
  } as LogoLayer;
}

function groupL(id: string, children: Layer[]): GroupLayer {
  return {
    id,
    kind: 'group',
    name: `group-${id}`,
    children,
    ...baseLayerProps,
  } as unknown as GroupLayer;
}

// ─── Per-kind rules ────────────────────────────────────────────────────

describe('transformLayersForVariant — per-kind rules', () => {
  it('text: clears `text` to "" but preserves all styling', () => {
    const SLOT_HEADING = { type: 'brand.font.heading' } as const;
    const t = textL('t1', {
      text: 'Some content',
      fontSize: 96,
      fontWeight: 800,
      color: { type: 'brand.color.primary' } as unknown as TextLayer['color'],
      fontFamily: SLOT_HEADING as unknown as TextLayer['fontFamily'],
      lineHeight: 1.4,
      letterSpacing: 0.03,
      textAlign: 'center',
      direction: 'rtl',
    } as Partial<TextLayer>);

    const [next] = transformLayersForVariant([t]) as TextLayer[];
    expect(next.kind).toBe('text');
    expect(next.text).toBe('');
    expect(next.id).not.toBe('t1'); // fresh id
    // Styling intact.
    expect(next.fontSize).toBe(96);
    expect(next.fontWeight).toBe(800);
    expect(next.color).toEqual({ type: 'brand.color.primary' });
    expect(next.fontFamily).toEqual(SLOT_HEADING);
    expect(next.lineHeight).toBe(1.4);
    expect(next.letterSpacing).toBe(0.03);
    expect(next.textAlign).toBe('center');
    expect(next.direction).toBe('rtl');
  });

  it('shape: kept entirely (fresh id)', () => {
    const s = shapeL('s1');
    const [next] = transformLayersForVariant([s]) as ShapeLayer[];
    expect(next.kind).toBe('shape');
    expect(next.id).not.toBe('s1');
    expect(next.shape).toBe('rectangle');
    expect(next.fill).toBe('#3b82f6');
  });

  it('image: removed entirely', () => {
    const i = imageL('i1');
    const result = transformLayersForVariant([i]);
    expect(result).toEqual([]);
  });

  it('svg: kept (decorative — usually icons)', () => {
    const s = svgL('s1');
    const [next] = transformLayersForVariant([s]) as SvgLayer[];
    expect(next.kind).toBe('svg');
    expect(next.id).not.toBe('s1');
    expect(next.src).toBe('https://example.com/icon.svg');
  });

  it('logo: kept (brand asset, not page content)', () => {
    const l = logoL('l1');
    const [next] = transformLayersForVariant([l]) as LogoLayer[];
    expect(next.kind).toBe('logo');
    expect(next.id).not.toBe('l1');
    expect(next.variant).toBe('auto');
  });
});

// ─── Mixed compositions ────────────────────────────────────────────────

describe('transformLayersForVariant — mixed compositions', () => {
  it('preserves order while filtering dropped layers', () => {
    const layers: Layer[] = [
      textL('a'),
      imageL('b'),
      shapeL('c'),
      logoL('d'),
      imageL('e'),
      svgL('f'),
    ];
    const next = transformLayersForVariant(layers);
    expect(next.map((l) => l.kind)).toEqual([
      'text',
      'shape',
      'logo',
      'svg',
    ]);
  });

  it('produces fresh ids for every kept layer (no collisions with source)', () => {
    const layers: Layer[] = [
      textL('a'),
      shapeL('b'),
      logoL('c'),
      svgL('d'),
    ];
    const result = transformLayersForVariant(layers);
    const sourceIds = new Set(layers.map((l) => l.id));
    for (const l of result) {
      expect(sourceIds.has(l.id)).toBe(false);
    }
    // All ids in the result are unique.
    const resultIds = new Set(result.map((l) => l.id));
    expect(resultIds.size).toBe(result.length);
  });
});

// ─── Group rules ──────────────────────────────────────────────────────

describe('transformLayersForVariant — group rules', () => {
  it('group with all children removed (only images) drops the group itself', () => {
    const g = groupL('g1', [imageL('i1'), imageL('i2')]);
    const result = transformLayersForVariant([g]);
    expect(result).toEqual([]);
  });

  it('group with mixed children keeps the group + the surviving children', () => {
    const g = groupL('g1', [
      textL('t1'),
      imageL('i1'),
      shapeL('s1'),
    ]);
    const [next] = transformLayersForVariant([g]) as GroupLayer[];
    expect(next.kind).toBe('group');
    expect(next.id).not.toBe('g1');
    expect(next.children.map((c) => c.kind)).toEqual(['text', 'shape']);
    // Text inside the group is cleared.
    expect((next.children[0] as TextLayer).text).toBe('');
  });

  it('nested groups recurse — all-image inner group drops, outer keeps surviving siblings', () => {
    const inner = groupL('g-inner', [imageL('i')]);
    const outer = groupL('g-outer', [inner, shapeL('s'), textL('t')]);
    const [next] = transformLayersForVariant([outer]) as GroupLayer[];
    expect(next.kind).toBe('group');
    expect(next.children.map((c) => c.kind)).toEqual(['shape', 'text']);
  });

  it('group with all children kept generates fresh ids for every layer in the tree', () => {
    const g = groupL('g1', [textL('t1'), shapeL('s1')]);
    const [next] = transformLayersForVariant([g]) as GroupLayer[];
    expect(next.id).not.toBe('g1');
    expect(next.children[0].id).not.toBe('t1');
    expect(next.children[1].id).not.toBe('s1');
  });
});

// ─── Empty cases ──────────────────────────────────────────────────────

describe('transformLayersForVariant — empty cases', () => {
  it('empty input → empty output', () => {
    expect(transformLayersForVariant([])).toEqual([]);
  });

  it('input of only-images → empty output', () => {
    expect(transformLayersForVariant([imageL('a'), imageL('b')])).toEqual([]);
  });

  it('input with no text and no images → identical-shape output (just fresh ids)', () => {
    // The "always-enabled" branch: a page with only shapes/logos/SVGs
    // produces a variant that's structurally identical to As-is. The
    // user got a fresh page; that's fine.
    const layers: Layer[] = [shapeL('a'), logoL('b'), svgL('c')];
    const result = transformLayersForVariant(layers);
    expect(result.map((l) => l.kind)).toEqual(['shape', 'logo', 'svg']);
    expect(result.length).toBe(layers.length);
    for (const l of result) {
      expect(layers.some((src) => src.id === l.id)).toBe(false);
    }
  });
});
