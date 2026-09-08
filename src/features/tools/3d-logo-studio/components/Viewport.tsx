/**
 * The rendering surface.
 *
 * This module is the *only* thing in the feature that reaches Three.js, and it
 * is loaded through `React.lazy` from the editor — so `three`, the render layer
 * and the material builders all land in their own chunk. Anyone who never opens
 * the studio never downloads them, and a build test asserts it.
 *
 * It owns exactly one imperative resource and releases it on unmount. A browser
 * caps live WebGL contexts at about sixteen; leaking one per visit means the
 * page silently stops drawing after a handful of navigations, with no error.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LoadingPill } from '@/shared/ds';

import type { MeshData } from '../engine/types';
import type { Studio3dDocument } from '../engine/document';
import { materialFor } from '../engine/document';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import { Studio, buildMaterial, LIGHTING_PRESETS } from '../render/studio';
import { getMaterial } from '../materials/presets';

export interface ViewportProps {
  doc: Studio3dDocument;
  mesh: MeshData;
  /** Rebuilding is the caller's job; this only says a frame is stale. */
  busy?: boolean;
  onReady?: (studio: Studio) => void;
}

export function Viewport({ doc, mesh, busy, onReady }: ViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<Studio | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // The stage is a grid track that manages its own overflow, so its box is
  // authoritative — measuring the canvas instead would feed its own size back
  // into itself and ratchet.
  //
  // Measured synchronously before the first paint as well as observed after it.
  // Waiting for the ResizeObserver alone leaves the canvas at the HTML default
  // of 300x150 for a frame — a postage stamp in the corner of a full-width
  // stage, and, more quietly, a window in which the renderer has not been
  // created at all.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = (width: number, height: number) => {
      setSize((prev) => {
        const next = { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
        return prev.width === next.width && prev.height === next.height ? prev : next;
      });
    };
    const box = host.getBoundingClientRect();
    measure(box.width, box.height);
    const observer = new ResizeObserver(([entry]) => {
      measure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // The renderer is built once and kept. Rebuilding it per resize threw away a
  // WebGL context and a prefiltered environment several times a drag — and left
  // the new one blank, because the effect that draws had no reason to re-run.
  const [ready, setReady] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const studio = new Studio({
      canvas,
      width: Math.max(1, size.width),
      height: Math.max(1, size.height),
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    studioRef.current = studio;
    // Marks the canvas as belonging to a live renderer. Tests wait on it, and
    // it is the honest signal — the <canvas> element exists from the first
    // render, long before anything has drawn into it.
    canvas.dataset.ready = 'true';
    onReady?.(studio);
    setReady((n) => n + 1);
    return () => {
      studioRef.current = null;
      delete canvas.dataset.ready;
      studio.dispose();
    };
    // `onReady` is intentionally not a dependency: a caller passing an inline
    // function would otherwise tear down and rebuild the WebGL context on every
    // render of the parent. `size` is read once here and tracked by the effect
    // below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (size.width < 2 || size.height < 2) return;
    studioRef.current?.resize(size.width, size.height, Math.min(window.devicePixelRatio || 1, 2));
  }, [size.width, size.height]);

  const lighting = useMemo(
    () => LIGHTING_PRESETS.find((l) => l.id === doc.lighting.presetId) ?? LIGHTING_PRESETS[0],
    [doc.lighting.presetId],
  );

  const draw = useCallback(() => {
    const studio = studioRef.current;
    if (!studio) return;
    studio.setLighting(lighting, doc.lighting.showBackground);
    if (doc.lighting.backdrop) studio.setBackdrop(doc.lighting.backdrop[0], doc.lighting.backdrop[1]);
    else studio.clearBackdrop();

    if (mesh.indices.length === 0) {
      studio.clearObject();
      studio.render();
      return;
    }

    const { geometry, componentOrder } = toBufferGeometry(mesh);
    normalizeToUnitSize(geometry, 2);

    // One material per group, in group order — that is how a component keeps
    // its own material without the mesh being split into separate objects.
    const materials = componentOrder.map((componentId) => {
      const preset = getMaterial(materialFor(doc, componentId)) ?? getMaterial('satin-black')!;
      return buildMaterial(preset);
    });
    const object = studio.setObject(geometry, materials.length > 1 ? materials : materials[0]);
    object.position.set(...doc.transform.position);
    object.rotation.set(...doc.transform.rotation);
    object.scale.set(...doc.transform.scale);

    studio.camera.position.set(...doc.camera.position);
    studio.camera.fov = doc.camera.fov;
    studio.frame(1.3);
    studio.render();

    return () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    };
  }, [doc, mesh, lighting]);

  // `ready` is in the dependency list on purpose: without it the very first
  // draw can run before the renderer exists and never be retried, which is a
  // permanently blank stage that no error reports.
  useEffect(() => {
    const cleanup = draw();
    return cleanup;
  }, [draw, ready, size.width, size.height]);

  return (
    <div className="l3d-stage" ref={hostRef}>
      <canvas ref={canvasRef} aria-label="3D preview of the imported logo" />
      {busy && (
        <div className="l3d-stage-status" role="status" aria-live="polite">
          <LoadingPill label="Rebuilding geometry…" />
        </div>
      )}
      {mesh.indices.length > 0 && (
        <div className="l3d-stage-meta">
          {mesh.groups.length} component{mesh.groups.length === 1 ? '' : 's'} ·{' '}
          {(mesh.indices.length / 3).toLocaleString()} triangles
        </div>
      )}
    </div>
  );
}

export default Viewport;
