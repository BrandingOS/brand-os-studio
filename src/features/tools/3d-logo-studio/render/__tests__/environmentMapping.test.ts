/**
 * The environment map and the key light must describe the same light.
 *
 * They are two representations of one thing: a softbox painted into an
 * equirectangular texture, and a directional light the rasterizer shades with.
 * A traced render sees only the first; the preview's shading comes mostly from
 * the second. When they disagreed, moving the light slid the highlight one way
 * in the preview and the other way in a traced render — and the map itself was
 * upside down, so a light placed overhead lit from below.
 *
 * The authority is three's own `equirectUv`:
 *
 *     u = atan2(dir.z, dir.x) / 2π + 0.5
 *     v = asin(dir.y) / π + 0.5
 *
 * which is reproduced here. If Three.js ever changes it, these fail.
 */
import { describe, it, expect } from 'vitest';
import { buildEnvironmentTexture, azimuthToU, withLightSource, SOFT_STUDIO } from '../environment';
import { lightDirection, DEFAULT_LIGHT_SOURCE, type LightSource } from '../../materials/lighting';

/** three/src/renderers/shaders/ShaderChunk/common.glsl.js */
function equirectUv(dir: [number, number, number]): [number, number] {
  const [x, y, z] = dir;
  return [
    (Math.atan2(z, x) / (Math.PI * 2)) + 0.5,
    (Math.asin(Math.max(-1, Math.min(1, y))) / Math.PI) + 0.5,
  ];
}

const source = (patch: Partial<LightSource> = {}): LightSource => ({ ...DEFAULT_LIGHT_SOURCE, ...patch });

/** Read a half-float texel's luminance. */
function luminanceAt(tex: ReturnType<typeof buildEnvironmentTexture>, u: number, v: number): number {
  const w = tex.image.width;
  const h = tex.image.height;
  const x = Math.min(w - 1, Math.max(0, Math.round(((u % 1) + 1) % 1 * w)));
  const y = Math.min(h - 1, Math.max(0, Math.round(v * (h - 1))));
  const data = tex.image.data as Uint16Array;
  const i = (y * w + x) * 4;
  return (fromHalf(data[i]) + fromHalf(data[i + 1]) + fromHalf(data[i + 2])) / 3;
}

function fromHalf(bits: number): number {
  const sign = (bits >> 15) & 1 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

describe('the map is the right way up', () => {
  it('the sky is above and the floor below', () => {
    const tex = buildEnvironmentTexture({ ...SOFT_STUDIO, boxes: [] }, 128);
    const up = equirectUv([0, 1, 0]);
    const down = equirectUv([0, -1, 0]);
    expect(luminanceAt(tex, up[0], up[1])).toBeGreaterThan(luminanceAt(tex, down[0], down[1]) * 3);
  });

  it('the horizon sits between them', () => {
    const tex = buildEnvironmentTexture({ ...SOFT_STUDIO, boxes: [] }, 128);
    const level = luminanceAt(tex, ...equirectUv([0, 0, 1]));
    const sky = luminanceAt(tex, ...equirectUv([0, 1, 0]));
    const floor = luminanceAt(tex, ...equirectUv([0, -1, 0]));
    expect(level).toBeLessThan(sky);
    expect(level).toBeGreaterThan(floor);
  });
});

describe('the softbox is where the light says it is', () => {
  it.each([
    ['front', 0.5], ['right', 0.75], ['behind', 0.0], ['left', 0.25],
  ] as const)('%s', (_name, azimuth) => {
    const src = source({ azimuth, elevation: 0.5, size: 0.12, intensity: 6 });
    const tex = buildEnvironmentTexture(withLightSource(SOFT_STUDIO, src), 256);
    // The direction the light claims to come from must be the brightest place
    // in the map.
    const [u, v] = equirectUv(lightDirection(src));
    const atLight = luminanceAt(tex, u, v);
    const opposite = luminanceAt(tex, u + 0.5, v);
    expect(atLight).toBeGreaterThan(opposite * 2);
  });

  it('overhead really is overhead', () => {
    const src = source({ azimuth: 0.5, elevation: 0.04, size: 0.12, intensity: 6 });
    const tex = buildEnvironmentTexture(withLightSource(SOFT_STUDIO, src), 256);
    const above = luminanceAt(tex, ...equirectUv([0, 1, 0]));
    const below = luminanceAt(tex, ...equirectUv([0, -1, 0]));
    expect(above).toBeGreaterThan(below * 3);
  });

  it('and low really is low', () => {
    const src = source({ azimuth: 0.5, elevation: 0.96, size: 0.12, intensity: 6 });
    const tex = buildEnvironmentTexture(withLightSource(SOFT_STUDIO, src), 256);
    expect(luminanceAt(tex, ...equirectUv([0, -1, 0])))
      .toBeGreaterThan(luminanceAt(tex, ...equirectUv([0, 1, 0])));
  });

  it('azimuthToU is the inverse of the shader mapping', () => {
    for (const azimuth of [0, 0.2, 0.5, 0.75, 0.99]) {
      const [u] = equirectUv(lightDirection(source({ azimuth, elevation: 0.5 })));
      expect(((u % 1) + 1) % 1, `azimuth=${azimuth}`).toBeCloseTo(azimuthToU(azimuth), 5);
    }
  });
});

describe('lightDirection', () => {
  it('faces the camera at 0.5, and the right at 0.75', () => {
    expect(lightDirection(source({ azimuth: 0.5, elevation: 0.5 }))[2]).toBeGreaterThan(0.99);
    expect(lightDirection(source({ azimuth: 0.75, elevation: 0.5 }))[0]).toBeGreaterThan(0.99);
  });
  it('is up at elevation 0 and down at 1', () => {
    expect(lightDirection(source({ elevation: 0 }))[1]).toBeCloseTo(1, 6);
    expect(lightDirection(source({ elevation: 1 }))[1]).toBeCloseTo(-1, 6);
  });
  it('is always unit length, so brightness does not vary with direction', () => {
    for (const azimuth of [0, 0.3, 0.6, 0.9]) {
      for (const elevation of [0, 0.25, 0.5, 0.75, 1]) {
        expect(Math.hypot(...lightDirection(source({ azimuth, elevation }))), `${azimuth}/${elevation}`)
          .toBeCloseTo(1, 6);
      }
    }
  });
});
