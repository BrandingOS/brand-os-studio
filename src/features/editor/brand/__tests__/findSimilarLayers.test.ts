// Unit tests for findSimilarLayers — Phase 3 step 4a.
//
// Acceptance per the build order:
//   • Same kind + same SlotRef on same property → match
//   • Different kind → no match
//   • Same kind but different SlotRef → no match
//   • Same kind + same SlotRef on different property → no match
//   • Literal values (no SlotRef) on either side → no match (returns empty)
//
// Plus boundary cases that are likely to trip future contributors:
//   • Reference layer itself is excluded
//   • Master page layers are NOT searched (different propagation model)
//   • Group children ARE searched (recursion)
//   • brand.color.neutral with different neutralIndex → NOT equal
//   • SvgLayer.fillOverrides addressed via 'fillOverrides.<key>' path
//   • slot-family / brand-context throw NotImplementedError

import { describe, expect, it } from 'vitest';
import { findSimilarLayers, type SimilarityReference } from '../findSimilarLayers';
import type {
  BrandOSDocument,
  GroupLayer,
  Page,
  ResolvedValue,
  ShapeLayer,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';

// ─── Fixtures ───────────────────────────────────────────────────────────

function makeText(
  id: string,
  color: ResolvedValue,
  fontFamily: ResolvedValue = 'Helvetica',
): TextLayer {
  return {
    id,
    name: id,
    kind: 'text',
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    text: '',
    fontFamily,
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color,
  };
}

function makeShape(id: string, fill: ResolvedValue | null): ShapeLayer {
  return {
    id,
    name: id,
    kind: 'shape',
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    shape: 'rectangle',
    fill,
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
  };
}

function makePage(id: string, layers: Page['layers']): Page {
  return {
    id,
    name: id,
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
    id: 'd',
    contentType: 'social-post',
    brandId: 'b',
    masterPages,
    pages,
    metadata: {},
  };
}

// ─── Acceptance — match cases ───────────────────────────────────────────

describe("findSimilarLayers — 'exact' level", () => {
  it('same kind + same SlotRef on same property → match', () => {
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const peer = makeText('peer', { type: 'brand.color.primary' });
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([
      { pageId: 'p1', layerId: 'peer' },
    ]);
  });

  it('matches across multiple pages', () => {
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const peer1 = makeText('peer1', { type: 'brand.color.primary' });
    const peer2 = makeText('peer2', { type: 'brand.color.primary' });
    const doc = makeDoc([
      makePage('p1', [refLayer]),
      makePage('p2', [peer1]),
      makePage('p3', [peer2]),
    ]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    const matches = findSimilarLayers(doc, ref, 'exact');
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.layerId).sort()).toEqual(['peer1', 'peer2']);
  });

  it('reference layer itself is never in the matches', () => {
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const doc = makeDoc([makePage('p1', [refLayer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });

  it('group children ARE searched (recursion)', () => {
    const innerPeer = makeText('inner', { type: 'brand.color.primary' });
    const group: GroupLayer = {
      id: 'g',
      name: 'g',
      kind: 'group',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      children: [innerPeer],
    };
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const doc = makeDoc([makePage('p1', [refLayer, group])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([
      { pageId: 'p1', layerId: 'inner' },
    ]);
  });
});

// ─── Acceptance — non-match cases ───────────────────────────────────────

describe("findSimilarLayers — 'exact' non-matches", () => {
  it('different kind → no match', () => {
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const shape = makeShape('shape', { type: 'brand.color.primary' });
    const doc = makeDoc([makePage('p1', [refLayer, shape])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });

  it('same kind, DIFFERENT SlotRef → no match', () => {
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const peer = makeText('peer', { type: 'brand.color.accent' });
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });

  it('same kind + same SlotRef on a DIFFERENT property → no match', () => {
    // Reference is `color: brand.color.primary`. Peer has the SAME slot
    // but on `fontFamily` — not on `color`. The peer's color is a
    // literal, not the brand primary.
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const peer = makeText(
      'peer',
      '#abcdef',
      { type: 'brand.color.primary' } as unknown as ResolvedValue,
    );
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });

  it('literal values on the reference → no match (no SlotRef = no exact-similarity concept)', () => {
    const refLayer = makeText('ref', '#3366ff');
    const peer = makeText('peer', '#3366ff'); // same hex, but no slot
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });

  it('peer with literal value on the matched property → no match', () => {
    // Reference uses a SlotRef, peer uses a literal — even if the
    // literal happens to equal the slot's resolved value, it's not
    // the same brand binding.
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const peer = makeText('peer', '#3366ff'); // literal hex, no slot
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });

  it('master page layers are NOT searched (different propagation model)', () => {
    const refLayer = makeText('ref', { type: 'brand.color.primary' });
    const masterLayer = makeText('master-l', { type: 'brand.color.primary' });
    const doc = makeDoc(
      [makePage('p1', [refLayer])],
      [makePage('master', [masterLayer])],
    );
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });
});

// ─── neutral with neutralIndex ──────────────────────────────────────────

describe('findSimilarLayers — neutral SlotRef equality', () => {
  it('same kind + same neutralIndex → match', () => {
    const refLayer = makeText('ref', { type: 'brand.color.neutral', neutralIndex: 2 });
    const peer = makeText('peer', { type: 'brand.color.neutral', neutralIndex: 2 });
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([
      { pageId: 'p1', layerId: 'peer' },
    ]);
  });

  it('different neutralIndex → NO match', () => {
    const refLayer = makeText('ref', { type: 'brand.color.neutral', neutralIndex: 2 });
    const peer = makeText('peer', { type: 'brand.color.neutral', neutralIndex: 5 });
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = { layer: refLayer, pageId: 'p1', property: 'color' };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });
});

// ─── SvgLayer.fillOverrides — dotted property path ─────────────────────

describe('findSimilarLayers — SvgLayer fillOverrides', () => {
  function makeSvg(id: string, overrides: Record<string, ResolvedValue>): SvgLayer {
    return {
      id,
      name: id,
      kind: 'svg',
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      visible: true,
      locked: false,
      brandLocked: false,
      src: 'https://example.com/i.svg',
      fillOverrides: overrides,
    };
  }

  it("matches via 'fillOverrides.<key>' path when both layers have the same slot at the same key", () => {
    const refLayer = makeSvg('ref', { '#path-1': { type: 'brand.color.primary' } });
    const peer = makeSvg('peer', { '#path-1': { type: 'brand.color.primary' } });
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = {
      layer: refLayer,
      pageId: 'p1',
      property: 'fillOverrides.#path-1',
    };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([
      { pageId: 'p1', layerId: 'peer' },
    ]);
  });

  it("does NOT match when the slot is on a DIFFERENT key", () => {
    const refLayer = makeSvg('ref', { '#path-1': { type: 'brand.color.primary' } });
    const peer = makeSvg('peer', { '#path-2': { type: 'brand.color.primary' } });
    const doc = makeDoc([makePage('p1', [refLayer, peer])]);
    const ref: SimilarityReference = {
      layer: refLayer,
      pageId: 'p1',
      property: 'fillOverrides.#path-1',
    };
    expect(findSimilarLayers(doc, ref, 'exact')).toEqual([]);
  });
});

// ─── Future similarity levels — explicit NotImplementedError ───────────

describe('findSimilarLayers — future levels throw', () => {
  it("'slot-family' throws NotImplementedError with a clear message", () => {
    const ref: SimilarityReference = {
      layer: makeText('x', { type: 'brand.color.primary' }),
      pageId: 'p1',
      property: 'color',
    };
    expect(() => findSimilarLayers(makeDoc([makePage('p1', [])]), ref, 'slot-family'))
      .toThrow(/not implemented/);
  });

  it("'brand-context' throws NotImplementedError with a clear message", () => {
    const ref: SimilarityReference = {
      layer: makeText('x', { type: 'brand.color.primary' }),
      pageId: 'p1',
      property: 'color',
    };
    expect(() => findSimilarLayers(makeDoc([makePage('p1', [])]), ref, 'brand-context'))
      .toThrow(/not implemented/);
  });
});
