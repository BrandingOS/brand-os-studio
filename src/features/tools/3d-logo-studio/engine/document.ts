/**
 * =============================================================================
 * The project document
 * =============================================================================
 *
 * One serializable value describing an entire 3D Logo Studio project, and a set
 * of pure operators over it. No React, no DOM, no Three.js — the same reasons
 * as the rest of `engine/`, plus one more: this is what the project archive
 * writes and what a future backend would store, so it must be expressible as
 * JSON and comparable by value.
 *
 * Two rules the shape exists to enforce:
 *
 * - **The original source is never discarded.** `source.svg` holds the file as
 *   supplied. Changing the geometry method, resetting, or comparing against the
 *   original must never require the user to upload again.
 * - **Every operator returns a new document.** Undo, autosave and "did anything
 *   change?" all become identity comparisons rather than deep diffs, and an
 *   interrupted save can never leave a half-applied state.
 */

import type { Component } from './types';
import { boundsOf } from './geom/polygon';
import { DEFAULT_LIGHT_SOURCE, type LightSource } from '../materials/lighting';
import { DEFAULT_INFLATE, DEFAULT_SPHERE, type InflateOptions } from './modes/inflate';
import { DEFAULT_EXTRUDE, DEFAULT_FLAT, type ExtrudeOptions, type FlatOptions } from './modes/extrude';
import { DEFAULT_REVOLVE, type RevolveOptions } from './modes/revolve';

/** Bumped when a change to this file cannot be read by the previous version.
 *  `storage/` migrates on load; nothing else may branch on it. */
export const DOCUMENT_SCHEMA_VERSION = 1;

/** Identifies which build produced a document, for diagnosing a bad archive. */
export const ENGINE_VERSION = '0.2.0';

export type GeometryMode = 'flat' | 'extrude' | 'inflate' | 'sphere' | 'revolve';

/**
 * Settings for all four modes are kept at once, not swapped out.
 *
 * Switching from Extrude to Inflate and back must return the extrusion the user
 * had, or every experiment costs them their settings — and the PRD requires
 * changing the modelling method without re-importing.
 */
export interface GeometrySettings {
  mode: GeometryMode;
  flat: FlatOptions;
  extrude: ExtrudeOptions;
  inflate: InflateOptions;
  /** Inflate's machinery with a per-component reach — see `InflateOptions.scale`. */
  sphere: InflateOptions;
  revolve: RevolveOptions;
}

export interface Transform {
  position: [number, number, number];
  /** Euler angles in radians, XYZ order. */
  rotation: [number, number, number];
  scale: [number, number, number];
}

export const IDENTITY_TRANSFORM: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

export interface ComponentState {
  hidden: boolean;
  locked: boolean;
  /** Preset id. Absent means the document's default material. */
  materialId?: string;
  /** Applied on top of the object transform. Absent means identity. */
  transform?: Transform;
}

/**
 * An ordered, non-destructive modifier.
 *
 * The stack is here in the schema from the start even though Phase 6 fills it,
 * because order is part of the result and therefore part of what a saved
 * project has to preserve — retrofitting that into stored documents later means
 * migrating every one of them.
 */
export interface Modifier {
  id: string;
  kind: 'twist' | 'taper' | 'smooth' | 'normals';
  enabled: boolean;
  /** Empty means the whole object. */
  scope: string[];
  params: Record<string, number | string | boolean>;
}

/**
 * How a frame is produced.
 *
 * `preview` is the rasterized viewport: instant, and unable to bounce light.
 * `high` traces paths — real reflections between the parts of a mark, occlusion
 * in its crevices, and glass that refracts more than once. It is progressive and
 * it is slow, which is why it is a mode rather than the default.
 */
export interface RenderState {
  mode: 'preview' | 'high';
  /** Samples per pixel to accumulate before a high render is called finished. */
  targetSamples: number;
  /** Traced resolution as a fraction of the viewport. */
  renderScale: number;
}

export const DEFAULT_RENDER: RenderState = {
  mode: 'preview',
  // Enough for a clean metal; glass and caustics want several times more, and
  // the control goes there.
  targetSamples: 256,
  renderScale: 1,
};

export interface CameraState {
  /** Optional for documents made before interactive navigation. */
  zoom?: number;
  frustumHeight?: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  projection: 'perspective' | 'orthographic';
}

export interface AnimationState {
  preset: 'static' | 'spin' | 'float' | 'oscillate' | 'orbit' | 'turntable' | 'pulse' | 'wobble';
  durationSeconds: number;
  fps: number;
  speed: number;
  reverse: boolean;
  loop: boolean;
  axis: 'x' | 'y' | 'z';
  ease: 'linear' | 'inOut';
}

export interface Studio3dDocument {
  schemaVersion: number;
  engineVersion: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: {
    /** Exactly as supplied. Never regenerated, never normalized. */
    svg: string;
    fileName: string;
    importedAt: string;
  };
  /** Normalized vector data derived from `source.svg`. */
  components: Component[];
  componentState: Record<string, ComponentState>;
  geometry: GeometrySettings;
  modifiers: Modifier[];
  transform: Transform;
  materials: {
    defaultId: string;
    byComponent: Record<string, string>;
  };
  lighting: {
    presetId: string;
    showBackground: boolean;
    backdrop: [string, string] | null;
    /**
     * Where the key light is. `null` means the preset's own.
     *
     * Kept here rather than in the renderer because it is a property of the
     * project: a saved logo has to reopen lit the way the user left it.
     */
    source: LightSource | null;
  };
  camera: CameraState;
  render: RenderState;
  animation: AnimationState;
}

export const DEFAULT_GEOMETRY: GeometrySettings = {
  mode: 'inflate',
  flat: DEFAULT_FLAT,
  extrude: DEFAULT_EXTRUDE,
  inflate: DEFAULT_INFLATE,
  sphere: DEFAULT_SPHERE,
  revolve: DEFAULT_REVOLVE,
};

/**
 * Depths and thicknesses, as a fraction of the logo's longest side.
 *
 * Every distance the generators take is in the artwork's own units, and those
 * units are whatever the file was drawn in. A fixed default of "6" is 5% of a
 * 113-unit viewBox and 0.6% of a 1024-unit one — so the same logo exported at a
 * different size would open looking almost flat, and the user would reasonably
 * conclude the tool was broken rather than that they had to go hunting for a
 * slider.
 *
 * Resolved once, when the document is created, so the numbers the panel shows
 * are real values in the artwork's units and stay editable as such.
 */
const DEFAULT_PROPORTIONS = {
  /** Peak half-thickness of an inflated surface. */
  inflateThickness: 0.055,
  /** Front-to-back depth of an extrusion. */
  extrudeDepth: 0.07,
} as const;

/** The default settings for a particular piece of artwork. */
export function defaultGeometryFor(components: readonly Component[]): GeometrySettings {
  const bounds = boundsOf(components);
  const extent = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  if (!Number.isFinite(extent) || extent <= 0) return DEFAULT_GEOMETRY;
  return {
    ...DEFAULT_GEOMETRY,
    inflate: { ...DEFAULT_INFLATE, thickness: round(extent * DEFAULT_PROPORTIONS.inflateThickness) },
    extrude: { ...DEFAULT_EXTRUDE, depth: round(extent * DEFAULT_PROPORTIONS.extrudeDepth) },
  };
}

/** Two significant figures, so the sliders open on a number a person would
 *  have typed rather than 6.214999999999999. */
function round(v: number): number {
  if (!(v > 0)) return v;
  // Via toPrecision, not by multiplying back up: 39 * 0.1 is
  // 3.9000000000000004, and a slider whose step is that is a slider that shows
  // it.
  return Number.parseFloat(v.toPrecision(2));
}

/**
 * Straight on, and on a longer lens than a default 3D scene would use.
 *
 * The first version opened at a three-quarter angle with a 35° field of view.
 * Two things were wrong with that. A logo is a flat piece of artwork and the
 * first thing anyone wants to see is that it still reads as itself — an angled
 * opening shot asks them to accept a reinterpretation before they have seen the
 * thing they uploaded. And a wide lens on an object that fills the frame throws
 * the outer parts into visible perspective distortion: on the nine-dot mark the
 * corner discs came out as ellipses, which reads as "stretched", not as depth.
 *
 * So the default is front-on and **orthographic**. Under perspective the parts
 * of a logo nearest the camera render larger than the parts further away — on
 * the nine-dot mark the right-hand discs came out visibly bigger than the
 * left-hand ones — and the eye reads that as the artwork being distorted,
 * because it is. Every design tool shows a document orthographically for the
 * same reason. Depth is then carried by the lighting and the silhouette rather
 * than by skewing the artwork.
 *
 * Perspective remains one click away, on a long lens, for anyone who wants it.
 */
export const DEFAULT_CAMERA: CameraState = {
  position: [0, 0, 4],
  target: [0, 0, 0],
  // Only consulted under perspective; long, so choosing perspective flatters
  // the object rather than bending it.
  fov: 20,
  projection: 'orthographic',
};

/** Named directions the camera can be sent to. The distance is not stored:
 *  the studio frames the object, so a preset is a direction and nothing more. */
export const CAMERA_VIEWS = {
  front: [0, 0, 1],
  'three-quarter': [0.55, 0.45, 1],
  side: [1, 0, 0.12],
  top: [0, 1, 0.12],
} as const satisfies Record<string, readonly [number, number, number]>;

export type CameraView = keyof typeof CAMERA_VIEWS;

/** Point the camera along a named direction, keeping its distance and lens. */
export function setCameraView(doc: Studio3dDocument, view: CameraView): Studio3dDocument {
  const dir = CAMERA_VIEWS[view];
  const length = Math.hypot(...doc.camera.position) || 4;
  const norm = Math.hypot(...dir) || 1;
  return setCamera(doc, {
    position: [(dir[0] / norm) * length, (dir[1] / norm) * length, (dir[2] / norm) * length],
    target: [0, 0, 0], zoom: undefined, frustumHeight: undefined,
  });
}

/** Which preset the camera is currently pointing along, if any. */
export function currentCameraView(doc: Studio3dDocument): CameraView | null {
  const [x, y, z] = doc.camera.position.map((v, i) => v - doc.camera.target[i]);
  const length = Math.hypot(x, y, z);
  if (!(length > 0)) return null;
  for (const [name, dir] of Object.entries(CAMERA_VIEWS) as [CameraView, readonly number[]][]) {
    const norm = Math.hypot(dir[0], dir[1], dir[2]);
    const dot = (x * dir[0] + y * dir[1] + z * dir[2]) / (length * norm);
    if (dot > 0.9999) return name;
  }
  return null;
}

export const DEFAULT_ANIMATION: AnimationState = {
  preset: 'static',
  durationSeconds: 5,
  fps: 30,
  speed: 1,
  reverse: false,
  loop: true,
  axis: 'y',
  ease: 'inOut',
};

export interface CreateDocumentInput {
  svg: string;
  fileName: string;
  components: Component[];
  name?: string;
  id?: string;
  now?: () => Date;
}

export function createDocument(input: CreateDocumentInput): Studio3dDocument {
  const now = (input.now ?? (() => new Date()))().toISOString();
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    id: input.id ?? `doc-${now}-${input.fileName}`,
    name: input.name ?? stripExtension(input.fileName) ?? 'Untitled logo',
    createdAt: now,
    updatedAt: now,
    source: { svg: input.svg, fileName: input.fileName, importedAt: now },
    components: input.components,
    componentState: {},
    geometry: defaultGeometryFor(input.components),
    modifiers: [],
    transform: IDENTITY_TRANSFORM,
    materials: { defaultId: 'satin-black', byComponent: {} },
    lighting: { presetId: 'white-studio', showBackground: true, backdrop: null, source: null },
    camera: DEFAULT_CAMERA,
    render: DEFAULT_RENDER,
    animation: DEFAULT_ANIMATION,
  };
}

// ---------------------------------------------------------------------------
// Operators. Each returns a new document; none mutates its input.
// ---------------------------------------------------------------------------

function touch(doc: Studio3dDocument, patch: Partial<Studio3dDocument>): Studio3dDocument {
  return { ...doc, ...patch, updatedAt: new Date().toISOString() };
}

export function setGeometryMode(doc: Studio3dDocument, mode: GeometryMode): Studio3dDocument {
  if (doc.geometry.mode === mode) return doc;
  return touch(doc, { geometry: { ...doc.geometry, mode } });
}

/** Patch the options of one mode. The other three keep their settings. */
export function setModeOptions<M extends GeometryMode>(
  doc: Studio3dDocument,
  mode: M,
  patch: Partial<GeometrySettings[M]>,
): Studio3dDocument {
  return touch(doc, {
    geometry: { ...doc.geometry, [mode]: { ...doc.geometry[mode], ...patch } } as GeometrySettings,
  });
}

export function setDefaultMaterial(doc: Studio3dDocument, materialId: string): Studio3dDocument {
  if (doc.materials.defaultId === materialId) return doc;
  return touch(doc, { materials: { ...doc.materials, defaultId: materialId } });
}

export function setComponentMaterial(
  doc: Studio3dDocument,
  componentId: string,
  materialId: string | null,
): Studio3dDocument {
  const byComponent = { ...doc.materials.byComponent };
  if (materialId === null) delete byComponent[componentId];
  else byComponent[componentId] = materialId;
  return touch(doc, { materials: { ...doc.materials, byComponent } });
}

/** The material a component actually renders with. */
export function materialFor(doc: Studio3dDocument, componentId: string): string {
  return doc.materials.byComponent[componentId] ?? doc.materials.defaultId;
}

export function setLighting(doc: Studio3dDocument, patch: Partial<Studio3dDocument['lighting']>): Studio3dDocument {
  return touch(doc, { lighting: { ...doc.lighting, ...patch } });
}

export function setCamera(doc: Studio3dDocument, patch: Partial<CameraState>): Studio3dDocument {
  return touch(doc, { camera: { ...doc.camera, ...patch } });
}

export function setRender(doc: Studio3dDocument, patch: Partial<RenderState>): Studio3dDocument {
  return touch(doc, { render: { ...doc.render, ...patch } });
}

/** Patch the key light, adopting the preset's defaults on first touch. */
export function setLightSource(doc: Studio3dDocument, patch: Partial<LightSource>): Studio3dDocument {
  const current = doc.lighting.source ?? DEFAULT_LIGHT_SOURCE;
  return touch(doc, { lighting: { ...doc.lighting, source: { ...current, ...patch } } });
}

/** Hand the key light back to the lighting preset. */
export function resetLightSource(doc: Studio3dDocument): Studio3dDocument {
  if (doc.lighting.source === null) return doc;
  return touch(doc, { lighting: { ...doc.lighting, source: null } });
}

export function setAnimation(doc: Studio3dDocument, patch: Partial<AnimationState>): Studio3dDocument {
  return touch(doc, { animation: { ...doc.animation, ...patch } });
}

export function setTransform(doc: Studio3dDocument, patch: Partial<Transform>): Studio3dDocument {
  return touch(doc, { transform: { ...doc.transform, ...patch } });
}

export function resetTransform(doc: Studio3dDocument): Studio3dDocument {
  return touch(doc, { transform: IDENTITY_TRANSFORM });
}

export function updateComponentState(
  doc: Studio3dDocument,
  componentId: string,
  patch: Partial<ComponentState>,
): Studio3dDocument {
  const current = doc.componentState[componentId] ?? { hidden: false, locked: false };
  return touch(doc, {
    componentState: { ...doc.componentState, [componentId]: { ...current, ...patch } },
  });
}

export function componentStateFor(doc: Studio3dDocument, componentId: string): ComponentState {
  return doc.componentState[componentId] ?? { hidden: false, locked: false };
}

/** Components that should actually be built — hidden ones are skipped entirely
 *  rather than generated and then not drawn, because generation is the
 *  expensive half. */
export function visibleComponents(doc: Studio3dDocument): Component[] {
  return doc.components.filter((c) => !componentStateFor(doc, c.id).hidden);
}

/**
 * Reset to the freshly imported state, keeping only the source.
 *
 * This is the operator the PRD's "always preserve the original uploaded source"
 * requirement exists for, and it is why `source.svg` and `components` are
 * separate fields: the components can be rebuilt from the source, but keeping
 * them means a reset does not have to re-parse.
 */
export function resetToSource(doc: Studio3dDocument): Studio3dDocument {
  return {
    ...createDocument({
      svg: doc.source.svg,
      fileName: doc.source.fileName,
      components: doc.components,
      name: doc.name,
      id: doc.id,
    }),
    createdAt: doc.createdAt,
  };
}

function stripExtension(fileName: string): string | undefined {
  const base = fileName.split('/').pop();
  if (!base) return undefined;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return stem.trim() || undefined;
}
