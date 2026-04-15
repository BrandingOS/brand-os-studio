import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, useCallback } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { BentoDesign, BentoTile } from '../types';
import { getTemplate } from '../templates';
import { resolveSize } from '../sizes';
import { TileRenderer } from './TileRenderer';
import { useBentoStore } from '../store';

export interface BentoCanvasHandle {
  /** The DOM element rendering the artboard at export resolution. */
  getExportElement: () => HTMLElement | null;
}

interface Props {
  design: BentoDesign;
  brand: Brand | null | undefined;
  selectedTileId: string | null;
  onSelectTile: (id: string | null) => void;
  /** Called when user drops an image onto a tile. */
  onImageDropped: (tileId: string, file: File) => void;
  /** Interactive (handles/hover). Public view sets this to false. */
  interactive?: boolean;
}

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface DragState {
  tileId: string;
  dir: HandleDir;
  startX: number;
  startY: number;
  origin: { row: number; col: number; rowSpan: number; colSpan: number };
  /** Pixel size of one grid track (cell + gap). */
  cellW: number;
  cellH: number;
}

export const BentoCanvas = forwardRef<BentoCanvasHandle, Props>(function BentoCanvas(
  { design, brand, selectedTileId, onSelectTile, onImageDropped, interactive = true },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const updateGeometry = useBentoStore((s) => s.updateTileGeometry);
  const beginInteraction = useBentoStore((s) => s.beginInteraction);

  const { width, height } = resolveSize(design.sizeId, design.customSize);
  const template = getTemplate(design.templateId);
  const cols = design.cols ?? template.cols;
  const rows = design.rows ?? template.rows;

  useImperativeHandle(ref, () => ({
    getExportElement: () => artboardRef.current,
  }), []);

  // Fit-to-container.
  useLayoutEffect(() => {
    const compute = () => {
      const c = containerRef.current;
      if (!c) return;
      const pad = 48;
      const availW = Math.max(100, c.clientWidth - pad * 2);
      const availH = Math.max(100, c.clientHeight - pad * 2);
      const s = Math.min(availW / width, availH / height, 1);
      setScale(s);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [width, height]);

  const minSide = Math.min(width, height);
  const gapPx = (design.gap / 100) * minSide;
  const paddingPx = (design.padding / 100) * minSide;
  const globalRadiusPx = (design.radius / 100) * minSide;

  // Cell dimensions (before gap).
  const cellWidth = (width - paddingPx * 2 - gapPx * (cols - 1)) / cols;
  const cellHeight = (height - paddingPx * 2 - gapPx * (rows - 1)) / rows;
  const trackW = cellWidth + gapPx;
  const trackH = cellHeight + gapPx;

  // ─── Resize drag handling ─────────────────────────────────────────────
  const startResize = useCallback((e: React.PointerEvent, tile: BentoTile, dir: HandleDir) => {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    beginInteraction();
    setDrag({
      tileId: tile.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origin: { row: tile.row, col: tile.col, rowSpan: tile.rowSpan, colSpan: tile.colSpan },
      cellW: trackW * scale,
      cellH: trackH * scale,
    });
  }, [interactive, trackW, trackH, scale, beginInteraction]);

  useLayoutEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const dxPx = e.clientX - drag.startX;
      const dyPx = e.clientY - drag.startY;
      // Snap threshold — half a cell.
      const dCols = Math.round(dxPx / drag.cellW);
      const dRows = Math.round(dyPx / drag.cellH);

      let { row, col, rowSpan, colSpan } = drag.origin;

      if (drag.dir.includes('e')) {
        colSpan = clamp(drag.origin.colSpan + dCols, 1, cols - drag.origin.col + 1);
      }
      if (drag.dir.includes('w')) {
        const newCol = clamp(drag.origin.col + dCols, 1, drag.origin.col + drag.origin.colSpan - 1);
        colSpan = drag.origin.col + drag.origin.colSpan - newCol;
        col = newCol;
      }
      if (drag.dir.includes('s')) {
        rowSpan = clamp(drag.origin.rowSpan + dRows, 1, rows - drag.origin.row + 1);
      }
      if (drag.dir.includes('n')) {
        const newRow = clamp(drag.origin.row + dRows, 1, drag.origin.row + drag.origin.rowSpan - 1);
        rowSpan = drag.origin.row + drag.origin.rowSpan - newRow;
        row = newRow;
      }

      updateGeometry(drag.tileId, { row, col, rowSpan, colSpan }, { skipHistory: true });
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, cols, rows, updateGeometry]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden relative bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.05)_1px,_transparent_0)] bg-[length:24px_24px]"
      onClick={() => interactive && onSelectTile(null)}
    >
      {/* Drag-cursor overlay */}
      {drag && (
        <div
          className="fixed inset-0 z-50"
          style={{ cursor: cursorFor(drag.dir) }}
        />
      )}
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        <div
          ref={artboardRef}
          data-bento-artboard
          style={{
            width,
            height,
            background: design.backgroundColor,
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: gapPx,
            padding: paddingPx,
            boxShadow: '0 40px 120px rgba(0,0,0,0.15)',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {design.tiles.map((tile) => {
            const approxTileW = cellWidth * tile.colSpan + gapPx * (tile.colSpan - 1);
            const approxTileH = cellHeight * tile.rowSpan + gapPx * (tile.rowSpan - 1);
            const isSelected = tile.id === selectedTileId;
            const isHovered = tile.id === hoveredTileId;
            const showHandles = interactive && (isSelected || isHovered);
            const style = tile.style ?? {};
            const radiusPx = style.radius !== undefined ? (style.radius / 100) * minSide : globalRadiusPx;
            const borderPx = style.borderWidth ? (style.borderWidth / 100) * minSide : 0;
            const shadow = shadowFor(style.shadow ?? 0, minSide);
            return (
              <div
                key={tile.id}
                onClick={(e) => {
                  if (!interactive) return;
                  e.stopPropagation();
                  onSelectTile(tile.id);
                }}
                onMouseEnter={() => interactive && setHoveredTileId(tile.id)}
                onMouseLeave={() => interactive && setHoveredTileId((v) => (v === tile.id ? null : v))}
                onDragOver={(e) => {
                  if (!interactive) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                  if (!interactive) return;
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    onImageDropped(tile.id, file);
                  }
                }}
                style={{
                  gridRow: `${tile.row} / span ${tile.rowSpan}`,
                  gridColumn: `${tile.col} / span ${tile.colSpan}`,
                  borderRadius: radiusPx,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: interactive ? 'pointer' : 'default',
                  outline: isSelected ? `${Math.max(2, minSide * 0.004)}px solid #6366F1` : 'none',
                  outlineOffset: isSelected ? `${Math.max(2, minSide * 0.004)}px` : 0,
                  opacity: style.opacity ?? 1,
                  boxShadow: shadow,
                  border: borderPx > 0 ? `${borderPx}px solid ${style.borderColor ?? '#0F172A'}` : undefined,
                  transition: drag ? 'none' : 'outline-color 120ms ease',
                }}
              >
                <TileRenderer tile={tile} brand={brand} tileWidth={approxTileW} tileHeight={approxTileH} />

                {showHandles && (
                  <ResizeHandles tile={tile} onStart={startResize} scale={scale} artboardMinSide={minSide} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function cursorFor(dir: HandleDir): string {
  if (dir === 'n' || dir === 's') return 'ns-resize';
  if (dir === 'e' || dir === 'w') return 'ew-resize';
  if (dir === 'ne' || dir === 'sw') return 'nesw-resize';
  return 'nwse-resize';
}

function shadowFor(level: number, minSide: number): string {
  if (!level) return '';
  const blur = [0, 6, 18, 36][level] * (minSide / 1080);
  const y = [0, 2, 6, 14][level] * (minSide / 1080);
  const a = [0, 0.08, 0.12, 0.18][level];
  return `0 ${y}px ${blur}px rgba(0,0,0,${a})`;
}

// ─── Resize handles overlay ──────────────────────────────────────────
function ResizeHandles({
  tile,
  onStart,
  scale,
  artboardMinSide,
}: {
  tile: BentoTile;
  onStart: (e: React.PointerEvent, tile: BentoTile, dir: HandleDir) => void;
  scale: number;
  artboardMinSide: number;
}) {
  // Handle size scaled so it's always a reasonable click target.
  const size = Math.max(10, artboardMinSide * 0.018);
  const edge = Math.max(6, artboardMinSide * 0.012);
  const scaled = (v: number) => v / Math.max(scale, 0.3); // keep handles roughly constant on screen

  const handleStyle = (css: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    background: '#FFFFFF',
    border: '2px solid #6366F1',
    borderRadius: 9999,
    pointerEvents: 'auto',
    zIndex: 10,
    ...css,
  });

  const edgeStyle = (css: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    pointerEvents: 'auto',
    zIndex: 9,
    ...css,
  });

  const s = scaled(size);
  const e = scaled(edge);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Corner dots */}
      <div onPointerDown={(ev) => onStart(ev, tile, 'nw')} style={handleStyle({ top: -s / 2, left: -s / 2, width: s, height: s, cursor: 'nwse-resize' })} />
      <div onPointerDown={(ev) => onStart(ev, tile, 'ne')} style={handleStyle({ top: -s / 2, right: -s / 2, width: s, height: s, cursor: 'nesw-resize' })} />
      <div onPointerDown={(ev) => onStart(ev, tile, 'sw')} style={handleStyle({ bottom: -s / 2, left: -s / 2, width: s, height: s, cursor: 'nesw-resize' })} />
      <div onPointerDown={(ev) => onStart(ev, tile, 'se')} style={handleStyle({ bottom: -s / 2, right: -s / 2, width: s, height: s, cursor: 'nwse-resize' })} />
      {/* Edges (invisible wide strips for easier grabbing) */}
      <div onPointerDown={(ev) => onStart(ev, tile, 'n')} style={edgeStyle({ top: -e / 2, left: s, right: s, height: e, cursor: 'ns-resize' })} />
      <div onPointerDown={(ev) => onStart(ev, tile, 's')} style={edgeStyle({ bottom: -e / 2, left: s, right: s, height: e, cursor: 'ns-resize' })} />
      <div onPointerDown={(ev) => onStart(ev, tile, 'w')} style={edgeStyle({ left: -e / 2, top: s, bottom: s, width: e, cursor: 'ew-resize' })} />
      <div onPointerDown={(ev) => onStart(ev, tile, 'e')} style={edgeStyle({ right: -e / 2, top: s, bottom: s, width: e, cursor: 'ew-resize' })} />
    </div>
  );
}
