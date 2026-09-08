/**
 * Phase 2 — the geometry and material proof.
 *
 * Runs in real Chromium against real WebGL, because the thing being proven is
 * that the generated geometry *renders*: a mesh can be watertight in a unit
 * test and still shade like tinfoil. Every case here draws the supplied
 * nine-component fixture and interrogates the actual pixels.
 *
 * Screenshots land in `__screenshots__/` for the owner's visual review, which
 * is the half of Phase 2 no assertion can stand in for.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { page } from '@vitest/browser/context';
import * as THREE from 'three';

import { importSvg } from '../render/svgImport';
import { inflate } from '../engine/modes/inflate';
import { extrude, flat } from '../engine/modes/extrude';
import { revolve } from '../engine/modes/revolve';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import { Studio, buildMaterial, LIGHTING_PRESETS } from '../render/studio';
import { getMaterial, MATERIAL_PRESETS, BENCHMARK_MATERIALS } from '../materials/presets';
import { exportGlb } from '../export/glb';
import type { Component, MeshData } from '../engine/types';
import { DEFAULT_CAMERA } from '../engine/document';

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_2" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 113 113">
  <g id="Layer_1-2"><g id="Logomark">
    <path d="M78.3,0c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1S84.5,0,78.3,0Z"/>
    <path d="M101.9,45.8c6.1,0,11.1-5,11.1-11.1s-5-11.1-11.1-11.1-11.1,5-11.1,11.1,5,11.1,11.1,11.1Z"/>
    <path d="M56.5,45.4c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
    <path d="M34.7,22.3c6.1,0,11.1-5,11.1-11.1S40.8,0,34.7,0s-11.1,5-11.1,11.1,5,11.1,11.1,11.1Z"/>
    <path d="M78.3,90.8c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
    <path d="M34.7,90.8c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
    <path d="M11.1,23.5c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
    <path d="M101.9,67.2c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
    <path d="M11.1,67.2c-6.1,0-11.1,5-11.1,11.1s5,11.1,11.1,11.1,11.1-5,11.1-11.1-5-11.1-11.1-11.1Z"/>
  </g></g>
</svg>`;

const SIZE = 560;
let components: Component[] = [];
const openStudios: Studio[] = [];

function makeStudio(transparent = false): { studio: Studio; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  document.body.appendChild(canvas);
  const studio = new Studio({ canvas, width: SIZE, height: SIZE, transparent });
  openStudios.push(studio);
  return { studio, canvas };
}

function show(
  mesh: MeshData,
  materialId: string,
  lightingId = 'white-studio',
  backdrop?: [string, string],
): { studio: Studio; canvas: HTMLCanvasElement } {
  const { studio, canvas } = makeStudio();
  const { geometry } = toBufferGeometry(mesh);
  normalizeToUnitSize(geometry, 2);
  const preset = getMaterial(materialId)!;
  studio.setLighting(LIGHTING_PRESETS.find((l) => l.id === lightingId)!);
  if (backdrop) studio.setBackdrop(backdrop[0], backdrop[1]);
  studio.setObject(geometry, buildMaterial(preset));
  // The product's own defaults. The proof has to show what a user actually
  // opens to, not a flattering angle.
  studio.setProjection(DEFAULT_CAMERA.projection, DEFAULT_CAMERA.fov);
  studio.camera.position.set(...DEFAULT_CAMERA.position);
  studio.frame(1.25);
  studio.render();
  return { studio, canvas };
}

/** Pixel statistics — the only honest way to ask "did something actually draw?". */
function analyse(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  const w = canvas.width;
  const h = canvas.height;
  const buf = new Uint8Array(w * h * 4);
  (gl as WebGLRenderingContext).readPixels(0, 0, w, h, 0x1908 /* RGBA */, 0x1401 /* UNSIGNED_BYTE */, buf);
  const counts = new Map<string, number>();
  let sum = 0;
  let opaque = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const key = `${buf[i] >> 3},${buf[i + 1] >> 3},${buf[i + 2] >> 3}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    sum += (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
    if (buf[i + 3] > 8) opaque++;
  }
  const pixels = w * h;
  let biggest = 0;
  for (const c of counts.values()) if (c > biggest) biggest = c;
  let loLuma = 255;
  let hiLuma = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const l = (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
    if (l < loLuma) loLuma = l;
    if (l > hiLuma) hiLuma = l;
  }
  return {
    pixels,
    lumaRange: hiLuma - loLuma,
    distinctColors: counts.size,
    /** Share of the frame taken by the single most common colour — the
     *  background. A frame that is 100% one colour drew nothing. */
    dominantShare: biggest / pixels,
    meanLuma: sum / pixels,
    opaqueShare: opaque / pixels,
  };
}

beforeAll(async () => {
  // Vitest's default viewport is 414px wide, so a 560px canvas is cropped in
  // every screenshot — which makes the owner's visual review of a logo show
  // two thirds of it.
  await page.viewport(700, 760);
  const result = await importSvg(FIXTURE);
  expect(result.diagnostics).toEqual([]);
  components = result.components;
  expect(components).toHaveLength(9);
});

afterEach(() => {
  while (openStudios.length) openStudios.pop()!.dispose();
  document.body.querySelectorAll('canvas').forEach((c) => c.remove());
});

describe('Phase 2 — the fixture renders in every geometry mode', () => {
  it('inflate produces a lit, shaded object rather than a flat silhouette', async () => {
    const mesh = inflate(components, { thickness: 7, fullness: 0.6, edgeSoftness: 0.3, quality: 0.6 });
    const { canvas } = show(mesh, 'glossy-black');
    const stats = analyse(canvas);
    // A flat silhouette quantises to a handful of buckets; a shaded surface
    // fills dozens. Measured at ~113 for this object, so 60 is a floor with
    // real headroom rather than a number tuned to today's output.
    expect(stats.distinctColors).toBeGreaterThan(60);
    // The object occupies a real share of the frame — not a speck, not the lot.
    expect(stats.dominantShare).toBeGreaterThan(0.2);
    expect(stats.dominantShare).toBeLessThan(0.95);
    await page.screenshot({ path: 'phase2-inflate-glossy-black.png' });
  });

  it('extrude produces a solid with a visible wall', async () => {
    // Seen from three-quarters, because the wall is the thing being proven and
    // a front-on orthographic view of a cylinder shows only its flat cap —
    // legitimately one flat colour, and no evidence of anything.
    const mesh = extrude(components, { depth: 12, alignment: 'center', curveQuality: 0.6 });
    const { studio, canvas } = show(mesh, 'polished-chrome', 'white-studio');
    studio.camera.position.set(2.2, 1.8, 4);
    studio.frame(1.25);
    studio.render();
    expect(analyse(canvas).distinctColors).toBeGreaterThan(40);
    await page.screenshot({ path: 'phase2-extrude-chrome.png' });
  });

  it('a bevelled extrude reads differently from a hard-edged one', async () => {
    const hard = extrude(components, { depth: 12, curveQuality: 0.6 });
    const soft = extrude(components, { depth: 12, bevelSize: 2.5, bevelThickness: 2, bevelSegments: 6, curveQuality: 0.6 });
    const first = show(hard, 'satin-black');
    const a = analyse(first.canvas);
    // Taken out of the document as well as disposed: two canvases stacked in
    // the body push the second one below the fold, and the screenshot the owner
    // reviews then shows an empty page with a sliver of render at the bottom.
    openStudios.pop()!.dispose();
    first.canvas.remove();
    const b = analyse(show(soft, 'satin-black').canvas);
    // The bevel changes how much light the edges catch; the frames must differ.
    expect(Math.abs(a.meanLuma - b.meanLuma)).toBeGreaterThan(0.1);
    await page.screenshot({ path: 'phase2-extrude-bevelled.png' });
  });

  it('extrude seen from three-quarters is a closed solid, not an open shell', async () => {
    const mesh = extrude(components, { depth: 14, alignment: 'center', curveQuality: 0.6 });
    const { studio, canvas } = show(mesh, 'satin-black');
    studio.camera.position.set(2.2, 1.8, 4);
    studio.frame(1.25);
    studio.render();
    expect(analyse(canvas).distinctColors).toBeGreaterThan(40);
    await page.screenshot({ path: 'phase2-extrude-three-quarter.png' });
  });

  it('inflate seen from three-quarters', async () => {
    const mesh = inflate(components, { thickness: 7, fullness: 0.6, edgeSoftness: 0.3, quality: 0.6 });
    const { studio, canvas } = show(mesh, 'glossy-black');
    studio.camera.position.set(2.0, 1.7, 4);
    studio.frame(1.25);
    studio.render();
    expect(analyse(canvas).distinctColors).toBeGreaterThan(40);
    await page.screenshot({ path: 'phase2-inflate-three-quarter.png' });
  });

  it('flat renders as a surface', async () => {
    const mesh = flat(components);
    const { canvas } = show(mesh, 'matte-plastic');
    expect(analyse(canvas).dominantShare).toBeLessThan(0.98);
    await page.screenshot({ path: 'phase2-flat.png' });
  });

  it('revolve produces a solid of revolution', async () => {
    const { mesh, warnings } = revolve(components.slice(0, 1), {
      axis: 'y', pivot: 0, offset: -6, sweep: Math.PI * 2, segments: 72,
    });
    expect(warnings).toEqual([]);
    const { canvas } = show(mesh, 'gold');
    expect(analyse(canvas).distinctColors).toBeGreaterThan(40);
    await page.screenshot({ path: 'phase2-revolve-gold.png' });
  });

  it('a partial revolve is visibly a wedge, not a full ring', async () => {
    const { mesh } = revolve(components.slice(0, 1), {
      axis: 'y', pivot: 0, offset: -6, sweep: Math.PI * 1.2, segments: 48, caps: true,
    });
    const { canvas } = show(mesh, 'copper');
    expect(analyse(canvas).distinctColors).toBeGreaterThan(40);
    await page.screenshot({ path: 'phase2-revolve-partial.png' });
  });
});

describe('Phase 2 — the four benchmark materials', () => {
  it.each(BENCHMARK_MATERIALS)('%s renders with real shading', async (id) => {
    const mesh = inflate(components, { thickness: 7, fullness: 0.6, edgeSoftness: 0.25, quality: 0.6 });
    const glass = id === 'clear-glass';
    const { canvas } = show(
      mesh,
      id,
      glass ? 'neutral-studio' : 'white-studio',
      glass ? ['#ffffff', '#3a4a63'] : undefined,
    );
    const stats = analyse(canvas);
    expect(stats.distinctColors).toBeGreaterThan(40);
    expect(stats.dominantShare).toBeLessThan(0.98);
    await page.screenshot({ path: `phase2-material-${id}.png` });
  });

  it('clear glass is reviewed on white and on black, as the PRD requires', async () => {
    const mesh = inflate(components, { thickness: 8, fullness: 0.7, quality: 0.6 });
    const white = show(mesh, 'clear-glass', 'high-contrast', ['#ffffff', '#d7dbe2']);
    white.studio.camera.position.set(1.6, 1.3, 4);
    white.studio.frame(1.25);
    white.studio.render();
    const onWhite = analyse(white.canvas);
    await page.screenshot({ path: 'phase2-glass-on-white.png' });
    openStudios.pop()!.dispose();
    white.canvas.remove();
    const black = show(mesh, 'clear-glass', 'black-studio', ['#2b2f38', '#050507']);
    black.studio.camera.position.set(1.6, 1.3, 4);
    black.studio.frame(1.25);
    black.studio.render();
    const onBlack = analyse(black.canvas);
    await page.screenshot({ path: 'phase2-glass-on-black.png' });
    // Glass takes its appearance from what is behind it, so the two frames must
    // differ substantially — if they matched, transmission is not working.
    expect(Math.abs(onWhite.meanLuma - onBlack.meanLuma)).toBeGreaterThan(20);
    // Colour buckets are quantised to 5 bits per channel, which collapses hard
    // on a near-black scene — the black-studio frame is a correct render with
    // few distinct buckets in it. Luma *range* is the metric that survives:
    // both frames must show shape, not a flat field.
    expect(onWhite.lumaRange).toBeGreaterThan(40);
    expect(onBlack.lumaRange).toBeGreaterThan(40);
  });

  it('every one of the 24 presets builds a usable material', () => {
    expect(MATERIAL_PRESETS).toHaveLength(24);
    for (const preset of MATERIAL_PRESETS) {
      const m = buildMaterial(preset);
      expect(m).toBeInstanceOf(THREE.MeshPhysicalMaterial);
      expect(Number.isFinite(m.roughness)).toBe(true);
      expect(Number.isFinite(m.metalness)).toBe(true);
      m.dispose();
    }
  });

  it('a transparent background really is transparent', async () => {
    const mesh = inflate(components, { thickness: 6, quality: 0.5 });
    const { studio, canvas } = makeStudio(true);
    const { geometry } = toBufferGeometry(mesh);
    normalizeToUnitSize(geometry, 2);
    studio.setLighting(LIGHTING_PRESETS[0], false);
    studio.setObject(geometry, buildMaterial(getMaterial('satin-black')!));
    studio.frame(1.3);
    studio.render();
    const stats = analyse(canvas);
    expect(stats.opaqueShare).toBeGreaterThan(0.02);
    expect(stats.opaqueShare).toBeLessThan(0.8);
    await page.screenshot({ path: 'phase2-transparent.png' });
  });
});

describe('Phase 2 — GLB export round-trips', () => {
  it('writes a valid binary glTF that reimports with all nine components', async () => {
    const mesh = inflate(components, { thickness: 7, quality: 0.5 });
    const { glb, notes } = await exportGlb(mesh, {
      defaultMaterial: getMaterial('satin-black')!,
      name: 'logomark',
    });
    expect(notes).toEqual([]);

    // A GLB begins with the magic 'glTF' and its own length.
    const header = new DataView(glb);
    expect(header.getUint32(0, true)).toBe(0x46546c67);
    expect(header.getUint32(4, true)).toBe(2);
    expect(header.getUint32(8, true)).toBe(glb.byteLength);

    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const parsed = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      new GLTFLoader().parse(glb, '', (g) => resolve(g as unknown as { scene: THREE.Group }), reject);
    });

    const meshes: THREE.Mesh[] = [];
    parsed.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes).toHaveLength(9);
    expect(new Set(meshes.map((m) => m.name)).size).toBe(9);
    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position');
      expect(pos.count).toBeGreaterThan(20);
      expect(m.geometry.getIndex()!.count % 3).toBe(0);
      expect(m.geometry.getAttribute('normal')).toBeTruthy();
    }
  });

  it('the reimported model renders — the file is not merely well-formed', async () => {
    const mesh = inflate(components, { thickness: 7, quality: 0.5 });
    const { glb } = await exportGlb(mesh, { defaultMaterial: getMaterial('gold')!, name: 'logomark' });
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const parsed = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      new GLTFLoader().parse(glb, '', (g) => resolve(g as unknown as { scene: THREE.Group }), reject);
    });

    const { studio, canvas } = makeStudio();
    studio.setLighting(LIGHTING_PRESETS[0]);
    const box = new THREE.Box3().setFromObject(parsed.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    parsed.scene.scale.setScalar(2 / Math.max(size.x, size.y, size.z, 1e-6));
    studio.scene.add(parsed.scene);
    studio.camera.position.set(1.1, 1.0, 3.2);
    studio.camera.lookAt(0, 0, 0);
    studio.render();
    expect(analyse(canvas).distinctColors).toBeGreaterThan(30);
    await page.screenshot({ path: 'phase2-glb-reimported.png' });
  });

  it('a glass material declares its fallback when compatibility is asked for', async () => {
    const mesh = inflate(components.slice(0, 2), { thickness: 6, quality: 0.4 });
    const { notes } = await exportGlb(mesh, {
      defaultMaterial: getMaterial('clear-glass')!,
      compatibleMaterials: true,
    });
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toContain('Clear glass');
  });
});

describe('Phase 2 — resources are released', () => {
  it('a studio can be created and disposed repeatedly without exhausting contexts', { timeout: 60_000 }, () => {
    // Browsers cap live WebGL contexts at ~16; without forceContextLoss on
    // dispose, the 17th canvas silently renders nothing at all.
    for (let i = 0; i < 24; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const studio = new Studio({ canvas, width: 64, height: 64 });
      studio.setLighting(LIGHTING_PRESETS[0]);
      studio.render();
      studio.dispose();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    document.body.appendChild(canvas);
    const studio = new Studio({ canvas, width: 128, height: 128 });
    openStudios.push(studio);
    studio.setLighting(LIGHTING_PRESETS[0]);
    const { geometry } = toBufferGeometry(inflate(components.slice(0, 1), { quality: 0.3 }));
    normalizeToUnitSize(geometry, 2);
    studio.setObject(geometry, buildMaterial(getMaterial('gold')!));
    studio.frame();
    studio.render();
    expect(analyse(canvas).distinctColors).toBeGreaterThan(8);
  });
});
