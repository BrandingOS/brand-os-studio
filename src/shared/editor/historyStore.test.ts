import { describe, expect, it } from 'vitest';

import { capPersistedHistory, type SlideHistory } from './historyStore';

function history(count: number, startTs = 1000): SlideHistory {
  return {
    snapshots: Array.from({ length: count }, (_, i) => ({
      html: `<p>${i}</p>`,
      timestamp: startTs + i,
    })),
    currentIndex: count - 1,
  };
}

describe('capPersistedHistory', () => {
  it('keeps only the newest snapshots per slide', () => {
    const out = capPersistedHistory({ ed1: { s1: history(40) } });
    expect(out.ed1.s1.snapshots).toHaveLength(8);
    // The tail is what survives — newest snapshot is still last.
    expect(out.ed1.s1.snapshots.at(-1)?.html).toBe('<p>39</p>');
  });

  it('keeps currentIndex pointing at the same snapshot', () => {
    const out = capPersistedHistory({ ed1: { s1: history(40) } });
    const kept = out.ed1.s1;
    expect(kept.snapshots[kept.currentIndex].html).toBe('<p>39</p>');
  });

  it('never emits an out-of-range currentIndex', () => {
    const trimmed = capPersistedHistory({
      ed1: { s1: { ...history(40), currentIndex: 2 } },
    });
    const kept = trimmed.ed1.s1;
    expect(kept.currentIndex).toBeGreaterThanOrEqual(0);
    expect(kept.currentIndex).toBeLessThan(kept.snapshots.length);
  });

  it('drops the least recently touched editors', () => {
    const data: Record<string, Record<string, SlideHistory>> = {};
    for (let i = 0; i < 9; i++) data[`ed${i}`] = { s1: history(3, i * 1000) };
    const out = capPersistedHistory(data);
    expect(Object.keys(out)).toHaveLength(4);
    expect(Object.keys(out)).toContain('ed8'); // newest kept
    expect(Object.keys(out)).not.toContain('ed0'); // oldest dropped
  });

  it('caps slides per editor', () => {
    const slides: Record<string, SlideHistory> = {};
    for (let i = 0; i < 20; i++) slides[`s${i}`] = history(3, i * 100);
    const out = capPersistedHistory({ ed1: slides });
    expect(Object.keys(out.ed1)).toHaveLength(12);
  });

  it('shrinks a fat history far below the original size', () => {
    const fat = { ed1: { s1: { snapshots: Array.from({ length: 50 }, (_, i) => ({ html: 'x'.repeat(20_000), timestamp: i })), currentIndex: 49 } } };
    const before = JSON.stringify(fat).length;
    const after = JSON.stringify(capPersistedHistory(fat)).length;
    expect(after).toBeLessThan(before * 0.25);
  });
});
