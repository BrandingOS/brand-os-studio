/**
 * =============================================================================
 * The studio — scene, lights, environment, camera
 * =============================================================================
 *
 * Everything a render needs, assembled imperatively and disposable in one call.
 * There is no React here and no animation loop: `render()` draws one frame when
 * asked. That is what lets the same code serve the interactive preview, the
 * progressive final render and an offscreen export without three copies of the
 * scene setup drifting apart.
 *
 * The environment is `RoomEnvironment` — a procedural studio box that ships
 * inside Three.js. It is the reason no HDRI file is downloaded: metals and
 * glass need something to reflect, and the PRD forbids fetching assets at all.
 */

import * as THREE from 'three';
import { buildEnvironmentTexture, type EnvironmentRecipe, SOFT_STUDIO, DARK_STUDIO, BRIGHT_STUDIO } from './environment';
import type { MaterialParams, MaterialPreset } from '../materials/types';
import type { LightingPreset } from '../materials/lighting';

export { LIGHTING_PRESETS, type LightingPreset } from '../materials/lighting';

/**
 * The lens used when perspective is chosen.
 *
 * Long — the equivalent of a short telephoto. A wide lens on an object filling
 * the frame is what turns a ring of identical discs into discs of visibly
 * different sizes; product photographers step back and zoom in for exactly this
 * reason.
 */
export const PERSPECTIVE_FOV = 20;

function makeCamera(projection: Projection, aspect: number, fov = PERSPECTIVE_FOV) {
  return projection === 'orthographic'
    ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100)
    : new THREE.PerspectiveCamera(fov, aspect, 0.01, 100);
}

export interface StudioOptions {
  canvas: HTMLCanvasElement;
  /** Mutable: `resize` updates these in place rather than rebuilding. */
  width: number;
  height: number;
  pixelRatio?: number;
  transparent?: boolean;
  /** Off for a screenshot, on for an export where every pixel is paid for once. */
  antialias?: boolean;
}

/**
 * Which surround each lighting preset reflects.
 *
 * This is most of what a lighting preset *is* for a metal: the directional
 * lights add highlights, but the broad shape of a reflective surface comes
 * entirely from what surrounds it.
 */
const ENVIRONMENTS: Record<string, EnvironmentRecipe> = {
  'white-studio': SOFT_STUDIO,
  'black-studio': DARK_STUDIO,
  'neutral-studio': SOFT_STUDIO,
  'soft-product': SOFT_STUDIO,
  'dramatic-rim': DARK_STUDIO,
  'high-contrast': BRIGHT_STUDIO,
};

export type Projection = 'orthographic' | 'perspective';

export class Studio {
  readonly scene = new THREE.Scene();
  /**
   * Orthographic by default.
   *
   * A logo is flat artwork, and under perspective the parts of it nearest the
   * camera render larger than the parts further away — on the nine-dot mark the
   * right-hand discs came out visibly bigger than the left-hand ones, and each
   * disc was seen at a slightly different angle. The eye reads that as the
   * artwork being distorted, because it is. Every design tool shows a document
   * orthographically for the same reason.
   *
   * Perspective stays available as a deliberate choice, and on a long lens
   * (see `PERSPECTIVE_FOV`) so that choosing it flatters the object rather than
   * bending it.
   */
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;
  private projection: Projection = 'orthographic';
  private readonly pmrem: THREE.PMREMGenerator;
  private environment: THREE.Texture | null = null;
  private environmentRecipe: EnvironmentRecipe | null = null;
  /**
   * The environment before prefiltering.
   *
   * The rasterizer wants the PMREM output — a cube-UV texture with roughness
   * baked into its mip chain. A path tracer wants the raw equirectangular map,
   * because it samples directions itself; handed the prefiltered one it reads
   * past the end of a lookup table and throws. Both are kept.
   */
  private environmentSource: THREE.DataTexture | null = null;
  private readonly disposables: { dispose(): void }[] = [];
  private object: THREE.Mesh | null = null;
  private backdrop: THREE.Mesh | null = null;

  constructor(private readonly options: StudioOptions) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      alpha: options.transparent ?? false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(options.pixelRatio ?? 1);
    this.renderer.setSize(options.width, options.height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = makeCamera('orthographic', options.width / options.height);
    this.camera.position.set(0, 0, 6);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();
  }

  /**
   * Resize in place.
   *
   * Rebuilding the whole `Studio` on every resize was the first version, and it
   * was wrong twice over: a WebGL context plus a PMREM environment is expensive
   * to construct, and — worse — the newly built renderer had nothing in it
   * until something else happened to trigger a redraw, so the first paint after
   * any resize was a blank stage.
   */
  resize(width: number, height: number, pixelRatio?: number): void {
    if (!(width > 0) || !(height > 0)) return;
    this.options.width = width;
    this.options.height = height;
    if (pixelRatio) this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    if (this.camera instanceof THREE.PerspectiveCamera) this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Switch projection, keeping where the camera is looking from.
   *
   * The two camera types cannot share one object, so this swaps it and carries
   * the position across — changing projection must not also move the view, or
   * the control reads as "randomise everything".
   */
  setProjection(projection: Projection, fov = PERSPECTIVE_FOV): void {
    if (projection === this.projection && (projection === 'orthographic' ||
        (this.camera as THREE.PerspectiveCamera).fov === fov)) {
      return;
    }
    const previous = this.camera.position.clone();
    this.projection = projection;
    this.camera = makeCamera(projection, this.options.width / this.options.height, fov);
    this.camera.position.copy(previous);
    this.camera.updateProjectionMatrix();
  }

  setLighting(preset: LightingPreset, showBackground = true): void {
    for (const child of [...this.scene.children]) {
      if (child instanceof THREE.Light) this.scene.remove(child);
    }
    const add = (l: THREE.Light) => { this.scene.add(l); this.disposables.push(l as unknown as { dispose(): void }); };
    add(new THREE.AmbientLight(0xffffff, preset.ambient));
    const key = new THREE.DirectionalLight(new THREE.Color(preset.key.color), preset.key.intensity);
    key.position.set(...preset.key.position);
    add(key);
    const fill = new THREE.DirectionalLight(new THREE.Color(preset.fill.color), preset.fill.intensity);
    fill.position.set(...preset.fill.position);
    add(fill);
    const rim = new THREE.DirectionalLight(new THREE.Color(preset.rim.color), preset.rim.intensity);
    rim.position.set(...preset.rim.position);
    add(rim);

    // Rebuilt when the recipe changes, because what the metal reflects is most
    // of what the lighting preset *is*.
    const recipe = ENVIRONMENTS[preset.id] ?? SOFT_STUDIO;
    if (this.environment === null || this.environmentRecipe !== recipe) {
      this.environment?.dispose();
      this.environmentSource?.dispose();
      const source = buildEnvironmentTexture(recipe, 1024);
      this.environment = this.pmrem.fromEquirectangular(source).texture;
      this.environmentSource = source;
      this.environmentRecipe = recipe;
    }
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = preset.environmentIntensity;
    // The visible background and the reflected environment are set apart here:
    // a glass on a black card still needs a bright room to refract, or it reads
    // as a hole rather than as glass.
    this.scene.background = this.options.transparent || !showBackground
      ? null
      : new THREE.Color(preset.background);
  }

  /**
   * A studio cyclorama behind the object.
   *
   * Not decoration. `transmission` refracts whatever is *behind* the surface,
   * and a flat background colour refracts to that same flat colour — so clear
   * glass over plain white renders as white blobs and reads as plastic. A
   * gradient backdrop is what a real product studio puts behind glass, and it
   * is what makes refraction legible. It stays independent of the reflected
   * environment, which the PRD requires to be separately controllable.
   */
  setBackdrop(top: string, bottom: string, distance = 6): void {
    this.clearBackdrop();
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(distance * 4, distance * 4), material);
    mesh.position.z = -distance;
    this.scene.add(mesh);
    this.backdrop = mesh;
  }

  clearBackdrop(): void {
    if (!this.backdrop) return;
    this.scene.remove(this.backdrop);
    this.backdrop.geometry.dispose();
    const m = this.backdrop.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
    this.backdrop = null;
  }

  setObject(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): THREE.Mesh {
    this.clearObject();
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    this.object = mesh;
    return mesh;
  }

  clearObject(): void {
    if (!this.object) return;
    this.scene.remove(this.object);
    this.object = null;
  }

  /** Frame the object so it fills the view with a consistent margin. */
  frame(margin = 1.25): void {
    if (!this.object) return;
    // Measured on the object alone — a backdrop plane is four times the scene
    // wide, and framing the whole scene would push the camera back until the
    // logo was a speck.
    const box = new THREE.Box3().setFromObject(this.object);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const radius = Math.max(size.x, size.y, size.z) / 2 || 1;
    const aspect = this.options.width / Math.max(1, this.options.height);

    const dir = this.camera.position.clone().sub(centre);
    if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1);
    dir.normalize();

    if (this.camera instanceof THREE.OrthographicCamera) {
      // Distance changes nothing about the size of an orthographic image, so it
      // is chosen only to clear the object; the frustum does the framing.
      const distance = radius * 4;
      const half = radius * margin;
      this.camera.left = aspect >= 1 ? -half * aspect : -half;
      this.camera.right = aspect >= 1 ? half * aspect : half;
      this.camera.top = aspect >= 1 ? half : half / aspect;
      this.camera.bottom = aspect >= 1 ? -half : -half / aspect;
      this.camera.near = 0.01;
      this.camera.far = distance * 10;
      this.camera.position.copy(centre).add(dir.multiplyScalar(distance));
    } else {
      const fov = (this.camera.fov * Math.PI) / 180;
      this.camera.aspect = aspect;
      // Fit against the *narrower* of the two view angles, or a wide logo in a
      // tall viewport is framed on height and runs off the sides.
      const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
      const distance = Math.max(
        radius / Math.sin(Math.min(fov, horizontalFov) / 2),
        radius * 1.2,
      ) * margin;
      this.camera.position.copy(centre).add(dir.multiplyScalar(distance));
      this.camera.near = Math.max(distance / 100, 0.001);
      this.camera.far = distance * 10;
    }
    this.camera.lookAt(centre);
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  toDataUrl(type = 'image/png'): string {
    this.render();
    return this.options.canvas.toDataURL(type);
  }

  /** The un-prefiltered environment, for a renderer that samples it directly. */
  get rawEnvironment(): THREE.DataTexture | null {
    return this.environmentSource;
  }

  dispose(): void {
    this.clearObject();
    this.clearBackdrop();
    this.environmentSource?.dispose();
    this.environment?.dispose();
    this.pmrem.dispose();
    this.scene.clear();
    this.renderer.dispose();
    // Without this the GPU keeps the context alive until it is garbage
    // collected, and a handful of mount/unmount cycles exhausts the browser's
    // context limit — after which every later canvas silently renders nothing.
    this.renderer.forceContextLoss();
  }
}

/** Build a Three.js material from a preset's parameters. */
export function buildMaterial(preset: MaterialPreset, overrides: Partial<MaterialParams> = {}): THREE.MeshPhysicalMaterial {
  const p = { ...preset.params, ...overrides };
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(p.color),
    metalness: p.metalness,
    roughness: p.roughness,
    transmission: p.transmission,
    ior: p.ior,
    thickness: p.thickness,
    clearcoat: p.clearcoat,
    clearcoatRoughness: p.clearcoatRoughness,
    // Ignored by the rasterizer and honoured by the path tracer, so one material
    // description serves both.
    dispersion: p.dispersion,
    emissive: new THREE.Color(p.emissive),
    emissiveIntensity: p.emissiveIntensity,
    iridescence: p.iridescence,
    anisotropy: p.anisotropy,
    opacity: p.opacity,
    transparent: p.opacity < 1,
    side: THREE.FrontSide,
  });
  if (Number.isFinite(p.attenuationDistance)) {
    material.attenuationColor = new THREE.Color(p.attenuationColor);
    material.attenuationDistance = p.attenuationDistance;
  }
  if (p.textureKind !== 'none' && p.textureStrength > 0) {
    applyTriplanarGrain(material, p);
  }
  return material;
}

/**
 * Procedural roughness maps.
 *
 * Generated rather than shipped: a texture file is an asset to license, host
 * and download, and the PRD's rule is that nothing leaves the device. These are
 * small, tileable and deterministic, so two renders of the same project match.
 */
/**
 * Fine surface grain, projected triplanar in object space.
 *
 * The obvious approach — a tangent-space normal map on the mesh's UVs — cannot
 * work here. The UVs are a flat projection of the artwork, so on a dome they
 * stretch without bound towards the silhouette, and the grain smears into
 * radial spokes converging on each ball's centre. It looked like a lighting
 * artefact and was not; polished chrome, which carries no texture, rendered
 * perfectly clean under the identical lights.
 *
 * Triplanar sampling has no UVs to stretch: the texture is read three times,
 * along each object-space plane, and blended by how much the surface faces each
 * axis. Because the grain here is isotropic — cast metal, not a woven or
 * directional material — the sample can be applied as a small object-space
 * perturbation of the normal rather than through a full tangent-space basis.
 * That is not a general normal-map implementation and is not meant to be; it is
 * the right one for fine, directionless relief, and it costs three texture
 * reads instead of a tangent attribute on every vertex.
 */
function applyTriplanarGrain(material: THREE.MeshPhysicalMaterial, p: MaterialParams): void {
  const grain = proceduralNormal(p.textureKind, p.textureScale, p.textureStrength);
  if (!grain) return;
  const rough = proceduralRoughness(p.textureKind, p.textureScale);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.grainMap = { value: grain };
    shader.uniforms.grainScale = { value: p.textureScale };
    shader.uniforms.grainStrength = { value: p.textureStrength };
    shader.uniforms.grainRough = { value: rough };
    shader.uniforms.grainRoughAmount = { value: rough ? 0.5 : 0 };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos;\nvarying vec3 vGrainNormal;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGrainPos = position;\nvGrainNormal = normal;',
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vGrainPos;
        varying vec3 vGrainNormal;
        uniform sampler2D grainMap;
        uniform sampler2D grainRough;
        uniform float grainScale;
        uniform float grainStrength;
        uniform float grainRoughAmount;
        vec4 triplanar(sampler2D tex, vec3 pos, vec3 nrm, float scale) {
          vec3 blend = pow(abs(nrm), vec3(4.0));
          blend /= max(dot(blend, vec3(1.0)), 1e-4);
          vec4 sx = texture2D(tex, pos.yz * scale);
          vec4 sy = texture2D(tex, pos.zx * scale);
          vec4 sz = texture2D(tex, pos.xy * scale);
          return sx * blend.x + sy * blend.y + sz * blend.z;
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 g = triplanar(grainMap, vGrainPos, normalize(vGrainNormal), grainScale).xyz * 2.0 - 1.0;
          normal = normalize(normal + g * grainStrength * 0.55);
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        if (grainRoughAmount > 0.0) {
          float gr = triplanar(grainRough, vGrainPos, normalize(vGrainNormal), grainScale).g;
          roughnessFactor = clamp(roughnessFactor * (1.0 - grainRoughAmount + gr * grainRoughAmount * 2.0), 0.02, 1.0);
        }`,
      );
  };
  // Changing the program is a recompile, and three caches by this key.
  material.customProgramCacheKey = () => `grain-${p.textureKind}-${p.textureScale}-${p.textureStrength}`;
  material.userData.grainTextures = [grain, rough].filter(Boolean);
}

/**
 * A tangent-space normal map from the same procedural grain.
 *
 * Derived by differencing a height field rather than by generating normals
 * directly, so the bumps are consistent with the roughness variation over the
 * same surface — a bump that catches the light must also be the part that is
 * rougher, or the two read as two different materials on one object.
 */
function proceduralNormal(
  kind: MaterialParams['textureKind'],
  scale: number,
  strength: number,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const height = grainField(kind, size);
  const img = ctx.createImageData(size, size);
  // Deliberately gentle: cast metal is fine relief, and a strong normal map on
  // a mirror finish turns into visual noise.
  const relief = 2.2 * Math.max(0.2, strength);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x - 1 + size) % size)];
      const r = height[y * size + ((x + 1) % size)];
      const u = height[((y - 1 + size) % size) * size + x];
      const d = height[((y + 1) % size) * size + x];
      const nx = (l - r) * relief;
      const ny = (u - d) * relief;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(scale, scale);
  tex.center.set(0.5, 0.5);
  return tex;
}

/**
 * The grain itself: value noise summed over several octaves.
 *
 * Octaves rather than one frequency because a single frequency tiles visibly —
 * the eye finds the period immediately, and on a curved surface it reads as a
 * pattern printed on the object rather than as the object's own surface.
 */
function grainField(kind: MaterialParams['textureKind'], size: number): Float32Array {
  const out = new Float32Array(size * size);
  const octaves = kind === 'brushed' ? [[64, 1], [128, 0.5], [256, 0.25]] : [[24, 1], [48, 0.55], [96, 0.3], [192, 0.15]];
  let total = 0;
  for (const [freq, amp] of octaves) {
    total += amp;
    const lattice = new Float32Array(freq * freq);
    let seed = 0x9e3779b9 ^ freq;
    for (let i = 0; i < lattice.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      lattice[i] = ((seed >>> 0) % 4096) / 4096;
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Brushed metal is stretched along one axis; everything else is even.
        const fx = kind === 'brushed' ? (x / size) * freq * 0.12 : (x / size) * freq;
        const fy = (y / size) * freq;
        const x0 = Math.floor(fx) % freq;
        const y0 = Math.floor(fy) % freq;
        const x1 = (x0 + 1) % freq;
        const y1 = (y0 + 1) % freq;
        const tx = smooth(fx - Math.floor(fx));
        const ty = smooth(fy - Math.floor(fy));
        const a = lattice[y0 * freq + x0];
        const b = lattice[y0 * freq + x1];
        const c = lattice[y1 * freq + x0];
        const d = lattice[y1 * freq + x1];
        out[y * size + x] += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function proceduralRoughness(kind: MaterialParams['textureKind'], scale: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  const grain = grainField(kind, size);
  for (let i = 0, p = 0; i < grain.length; i++, p += 4) {
    // A narrow band around the material's own roughness. Wide swings are what
    // produced starbursts: the map multiplies the base value, so a range of
    // 0.3–0.95 on a metal is the difference between a mirror and a matte patch
    // a few pixels apart.
    const v = 0.72 + (grain[i] - 0.5) * 0.5;
    const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
    img.data[p] = c; img.data[p + 1] = c; img.data[p + 2] = c; img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(scale, scale);
  tex.center.set(0.5, 0.5);
  return tex;
}
