import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { BentoDesign } from '../types';
import { getTemplate } from '../templates';
import { resolveSize } from '../sizes';
import { TileRenderer } from './TileRenderer';

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
}

/**
 * Renders the bento design as a fit-to-container artboard.
 *
 * The DOM tree is rendered at *export pixel size* (e.g. 1080×1080) but
 * scaled via CSS transform to fit the visible area. This gives html2canvas
 * a clean, high-res surface while keeping the editor responsive.
 */
export const BentoCanvas = forwardRef<BentoCanvasHandle, Props>(function BentoCanvas(
  { design, brand, selectedTileId, onSelectTile, onImageDropped },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const { width, height } = resolveSize(design.sizeId, design.customSize);
  const template = getTemplate(design.templateId);

  useImperativeHandle(ref, () => ({
    getExportElement: () => artboardRef.current,
  }), []);

  // Fit-to-container: compute scale from element size.
  useLayoutEffect(() => {
    const compute = () => {
      const c = containerRef.current;
      if (!c) return;
      const pad = 48; // visual breathing room around the artboard
      const availW = Math.max(100, c.clientWidth - pad * 2);
      const availH = Math.max(100, c.clientHeight - pad * 2);
      const s = Math.min(availW / width, availH / height, 1);
      setScale(s);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [width, height]);

  const minSide = Math.min(width, height);
  const gapPx = (design.gap / 100) * minSide;
  const radiusPx = (design.radius / 100) * minSide;

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden relative"
      onClick={() => onSelectTile(null)}
    >
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
            gridTemplateColumns: `repeat(${template.cols}, 1fr)`,
            gridTemplateRows: `repeat(${template.rows}, 1fr)`,
            gap: gapPx,
            padding: gapPx,
            boxShadow: '0 40px 120px rgba(0,0,0,0.18)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {design.tiles.map((tile) => {
            const approxTileW = (width - gapPx * (template.cols + 1)) / template.cols * tile.colSpan;
            const approxTileH = (height - gapPx * (template.rows + 1)) / template.rows * tile.rowSpan;
            const isSelected = tile.id === selectedTileId;
            return (
              <div
                key={tile.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTile(tile.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
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
                  cursor: 'pointer',
                  outline: isSelected ? `${Math.max(2, minSide * 0.006)}px solid #6366F1` : 'none',
                  outlineOffset: isSelected ? `${Math.max(2, minSide * 0.006)}px` : 0,
                  transition: 'outline-color 120ms ease',
                }}
              >
                <TileRenderer tile={tile} brand={brand} tileWidth={approxTileW} tileHeight={approxTileH} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
