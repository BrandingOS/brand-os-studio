import { describe, it, expect } from 'vitest';
import {
  normalizeColor, toPaint, deriveSizing, deriveLayout, parseShadows, nodeToIR, roleFor,
} from './toIR';
import type { RawNode } from './raw';

const node = (over: Partial<RawNode> = {}): RawNode => ({
  tag: 'div',
  classes: [],
  fx: {},
  aria: {},
  style: { display: 'block', opacity: '1' },
  rect: { x: 0, y: 0, w: 100, h: 40 },
  children: [],
  ...over,
});

// Real values, taken from the measurements spike 1 produced against the DS.
const TOKENS = {
  '#111113': '--ds-accent',
  '#f5f4ef': '--ds-bg',
  '#efeee8': '--ds-surface-hover',
  'rgba(17, 17, 19, 0.16)': '--ds-focus-ring',
};

describe('normalizeColor', () => {
  it('collapses opaque rgb to hex', () => {
    expect(normalizeColor('rgb(17, 17, 19)')).toBe('#111113');
    expect(normalizeColor('rgb(239, 238, 232)')).toBe('#efeee8');
  });

  it('keeps alpha as rgba', () => {
    expect(normalizeColor('rgba(17, 17, 19, 0.16)')).toBe('rgba(17, 17, 19, 0.16)');
  });

  it('recognises every spelling of transparent', () => {
    expect(normalizeColor('transparent')).toBe('transparent');
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBe('transparent');
  });
});

describe('toPaint — token provenance', () => {
  it('attaches the token that produced the value', () => {
    expect(toPaint('rgb(17, 17, 19)', TOKENS)).toEqual({ value: '#111113', token: '--ds-accent' });
  });

  it('resolves a value carrying alpha', () => {
    expect(toPaint('rgba(17, 17, 19, 0.16)', TOKENS).token).toBe('--ds-focus-ring');
  });

  it('leaves an unmapped value untokenised rather than guessing', () => {
    const paint = toPaint('rgb(1, 2, 3)', TOKENS);
    expect(paint.value).toBe('#010203');
    expect(paint.token).toBeUndefined();
  });
});

describe('deriveSizing — intent, not pixels', () => {
  const flexRow = node({ style: { display: 'flex', 'flex-direction': 'row' } });

  it('hugs by default', () => {
    const s = deriveSizing(node({ style: { display: 'block', 'flex-grow': '0' } }), flexRow);
    expect(s.width).toBe('hug');
  });

  it('fills when the child grows along the parent axis', () => {
    const child = node({ style: { display: 'block', 'flex-grow': '1' } });
    expect(deriveSizing(child, flexRow).width).toBe('fill');
  });

  it('does NOT fill when the parent is not flex, even with flex-grow set', () => {
    const notFlex = node({ style: { display: 'block' } });
    const child = node({ style: { display: 'block', 'flex-grow': '1' } });
    expect(deriveSizing(child, notFlex).width).toBe('hug');
  });

  it('treats an explicit length as fixed', () => {
    const child = node({ style: { display: 'block', declaredWidth: '200px' } });
    expect(deriveSizing(child, flexRow).width).toBe('fixed');
  });

  it('treats a percentage as fill, not fixed', () => {
    const child = node({ style: { display: 'block', declaredWidth: '100%' } });
    expect(deriveSizing(child, flexRow).width).toBe('fill');
  });

  it('stretches across the counter axis', () => {
    const column = node({ style: { display: 'flex', 'flex-direction': 'column' } });
    const child = node({ style: { display: 'block', 'align-self': 'stretch' } });
    expect(deriveSizing(child, column).width).toBe('fill');
  });

  it('carries min-width rather than baking the measurement in (DsMenu case)', () => {
    const menu = node({
      style: { display: 'flex', 'flex-direction': 'column', 'min-width': '200px' },
      rect: { x: 0, y: 0, w: 232, h: 180 },
    });
    const s = deriveSizing(menu, null);
    expect(s.minW).toBe(200);
    expect(s.w).toBe(232);          // measured value kept only as the fallback
  });

  it('ignores max-width: none', () => {
    const n = node({ style: { display: 'block', 'max-width': 'none' } });
    expect(deriveSizing(n, null).maxW).toBeUndefined();
  });
});

describe('deriveLayout', () => {
  it('maps flex onto auto-layout', () => {
    const n = node({
      style: {
        display: 'flex', 'flex-direction': 'row', gap: '8px',
        'padding-top': '12px', 'padding-right': '22px',
        'padding-bottom': '12px', 'padding-left': '22px',
        'justify-content': 'center', 'align-items': 'center', 'flex-wrap': 'nowrap',
      },
    });
    expect(deriveLayout(n)).toEqual({
      mode: 'auto', direction: 'row', gap: 8,
      padding: [12, 22, 12, 22],
      primaryAlign: 'center', counterAlign: 'center', wrap: false,
    });
  });

  it('reads column direction', () => {
    const n = node({ style: { display: 'flex', 'flex-direction': 'column', 'row-gap': '6px' } });
    const l = deriveLayout(n);
    expect(l).toMatchObject({ mode: 'auto', direction: 'column', gap: 6 });
  });

  it('falls back to absolute for non-flex, visibly rather than silently', () => {
    expect(deriveLayout(node({ style: { display: 'block' } }))).toEqual({ mode: 'absolute' });
    expect(deriveLayout(node({ style: { display: 'grid' } }))).toEqual({ mode: 'absolute' });
  });
});

describe('parseShadows — composites must survive', () => {
  it('keeps both layers of a two-layer shadow in order', () => {
    // --ds-shadow-float
    const css = 'rgba(20, 18, 14, 0.08) 0px 4px 10px 0px, rgba(20, 18, 14, 0.16) 0px 16px 40px 0px';
    const out = parseShadows(css, {});
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ x: 0, y: 4, blur: 10, index: 0 });
    expect(out[1]).toMatchObject({ x: 0, y: 16, blur: 40, index: 1 });
  });

  it('does not split on a comma inside rgba()', () => {
    expect(parseShadows('rgba(17, 17, 19, 0.18) 0px 2px 8px 0px', {})).toHaveLength(1);
  });

  it('returns nothing for none', () => {
    expect(parseShadows('none', {})).toEqual([]);
    expect(parseShadows('', {})).toEqual([]);
  });

  it('tokenises the shadow colour when it maps', () => {
    const out = parseShadows('rgba(17, 17, 19, 0.16) 0px 0px 0px 3px', TOKENS);
    expect(out[0].color.token).toBe('--ds-focus-ring');
  });
});

describe('nodeToIR', () => {
  const opts = { sidRoot: 'ds/button', variant: { tone: 'primary' }, tokens: TOKENS, direction: 'ltr' as const };

  it('builds a sid from the declared axes', () => {
    expect(nodeToIR(node(), opts).sid).toBe('ds/button[tone=primary]');
  });

  it('records a transform as an intentional normalization, not geometry', () => {
    const hovered = node({ style: { display: 'flex', transform: 'matrix(1, 0, 0, 1, 0, -1)' } });
    const ir = nodeToIR(hovered, opts);
    expect(ir.losses).toHaveLength(1);
    expect(ir.losses[0]).toMatchObject({ property: 'transform', reason: 'intentional-normalization' });
  });

  it('drops zero-size and hidden children', () => {
    const parent = node({
      style: { display: 'flex' },
      children: [
        node({ rect: { x: 0, y: 0, w: 0, h: 0 } }),
        node({ style: { display: 'none' } }),
        node({ style: { visibility: 'hidden' }, rect: { x: 0, y: 0, w: 10, h: 10 } }),
        node({ tag: 'span', style: { display: 'block' }, text: 'keep' }),
      ],
    });
    expect(nodeToIR(parent, opts).children).toHaveLength(1);
  });

  it('gives repeated sibling roles distinct sids', () => {
    const menu = node({
      style: { display: 'flex' },
      children: [
        node({ tag: 'svg', svg: '<svg/>' }),
        node({ tag: 'svg', svg: '<svg/>' }),
        node({ tag: 'svg', svg: '<svg/>' }),
      ],
    });
    const sids = nodeToIR(menu, opts).children.map((c) => c.sid);
    expect(new Set(sids).size).toBe(3);
    expect(sids[0]).toMatch(/\/icon$/);
    expect(sids[1]).toMatch(/\/icon#2$/);
  });

  it('omits a fill for a transparent background', () => {
    const n = node({ style: { display: 'flex', 'background-color': 'rgba(0, 0, 0, 0)' } });
    expect(nodeToIR(n, opts).style.fills).toEqual([]);
  });

  it('carries a stroke only when the border has width', () => {
    const none = node({ style: { display: 'flex', 'border-top-width': '0px' } });
    expect(nodeToIR(none, opts).style.strokes).toEqual([]);
    const some = node({
      style: { display: 'flex', 'border-top-width': '1px', 'border-top-color': 'rgb(17, 17, 19)' },
    });
    const ir = nodeToIR(some, opts);
    expect(ir.style.strokeWeight).toBe(1);
    expect(ir.style.strokes[0].token).toBe('--ds-accent');
  });

  it('classifies an svg node as a vector, not an image', () => {
    expect(nodeToIR(node({ tag: 'svg', svg: '<svg/>' }), opts).kind).toBe('vector');
  });
});

describe('roleFor', () => {
  it('prefers a declared role', () => {
    expect(roleFor(node({ fx: { role: 'thumb' } }))).toBe('thumb');
  });

  it('matches a manifest class selector', () => {
    expect(roleFor(node({ classes: ['ds-menu-item'] }), { '.ds-menu-item': 'item' })).toBe('item');
  });

  it('falls back to icon for svg and label for text', () => {
    expect(roleFor(node({ tag: 'svg', svg: '<svg/>' }))).toBe('icon');
    expect(roleFor(node({ text: 'hi' }))).toBe('label');
  });
});
