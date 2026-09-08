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
import { DEFAULT_INFLATE, type InflateOptions } from './modes/inflate';
import { DEFAULT_EXTRUDE, DEFAULT_FLAT, type ExtrudeOptions, type FlatOptions } from './modes/extrude';
import { DEFAULT_REVOLVE, type RevolveOptions } from './modes/revolve';

/** Bumped when a change to this file cannot be read by the previous version.
 *  `storage/` migrates on load; nothing else may branch on it. */
export const DOCUMENT_SCHEMA_VERSION = 1;

/** Identifies which build produced a document, for diagnosing a bad archive. */
export const ENGINE_VERSION = '0.2.0';

export type GeometryMode = 'flat' | 'extrude' | 'inflate' | 'revolve';

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

export interface CameraState {
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
  };
  camera: CameraState;
  animation: AnimationState;
}

export const DEFAULT_GEOMETRY: GeometrySettings = {
  mode: 'inflate',
  flat: DEFAULT_FLAT,
  extrude: DEFAULT_EXTRUDE,
  inflate: DEFAULT_INFLATE,
  revolve: DEFAULT_REVOLVE,
};

export const DEFAULT_CAMERA: CameraState = {
  position: [1.1, 1.0, 3.2],
  target: [0, 0, 0],
  fov: 35,
  projection: 'perspective',
};

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
    geometry: DEFAULT_GEOMETRY,
    modifiers: [],
    transform: IDENTITY_TRANSFORM,
    materials: { defaultId: 'satin-black', byComponent: {} },
    lighting: { presetId: 'white-studio', showBackground: true, backdrop: null },
    camera: DEFAULT_CAMERA,
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
