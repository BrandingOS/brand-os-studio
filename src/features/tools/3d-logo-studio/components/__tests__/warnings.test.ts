import { describe, it, expect } from 'vitest';
import { summariseWarnings } from '../Studio3dEditor';
import type { RevolveWarning } from '../../engine/modes/revolve';

const crossing = (id: string): RevolveWarning => ({ code: 'profile-crosses-axis', componentId: id });
const empty = (id: string): RevolveWarning => ({ code: 'empty-profile', componentId: id });

describe('summariseWarnings', () => {
  it('says nothing when there is nothing to say', () => {
    expect(summariseWarnings([])).toEqual([]);
  });

  it('collapses one message per kind, not one per component', () => {
    // The nine-dot mark raised the identical sentence nine times, and the wall
    // of banners pushed the artwork off the screen.
    const nine = Array.from({ length: 9 }, (_, i) => crossing(`dot-${i}`));
    const out = summariseWarnings(nine);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('9 parts');
  });

  it('keeps different kinds separate', () => {
    const out = summariseWarnings([crossing('a'), crossing('b'), empty('c')]);
    expect(out).toHaveLength(2);
    expect(out.some((m) => m.includes('2 parts'))).toBe(true);
    expect(out.some((m) => m.includes('One part'))).toBe(true);
  });

  it('reads correctly for a single component', () => {
    const out = summariseWarnings([crossing('only')]);
    expect(out[0]).toContain('One part');
    expect(out[0]).not.toContain('1 parts');
  });

  it('tells the user what to change, not just what went wrong', () => {
    expect(summariseWarnings([crossing('a')])[0]).toMatch(/pivot|offset/i);
  });
});
