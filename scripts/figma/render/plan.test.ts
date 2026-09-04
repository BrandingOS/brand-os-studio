import { describe, expect, it } from 'vitest';
import {
  dedupeVariants, orderByDependency, refsOf, visualFingerprint, variableNameFor,
} from './plan';
import type { PlanNode, PlanSet, PlanVariant } from './plan';

function node(over: Partial<PlanNode> = {}): PlanNode {
  return {
    sid: 'n', name: 'n', kind: 'frame',
    layout: { mode: 'none' } as PlanNode['layout'],
    sizing: { width: 'hug', height: 'hug' } as PlanNode['sizing'],
    fills: [], strokes: [], radii: [0, 0, 0, 0], effects: [], opacity: 1,
    children: [], ...over,
  };
}

function variant(axes: Record<string, string>, n: PlanNode): PlanVariant {
  return {
    sid: `ds/x[${Object.entries(axes).map(([k, v]) => `${k}=${v}`).join(',')}]`,
    name: Object.keys(axes).sort().map((k) => `${k}=${axes[k]}`).join(', '),
    axes,
    node: n,
  };
}

function set(variants: PlanVariant[]): PlanSet {
  return { sid: 'ds/x', name: 'DsX', page: '03', variants };
}

describe('dedupeVariants', () => {
  /**
   * The regression this whole function exists to prevent.
   *
   * The product paints a disabled toggle exactly like an enabled one — an
   * accessibility defect in the CSS. The old fingerprint-based collapse then
   * DELETED `disabled=true` from the component set, so the design system
   * silently inherited the bug and a designer could no longer specify the
   * state at all.
   */
  it('keeps a semantic state whose rendering is identical to another cell', () => {
    const identical = node({ fills: [{ v: '#ffffff' }] });
    const r = dedupeVariants(set([
      variant({ checked: 'false', disabled: 'false' }, identical),
      variant({ checked: 'false', disabled: 'true' }, node({ fills: [{ v: '#ffffff' }] })),
    ]));

    expect(r.set.variants).toHaveLength(2);
    expect(r.set.variants.map((v) => v.axes.disabled).sort()).toEqual(['false', 'true']);
  });

  it('reports the identical pair rather than acting on it', () => {
    const r = dedupeVariants(set([
      variant({ disabled: 'false' }, node({ fills: [{ v: '#fff' }] })),
      variant({ disabled: 'true' }, node({ fills: [{ v: '#fff' }] })),
    ]));

    expect(r.visuallyIdentical).toEqual([
      { sid: 'ds/x[disabled=true]', same: 'ds/x[disabled=false]', axes: { disabled: 'true' } },
    ]);
  });

  /** A tone that currently paints like another tone is a bug to fix, not a variant to drop. */
  it('keeps a tone that renders identically to a different tone', () => {
    const r = dedupeVariants(set([
      variant({ tone: 'neutral' }, node({ fills: [{ v: '#eee' }] })),
      variant({ tone: 'success' }, node({ fills: [{ v: '#eee' }] })),
    ]));
    expect(r.set.variants.map((v) => v.axes.tone)).toEqual(['neutral', 'success']);
  });

  it('never reports a cell as identical to itself', () => {
    const r = dedupeVariants(set([variant({ tone: 'neutral' }, node())]));
    expect(r.visuallyIdentical).toEqual([]);
  });

  it('drops an axis that carries one declared value, so a lone cell is not a set', () => {
    const r = dedupeVariants(set([variant({ state: 'default' }, node())]));
    expect(r.droppedAxes).toEqual(['state']);
    expect(r.set.variants[0].axes).toEqual({});
    expect(r.set.variants[0].name).toBe('default');
  });

  it('drops only the single-valued axis, keeping the one that distinguishes', () => {
    const r = dedupeVariants(set([
      variant({ size: 'md', tone: 'primary' }, node()),
      variant({ size: 'md', tone: 'danger' }, node({ fills: [{ v: '#c00' }] })),
    ]));
    expect(r.droppedAxes).toEqual(['size']);
    expect(r.set.variants.map((v) => v.name)).toEqual(['tone=primary', 'tone=danger']);
  });

  /** Duplicate variant names make combineAsVariants throw, so this is load-bearing. */
  it('leaves every surviving variant name distinct', () => {
    const r = dedupeVariants(set([
      variant({ checked: 'false', disabled: 'false' }, node()),
      variant({ checked: 'false', disabled: 'true' }, node()),
      variant({ checked: 'true', disabled: 'false' }, node()),
      variant({ checked: 'true', disabled: 'true' }, node()),
    ]));
    const names = r.set.variants.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('preserves the declared sid, so a rerun reconciles instead of duplicating', () => {
    const r = dedupeVariants(set([
      variant({ state: 'default', tone: 'a' }, node()),
      variant({ state: 'hover', tone: 'a' }, node()),
    ]));
    expect(r.set.variants.map((v) => v.sid)).toEqual([
      'ds/x[state=default,tone=a]',
      'ds/x[state=hover,tone=a]',
    ]);
  });
});

describe('visualFingerprint', () => {
  it('ignores sid, so two cells differing only in name match', () => {
    expect(visualFingerprint(node({ sid: 'a' }))).toBe(visualFingerprint(node({ sid: 'b' })));
  });

  it('separates cells whose fills differ', () => {
    expect(visualFingerprint(node({ fills: [{ v: '#000' }] })))
      .not.toBe(visualFingerprint(node({ fills: [{ v: '#fff' }] })));
  });

  it('reaches into children', () => {
    expect(visualFingerprint(node({ children: [node({ opacity: 0.4 })] })))
      .not.toBe(visualFingerprint(node({ children: [node({ opacity: 1 })] })));
  });
});

describe('orderByDependency', () => {
  const withRef = (sid: string, ref?: string): PlanSet => ({
    sid,
    name: sid,
    page: '04',
    variants: [variant({}, node(ref ? { children: [node({ ref })] } : {}))],
  });

  it('places a container after the component it instantiates', () => {
    const out = orderByDependency([
      withRef('p/colors-group', 'p/color-swatch'),
      withRef('p/color-swatch'),
    ]);
    expect(out.map((s) => s.sid)).toEqual(['p/color-swatch', 'p/colors-group']);
  });

  /**
   * The case sid ordering gets wrong. Every dependency in the current manifest
   * happens to be satisfied alphabetically, which is luck, not a property.
   */
  it('orders a container named before its dependency', () => {
    const out = orderByDependency([withRef('p/aaa', 'p/zzz'), withRef('p/zzz')]);
    expect(out.map((s) => s.sid)).toEqual(['p/zzz', 'p/aaa']);
  });

  it('resolves a ref carrying a variant suffix back to its set', () => {
    const out = orderByDependency([withRef('p/aaa', 'p/zzz[state=on]'), withRef('p/zzz')]);
    expect(out.map((s) => s.sid)).toEqual(['p/zzz', 'p/aaa']);
  });

  it('reaches through a chain', () => {
    const out = orderByDependency([
      withRef('p/a', 'p/b'), withRef('p/b', 'p/c'), withRef('p/c'),
    ]);
    expect(out.map((s) => s.sid)).toEqual(['p/c', 'p/b', 'p/a']);
  });

  it('keeps sid order among sets that depend on nothing', () => {
    const out = orderByDependency([withRef('p/c'), withRef('p/a'), withRef('p/b')]);
    expect(out.map((s) => s.sid)).toEqual(['p/a', 'p/b', 'p/c']);
  });

  /** A cycle is a manifest bug; it must surface on the canvas, not kill the run. */
  it('survives a cycle without throwing, emitting every set once', () => {
    const out = orderByDependency([withRef('p/a', 'p/b'), withRef('p/b', 'p/a')]);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((s) => s.sid)).size).toBe(2);
  });

  it('ignores a ref to something outside the plan', () => {
    const out = orderByDependency([withRef('p/a', 'ds/button')]);
    expect(out.map((s) => s.sid)).toEqual(['p/a']);
  });
});

describe('refsOf', () => {
  it('collects refs from anywhere in the tree, deduplicated', () => {
    const set: PlanSet = {
      sid: 'p/x',
      name: 'x',
      page: '04',
      variants: [variant({}, node({
        children: [
          node({ ref: 'p/a' }),
          node({ children: [node({ ref: 'p/a' }), node({ ref: 'p/b' })] }),
        ],
      }))],
    };
    expect(refsOf(set).sort()).toEqual(['p/a', 'p/b']);
  });

  it('is empty for a set that instantiates nothing', () => {
    expect(refsOf({ sid: 'p/x', name: 'x', page: '04', variants: [variant({}, node())] }))
      .toEqual([]);
  });
});

describe('variableNameFor', () => {
  it('turns a token into a readable Figma path', () => {
    expect(variableNameFor('--ds-surface-hover')).toBe('surface/hover');
    expect(variableNameFor('--ds-accent')).toBe('accent');
  });
});
