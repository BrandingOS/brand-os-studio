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
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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

    if (!this.environment) {
      const room = new RoomEnvironment();
      this.environment = this.pmrem.fromScene(room, 0.04).texture;
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
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

  dispose(): void {
    this.clearObject();
    this.clearBackdrop();
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
    const map = proceduralRoughness(p.textureKind, p.textureScale);
    if (map) {
      material.roughnessMap = map;
      // The map modulates `roughness`, so the base value has to leave headroom
      // or a textured metal reads exactly like a smooth one.
      material.roughness = Math.min(1, p.roughness * (1 + p.textureStrength));
      map.rotation = p.textureRotation;
    }
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
function proceduralRoughness(kind: MaterialParams['textureKind'], scale: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  let seed = 0x9e3779b9;
  const rand = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v: number;
      if (kind === 'brushed') {
        // Streaks along one axis. Anisotropy is what sells brushed metal, and a
        // roughness map that varies only across the grain is how it is faked
        // without a full anisotropic BRDF.
        v = 0.5 + (rand() - 0.5) * 0.9;
        v = v * 0.25 + 0.6;
      } else if (kind === 'speckle') {
        v = rand() > 0.82 ? 0.95 : 0.35 + rand() * 0.2;
      } else {
        const grain = Math.sin((x / size) * Math.PI * 2 * 3) * 0.5 + 0.5;
        v = 0.35 + grain * 0.3 + (rand() - 0.5) * 0.12;
      }
      const i = (y * size + x) * 4;
      const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
      img.data[i] = c; img.data[i + 1] = c; img.data[i + 2] = c; img.data[i + 3] = 255;
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
