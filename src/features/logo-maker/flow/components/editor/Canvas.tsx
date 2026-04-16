import { useEffect, useRef } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';
import { createCanvas, loadSVGIntoCanvas } from '../../utils/fabric-setup';

interface CanvasProps {
  initialSVG?: string | null;
  onReady: (canvas: FabricCanvas) => void;
  className?: string;
  previewBg: 'primary' | 'light' | 'dark' | 'favicon';
  zoom: number;
}

const BG_BY_PREVIEW: Record<CanvasProps['previewBg'], string> = {
  primary: '#ffffff',
  light: '#f4f6f9',
  dark: '#0A0A0A',
  favicon: '#1f2937',
};

export function Canvas({ initialSVG, onReady, className, previewBg, zoom }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const canvas = createCanvas(ref.current);
    fabricRef.current = canvas;
    onReady(canvas);

    if (initialSVG) {
      void loadSVGIntoCanvas(canvas, initialSVG);
    }

    return () => {
      void canvas.dispose();
      fabricRef.current = null;
    };
    // Mount once — changing callbacks shouldn't recreate the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview background updates without recreating the canvas.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundColor = BG_BY_PREVIEW[previewBg];
    canvas.requestRenderAll();
  }, [previewBg]);

  // Zoom updates the CSS transform of the wrapper, not the Fabric zoom,
  // so we don't lose object coordinates. For "real" zoom of the canvas,
  // we'd use canvas.setZoom — kept in the wrapper for now to match the
  // logo-maker existing behavior.
  return (
    <div
      className={className}
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        transition: 'transform 120ms ease',
      }}
    >
      <canvas ref={ref} className="rounded-md shadow-sm" />
    </div>
  );
}
