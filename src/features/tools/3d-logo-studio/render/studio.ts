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

export interface LightingPreset {
  id: string;
  name: string;
  background: string;
  /** Separate from `background` on purpose: the PRD requires the reflected
   *  environment to be independent of what the viewer sees behind the object. */
  environmentIntensity: number;
  key: { position: [number, number, number]; intensity: number; color: string };
  fill: { position: [number, number, number]; intensity: number; color: string };
  rim: { position: [number, number, number]; intensity: number; color: string };
  ambient: number;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'white-studio', name: 'White studio', background: '#f2f1ee', environmentIntensity: 1.1,
    key: { position: [4, 6, 6], intensity: 2.2, color: '#ffffff' },
    fill: { position: [-5, 1, 4], intensity: 0.8, color: '#eef1f5' },
    rim: { position: [0, 3, -6], intensity: 1.4, color: '#ffffff' },
    ambient: 0.35,
  },
  {
    id: 'black-studio', name: 'Black studio', background: '#0c0c0e', environmentIntensity: 0.55,
    key: { position: [4, 5, 5], intensity: 2.6, color: '#ffffff' },
    fill: { position: [-5, 0, 3], intensity: 0.35, color: '#9fb4d0' },
    rim: { position: [-1, 2, -6], intensity: 2.4, color: '#ffffff' },
    ambient: 0.08,
  },
  {
    id: 'neutral-studio', name: 'Neutral studio', background: '#8b8b8e', environmentIntensity: 1,
    key: { position: [3, 5, 6], intensity: 1.8, color: '#ffffff' },
    fill: { position: [-4, 1, 4], intensity: 0.9, color: '#ffffff' },
    rim: { position: [0, 2, -5], intensity: 1, color: '#ffffff' },
    ambient: 0.4,
  },
  {
    id: 'soft-product', name: 'Soft product', background: '#e8e6e1', environmentIntensity: 1.3,
    key: { position: [2, 7, 5], intensity: 1.5, color: '#fffaf2' },
    fill: { position: [-4, 2, 5], intensity: 1.1, color: '#f0f4ff' },
    rim: { position: [1, 1, -5], intensity: 0.6, color: '#ffffff' },
    ambient: 0.55,
  },
  {
    id: 'dramatic-rim', name: 'Dramatic rim', background: '#111114', environmentIntensity: 0.4,
    key: { position: [6, 3, 2], intensity: 1.2, color: '#ffd9b0' },
    fill: { position: [-6, -1, 2], intensity: 0.25, color: '#7aa2ff' },
    rim: { position: [-2, 4, -6], intensity: 4, color: '#ffffff' },
    ambient: 0.05,
  },
  {
    id: 'high-contrast', name: 'High contrast reflective', background: '#ffffff', environmentIntensity: 1.6,
    key: { position: [5, 8, 4], intensity: 3, color: '#ffffff' },
    fill: { position: [-6, 0, 2], intensity: 0.2, color: '#ffffff' },
    rim: { position: [0, -3, -6], intensity: 2, color: '#ffffff' },
    ambient: 0.2,
  },
];

export interface StudioOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio?: number;
  transparent?: boolean;
  /** Off for a screenshot, on for an export where every pixel is paid for once. */
  antialias?: boolean;
}

export class Studio {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
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

    this.camera = new THREE.PerspectiveCamera(35, options.width / options.height, 0.01, 100);
    this.camera.position.set(0, 0, 6);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();
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
    const fov = (this.camera.fov * Math.PI) / 180;
    // Fit against the *narrower* of the two view angles, or a wide logo in a
    // tall viewport is framed on height and runs off the sides.
    const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
    const distance = Math.max(
      radius / Math.sin(Math.min(fov, horizontalFov) / 2),
      radius * 1.2,
    ) * margin;
    const dir = this.camera.position.clone().sub(centre);
    if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1);
    dir.normalize();
    this.camera.position.copy(centre).add(dir.multiplyScalar(distance));
    this.camera.near = Math.max(distance / 100, 0.001);
    this.camera.far = distance * 10;
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
