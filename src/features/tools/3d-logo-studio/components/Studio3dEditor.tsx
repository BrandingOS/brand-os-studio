/**
 * 3D Logo Studio — the editor.
 *
 * Phase 3's job is that this mounts inside BrandingOS, wears its chrome, needs
 * no Brand, and leaves nothing behind on the way out. The panels it carries are
 * real but not final: modifiers, per-component editing, cameras, animation and
 * export land in later phases against the same document model.
 *
 * Two structural decisions worth keeping:
 *
 * - **The viewport is lazy.** `three` plus the render layer is the heaviest
 *   thing this feature owns and no other route should pay for it, so it is
 *   loaded through `React.lazy` and nothing above this line imports `render/`.
 * - **Geometry is rebuilt off the main thread's critical path.** A rebuild is
 *   tens to hundreds of milliseconds, so it is scheduled rather than run inside
 *   the event handler that changed the slider, and a stale result can never
 *   overwrite a newer one — the version check is the same rule the PRD sets for
 *   the modifier stack in Phase 6.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { DsBanner, LoadingPill } from '@/shared/ds';

import '../studio3d.css';
import type { MeshData } from '../engine/types';
import { EMPTY_MESH } from '../engine/types';
import {
  createDocument, setGeometryMode, setModeOptions, setDefaultMaterial, setLighting,
  resetToSource, setCameraView, setCamera, setRender, setAnimation,
  setLightSource, resetLightSource,
  type AnimationState, type CameraView, type GeometryMode, type RenderState,
  type Studio3dDocument,
} from '../engine/document';
import { buildMesh } from '../engine/buildMesh';
import type { RevolveWarning } from '../engine/modes/revolve';
import type { ImportResult } from '../render/svgImport';
import { ImportPanel, DiagnosticBanner } from './ImportPanel';
import { PropertiesPanel } from './PropertiesPanel';

// One dynamic import, one chunk: three, the render layer and the materials.
const Viewport = lazy(() => import('./Viewport'));

export interface Studio3dEditorProps {
  /** Preloaded document — the tests use it, and Brand mode will later. */
  initialDocument?: Studio3dDocument;
}

/**
 * Collapse per-component warnings into one line per kind, naming how many
 * components each affects.
 */
export function summariseWarnings(warnings: readonly RevolveWarning[]): string[] {
  const counts = new Map<RevolveWarning['code'], number>();
  for (const w of warnings) counts.set(w.code, (counts.get(w.code) ?? 0) + 1);
  const out: string[] = [];
  for (const [code, n] of counts) {
    const parts = n === 1 ? 'One part' : `${n} parts`;
    if (code === 'profile-crosses-axis') {
      out.push(
        `${parts} of this logo cross the axis, so the sweep folds through itself. ` +
        'Move the pivot or the axis offset so the shape sits to one side of it.',
      );
    } else {
      out.push(`${parts} had no usable profile and ${n === 1 ? 'was' : 'were'} skipped.`);
    }
  }
  return out;
}

export function Studio3dEditor({ initialDocument }: Studio3dEditorProps) {
  const [doc, setDoc] = useState<Studio3dDocument | null>(initialDocument ?? null);
  const [mesh, setMesh] = useState<MeshData>(EMPTY_MESH);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [highQualityUnavailable, setHighQualityUnavailable] = useState<string | null>(null);

  // Monotonic, so a slow rebuild that finishes after a faster later one is
  // discarded instead of painting an older shape over a newer one.
  const versionRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (!doc) {
      setMesh(EMPTY_MESH);
      return;
    }
    const version = ++versionRef.current;
    setBusy(true);
    // A frame's grace so the control that triggered this paints its new value
    // first; without it a dragged slider feels like it is fighting back.
    const handle = window.setTimeout(() => {
      if (!aliveRef.current || version !== versionRef.current) return;
      try {
        const result = buildMesh(doc);
        if (!aliveRef.current || version !== versionRef.current) return;
        setMesh(result.mesh);
        // One message per *kind*, not one per component. A warning is about a
        // setting, and a nine-part logo raised the identical sentence nine
        // times — a wall of banners that pushed the artwork off the screen and
        // said nothing the first one had not.
        setWarnings(summariseWarnings(result.warnings));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The geometry could not be built.');
        setMesh(EMPTY_MESH);
      } finally {
        if (aliveRef.current && version === versionRef.current) setBusy(false);
      }
    }, 0);
    return () => window.clearTimeout(handle);
    // Only modeling inputs rebuild geometry. A camera gesture or material change
    // must not run triangulation again on the main thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.source, doc?.geometry, doc?.components, doc?.componentState, doc?.modifiers]);

  const handleFile = useCallback(async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      // Imported here rather than at module scope: it reaches three's SVGLoader,
      // and the empty state must not download the render layer.
      const { importSvg } = await import('../render/svgImport');
      const result = await importSvg(text);
      setImportResult(result);
      if (result.components.length === 0) {
        setDoc(null);
        return;
      }
      setDoc(createDocument({ svg: result.source, fileName: file.name, components: result.components }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.');
    } finally {
      setImporting(false);
    }
  }, []);

  if (!doc) {
    return (
      <div className="l3d-shell">
        <div className="l3d-work" style={{ display: 'block' }}>
          <div className="l3d-stage" style={{ minHeight: 420 }}>
            <div className="l3d-stage-status">
              <ImportPanel onFile={handleFile} busy={importing} result={importResult} error={error} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="l3d-shell">
      {(error || warnings.length > 0 || (importResult?.diagnostics.length ?? 0) > 0) && (
        <div className="l3d-diagnostics">
          {error && <DsBanner tone="danger">{error}</DsBanner>}
          {warnings.map((w, i) => <DsBanner key={`w${i}`} tone="warning">{w}</DsBanner>)}
          {importResult?.diagnostics.map((d, i) => <DiagnosticBanner key={`d${i}`} diagnostic={d} />)}
        </div>
      )}
      <div className="l3d-work">
        <div className="panel" aria-label="Source">
          <div className="panel-top">
            <div className="panel-heading">
              <span className="panel-heading-eyebrow">Logo</span>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="l3d-stage">
              <div className="l3d-stage-status" role="status">
                <LoadingPill label="Loading the renderer…" />
              </div>
            </div>
          }
        >
          <Viewport doc={doc} mesh={mesh} busy={busy}
            onCameraChange={(camera) => setDoc((d) => d ? setCamera(d, camera) : d)}
            onHighQualityUnavailable={setHighQualityUnavailable} />
        </Suspense>

        <PropertiesPanel
          doc={doc}
          onModeChange={(mode: GeometryMode) => setDoc((d) => (d ? setGeometryMode(d, mode) : d))}
          onModePatch={(patch) =>
            setDoc((d) => (d ? setModeOptions(d, d.geometry.mode, patch as never) : d))
          }
          onMaterialChange={(id) => setDoc((d) => (d ? setDefaultMaterial(d, id) : d))}
          onLightingChange={(id) => setDoc((d) => (d ? setLighting(d, { presetId: id }) : d))}
          onBackgroundToggle={(v) => setDoc((d) => (d ? setLighting(d, { showBackground: v }) : d))}
          onViewChange={(view: CameraView) => setDoc((d) => (d ? setCameraView(d, view) : d))}
          onProjectionChange={(projection) => setDoc((d) => (d ? setCamera(d, { projection, zoom: undefined, frustumHeight: undefined }) : d))}
          onRenderChange={(patch: Partial<RenderState>) => {
            // A new attempt deserves a clean slate: the last refusal was about
            // the previous settings, and leaving it up makes the control look
            // permanently broken.
            if (patch.mode) setHighQualityUnavailable(null);
            setDoc((d) => (d ? setRender(d, patch) : d));
          }}
          onAnimationChange={(patch: Partial<AnimationState>) =>
            setDoc((d) => (d ? setAnimation(d, patch) : d))}
          onLightSourceChange={(patch) => setDoc((d) => (d ? setLightSource(d, patch) : d))}
          onLightSourceReset={() => setDoc((d) => (d ? resetLightSource(d) : d))}
          highQualityUnavailable={highQualityUnavailable}
          onReset={() => setDoc((d) => (d ? resetToSource(d) : d))}
        />
      </div>
    </div>
  );
}

export default Studio3dEditor;
