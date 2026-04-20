import { describe, it, expect } from 'vitest';
import { reshuffle } from './shuffle';

type Item = { id: string; locked: boolean; value: number };

describe('reshuffle', () => {
  it('preserves locked items at their original indices', () => {
    const items: Item[] = [
      { id: 'a', locked: false, value: 1 },
      { id: 'b', locked: true,  value: 2 },
      { id: 'c', locked: false, value: 3 },
      { id: 'd', locked: true,  value: 4 },
    ];
    const generate = (): Item => ({ id: 'new', locked: false, value: 99 });
    const out = reshuffle(items, generate);
    expect(out[1]).toEqual(items[1]);
    expect(out[3]).toEqual(items[3]);
    expect(out[0].value).toBe(99);
    expect(out[2].value).toBe(99);
  });

  it('returns the same array when everything is locked', () => {
    const items: Item[] = [
      { id: 'a', locked: true, value: 1 },
      { id: 'b', locked: true, value: 2 },
    ];
    const out = reshuffle(items, () => ({ id: 'never', locked: false, value: 0 }));
    expect(out).toEqual(items);
  });

  it('replaces every item when nothing is locked', () => {
    const items: Item[] = [
      { id: 'a', locked: false, value: 1 },
      { id: 'b', locked: false, value: 2 },
    ];
    let i = 0;
    const out = reshuffle(items, () => ({ id: `g${i++}`, locked: false, value: 10 + i }));
    expect(out.every(x => x.value >= 10)).toBe(true);
  });

  it('handles an empty array', () => {
    expect(reshuffle<Item>([], () => ({ id: 'x', locked: false, value: 0 }))).toEqual([]);
  });
});
