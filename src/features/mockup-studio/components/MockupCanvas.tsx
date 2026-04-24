/**
 * MockupCanvas — the PixiJS viewport.
 *
 * Keeps the canvas sized to the container, forwards events to the
 * selection logic, and mounts the engine via `useMockupRenderer`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { useMockupRenderer } from '../engine/useMockupRenderer';
import type { MockupState, TemplateMeta } from '../engine/types';

interface MockupCanvasProps {
  template: TemplateMeta | null;
  state: MockupState | null;
  onCanvasClick?: () => void;
}

export function MockupCanvas({ template, state, onCanvasClick }: MockupCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useMockupRenderer(canvasRef, template, state);

  // Watch container size for responsive scaling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute a letterbox scale so the canvas fits the viewport.
  const display = useMemo(() => {
    if (!template) return { width: 0, height: 0 };
    const maxW = containerSize.width - 32;
    const maxH = containerSize.height - 32;
    if (maxW <= 0 || maxH <= 0) return { width: 0, height: 0 };
    const ratio = Math.min(
      maxW / template.canvas.width,
      maxH / template.canvas.height,
    );
    return {
      width: template.canvas.width * ratio,
      height: template.canvas.height * ratio,
    };
  }, [containerSize, template]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,theme(colors.muted/40)_0%,theme(colors.muted/10)_100%)] overflow-hidden"
      onClick={onCanvasClick}
    >
      {template ? (
        <div
          className="relative rounded-lg shadow-2xl bg-card overflow-hidden"
          style={{ width: display.width, height: display.height }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">
          Pick a template from the left to start.
        </div>
      )}
    </div>
  );
}
