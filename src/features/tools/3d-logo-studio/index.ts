/**
 * 3D Logo Studio — public surface.
 *
 * Deliberately narrow, and deliberately free of anything that reaches Three.js:
 * importing this module must not pull the render layer into a caller's chunk.
 * The editor lazy-loads its own viewport; `render/`, `materials/` and `export/`
 * are reached through that boundary, never re-exported here.
 */

export { Studio3dEditor, type Studio3dEditorProps } from './components/Studio3dEditor';
export {
  createDocument, resetToSource, setGeometryMode, setModeOptions,
  type Studio3dDocument, type GeometryMode, DOCUMENT_SCHEMA_VERSION, ENGINE_VERSION,
} from './engine/document';
export { buildMesh, type BuildResult } from './engine/buildMesh';
export type { Component, MeshData } from './engine/types';
