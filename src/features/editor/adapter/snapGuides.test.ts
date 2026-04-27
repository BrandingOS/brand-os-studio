import { describe, expect, it } from 'vitest';
import { computeSnap, SNAP_THRESHOLD_PX, type BBox } from './snapGuides';

const moving: BBox = { x: 100, y: 100, width: 50, height: 50 };

describe('computeSnap', () => {
  it('returns no snap when nothing is within threshold', () => {
    const others: BBox[] = [{ x: 500, y: 500, width: 50, height: 50 }];
    const r = computeSnap(moving, others);
    expect(r.snappedX).toBe(null);
    expect(r.snappedY).toBe(null);
    expect(r.guides).toEqual([]);
  });

  it('snaps left edge to another object left edge within threshold', () => {
    const others: BBox[] = [{ x: 102, y: 500, width: 50, height: 50 }];
    const r = computeSnap(moving, others);
    expect(r.snappedX).toBe(102);
    expect(r.guides).toContainEqual({ axis: 'x', position: 102 });
  });

  it('snaps center-to-center', () => {
    const others: BBox[] = [{ x: 200, y: 100, width: 50, height: 50 }];
    // Moving center: 100 + 25 = 125. Other center: 200 + 25 = 225.
    // |125 - 225| = 100, way past threshold. So no snap here.
    expect(computeSnap(moving, others).snappedX).toBe(null);

    // Place another so centers align within threshold:
    // Moving center.x = 125. Want other center to be ~127 (delta = 2).
    // other.x = 102 → other.center = 127.
    const others2: BBox[] = [{ x: 102, y: 100, width: 50, height: 50 }];
    const r = computeSnap(moving, others2);
    // The closest pairing is left-to-left (delta=2) which beats center-to-center
    // (delta=2 also). Either is acceptable; snappedX should be 102 in both.
    expect(r.snappedX).toBe(102);
  });

  it('picks the closest target when multiple are within threshold', () => {
    const others: BBox[] = [
      { x: 103, y: 500, width: 50, height: 50 }, // delta 3 to left edge
      { x: 101, y: 500, width: 50, height: 50 }, // delta 1 to left edge — closer
    ];
    const r = computeSnap(moving, others);
    expect(r.snappedX).toBe(101);
  });

  it('emits both x and y guides when both axes match', () => {
    const others: BBox[] = [{ x: 102, y: 103, width: 50, height: 50 }];
    const r = computeSnap(moving, others);
    expect(r.snappedX).toBe(102);
    expect(r.snappedY).toBe(103);
    expect(r.guides.length).toBe(2);
  });

  it('respects the configured threshold', () => {
    const others: BBox[] = [{ x: 100 + SNAP_THRESHOLD_PX, y: 500, width: 50, height: 50 }];
    // Exactly at threshold should NOT snap (strict `<` inside).
    expect(computeSnap(moving, others).snappedX).toBe(null);
  });
});
