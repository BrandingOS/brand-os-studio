/** Lazy renderer boundary. Geometry, appearance and navigation update separately. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box3, Mesh, OrthographicCamera, type Material } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DsButton, LoadingPill } from '@/shared/ds';
import type { MeshData } from '../engine/types';
import { type CameraState, type Studio3dDocument } from '../engine/document';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import { Studio, buildMaterial, LIGHTING_PRESETS } from '../render/studio';
import { getMaterial } from '../materials/presets';
import type { PathTraceHandle, PathTraceProgress } from '../render/pathTracer';
import { evaluateAnimation, isAnimated } from '../engine/animation';

export interface ViewportProps {
  doc: Studio3dDocument;
  mesh: MeshData;
  busy?: boolean;
  onReady?: (studio: Studio) => void;
  onCameraChange?: (camera: CameraState) => void;
  /** Raised when a traced render cannot run here, so the panel can say why. */
  onHighQualityUnavailable?: (reason: string) => void;
}

function release(material: Material) {
  // Custom shader textures are not released by Material.dispose().
  for (const texture of material.userData.grainTextures ?? []) texture.dispose();
  material.dispose();
}

export function Viewport({
  doc, mesh, busy, onReady, onCameraChange, onHighQualityUnavailable,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<Studio | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectRef = useRef<Mesh | null>(null);
  const cameraKey = useRef('');
  const framedSource = useRef<object | null>(null);
  const callbacks = useRef({ onReady, onCameraChange, onHighQualityUnavailable });
  callbacks.current = { onReady, onCameraChange, onHighQualityUnavailable };
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [ready, setReady] = useState(0);
  const [trace, setTrace] = useState<PathTraceProgress | null>(null);
  const traceRef = useRef<PathTraceHandle | null>(null);
  /**
   * Bumped whenever a traced render should start over.
   *
   * Navigation does not change the document until the gesture ends, so a zoom
   * or an orbit needs its own signal — without one the view moves and the
   * accumulated picture stays behind, describing where the camera used to be.
   */
  const [traceEpoch, setTraceEpoch] = useState(0);
  /** Read by the OrbitControls handlers, which are bound once and would
   *  otherwise close over the mode as it was at mount. */
  const highRef = useRef(false);
  highRef.current = doc.render.mode === 'high';

  useLayoutEffect(() => {
    const host = hostRef.current!;
    const measure = () => {
      const box = host.getBoundingClientRect();
      setSize({ width: Math.max(1, Math.round(box.width)), height: Math.max(1, Math.round(box.height)) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const publishCamera = () => {
    const studio = studioRef.current, controls = controlsRef.current;
    if (!studio || !controls) return;
    const camera = studio.camera;
    const next: CameraState = {
      position: camera.position.toArray(), target: controls.target.toArray(),
      projection: camera instanceof OrthographicCamera ? 'orthographic' : 'perspective',
      fov: 'fov' in camera ? camera.fov : doc.camera.fov,
      zoom: camera.zoom,
      ...(camera instanceof OrthographicCamera ? { frustumHeight: camera.top - camera.bottom } : {}),
    };
    cameraKey.current = JSON.stringify(next);
    callbacks.current.onCameraChange?.(next);
  };
  const publishRef = useRef(publishCamera);
  publishRef.current = publishCamera;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const studio = new Studio({ canvas, width: 1, height: 1,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
    const controls = new OrbitControls(studio.camera, canvas);
    // Demand-driven: no permanent RAF and no motion after the user releases.
    controls.enableDamping = false;
    controls.minZoom = 0.1;
    controls.maxZoom = 20;
    controls.minDistance = 0.1;
    controls.maxDistance = 50;
    controls.listenToKeyEvents(canvas);
    /**
     * A rasterized frame, drawn while the user is moving the camera.
     *
     * In high quality this also *stops* the trace. Both renderers write to the
     * same canvas, and this handler fires on every frame of an orbit or a zoom —
     * so without the cancel it paints the rasterized image over the accumulated
     * one continuously, and "High quality" appears to do nothing at all. That is
     * exactly what it did.
     *
     * Falling back to the raster while the camera is in motion is also the right
     * behaviour rather than a concession: it is the PRD's "reduced quality while
     * the camera is moving, restored when interaction stops".
     */
    const draw = () => {
      if (highRef.current) traceRef.current?.cancel();
      studio.render();
    };
    const end = () => {
      publishRef.current();
      // Re-trace from the new view. Publishing may not change the document at
      // all — a click that moved nothing — so the restart cannot rely on it.
      if (highRef.current) setTraceEpoch(n => n + 1);
    };
    const focus = () => canvas.focus({ preventScroll: true });
    controls.addEventListener('change', draw);
    controls.addEventListener('end', end);
    canvas.addEventListener('pointerdown', focus);
    // Keyboard gestures do not emit an end event.
    canvas.addEventListener('keyup', end);
    studioRef.current = studio;
    controlsRef.current = controls;
    canvas.dataset.ready = 'true';
    callbacks.current.onReady?.(studio);
    setReady(n => n + 1);
    return () => {
      controls.removeEventListener('change', draw);
      controls.removeEventListener('end', end);
      canvas.removeEventListener('pointerdown', focus);
      canvas.removeEventListener('keyup', end);
      controls.dispose();
      studioRef.current = null;
      controlsRef.current = null;
      framedSource.current = null;
      cameraKey.current = '';
      delete canvas.dataset.ready;
      studio.dispose();
    };
  }, []);

  useEffect(() => {
    const studio = studioRef.current;
    if (!studio) return;
    studio.resize(size.width, size.height, Math.min(window.devicePixelRatio || 1, 2));
    const camera = studio.camera;
    if (camera instanceof OrthographicCamera) {
      const half = (camera.top - camera.bottom) / 2;
      camera.left = -half * size.width / size.height;
      camera.right = -camera.left;
      camera.updateProjectionMatrix();
    }
    studio.render();
  }, [size, ready]);

  useEffect(() => {
    const studio = studioRef.current;
    if (!studio || mesh.indices.length === 0) return;
    const { geometry } = toBufferGeometry(mesh);
    normalizeToUnitSize(geometry, 2);
    objectRef.current = studio.setObject(geometry, []);
    return () => {
      studio.clearObject();
      objectRef.current = null;
      geometry.dispose();
    };
  }, [mesh, ready]);

  const materialSettings = doc.materials;
  useEffect(() => {
    const object = objectRef.current;
    if (!object) return;
    const materials = mesh.groups.map(group => buildMaterial(
      getMaterial(materialSettings.byComponent[group.componentId] ?? materialSettings.defaultId) ?? getMaterial('satin-black')!));
    object.material = materials;
    studioRef.current?.render();
    return () => materials.forEach(release);
  }, [mesh, materialSettings, ready]);

  useEffect(() => {
    const studio = studioRef.current;
    if (!studio) return;
    const lighting = LIGHTING_PRESETS.find(l => l.id === doc.lighting.presetId) ?? LIGHTING_PRESETS[0];
    studio.setLighting(lighting, doc.lighting.showBackground, doc.lighting.source);
    if (doc.lighting.backdrop) studio.setBackdrop(...doc.lighting.backdrop);
    else studio.clearBackdrop();
    studio.render();
  }, [doc.lighting, ready]);

  useEffect(() => {
    const object = objectRef.current;
    if (!object) return;
    object.position.set(...doc.transform.position);
    object.rotation.set(...doc.transform.rotation);
    object.scale.set(...doc.transform.scale);
    studioRef.current?.render();
  }, [mesh, doc.transform, ready]);

  /**
   * The animation loop.
   *
   * It applies a *delta* on top of the user's own transform and never writes
   * back to the document: a spin the user can stop must leave the logo exactly
   * where they had put it, and a rotation persisted into the project would also
   * restart the path tracer sixty times a second.
   *
   * Held still while a traced render is running, for the same reason a
   * photographer does not move the subject during a long exposure — the tracer
   * accumulates samples of one fixed frame, and a moving object averages a
   * smear. High quality is a still.
   */
  useEffect(() => {
    const object = objectRef.current;
    const studio = studioRef.current;
    if (!object || !studio) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const running = isAnimated(doc.animation) && doc.render.mode !== 'high' && !reduced;

    // Whether it runs or not, put the object back where the base transform says.
    const rest = () => {
      object.position.set(...doc.transform.position);
      object.rotation.set(...doc.transform.rotation);
      object.scale.set(...doc.transform.scale);
    };
    if (!running) {
      rest();
      studio.render();
      return;
    }

    let frame = 0;
    const started = performance.now();
    // Where the camera sits at rest, captured once so an orbit is measured from
    // a fixed origin rather than compounding on itself.
    const restCamera: [number, number, number] = [
      studio.camera.position.x, studio.camera.position.y, studio.camera.position.z,
    ];
    const tick = () => {
      // Absolute elapsed time, not a running total: the evaluator is a pure
      // function of the timestamp, and feeding it deltas would be the one way to
      // make the preview drift from an export of the same animation.
      const pose = evaluateAnimation(doc.animation, (performance.now() - started) / 1000);
      object.position.set(
        doc.transform.position[0] + pose.position[0],
        doc.transform.position[1] + pose.position[1],
        doc.transform.position[2] + pose.position[2],
      );
      object.rotation.set(
        doc.transform.rotation[0] + pose.rotation[0],
        doc.transform.rotation[1] + pose.rotation[1],
        doc.transform.rotation[2] + pose.rotation[2],
      );
      object.scale.set(
        doc.transform.scale[0] * pose.scale,
        doc.transform.scale[1] * pose.scale,
        doc.transform.scale[2] * pose.scale,
      );
      if (pose.cameraOrbit !== 0) {
        // Swung around the controls' target, keeping distance and height. The
        // angle is applied fresh from the resting position each frame rather
        // than added to the camera, so it stays a pure function of the
        // timestamp like everything else — and so stopping puts the camera back
        // exactly where the user left it.
        const controls = controlsRef.current;
        const cx = controls ? controls.target.x : 0;
        const cz = controls ? controls.target.z : 0;
        const radius = Math.hypot(restCamera[0] - cx, restCamera[2] - cz);
        if (radius > 0) {
          const base = Math.atan2(restCamera[2] - cz, restCamera[0] - cx);
          studio.camera.position.x = cx + Math.cos(base + pose.cameraOrbit) * radius;
          studio.camera.position.z = cz + Math.sin(base + pose.cameraOrbit) * radius;
          if (controls) studio.camera.lookAt(controls.target);
        }
      }
      studio.render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      rest();
      studio.camera.position.set(restCamera[0], restCamera[1], restCamera[2]);
      if (controlsRef.current) studio.camera.lookAt(controlsRef.current.target);
      studio.render();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.animation, doc.transform, doc.render.mode, mesh, ready, size.width, size.height]);

  useEffect(() => {
    const studio = studioRef.current, controls = controlsRef.current, object = objectRef.current;
    if (!studio || !controls || !object) return;
    const key = JSON.stringify(doc.camera);
    if (cameraKey.current === key && framedSource.current === doc.source) return;
    studio.setProjection(doc.camera.projection, doc.camera.fov);
    controls.object = studio.camera;
    studio.camera.position.set(...doc.camera.position);
    studio.camera.zoom = 1;
    studio.frame(1.3);
    new Box3().setFromObject(object).getCenter(controls.target);
    if (doc.camera.zoom !== undefined) {
      studio.camera.position.set(...doc.camera.position);
      controls.target.set(...doc.camera.target);
      studio.camera.zoom = doc.camera.zoom;
      if (studio.camera instanceof OrthographicCamera && doc.camera.frustumHeight) {
        const half = doc.camera.frustumHeight / 2;
        studio.camera.top = half; studio.camera.bottom = -half;
        studio.camera.right = half * size.width / size.height;
        studio.camera.left = -studio.camera.right;
      }
    }
    studio.camera.updateProjectionMatrix();
    controls.update();
    studio.render();
    cameraKey.current = key;
    framedSource.current = doc.source;
  }, [doc.camera, doc.source, mesh, ready, size]);

  /**
   * The traced render.
   *
   * Torn down and restarted whenever anything it depends on changes, because a
   * path trace *accumulates*: continuing after the geometry, the materials, the
   * lighting or the camera moved would average two different pictures together.
   * That is why the dependency list is the whole document — every setting is in
   * the frame.
   */
  useEffect(() => {
    traceRef.current?.cancel();
    traceRef.current = null;
    setTrace(null);

    const studio = studioRef.current;
    if (!studio) return;
    if (doc.render.mode !== 'high' || mesh.indices.length === 0) {
      // Back to the rasterized picture, which every other effect here owns.
      studio.render();
      return;
    }

    let disposed = false;
    let handle: PathTraceHandle | null = null;
    void (async () => {
      const { startPathTrace, pathTracingSupport } = await import('../render/pathTracer');
      if (disposed) return;
      const support = pathTracingSupport(studio.renderer);
      if (!support.supported) {
        callbacks.current.onHighQualityUnavailable?.(
          support.reason ?? 'A traced render is not available on this device.');
        return;
      }
      handle = await startPathTrace(studio.renderer, studio.scene, studio.camera, {
        targetSamples: doc.render.targetSamples,
        renderScale: doc.render.renderScale,
        environment: studio.rawEnvironment,
        onProgress: p => { if (!disposed) setTrace(p); },
      });
      if (disposed) { handle.dispose(); return; }
      traceRef.current = handle;
      await handle.done;
    })();

    return () => {
      disposed = true;
      handle?.dispose();
      traceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, mesh, ready, size.width, size.height, traceEpoch]);

  const fit = () => {
    const studio = studioRef.current, controls = controlsRef.current, object = objectRef.current;
    if (!studio || !controls || !object) return;
    // Remove pan while retaining the viewing direction.
    studio.camera.position.sub(controls.target);
    studio.camera.zoom = 1;
    studio.frame(1.3);
    new Box3().setFromObject(object).getCenter(controls.target);
    controls.update();
    studio.render();
    publishRef.current();
    if (highRef.current) setTraceEpoch(n => n + 1);
  };

  return <div className="l3d-stage" ref={hostRef}>
    <canvas ref={canvasRef} tabIndex={0} aria-label="3D preview of the imported logo"
      title="Drag to orbit. Scroll to zoom. Right-drag to pan. Arrow keys pan; Shift + arrows orbit." />
    {mesh.indices.length > 0 && <>
      <div className="l3d-navigation">
        <DsButton tone="secondary" size="sm" onClick={fit}>Fit view</DsButton>
        <span className="l3d-navigation-help">Drag to orbit · Scroll to zoom · Right-drag to pan</span>
      </div>
      <div className="l3d-stage-meta">{mesh.groups.length} component{mesh.groups.length === 1 ? '' : 's'} ·{' '}
        {(mesh.indices.length / 3).toLocaleString()} triangles</div>
    </>}
    {busy && <div className="l3d-stage-status" role="status" aria-live="polite">
      <LoadingPill label="Rebuilding geometry…" />
    </div>}
    {trace && trace.fraction < 1 && <div className="l3d-trace" role="status" aria-live="polite">
      <div className="l3d-trace-bar"><span style={{ width: `${Math.round(trace.fraction * 100)}%` }} /></div>
      <span className="l3d-trace-text">
        Rendering · {Math.round(trace.samples)} of {trace.targetSamples} samples
        {trace.remainingMs !== null && ` · about ${formatRemaining(trace.remainingMs)} left`}
      </span>
    </div>}
  </div>;
}

/** Coarse on purpose: a countdown to the second on a minutes-long render reads
 *  as precision the estimate does not have. */
function formatRemaining(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 10) return 'a few seconds';
  if (seconds < 90) return `${Math.round(seconds / 5) * 5} seconds`;
  return `${Math.round(seconds / 30) / 2} minutes`;
}

export default Viewport;
