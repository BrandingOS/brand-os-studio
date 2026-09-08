/**
 * =============================================================================
 * Mesh builder
 * =============================================================================
 *
 * Accumulates vertices and triangles into the flat typed arrays every consumer
 * downstream wants, and tracks which slice of the index buffer belongs to which
 * component — that mapping is what keeps per-component selection, hiding and
 * materials possible after the geometry has been generated.
 */

import type { MeshData, MeshGroup } from '../types';

export class MeshBuilder {
  private px: number[] = [];
  private nx: number[] = [];
  private uv: number[] = [];
  private idx: number[] = [];
  private groups: MeshGroup[] = [];
  private openGroup: { componentId: string; start: number } | null = null;

  get vertexCount(): number {
    return this.px.length / 3;
  }

  get indexCount(): number {
    return this.idx.length;
  }

  /** Returns the new vertex's index. Normals default to zero and are usually
   *  filled in later by `computeVertexNormals`. */
  vertex(x: number, y: number, z: number, u = 0, v = 0, nx = 0, ny = 0, nz = 0): number {
    const i = this.px.length / 3;
    this.px.push(x, y, z);
    this.nx.push(nx, ny, nz);
    this.uv.push(u, v);
    return i;
  }

  triangle(a: number, b: number, c: number): void {
    // A collapsed triangle contributes nothing and poisons normal averaging.
    if (a === b || b === c || a === c) return;
    this.idx.push(a, b, c);
  }

  beginComponent(componentId: string): void {
    this.endComponent();
    this.openGroup = { componentId, start: this.idx.length };
  }

  endComponent(): void {
    if (!this.openGroup) return;
    const count = this.idx.length - this.openGroup.start;
    if (count > 0) this.groups.push({ ...this.openGroup, count });
    this.openGroup = null;
  }

  /**
   * Area-weighted vertex normals.
   *
   * Area weighting rather than a plain average because inflate produces wildly
   * uneven triangles — a dense fan near a corner would otherwise outvote the
   * large triangles that actually describe the surface, and the shading breaks
   * up exactly where the artwork is most detailed.
   */
  computeVertexNormals(): void {
    const n = this.px.length;
    const out = new Float64Array(n);
    for (let t = 0; t < this.idx.length; t += 3) {
      const a = this.idx[t] * 3;
      const b = this.idx[t + 1] * 3;
      const c = this.idx[t + 2] * 3;
      const ux = this.px[b] - this.px[a];
      const uy = this.px[b + 1] - this.px[a + 1];
      const uz = this.px[b + 2] - this.px[a + 2];
      const vx = this.px[c] - this.px[a];
      const vy = this.px[c + 1] - this.px[a + 1];
      const vz = this.px[c + 2] - this.px[a + 2];
      // Un-normalized cross product: its length is twice the triangle area,
      // which is the weight we want.
      const cx = uy * vz - uz * vy;
      const cy = uz * vx - ux * vz;
      const cz = ux * vy - uy * vx;
      out[a] += cx; out[a + 1] += cy; out[a + 2] += cz;
      out[b] += cx; out[b + 1] += cy; out[b + 2] += cz;
      out[c] += cx; out[c + 1] += cy; out[c + 2] += cz;
    }
    for (let i = 0; i < n; i += 3) {
      const len = Math.hypot(out[i], out[i + 1], out[i + 2]);
      if (len > 1e-12) {
        this.nx[i] = out[i] / len;
        this.nx[i + 1] = out[i + 1] / len;
        this.nx[i + 2] = out[i + 2] / len;
      } else {
        this.nx[i] = 0; this.nx[i + 1] = 0; this.nx[i + 2] = 1;
      }
    }
  }

  build(): MeshData {
    this.endComponent();
    return {
      positions: Float32Array.from(this.px),
      normals: Float32Array.from(this.nx),
      uvs: Float32Array.from(this.uv),
      indices: Uint32Array.from(this.idx),
      groups: this.groups,
    };
  }
}
