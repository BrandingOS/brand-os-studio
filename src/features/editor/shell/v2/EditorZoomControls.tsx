// EditorZoomControls — Step 5/7 fix 6.
//
// Bottom-right cluster: Fit / Zoom out / 100% / Zoom in. The current
// zoom percentage is displayed inline. Hidden when Phase 4.5's full
// pan-and-zoom mode lands; for now this is a basic "scale the canvas
// wrapper to fit the viewport" implementation that uses CSS
// `transform: scale()` on a parent of EditorCanvasMount.

import { Maximize2, Minus, Plus } from 'lucide-react';

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
}

export function EditorZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFit,
}: Props) {
  return (
    <div
      data-zoom-controls
      className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 rounded-xl px-1 py-1"
      style={{
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--border, rgba(13,13,13,0.12))',
        boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.05))',
        color: 'var(--text-primary, #0d0d0d)',
      }}
    >
      <ZoomBtn label="Fit to screen" onClick={onFit} dataAction="fit">
        <Maximize2 className="h-3.5 w-3.5" />
      </ZoomBtn>
      <Sep />
      <ZoomBtn label="Zoom out" onClick={onZoomOut} dataAction="zoom-out">
        <Minus className="h-3.5 w-3.5" />
      </ZoomBtn>
      <button
        type="button"
        onClick={onZoomReset}
        data-zoom-action="reset"
        title="Reset to 100%"
        className="rounded-lg px-2 py-1 text-[11px] tabular-nums transition-colors"
        style={{
          background: 'transparent',
          color: 'var(--text-primary, #0d0d0d)',
          minWidth: 44,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--surface-hover, #f5f5f4)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        {Math.round(zoom * 100)}%
      </button>
      <ZoomBtn label="Zoom in" onClick={onZoomIn} dataAction="zoom-in">
        <Plus className="h-3.5 w-3.5" />
      </ZoomBtn>
    </div>
  );
}

function ZoomBtn({
  label,
  onClick,
  dataAction,
  children,
}: {
  label: string;
  onClick: () => void;
  dataAction: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-zoom-action={dataAction}
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
      style={{ color: 'var(--text-primary, #0d0d0d)' }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--surface-hover, #f5f5f4)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'transparent')
      }
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span
      className="mx-0.5 h-4 w-px"
      style={{ background: 'var(--border, rgba(13,13,13,0.12))' }}
    />
  );
}
