// Phase 7.3 — Renders other users' cursors over the active page.
//
// Receives the cursor list from useDesignCursors (already self-
// excluded + stale-pruned) and the active page's bounding-box in
// SCREEN coords (the canvas region wrapper does the page-fit math
// already). Each cursor is positioned via:
//
//   left = pageRect.left + pageRect.width  * cursor.x
//   top  = pageRect.top  + pageRect.height * cursor.y
//
// pageRect comes from the caller (Editor.tsx measures the canvas
// region). Cursors only render when their pageId matches the
// active page — viewing a different page means we're not on the
// peer's canvas, so don't show their cursor.

import type { CursorState } from './useDesignCursors';

interface EditorCursorOverlayProps {
  others: CursorState[];
  activePageId: string;
  /** Active page's bounding rect in viewport (CSS) pixels. */
  pageRect: { left: number; top: number; width: number; height: number } | null;
}

export function EditorCursorOverlay({
  others,
  activePageId,
  pageRect,
}: EditorCursorOverlayProps) {
  if (!pageRect || others.length === 0) return null;

  const visible = others.filter((c) => c.pageId === activePageId);
  if (visible.length === 0) return null;

  return (
    <div
      data-editor-cursor-overlay
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
      }}
      aria-hidden
    >
      {visible.map((c) => {
        const left = pageRect.left + pageRect.width * c.x;
        const top = pageRect.top + pageRect.height * c.y;
        return (
          <div
            key={c.userId}
            data-cursor-user-id={c.userId}
            style={{
              position: 'absolute',
              left,
              top,
              transform: 'translate(-2px, -2px)',
              transition: 'left 90ms linear, top 90ms linear',
            }}
          >
            <CursorArrow color={c.color} />
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: 14,
                background: c.color,
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {c.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CursorArrow({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path
        d="M3 1 L3 16 L7 12 L10 18 L12 17 L9 11 L15 11 Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1"
      />
    </svg>
  );
}
