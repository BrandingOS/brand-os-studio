import { describe, it, expect } from 'vitest';
import {
  sid, variantSid, childSid, parseSid, assignOrdinals, bySid, resolveAlias,
  type AliasTable,
} from './sid';

describe('sid grammar', () => {
  it('joins plain segments', () => {
    expect(sid('ds', 'button')).toBe('ds/button');
    expect(sid('foundations', 'color', 'ds-accent')).toBe('foundations/color/ds-accent');
  });

  it('rejects segments that would break parsing', () => {
    expect(() => sid('ds', 'Button')).toThrow();      // uppercase
    expect(() => sid('ds', 'a b')).toThrow();         // space
    expect(() => sid('ds', 'a/b')).toThrow();         // separator
    expect(() => sid('ds', 'a[1]')).toThrow();        // axis bracket
  });
});

describe('variantSid — rule 1: iteration order is not identity', () => {
  it('sorts axes by key so the same axes in any order give the same sid', () => {
    const a = variantSid('ds/button', { tone: 'primary', state: 'hover', size: 'md' });
    const b = variantSid('ds/button', { size: 'md', state: 'hover', tone: 'primary' });
    expect(a).toBe(b);
    expect(a).toBe('ds/button[size=md,state=hover,tone=primary]');
  });

  it('returns the base untouched when there are no axes', () => {
    expect(variantSid('ds/button', {})).toBe('ds/button');
  });
});

describe('childSid — rule 2: repeated siblings must not collide', () => {
  it('omits the ordinal for the first occurrence', () => {
    expect(childSid('ds/menu/item', 'icon')).toBe('ds/menu/item/icon');
    expect(childSid('ds/menu/item', 'icon', 1)).toBe('ds/menu/item/icon');
  });

  it('suffixes later occurrences', () => {
    expect(childSid('ds/menu/item', 'icon', 2)).toBe('ds/menu/item/icon#2');
    expect(childSid('ds/menu/item', 'icon', 3)).toBe('ds/menu/item/icon#3');
  });

  it('three sibling icons produce three distinct sids', () => {
    const sids = assignOrdinals(['icon', 'icon', 'icon'])
      .map((r) => `ds/menu/item/${r}`);
    expect(new Set(sids).size).toBe(3);
  });

  it('adding a second sibling does not re-key the first', () => {
    const before = assignOrdinals(['icon']);
    const after = assignOrdinals(['icon', 'icon']);
    expect(after[0]).toBe(before[0]);
  });

  it('interleaved roles each get their own counter', () => {
    expect(assignOrdinals(['icon', 'label', 'icon', 'label', 'icon']))
      .toEqual(['icon', 'label', 'icon#2', 'label#2', 'icon#3']);
  });
});

describe('parseSid', () => {
  it('round-trips a variant sid', () => {
    const value = variantSid('ds/button', { state: 'hover', tone: 'primary' });
    const parsed = parseSid(value);
    expect(parsed.base).toBe('ds/button');
    expect(parsed.axes).toEqual({ state: 'hover', tone: 'primary' });
  });

  it('reads ordinals back off segments', () => {
    const parsed = parseSid('ds/menu/item#2/icon#3');
    expect(parsed.segments).toEqual([
      { role: 'ds', ordinal: 1 },
      { role: 'menu', ordinal: 1 },
      { role: 'item', ordinal: 2 },
      { role: 'icon', ordinal: 3 },
    ]);
  });

  it('handles a base with no axes', () => {
    expect(parseSid('ds/button').axes).toEqual({});
  });
});

describe('bySid — determinism', () => {
  it('orders independently of input order', () => {
    const a = bySid([{ sid: 'b' }, { sid: 'a' }, { sid: 'c' }]).map((x) => x.sid);
    const b = bySid([{ sid: 'c' }, { sid: 'b' }, { sid: 'a' }]).map((x) => x.sid);
    expect(a).toEqual(b);
    expect(a).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate its input', () => {
    const input = [{ sid: 'b' }, { sid: 'a' }];
    bySid(input);
    expect(input.map((x) => x.sid)).toEqual(['b', 'a']);
  });
});

describe('alias table — rule 3: dedup must not re-key', () => {
  it('resolves a collapsed sid to its survivor', () => {
    const table: AliasTable = new Map([
      ['ds/button[state=active,tone=tertiary]', 'ds/button[state=default,tone=tertiary]'],
    ]);
    expect(resolveAlias(table, 'ds/button[state=active,tone=tertiary]'))
      .toBe('ds/button[state=default,tone=tertiary]');
  });

  it('follows a chain', () => {
    const table: AliasTable = new Map([['a', 'b'], ['b', 'c']]);
    expect(resolveAlias(table, 'a')).toBe('c');
  });

  it('leaves an unaliased sid alone', () => {
    expect(resolveAlias(new Map(), 'ds/button')).toBe('ds/button');
  });

  it('throws on a cycle rather than looping forever', () => {
    const table: AliasTable = new Map([['a', 'b'], ['b', 'a']]);
    expect(() => resolveAlias(table, 'a')).toThrow(/cycle/);
  });

  it('collapsing a state does not change the surviving sid itself', () => {
    // tertiary has no :active rule, so active collapses onto default.
    const declared = variantSid('ds/button', { tone: 'tertiary', state: 'active' });
    const survivor = variantSid('ds/button', { tone: 'tertiary', state: 'default' });
    const table: AliasTable = new Map([[declared, survivor]]);
    // The SURVIVOR's sid is untouched by the collapse — that is the whole point.
    expect(resolveAlias(table, survivor)).toBe(survivor);
  });
});
