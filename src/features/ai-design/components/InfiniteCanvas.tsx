/**
 * Figma-style infinite canvas — unbounded pan + zoom, dot grid background.
 *
 * Implementation: a CSS-transformed inner "world" element that holds every
 * node in world-space coordinates. The outer "viewport" captures pointer
 * events and converts screen deltas to world deltas. Zoom is centered at
 * the cursor so Cmd/Ctrl + wheel feels like Figma.
 *
 * No external library — matches the codebase's existing custom pan+zoom
 * pattern (see `src/features/editor/core/EditorCanvas.tsx`, freeform mode).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { DesignNode } from '../types';
import { CanvasNode } from './CanvasNode';
import { Button } from '@/components/ui/button';
import { Maximize2, Minus, Plus, MousePointer2 } from 'lucide-react';

interface Props {
  nodes: DesignNode[];
  brand: Brand | null | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

export function InfiniteCanvas({ nodes, brand, selectedId, onSelect, onMove }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.5);

  // Center the initial viewport on (600, 600) in world space so brand-new
  // content dropped near the origin is visible without hunting.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    setPan({ x: rect.width / 2 - 600 * 0.5, y: rect.height / 2 - 400 * 0.5 });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Pan (drag empty canvas) ──────────────────────────────────────────
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const onPointerDownViewport = (e: React.PointerEvent) => {
    // Middle-click or space+drag is classic pan; here we also pan on plain
    // drag when the target is the viewport itself (not a node).
    if (e.target !== e.currentTarget && e.target !== viewportRef.current?.querySelector('.ai-design-world')) {
      // Clicked inside a node — don't start a canvas pan unless shift+click.
      if (!e.shiftKey) return;
    }
    onSelect(null);
    panRef.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMoveViewport = (e: React.PointerEvent) => {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setPan({ x: panRef.current.origX + dx, y: panRef.current.origY + dy });
  };
  const onPointerUpViewport = (e: React.PointerEvent) => {
    panRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // ─── Zoom (Cmd/Ctrl + wheel, centered on cursor) ──────────────────────
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // free scroll for now
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setZoom((z) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (1 - e.deltaY * 0.0015)));
        // Adjust pan so the point under the cursor stays fixed.
        const worldX = (cursorX - pan.x) / z;
        const worldY = (cursorY - pan.y) / z;
        setPan({ x: cursorX - worldX * next, y: cursorY - worldY * next });
        return next;
      });
    },
    [pan.x, pan.y],
  );

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // ─── Node drag ────────────────────────────────────────────────────────
  const nodeDragRef = useRef<{ id: string; startClientX: number; startClientY: number; origX: number; origY: number } | null>(null);
  const onWorldPointerDown = (e: React.PointerEvent) => {
    // Find nearest node via DOM data attribute.
    const el = (e.target as HTMLElement).closest('[data-node-id]');
    if (!el) return;
    const id = el.getAttribute('data-node-id')!;
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    e.stopPropagation();
    onSelect(id);
    nodeDragRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: node.x,
      origY: node.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onWorldPointerMove = (e: React.PointerEvent) => {
    if (!nodeDragRef.current) return;
    const { id, startClientX, startClientY, origX, origY } = nodeDragRef.current;
    const dx = (e.clientX - startClientX) / zoom;
    const dy = (e.clientY - startClientY) / zoom;
    onMove(id, origX + dx, origY + dy);
  };
  const onWorldPointerUp = (e: React.PointerEvent) => {
    nodeDragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const resetView = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    setZoom(0.5);
    setPan({ x: rect.width / 2 - 600 * 0.5, y: rect.height / 2 - 400 * 0.5 });
  };

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2));

  // Dot-grid background whose spacing and offset track pan+zoom so it looks
  // "attached" to the world, not the viewport.
  const dotSize = 1;
  const dotGap = 24 * zoom;
  const bgPosX = pan.x % dotGap;
  const bgPosY = pan.y % dotGap;

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDownViewport}
      onPointerMove={onPointerMoveViewport}
      onPointerUp={onPointerUpViewport}
      onPointerLeave={onPointerUpViewport}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        backgroundColor: '#f5f6f8',
        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.18) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${dotGap}px ${dotGap}px`,
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        cursor: panRef.current ? 'grabbing' : 'default',
      }}
    >
      <div
        className="ai-design-world absolute top-0 left-0"
        onPointerDown={onWorldPointerDown}
        onPointerMove={onWorldPointerMove}
        onPointerUp={onWorldPointerUp}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: 0,
          height: 0,
        }}
      >
        {nodes.map((n) => (
          <div key={n.id} data-node-id={n.id} style={{ position: 'absolute' }}>
            <CanvasNode
              node={n}
              brand={brand}
              selected={selectedId === n.id}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground">
          <MousePointer2 className="h-6 w-6 mb-2 opacity-40" />
          <p className="text-sm opacity-60">
            Your generated design will appear here. Shift+drag to pan, Cmd/Ctrl+scroll to zoom.
          </p>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background border rounded-full shadow-md px-1 py-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={zoomOut}>
          <Minus className="h-4 w-4" />
        </Button>
        <div className="px-2 text-xs font-medium tabular-nums w-12 text-center">
          {Math.round(zoom * 100)}%
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={zoomIn}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={resetView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
