import { describe, it, expect } from 'vitest';
import type { Component, Ring } from '../types';
import {
  createDocument, setGeometryMode, setModeOptions, setDefaultMaterial, setComponentMaterial,
  materialFor, setLighting, setCamera, setTransform, resetTransform, updateComponentState,
  componentStateFor, visibleComponents, resetToSource, IDENTITY_TRANSFORM,
  DOCUMENT_SCHEMA_VERSION, type Studio3dDocument,
} from '../document';
import { buildMesh } from '../buildMesh';
import { DEFAULT_CAMERA, CAMERA_VIEWS, setCameraView, currentCameraView, defaultGeometryFor } from '../document';
import { inflate } from '../modes/inflate';

const circle = (cx: number, cy: number, r: number, n = 48): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};
const comps: Component[] = [
  { id: 'a', rings: [circle(20, 20, 15)], fillRule: 'nonzero' },
  { id: 'b', rings: [circle(60, 20, 15)], fillRule: 'nonzero' },
];
const make = (): Studio3dDocument =>
  createDocument({ svg: '<svg/>', fileName: 'mark.svg', components: comps, id: 'doc-1' });

describe('createDocument', () => {
  it('stamps the schema and engine versions', () => {
    const d = make();
    expect(d.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION);
    expect(d.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('names the project from the file name, without its extension', () => {
    expect(createDocument({ svg: '', fileName: 'Logomark-3d.svg', components: [] }).name).toBe('Logomark-3d');
    expect(createDocument({ svg: '', fileName: 'a/b/deep.svg', components: [] }).name).toBe('deep');
    expect(createDocument({ svg: '', fileName: '.svg', components: [] }).name).toBe('.svg');
    expect(createDocument({ svg: '', fileName: '', components: [] }).name).toBe('Untitled logo');
  });

  it('keeps the source exactly as supplied', () => {
    const svg = '<svg viewBox="0 0 1 1"><!-- comment --></svg>';
    expect(createDocument({ svg, fileName: 'x.svg', components: [] }).source.svg).toBe(svg);
  });

  it('starts with no per-component overrides and an identity transform', () => {
    const d = make();
    expect(d.componentState).toEqual({});
    expect(d.materials.byComponent).toEqual({});
    expect(d.transform).toEqual(IDENTITY_TRANSFORM);
    expect(d.modifiers).toEqual([]);
  });

  it('round-trips through JSON', () => {
    const d = make();
    const back = JSON.parse(JSON.stringify(d));
    expect(back.name).toBe(d.name);
    expect(back.geometry.mode).toBe(d.geometry.mode);
    // typed arrays do not survive JSON — the archive is responsible for the
    // vector data, and this test exists to keep that fact visible
    expect(Array.isArray(back.components[0].rings[0])).toBe(false);
  });
});

describe('operators are pure', () => {
  it('never mutate the input', () => {
    const d = make();
    const snapshot = JSON.stringify({ ...d, updatedAt: '' });
    setGeometryMode(d, 'extrude');
    setDefaultMaterial(d, 'gold');
    setComponentMaterial(d, 'a', 'gold');
    setTransform(d, { position: [1, 2, 3] });
    updateComponentState(d, 'a', { hidden: true });
    expect(JSON.stringify({ ...d, updatedAt: '' })).toBe(snapshot);
  });

  it('return the same object when nothing changes, so identity means "no edit"', () => {
    const d = make();
    expect(setGeometryMode(d, d.geometry.mode)).toBe(d);
    expect(setDefaultMaterial(d, d.materials.defaultId)).toBe(d);
  });
});

describe('geometry settings', () => {
  it('switching mode preserves the settings of every other mode', () => {
    let d = make();
    d = setModeOptions(d, 'extrude', { depth: 42, bevelSize: 3 });
    d = setModeOptions(d, 'inflate', { thickness: 9 });
    d = setGeometryMode(d, 'extrude');
    d = setGeometryMode(d, 'revolve');
    d = setGeometryMode(d, 'inflate');
    expect(d.geometry.extrude.depth).toBe(42);
    expect(d.geometry.extrude.bevelSize).toBe(3);
    expect(d.geometry.inflate.thickness).toBe(9);
    expect(d.geometry.mode).toBe('inflate');
  });

  it('patching one mode leaves its other options alone', () => {
    const d = setModeOptions(make(), 'extrude', { depth: 20 });
    expect(d.geometry.extrude.depth).toBe(20);
    expect(d.geometry.extrude.alignment).toBe('center');
  });
});

describe('materials', () => {
  it('falls back to the document default', () => {
    const d = make();
    expect(materialFor(d, 'a')).toBe(d.materials.defaultId);
  });

  it('a per-component material wins, and can be cleared', () => {
    let d = setComponentMaterial(make(), 'a', 'gold');
    expect(materialFor(d, 'a')).toBe('gold');
    expect(materialFor(d, 'b')).toBe(d.materials.defaultId);
    d = setComponentMaterial(d, 'a', null);
    expect(materialFor(d, 'a')).toBe(d.materials.defaultId);
    expect(d.materials.byComponent).toEqual({});
  });

  it('changing the default does not disturb a component override', () => {
    let d = setComponentMaterial(make(), 'a', 'gold');
    d = setDefaultMaterial(d, 'clear-glass');
    expect(materialFor(d, 'a')).toBe('gold');
    expect(materialFor(d, 'b')).toBe('clear-glass');
  });
});

describe('component state', () => {
  it('defaults to visible and unlocked', () => {
    expect(componentStateFor(make(), 'a')).toEqual({ hidden: false, locked: false });
  });

  it('hiding a component takes it out of the build', () => {
    const d = updateComponentState(make(), 'a', { hidden: true });
    expect(visibleComponents(d).map((c) => c.id)).toEqual(['b']);
    expect(buildMesh(d).mesh.groups.map((g) => g.componentId)).toEqual(['b']);
  });

  it('patches merge rather than replace', () => {
    let d = updateComponentState(make(), 'a', { locked: true });
    d = updateComponentState(d, 'a', { hidden: true });
    expect(componentStateFor(d, 'a')).toEqual({ hidden: true, locked: true });
  });
});

describe('lighting, camera and transform', () => {
  it('patch rather than replace', () => {
    const d = setLighting(setCamera(make(), { fov: 50 }), { showBackground: false });
    expect(d.camera.fov).toBe(50);
    expect(d.camera.projection).toBe('orthographic');
    expect(d.lighting.showBackground).toBe(false);
    expect(d.lighting.presetId).toBe('white-studio');
  });

  it('reset returns the identity transform', () => {
    const d = resetTransform(setTransform(make(), { position: [5, 5, 5], scale: [2, 2, 2] }));
    expect(d.transform).toEqual(IDENTITY_TRANSFORM);
  });
});

describe('resetToSource', () => {
  it('throws away every edit but keeps the source, the name, the id and the creation time', () => {
    let d = make();
    const createdAt = d.createdAt;
    d = setGeometryMode(d, 'revolve');
    d = setDefaultMaterial(d, 'gold');
    d = updateComponentState(d, 'a', { hidden: true });
    d = setTransform(d, { position: [9, 9, 9] });

    const reset = resetToSource(d);
    expect(reset.source.svg).toBe(d.source.svg);
    expect(reset.name).toBe(d.name);
    expect(reset.id).toBe(d.id);
    expect(reset.createdAt).toBe(createdAt);
    expect(reset.geometry.mode).toBe('inflate');
    expect(reset.materials.defaultId).not.toBe('gold');
    expect(reset.componentState).toEqual({});
    expect(reset.transform).toEqual(IDENTITY_TRANSFORM);
  });
});

describe('buildMesh', () => {
  it('dispatches to every mode through one contract', () => {
    for (const mode of ['flat', 'extrude', 'inflate', 'revolve'] as const) {
      const d = setGeometryMode(make(), mode);
      const { mesh, durationMs } = buildMesh(d);
      expect(mesh.indices.length, mode).toBeGreaterThan(0);
      expect(mesh.groups.length, mode).toBe(2);
      expect(durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns an empty mesh rather than throwing when everything is hidden', () => {
    let d = make();
    for (const c of comps) d = updateComponentState(d, c.id, { hidden: true });
    const { mesh, warnings } = buildMesh(d);
    expect(mesh.indices).toHaveLength(0);
    expect(warnings).toEqual([]);
  });

  it('surfaces revolve warnings rather than swallowing them', () => {
    // One component, axis through its middle, so the profile really does
    // straddle it. With the shared whole-logo axis a mid pivot on a two-part
    // mark falls in the gap between the parts and crosses neither.
    const single = createDocument({ svg: '', fileName: 'one.svg', components: [comps[0]] });
    let d = setGeometryMode(single, 'revolve');
    d = setModeOptions(d, 'revolve', { pivot: 0.5, offset: 0 });
    expect(buildMesh(d).warnings.map((w) => w.code)).toContain('profile-crosses-axis');
  });

  it('the default revolve does not warn about a multi-part logo', () => {
    // The axis sits at the edge of the whole logo, so nothing straddles it —
    // the old per-component default warned once for every single component.
    const d = setGeometryMode(make(), 'revolve');
    expect(buildMesh(d).warnings).toEqual([]);
  });

  it('every component sweeps about the same axis', () => {
    // Two discs, one axis: the further one must sweep a bigger radius. Measured
    // per component they would produce two identical tori instead.
    const d = setGeometryMode(make(), 'revolve');
    const { mesh } = buildMesh(d);
    const span = (id: string) => {
      const g = mesh.groups.find((x) => x.componentId === id)!;
      let lo = Infinity, hi = -Infinity;
      for (let t = g.start; t < g.start + g.count; t++) {
        const z = mesh.positions[mesh.indices[t] * 3 + 2];
        lo = Math.min(lo, z); hi = Math.max(hi, z);
      }
      return hi - lo;
    };
    // 'a' sits at x=20, 'b' at x=60, and the axis is at the logo's left edge —
    // so 'b' sweeps the bigger radius.
    expect(span('b')).toBeGreaterThan(span('a') * 1.5);
  });

  it(`honours the mode's own options`, () => {
    let d = setGeometryMode(make(), 'extrude');
    const shallow = buildMesh(setModeOptions(d, 'extrude', { depth: 2 })).mesh;
    const deep = buildMesh(setModeOptions(d, 'extrude', { depth: 20 })).mesh;
    const zSpan = (m: typeof shallow) => {
      let lo = Infinity, hi = -Infinity;
      for (let i = 2; i < m.positions.length; i += 3) { lo = Math.min(lo, m.positions[i]); hi = Math.max(hi, m.positions[i]); }
      return hi - lo;
    };
    expect(zSpan(deep)).toBeGreaterThan(zSpan(shallow) * 5);
  });
});


describe('camera views', () => {
  it('opens straight on, not at an angle', () => {
    // A logo is flat artwork; the first thing anyone wants is to see that it
    // still reads as itself. An angled opening shot also throws the outer parts
    // into perspective distortion, which reads as stretching rather than depth.
    expect(DEFAULT_CAMERA.position[0]).toBe(0);
    expect(DEFAULT_CAMERA.position[1]).toBe(0);
    expect(DEFAULT_CAMERA.position[2]).toBeGreaterThan(0);
    expect(currentCameraView(make())).toBe('front');
  });

  it('shows the logo without perspective by default', () => {
    // Under perspective the near parts of a flat logo render larger than the
    // far ones — on the nine-dot mark the right-hand discs came out visibly
    // bigger than the left. Design tools show documents orthographically.
    expect(DEFAULT_CAMERA.projection).toBe('orthographic');
  });

  it('keeps a long lens for when perspective is chosen', () => {
    expect(DEFAULT_CAMERA.fov).toBeLessThanOrEqual(22);
  });

  it('switching projection changes nothing else about the camera', () => {
    const before = make();
    const after = setCamera(before, { projection: 'perspective' });
    expect(after.camera.position).toEqual(before.camera.position);
    expect(after.camera.fov).toBe(before.camera.fov);
    expect(after.camera.projection).toBe('perspective');
  });

  it('each preset points somewhere different, and reports itself back', () => {
    for (const view of Object.keys(CAMERA_VIEWS) as (keyof typeof CAMERA_VIEWS)[]) {
      const d = setCameraView(make(), view);
      expect(currentCameraView(d), view).toBe(view);
    }
  });

  it('changing view keeps the distance and the lens', () => {
    const before = make();
    const after = setCameraView(before, 'three-quarter');
    expect(Math.hypot(...after.camera.position)).toBeCloseTo(Math.hypot(...before.camera.position), 6);
    expect(after.camera.fov).toBe(before.camera.fov);
  });

  it('an arbitrary camera position matches no preset', () => {
    const d = setCamera(make(), { position: [1, 2, 3] });
    expect(currentCameraView(d)).toBeNull();
  });
});


describe('defaults follow the size the artwork was drawn at', () => {
  const scaled = (factor: number): Component[] => comps.map((c) => ({
    ...c,
    rings: c.rings.map((r) => Float64Array.from(Array.from(r, (v) => v * factor))),
  }));

  it('a logo drawn ten times larger gets ten times the thickness', () => {
    // Every distance the generators take is in the artwork's own units. A fixed
    // default is 5% of a 113-unit viewBox and 0.6% of a 1024-unit one, so the
    // same logo exported at a different size would open looking flat.
    const small = defaultGeometryFor(comps);
    const large = defaultGeometryFor(scaled(10));
    expect(large.inflate.thickness / small.inflate.thickness).toBeCloseTo(10, 1);
    expect(large.extrude.depth / small.extrude.depth).toBeCloseTo(10, 1);
  });

  it('the resulting shape is proportionally identical at any scale', () => {
    const relief = (factor: number) => {
      const g = defaultGeometryFor(scaled(factor));
      const m = inflate(scaled(factor), g.inflate);
      let lo = Infinity, hi = -Infinity, wide = 0;
      for (let i = 0; i < m.positions.length; i += 3) {
        lo = Math.min(lo, m.positions[i + 2]);
        hi = Math.max(hi, m.positions[i + 2]);
        wide = Math.max(wide, Math.abs(m.positions[i]));
      }
      return (hi - lo) / wide;
    };
    expect(relief(10)).toBeCloseTo(relief(1), 2);
  });

  it('rounds to something a person would have typed', () => {
    const g = defaultGeometryFor(comps);
    expect(String(g.inflate.thickness)).toMatch(/^\d+(\.\d)?$/);
  });

  it('survives artwork with no extent at all', () => {
    expect(() => defaultGeometryFor([])).not.toThrow();
    expect(defaultGeometryFor([]).inflate.thickness).toBeGreaterThan(0);
  });

  it('a created document carries the scaled defaults', () => {
    const big = createDocument({ svg: '', fileName: 'big.svg', components: scaled(10) });
    const small = createDocument({ svg: '', fileName: 'small.svg', components: comps });
    expect(big.geometry.inflate.thickness).toBeGreaterThan(small.geometry.inflate.thickness * 5);
  });
});
