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

export interface ViewportProps {
  doc: Studio3dDocument;
  mesh: MeshData;
  busy?: boolean;
  onReady?: (studio: Studio) => void;
  onCameraChange?: (camera: CameraState) => void;
}

function release(material: Material) {
  // Custom shader textures are not released by Material.dispose().
  for (const texture of material.userData.grainTextures ?? []) texture.dispose();
  material.dispose();
}

export function Viewport({ doc, mesh, busy, onReady, onCameraChange }: ViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<Studio | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectRef = useRef<Mesh | null>(null);
  const cameraKey = useRef('');
  const framedSource = useRef<object | null>(null);
  const callbacks = useRef({ onReady, onCameraChange });
  callbacks.current = { onReady, onCameraChange };
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [ready, setReady] = useState(0);

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
    const draw = () => studio.render();
    const end = () => publishRef.current();
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
    studio.setLighting(lighting, doc.lighting.showBackground);
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
