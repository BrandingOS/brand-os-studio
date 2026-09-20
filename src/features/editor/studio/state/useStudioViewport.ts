// The Studio viewport — zoom, pan, and fit.
//
// The store owns the numbers; this hook owns the behaviour and pushes
// the result into `adapter.setViewportTransform`, which writes Fabric's
// own `viewportTransform`. Nothing here scales a DOM node, which is why
// selection handles stay the same size at 5% and at 400%.
//
// Coordinate contract, used by every function below:
//
//     screen = document * zoom + pan
//
// so document = (screen - pan) / zoom. `pan` is in canvas-relative
// screen pixels; the canvas element fills the workspace region exactly,
// so canvas-relative and region-relative are the same thing.

import { useCallback, useEffect, useRef } from 'react';
import type { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import { readStudio, useStudioStore } from './studioStore';

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 16;
/** Breathing room between the page and the edge of the workspace. */
export const FIT_PADDING = 48;
/** Fit never magnifies past this — a stamp-sized page should not fill a 27" display. */
export const MAX_FIT_ZOOM = 2;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export interface StudioViewport {
  /** Attach to the element that frames the canvas. */
  regionRef: React.MutableRefObject<HTMLDivElement | null>;
  fit: () => void;
  zoomTo: (zoom: number, anchor?: { x: number; y: number }) => void;
  zoomBy: (factor: number, anchor?: { x: number; y: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  actualSize: () => void;
  panBy: (dx: number, dy: number) => void;
  /** Screen point (viewport coords) → document point. */
  toDocument: (clientX: number, clientY: number) => { x: number; y: number };
  /** Centre of the visible workspace, in document coordinates. */
  visibleCentre: () => { x: number; y: number };
}

export function useStudioViewport(
  adapter: FabricAdapter | null,
  pageSize: { width: number; height: number } | null,
): StudioViewport {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  // Viewport values are read inside pointer handlers that must not
  // re-subscribe on every frame, so the hook keeps its own mirror.
  const vpRef = useRef({ zoom: 1, panX: 0, panY: 0 });

  useEffect(
    () =>
      useStudioStore.subscribe((s) => {
        vpRef.current = { zoom: s.zoom, panX: s.panX, panY: s.panY };
      }),
    [],
  );

  const push = useCallback(
    (zoom: number, panX: number, panY: number) => {
      vpRef.current = { zoom, panX, panY };
      useStudioStore.getState().setViewport({ zoom, panX, panY });
      adapter?.setViewportTransform(zoom, panX, panY);
    },
    [adapter],
  );

  const fit = useCallback(() => {
    const region = regionRef.current;
    if (!region || !pageSize) return;
    const width = region.clientWidth || sizeRef.current.width;
    const height = region.clientHeight || sizeRef.current.height;
    if (!width || !height) return;
    const zoom = clampZoom(
      Math.min(
        (width - FIT_PADDING * 2) / pageSize.width,
        (height - FIT_PADDING * 2) / pageSize.height,
        MAX_FIT_ZOOM,
      ),
    );
    push(
      zoom,
      (width - pageSize.width * zoom) / 2,
      (height - pageSize.height * zoom) / 2,
    );
  }, [pageSize, push]);

  /**
   * Zoom about an anchor.
   *
   * Without an anchor the workspace centre is used. With one — the
   * pointer, for ⌘-wheel — the document point under it is kept fixed,
   * which is what makes zooming feel like it is aimed rather than
   * happening to you.
   */
  const zoomTo = useCallback(
    (next: number, anchor?: { x: number; y: number }) => {
      const region = regionRef.current;
      if (!region) return;
      const { zoom, panX, panY } = vpRef.current;
      const z = clampZoom(next);
      if (z === zoom) return;
      const rect = region.getBoundingClientRect();
      const ax = anchor ? anchor.x - rect.left : rect.width / 2;
      const ay = anchor ? anchor.y - rect.top : rect.height / 2;
      const ratio = z / zoom;
      push(z, ax - (ax - panX) * ratio, ay - (ay - panY) * ratio);
    },
    [push],
  );

  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) =>
      zoomTo(vpRef.current.zoom * factor, anchor),
    [zoomTo],
  );

  // Multiplicative steps, so 100→115 reads as the same amount of
  // "bigger" as 800→920. Additive steps feel jumpy when zoomed out and
  // barely move when zoomed in.
  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy]);
  const actualSize = useCallback(() => zoomTo(1), [zoomTo]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const { zoom, panX, panY } = vpRef.current;
      push(zoom, panX + dx, panY + dy);
    },
    [push],
  );

  const toDocument = useCallback((clientX: number, clientY: number) => {
    const region = regionRef.current;
    const { zoom, panX, panY } = vpRef.current;
    if (!region) return { x: 0, y: 0 };
    const rect = region.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom,
    };
  }, []);

  const visibleCentre = useCallback(() => {
    const region = regionRef.current;
    const { zoom, panX, panY } = vpRef.current;
    if (!region) return { x: 0, y: 0 };
    return {
      x: (region.clientWidth / 2 - panX) / zoom,
      y: (region.clientHeight / 2 - panY) / zoom,
    };
  }, []);

  // ─── Keep the canvas the size of its region ──────────────────────────
  //
  // The canvas IS the workspace in viewport mode, so it has to track the
  // region through window resizes and panel open/close. A ResizeObserver
  // catches both without the shell having to tell us.
  useEffect(() => {
    const region = regionRef.current;
    if (!region || !adapter) return;
    let firstFit = true;

    const sync = () => {
      const width = region.clientWidth;
      const height = region.clientHeight;
      if (!width || !height) return;
      const changed =
        width !== sizeRef.current.width || height !== sizeRef.current.height;
      sizeRef.current = { width, height };
      if (!changed) return;
      void adapter.enableViewport(width, height).then(() => {
        if (firstFit) {
          firstFit = false;
          fit();
        } else {
          // A resize must not silently re-zoom the user's view; keep the
          // scale and re-apply the transform at the new canvas size.
          const { zoom, panX, panY } = vpRef.current;
          adapter.setViewportTransform(zoom, panX, panY);
        }
      });
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(region);
    return () => observer.disconnect();
  }, [adapter, fit]);

  // Re-fit when the PAGE changes size (switching to a page with
  // different dimensions, or editing the document's dimensions).
  const pageKey = pageSize ? `${pageSize.width}x${pageSize.height}` : '';
  const lastPageKey = useRef(pageKey);
  useEffect(() => {
    if (!pageKey || pageKey === lastPageKey.current) return;
    lastPageKey.current = pageKey;
    fit();
  }, [pageKey, fit]);

  // ─── Wheel ───────────────────────────────────────────────────────────
  //
  // ⌘/Ctrl-wheel zooms at the pointer (and pre-empts the browser's page
  // zoom); a plain wheel scrolls the workspace, shift swaps the axis.
  // Trackpads fire far faster than the screen refreshes, so ticks are
  // accumulated and applied once per frame — without that, React renders
  // several times per painted frame and the zoom visibly stair-steps.
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    let zoomDelta = 0;
    let panDx = 0;
    let panDy = 0;
    let anchor = { x: 0, y: 0 };
    let frame: number | null = null;

    const apply = () => {
      frame = null;
      if (zoomDelta !== 0) {
        // exp() keeps the step proportional to wheel velocity AND
        // multiplicative, so a pinch feels even across zoom levels.
        zoomBy(Math.exp(-zoomDelta * 0.0028), anchor);
        zoomDelta = 0;
      }
      if (panDx !== 0 || panDy !== 0) {
        panBy(-panDx, -panDy);
        panDx = 0;
        panDy = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        zoomDelta += e.deltaY;
        anchor = { x: e.clientX, y: e.clientY };
      } else if (e.shiftKey) {
        panDx += e.deltaY || e.deltaX;
      } else {
        panDx += e.deltaX;
        panDy += e.deltaY;
      }
      if (frame === null) frame = requestAnimationFrame(apply);
    };

    region.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      region.removeEventListener('wheel', onWheel);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [zoomBy, panBy]);

  // ─── Space-drag and middle-drag pan ──────────────────────────────────
  //
  // Held space turns the whole workspace into a hand. Middle-drag does
  // the same without the keyboard. Both take the pointer BEFORE Fabric
  // sees it (capture phase) — otherwise the press lands on whatever
  // object is under the cursor and drags that instead of the view.
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    let spaceDown = false;
    let panning = false;
    let last = { x: 0, y: 0 };

    const setCursor = () => {
      region.style.cursor = panning ? 'grabbing' : spaceDown ? 'grab' : '';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || spaceDown) return;
      if (isTypingTarget(e.target)) return;
      spaceDown = true;
      // Stop the page scrolling under a held space.
      e.preventDefault();
      setCursor();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceDown = false;
      setCursor();
    };
    const onBlur = () => {
      spaceDown = false;
      panning = false;
      setCursor();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!(spaceDown || e.button === 1)) return;
      panning = true;
      last = { x: e.clientX, y: e.clientY };
      region.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      readStudio().setInteracting(true);
      setCursor();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!panning) return;
      e.preventDefault();
      e.stopPropagation();
      panBy(e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!panning) return;
      panning = false;
      if (region.hasPointerCapture(e.pointerId)) region.releasePointerCapture(e.pointerId);
      readStudio().setInteracting(false);
      setCursor();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    region.addEventListener('pointerdown', onPointerDown, true);
    region.addEventListener('pointermove', onPointerMove, true);
    region.addEventListener('pointerup', onPointerUp, true);
    region.addEventListener('pointercancel', onPointerUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      region.removeEventListener('pointerdown', onPointerDown, true);
      region.removeEventListener('pointermove', onPointerMove, true);
      region.removeEventListener('pointerup', onPointerUp, true);
      region.removeEventListener('pointercancel', onPointerUp, true);
      region.style.cursor = '';
    };
  }, [panBy]);

  return {
    regionRef,
    fit,
    zoomTo,
    zoomBy,
    zoomIn,
    zoomOut,
    actualSize,
    panBy,
    toDocument,
    visibleCentre,
  };
}

/** True when a key event came from somewhere the user is typing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable === true
  );
}
