/**
 * =============================================================================
 * Segment index — accelerated distance-to-boundary
 * =============================================================================
 *
 * Inflate asks "how far is this vertex from the edge of the shape?" once per
 * vertex, and a detailed logo has tens of thousands of both vertices and edges.
 * The naive double loop is O(V·E) and turns a 30 ms operation into a 30 s one.
 *
 * This buckets every boundary segment into a uniform grid and searches outward
 * in square rings, stopping as soon as the next ring cannot possibly hold
 * anything closer than the best found so far. Uniform grids are the right
 * structure here because logo contours are evenly sampled by construction —
 * there is no clustering for a BVH to exploit.
 */

import type { Bounds2, Ring } from '../types';
import { ringBounds } from './polygon';

export class SegmentIndex {
  /** Flat segment store: [ax, ay, bx, by] per segment. */
  private readonly seg: Float64Array;
  private readonly count: number;
  private readonly cell: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly minX: number;
  private readonly minY: number;
  /** CSR-style buckets: `start[c]…start[c+1]` indexes into `items`. */
  private readonly start: Uint32Array;
  private readonly items: Uint32Array;

  constructor(rings: readonly Ring[], targetPerCell = 2) {
    const segs: number[] = [];
    const b: Bounds2 = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const ring of rings) {
      const n = ring.length / 2;
      if (n < 2) continue;
      ringBounds(ring, b);
      for (let i = 0, j = n - 1; i < n; j = i++) {
        segs.push(ring[j * 2], ring[j * 2 + 1], ring[i * 2], ring[i * 2 + 1]);
      }
    }
    this.seg = Float64Array.from(segs);
    this.count = segs.length / 4;

    if (this.count === 0) {
      this.cell = 1; this.cols = 1; this.rows = 1; this.minX = 0; this.minY = 0;
      this.start = new Uint32Array(2); this.items = new Uint32Array(0);
      return;
    }

    const w = Math.max(b.maxX - b.minX, 1e-9);
    const h = Math.max(b.maxY - b.minY, 1e-9);
    // Aim for `targetPerCell` segments per cell; clamp so a pathological file
    // cannot ask for a hundred million cells.
    const wanted = Math.max(1, Math.ceil(this.count / targetPerCell));
    let cell = Math.sqrt((w * h) / wanted);
    if (!(cell > 0) || !Number.isFinite(cell)) cell = Math.max(w, h);
    const maxDim = 512;
    this.cell = Math.max(cell, Math.max(w, h) / maxDim);
    this.cols = Math.max(1, Math.min(maxDim, Math.ceil(w / this.cell) + 1));
    this.rows = Math.max(1, Math.min(maxDim, Math.ceil(h / this.cell) + 1));
    this.minX = b.minX;
    this.minY = b.minY;

    // Two-pass counting sort into CSR buckets — no arrays of arrays.
    const nCells = this.cols * this.rows;
    const counts = new Uint32Array(nCells + 1);
    const cellsFor = (k: number): [number, number, number, number] => {
      const ax = this.seg[k * 4], ay = this.seg[k * 4 + 1];
      const bx = this.seg[k * 4 + 2], by = this.seg[k * 4 + 3];
      return [
        this.clampCol(Math.min(ax, bx)), this.clampRow(Math.min(ay, by)),
        this.clampCol(Math.max(ax, bx)), this.clampRow(Math.max(ay, by)),
      ];
    };
    let total = 0;
    for (let k = 0; k < this.count; k++) {
      const [c0, r0, c1, r1] = cellsFor(k);
      total += (c1 - c0 + 1) * (r1 - r0 + 1);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) counts[r * this.cols + c + 1]++;
    }
    for (let i = 1; i <= nCells; i++) counts[i] += counts[i - 1];
    this.start = counts;
    this.items = new Uint32Array(total);
    const cursor = Uint32Array.from(counts.subarray(0, nCells));
    for (let k = 0; k < this.count; k++) {
      const [c0, r0, c1, r1] = cellsFor(k);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.items[cursor[r * this.cols + c]++] = k;
    }
  }

  private clampCol(x: number): number {
    const c = Math.floor((x - this.minX) / this.cell);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  private clampRow(y: number): number {
    const r = Math.floor((y - this.minY) / this.cell);
    return r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
  }

  /** Unsigned distance from (x, y) to the nearest boundary segment. */
  distance(x: number, y: number): number {
    if (this.count === 0) return Infinity;
    const c = this.clampCol(x);
    const r = this.clampRow(y);
    let bestSq = Infinity;
    const maxRadius = Math.max(this.cols, this.rows);

    for (let radius = 0; radius <= maxRadius; radius++) {
      // Nothing in ring `radius` can be nearer than (radius - 1) cells, so once
      // the best beats that the search is finished. Compared squared, because
      // that is how the best is carried.
      if (radius > 0) {
        const floor = (radius - 1) * this.cell;
        if (bestSq <= floor * floor) break;
      }
      const c0 = c - radius, c1 = c + radius, r0 = r - radius, r1 = r + radius;
      for (let rr = r0; rr <= r1; rr++) {
        if (rr < 0 || rr >= this.rows) continue;
        const edgeRow = rr === r0 || rr === r1;
        for (let cc = c0; cc <= c1; cc++) {
          if (cc < 0 || cc >= this.cols) continue;
          // Only the perimeter of the square is new on this pass.
          if (!edgeRow && cc !== c0 && cc !== c1) continue;
          const cellIdx = rr * this.cols + cc;
          for (let p = this.start[cellIdx]; p < this.start[cellIdx + 1]; p++) {
            const k = this.items[p];
            const d = distSqToSegment(
              x, y,
              this.seg[k * 4], this.seg[k * 4 + 1],
              this.seg[k * 4 + 2], this.seg[k * 4 + 3],
            );
            if (d < bestSq) bestSq = d;
          }
        }
      }
    }
    return Math.sqrt(bestSq);
  }
}

function distSqToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  return cx * cx + cy * cy;
}
