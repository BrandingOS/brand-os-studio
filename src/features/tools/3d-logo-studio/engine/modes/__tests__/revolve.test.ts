import { describe, it, expect } from 'vitest';
import type { Component, MeshData, Ring } from '../../types';
import { revolve, DEFAULT_REVOLVE } from '../revolve';

const rect = (x0: number, y0: number, x1: number, y1: number): Ring =>
  Float64Array.from([x0, y0, x1, y0, x1, y1, x0, y1]);
const comp = (id: string, rings: Ring[]): Component => ({ id, rings, fillRule: 'nonzero' });

const bounds = (m: MeshData) => {
  const b = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (let i = 0; i < m.positions.length; i += 3) {
    b.minX = Math.min(b.minX, m.positions[i]); b.maxX = Math.max(b.maxX, m.positions[i]);
    b.minY = Math.min(b.minY, m.positions[i + 1]); b.maxY = Math.max(b.maxY, m.positions[i + 1]);
    b.minZ = Math.min(b.minZ, m.positions[i + 2]); b.maxZ = Math.max(b.maxZ, m.positions[i + 2]);
  }
  return b;
};

describe('revolve', () => {
  it('returns an empty mesh and no warnings for no components', () => {
    const r = revolve([]);
    expect(r.mesh.indices).toHaveLength(0);
    expect(r.warnings).toEqual([]);
  });

  it('sweeps a rectangle offset from the axis into a tube', () => {
    // 10..20 from the axis, 30 tall: a cylinder shell of outer radius 20
    const profile = comp('p', [rect(10, 0, 20, 30)]);
    const { mesh, warnings } = revolve([profile], { axis: 'y', pivot: 0, offset: -10, segments: 48 });
    expect(warnings).toEqual([]);
    const b = bounds(mesh);
    expect(b.maxZ).toBeCloseTo(20, 0);
    expect(b.minZ).toBeCloseTo(-20, 0);
    expect(b.maxY - b.minY).toBeCloseTo(30, 0); // height is untouched by the sweep
  });

  it('a partial sweep spans less than a full one and can be capped', () => {
    const profile = comp('p', [rect(10, 0, 20, 30)]);
    const half = revolve([profile], { pivot: 0, offset: -10, sweep: Math.PI, caps: true });
    const whole = revolve([profile], { pivot: 0, offset: -10, sweep: Math.PI * 2 });
    expect(bounds(half.mesh).minZ).toBeCloseTo(0, 6);   // only the +Z half exists
    expect(bounds(whole.mesh).minZ).toBeLessThan(-1);
    const uncapped = revolve([profile], { pivot: 0, offset: -10, sweep: Math.PI, caps: false });
    expect(half.mesh.indices.length).toBeGreaterThan(uncapped.mesh.indices.length);
  });

  it('warns when the profile straddles the axis instead of silently folding', () => {
    const profile = comp('p', [rect(-10, 0, 10, 20)]);
    const { warnings } = revolve([profile], { axis: 'y', pivot: 0.5 });
    expect(warnings).toEqual([{ code: 'profile-crosses-axis', componentId: 'p' }]);
  });

  it('does not warn when the profile sits wholly to one side', () => {
    const profile = comp('p', [rect(10, 0, 20, 20)]);
    expect(revolve([profile], { axis: 'y', pivot: 0, offset: -10 }).warnings).toEqual([]);
  });

  it('reports an empty profile rather than dropping it silently', () => {
    const { warnings } = revolve([comp('bad', [Float64Array.from([0, 0, 1, 1])])]);
    expect(warnings).toEqual([{ code: 'empty-profile', componentId: 'bad' }]);
  });

  it('segments control the smoothness of the sweep', () => {
    const profile = comp('p', [rect(10, 0, 20, 30)]);
    const coarse = revolve([profile], { pivot: 0, offset: -10, segments: 8 });
    const fine = revolve([profile], { pivot: 0, offset: -10, segments: 96 });
    expect(fine.mesh.positions.length).toBeGreaterThan(coarse.mesh.positions.length * 5);
  });

  it('the x axis sweeps about the other direction', () => {
    const profile = comp('p', [rect(0, 10, 30, 20)]);
    const y = revolve([profile], { axis: 'y', pivot: 0, offset: -10 });
    const x = revolve([profile], { axis: 'x', pivot: 0, offset: -10 });
    expect(bounds(y.mesh).maxX - bounds(y.mesh).minX)
      .not.toBeCloseTo(bounds(x.mesh).maxX - bounds(x.mesh).minX, 1);
  });

  it('keeps each component addressable', () => {
    const a = comp('a', [rect(10, 0, 20, 10)]);
    const b = comp('b', [rect(10, 40, 20, 50)]);
    const { mesh } = revolve([a, b], { pivot: 0, offset: -10 });
    expect(mesh.groups.map((g) => g.componentId)).toEqual(['a', 'b']);
  });

  it('emits finite unit normals', () => {
    const { mesh } = revolve([comp('p', [rect(10, 0, 20, 30)])], { pivot: 0, offset: -10 });
    for (let i = 0; i < mesh.normals.length; i += 3) {
      expect(Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2])).toBeCloseTo(1, 4);
    }
  });

  it('clamps a nonsense sweep instead of producing nothing', () => {
    const profile = comp('p', [rect(10, 0, 20, 30)]);
    expect(revolve([profile], { sweep: -5, pivot: 0, offset: -10 }).mesh.indices.length).toBeGreaterThan(0);
    expect(revolve([profile], { sweep: 99, pivot: 0, offset: -10 }).mesh.indices.length).toBeGreaterThan(0);
  });

  it('defaults to a full revolution about Y', () => {
    expect(DEFAULT_REVOLVE.sweep).toBeCloseTo(Math.PI * 2);
    expect(DEFAULT_REVOLVE.axis).toBe('y');
  });
});
