/**
 * Design-with-AI — Fabric.js canvas surface.
 *
 * Infinite scrolling workspace with a centered 1080×1080 "art-board" frame.
 * The canvas is resized to fill its container and exposes an imperative
 * handle so siblings (toolbar, inspector, AI bar) can operate on objects
 * without prop-drilling Fabric internals.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as fabric from 'fabric';
import type { Brand } from '@/shared/types/brand';
import { useDesignAiStore, type ToolId } from './store';
import type { DesignNode } from '@/features/ai-design/types';

export interface CanvasHandle {
  canvas: fabric.Canvas | null;
  addNodes: (nodes: DesignNode[]) => void;
  exportPng: () => string | null;
  zoomTo: (factor: number) => void;
  zoomToFit: () => void;
  deleteSelection: () => void;
  applyFill: (color: string) => void;
  applyStroke: (color: string) => void;
  applyFontSize: (px: number) => void;
  loadFromJson: (json: string) => void;
}

interface Props {
  brand?: Brand;
}

const ARTBOARD = { w: 1080, h: 1080 };

export const DesignCanvas = forwardRef<CanvasHandle, Props>(function DesignCanvas(
  { brand },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const toolRef = useRef<ToolId>('select');
  const drawingRef = useRef<fabric.Object | null>(null);
  const pushHistory = useDesignAiStore((s) => s.pushHistory);
  const setSelected = useDesignAiStore((s) => s.setSelected);
  const setZoom = useDesignAiStore((s) => s.setZoom);
  const setTool = useDesignAiStore((s) => s.setTool);
  const tool = useDesignAiStore((s) => s.tool);

  useEffect(() => {
    toolRef.current = tool;
    const c = fabricRef.current;
    if (!c) return;
    c.selection = tool === 'select';
    c.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
    c.hoverCursor = tool === 'select' ? 'move' : 'crosshair';
    c.forEachObject((o) => {
      o.selectable = tool === 'select';
      o.evented = tool === 'select' || (o as fabric.Object & { isArtboard?: boolean }).isArtboard !== true;
    });
  }, [tool]);

  const palette = useMemo(() => {
    const primary = brand?.primaryColor ?? '#6366f1';
    const secondary = brand?.secondaryColor ?? '#f1f5f9';
    return { primary, secondary };
  }, [brand]);

  // One-time init.
  useEffect(() => {
    if (!elRef.current || !hostRef.current) return;
    const host = hostRef.current;
    const canvas = new fabric.Canvas(elRef.current, {
      backgroundColor: '#fafafa',
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });
    fabricRef.current = canvas;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      canvas.setDimensions({ width: rect.width, height: rect.height });
      canvas.requestRenderAll();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Artboard: a locked, non-selectable frame that represents the export area.
    const artboard = new fabric.Rect({
      left: 0,
      top: 0,
      width: ARTBOARD.w,
      height: ARTBOARD.h,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      excludeFromExport: false,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 24, offsetY: 4 }),
    });
    (artboard as fabric.Object & { isArtboard?: boolean }).isArtboard = true;
    canvas.add(artboard);

    // Center the artboard in the viewport.
    const center = () => {
      const rect = host.getBoundingClientRect();
      const cx = rect.width / 2 - ARTBOARD.w / 2;
      const cy = rect.height / 2 - ARTBOARD.h / 2;
      canvas.viewportTransform = [1, 0, 0, 1, cx, cy];
      canvas.requestRenderAll();
    };
    center();

    // Persist snapshots for undo/redo.
    const snap = () => {
      const json = JSON.stringify(canvas.toJSON(['isArtboard']));
      pushHistory(json);
    };
    snap();
    canvas.on('object:added', snap);
    canvas.on('object:modified', snap);
    canvas.on('object:removed', snap);

    // Track selection.
    const onSel = () => {
      const active = canvas.getActiveObjects();
      setSelected(active.map((o) => (o as fabric.Object & { id?: string }).id ?? '__anon__'));
    };
    canvas.on('selection:created', onSel);
    canvas.on('selection:updated', onSel);
    canvas.on('selection:cleared', () => setSelected([]));

    // Tool-driven shape creation via drag.
    let startPt: { x: number; y: number } | null = null;
    canvas.on('mouse:down', (opt) => {
      const t = toolRef.current;
      if (t === 'select') return;
      const pointer = canvas.getPointer(opt.e);
      startPt = pointer;
      canvas.selection = false;

      if (t === 'text') {
        const tb = new fabric.IText('Double-click to edit', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 48,
          fontFamily: brand?.fonts?.primary ?? 'Inter',
          fill: '#111827',
        });
        canvas.add(tb);
        canvas.setActiveObject(tb);
        tb.enterEditing();
        drawingRef.current = null;
        setTool('select');
        return;
      }

      if (t === 'rect' || t === 'frame') {
        const obj = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: t === 'frame' ? '#ffffff' : palette.primary,
          stroke: t === 'frame' ? '#e5e7eb' : undefined,
          strokeWidth: t === 'frame' ? 1 : 0,
          rx: 12,
          ry: 12,
        });
        canvas.add(obj);
        drawingRef.current = obj;
      } else if (t === 'ellipse') {
        const obj = new fabric.Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 1,
          ry: 1,
          fill: palette.primary,
          originX: 'left',
          originY: 'top',
        });
        canvas.add(obj);
        drawingRef.current = obj;
      } else if (t === 'line') {
        const obj = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#111827',
          strokeWidth: 3,
          strokeLineCap: 'round',
        });
        canvas.add(obj);
        drawingRef.current = obj;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!drawingRef.current || !startPt) return;
      const pointer = canvas.getPointer(opt.e);
      const obj = drawingRef.current;
      const dx = pointer.x - startPt.x;
      const dy = pointer.y - startPt.y;

      if (obj instanceof fabric.Rect) {
        obj.set({
          left: Math.min(startPt.x, pointer.x),
          top: Math.min(startPt.y, pointer.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
        });
      } else if (obj instanceof fabric.Ellipse) {
        obj.set({
          left: Math.min(startPt.x, pointer.x),
          top: Math.min(startPt.y, pointer.y),
          rx: Math.abs(dx) / 2,
          ry: Math.abs(dy) / 2,
        });
      } else if (obj instanceof fabric.Line) {
        obj.set({ x2: pointer.x, y2: pointer.y });
      }
      obj.setCoords();
      canvas.requestRenderAll();
    });

    canvas.on('mouse:up', () => {
      if (drawingRef.current) {
        canvas.setActiveObject(drawingRef.current);
      }
      drawingRef.current = null;
      startPt = null;
      canvas.selection = toolRef.current === 'select';
      if (toolRef.current !== 'select') setTool('select');
    });

    // Pan with space-drag; zoom with ctrl/meta + wheel.
    let panning = false;
    let lastPan: { x: number; y: number } | null = null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !panning) {
        panning = true;
        canvas.defaultCursor = 'grab';
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        const active = canvas.getActiveObjects();
        if (active.length && !(active[0] as fabric.Object & { isArtboard?: boolean }).isArtboard) {
          active.forEach((o) => canvas.remove(o));
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        panning = false;
        canvas.defaultCursor = toolRef.current === 'select' ? 'default' : 'crosshair';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    canvas.on('mouse:down', (opt) => {
      if (panning) {
        lastPan = { x: opt.e.clientX, y: opt.e.clientY };
        canvas.defaultCursor = 'grabbing';
      }
    });
    canvas.on('mouse:move', (opt) => {
      if (panning && lastPan) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPan.x;
          vpt[5] += e.clientY - lastPan.y;
          canvas.requestRenderAll();
        }
        lastPan = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.on('mouse:up', () => {
      lastPan = null;
      if (panning) canvas.defaultCursor = 'grab';
    });

    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e;
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.1, Math.min(4, zoom));
      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
      setZoom(zoom);
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      ro.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    get canvas() {
      return fabricRef.current;
    },
    addNodes: (nodes) => {
      const c = fabricRef.current;
      if (!c) return;
      nodes.forEach((n) => {
        let obj: fabric.Object | null = null;
        if (n.kind === 'text') {
          obj = new fabric.Textbox(n.text, {
            left: n.x,
            top: n.y,
            width: n.width,
            fontSize: n.fontSize,
            fontWeight: n.fontWeight,
            fontFamily: n.fontFamily ?? brand?.fonts?.primary ?? 'Inter',
            fill: n.color,
            textAlign: n.align ?? 'left',
          });
        } else if (n.kind === 'rect') {
          obj = new fabric.Rect({
            left: n.x,
            top: n.y,
            width: n.width,
            height: n.height,
            fill: n.fill,
            rx: n.radius ?? 0,
            ry: n.radius ?? 0,
            stroke: n.stroke,
            strokeWidth: n.strokeWidth ?? 0,
          });
        } else if (n.kind === 'swatch') {
          const cellW = 80;
          const group = new fabric.Group(
            n.colors.map(
              (color, i) =>
                new fabric.Rect({
                  left: i * cellW,
                  top: 0,
                  width: cellW,
                  height: cellW,
                  fill: color,
                  rx: 12,
                  ry: 12,
                }),
            ),
            { left: n.x, top: n.y },
          );
          obj = group;
        } else if (n.kind === 'frame') {
          obj = new fabric.Rect({
            left: n.x,
            top: n.y,
            width: n.width,
            height: n.height,
            fill: n.background ?? '#ffffff',
            stroke: '#e5e7eb',
            strokeWidth: 1,
            rx: 16,
            ry: 16,
          });
        }
        if (obj) c.add(obj);
      });
      c.requestRenderAll();
    },
    exportPng: () => {
      const c = fabricRef.current;
      if (!c) return null;
      // Crop export to the artboard bounds.
      return c.toDataURL({
        format: 'png',
        left: 0,
        top: 0,
        width: ARTBOARD.w,
        height: ARTBOARD.h,
        multiplier: 2,
      });
    },
    zoomTo: (factor) => {
      const c = fabricRef.current;
      if (!c) return;
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      c.zoomToPoint(new fabric.Point(rect.width / 2, rect.height / 2), factor);
      setZoom(factor);
    },
    zoomToFit: () => {
      const c = fabricRef.current;
      const host = hostRef.current;
      if (!c || !host) return;
      const rect = host.getBoundingClientRect();
      const pad = 80;
      const factor = Math.min(
        (rect.width - pad) / ARTBOARD.w,
        (rect.height - pad) / ARTBOARD.h,
      );
      const cx = rect.width / 2 - (ARTBOARD.w * factor) / 2;
      const cy = rect.height / 2 - (ARTBOARD.h * factor) / 2;
      c.viewportTransform = [factor, 0, 0, factor, cx, cy];
      c.requestRenderAll();
      setZoom(factor);
    },
    deleteSelection: () => {
      const c = fabricRef.current;
      if (!c) return;
      c.getActiveObjects().forEach((o) => {
        if (!(o as fabric.Object & { isArtboard?: boolean }).isArtboard) c.remove(o);
      });
      c.discardActiveObject();
      c.requestRenderAll();
    },
    applyFill: (color) => {
      const c = fabricRef.current;
      if (!c) return;
      c.getActiveObjects().forEach((o) => o.set('fill', color));
      c.requestRenderAll();
      c.fire('object:modified');
    },
    applyStroke: (color) => {
      const c = fabricRef.current;
      if (!c) return;
      c.getActiveObjects().forEach((o) => o.set('stroke', color));
      c.requestRenderAll();
      c.fire('object:modified');
    },
    applyFontSize: (px) => {
      const c = fabricRef.current;
      if (!c) return;
      c.getActiveObjects().forEach((o) => {
        if (o instanceof fabric.IText || o instanceof fabric.Textbox) {
          o.set('fontSize', px);
        }
      });
      c.requestRenderAll();
      c.fire('object:modified');
    },
    loadFromJson: (json) => {
      const c = fabricRef.current;
      if (!c) return;
      c.loadFromJSON(json).then(() => c.requestRenderAll());
    },
  }));

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={elRef} />
    </div>
  );
});
