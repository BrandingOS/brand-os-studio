import { describe, it, expect } from 'vitest';
import { deriveLayout, nodeToIR } from './toIR';
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

const TOKENS = { '#111113': '--ds-accent' };

/**
 * The 32-step neutral ramp is why this rule exists: 158px swatches sharing a
 * 1044px row, each pulled back over the one before it. Read as a plain gap of 0,
 * the ramp laid out 5,056px wide.
 */
describe('overlapping stacks become negative item spacing', () => {
  const swatch = (ml: string) => node({
    style: { display: 'block', opacity: '1', 'margin-left': ml },
  });
  const row = (kids: RawNode[], gap = '0px') => node({
    style: {
      display: 'flex', opacity: '1', 'flex-direction': 'row', gap,
      'padding-top': '0px', 'padding-right': '0px',
      'padding-bottom': '0px', 'padding-left': '0px',
    },
    children: kids,
  });

  it('reads a uniform negative margin as negative spacing', () => {
    const kids = [swatch('0px'), ...Array.from({ length: 31 }, () => swatch('-130px'))];
    expect(deriveLayout(row(kids)).gap).toBe(-130);
  });

  it('handles a two-swatch row, where the one margin IS the gap', () => {
    expect(deriveLayout(row([swatch('0px'), swatch('-220px')])).gap).toBe(-220);
  });

  it('adds the overlap to a real gap rather than replacing it', () => {
    expect(deriveLayout(row([swatch('0px'), swatch('-10px'), swatch('-10px')], '4px')).gap).toBe(-6);
  });

  it('ignores a lone nudge the other siblings do not share', () => {
    expect(deriveLayout(row([swatch('0px'), swatch('-40px'), swatch('0px'), swatch('0px')])).gap)
      .toBe(0);
  });

  it('ignores positive margins — only an overlap is a stack', () => {
    expect(deriveLayout(row([swatch('0px'), swatch('8px'), swatch('8px')])).gap).toBe(0);
  });

  it('reads margin-top for a column', () => {
    const kid = (mt: string) => node({ style: { display: 'block', opacity: '1', 'margin-top': mt } });
    const col = node({
      style: {
        display: 'flex', opacity: '1', 'flex-direction': 'column', gap: '0px',
        'padding-top': '0px', 'padding-right': '0px',
        'padding-bottom': '0px', 'padding-left': '0px',
      },
      children: [kid('0px'), kid('-12px'), kid('-12px')],
    });
    expect(deriveLayout(col).gap).toBe(-12);
  });
});

describe('per-instance overrides', () => {
  const opts = { sidRoot: 'screen/setup', variant: {}, tokens: TOKENS, direction: 'ltr' as const };
  const ref = (fx: Record<string, string>) =>
    nodeToIR(node({ fx: { ref: 'pattern/color-swatch', ...fx } }), opts);

  it('records the occurrence colour and size when they were stamped', () => {
    const n = ref({ refFill: 'rgb(47, 158, 95)', refSize: '626,180' });
    expect(n.overrides?.fill).toEqual({ value: '#2f9e5f' });
    expect(n.overrides?.size).toEqual({ w: 626, h: 180 });
  });

  it('keeps token provenance on an overridden fill', () => {
    expect(ref({ refFill: 'rgb(17, 17, 19)' }).overrides?.fill)
      .toEqual({ value: '#111113', token: '--ds-accent' });
  });

  it('carries neither for an ordinary instance', () => {
    // Absence is the point. An override means "this one is genuinely
    // different"; 105 instances each restating their component's own paint
    // would not fit through the transport's 50,000-character cap.
    expect(ref({}).overrides).toBeUndefined();
  });
});

/**
 * The segmented nav's sliding pill is `position: absolute` inside a flex row.
 * Appended into that row it became a 63px empty box that pushed Setup, Brand
 * Kit, Guideline, Design and Tools along in front of it.
 */
describe('a positioned child carries its own offset', () => {
  const opts = { sidRoot: 'pattern/segmented-nav', variant: {}, tokens: TOKENS, direction: 'ltr' as const };
  const row = (kids: RawNode[]) => node({
    style: {
      display: 'flex', opacity: '1', 'flex-direction': 'row', gap: '2px', position: 'relative',
      'padding-top': '0px', 'padding-right': '0px',
      'padding-bottom': '0px', 'padding-left': '0px',
    },
    rect: { x: 532, y: 20, w: 376, h: 43 },
    children: kids,
  });

  it('offsets an absolute child of a FLEX parent', () => {
    const pill = node({
      style: { display: 'block', opacity: '1', position: 'absolute' },
      rect: { x: 537, y: 24, w: 63, h: 33 },
    });
    const ir = nodeToIR(row([pill]), opts);
    expect(ir.children[0].pos).toEqual({ x: 5, y: 4 });
  });

  it('leaves an ordinary flex child to the layout', () => {
    const tab = node({
      style: { display: 'block', opacity: '1', position: 'relative' },
      rect: { x: 537, y: 24, w: 63, h: 33 },
    });
    expect(nodeToIR(row([tab]), opts).children[0].pos).toBeUndefined();
  });

  it('still offsets every child of an absolutely-laid-out parent', () => {
    const box = node({
      style: { display: 'block', opacity: '1' },
      rect: { x: 0, y: 0, w: 200, h: 100 },
      children: [
        node({ style: { display: 'block', opacity: '1' }, rect: { x: 10, y: 20, w: 30, h: 30 } }),
        node({ style: { display: 'block', opacity: '1' }, rect: { x: 60, y: 20, w: 30, h: 30 } }),
      ],
    });
    const ir = nodeToIR(box, opts);
    expect(ir.children.map((c) => c.pos)).toEqual([{ x: 10, y: 20 }, { x: 60, y: 20 }]);
  });
});
