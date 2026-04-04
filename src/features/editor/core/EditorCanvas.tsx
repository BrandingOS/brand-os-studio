/**
 * Unified Editor Canvas
 *
 * Renders the canvas area for all editor modes.
 * Handles zoom, pan, grid overlay, and page rendering.
 */
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useEditor } from './EditorContext';

interface EditorCanvasProps {
  /** Custom page renderer (for Fabric.js or custom rendering) */
  renderPage?: (pageIndex: number) => ReactNode;
  /** Default slot content if no custom renderer */
  children?: ReactNode;
  className?: string;
}

export function EditorCanvas({ renderPage, children, className }: EditorCanvasProps) {
  const {
    pages, activePageIndex, activePage, viewMode, zoom, panX, panY,
    showGrid, setActivePage,
  } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  if (!activePage) return null;

  const scale = zoom / 100;

  // ─── Fixed mode: single centered page ──────────────────────
  if (viewMode === 'fixed') {
    return (
      <div ref={containerRef} className={cn('flex-1 overflow-hidden flex items-center justify-center bg-muted/50', className)}>
        <div
          className="relative shadow-xl rounded-sm"
          style={{
            width: activePage.width,
            height: activePage.height,
            transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            transformOrigin: 'center center',
            background: activePage.background,
          }}
        >
          {showGrid && <GridOverlay />}
          {renderPage ? renderPage(activePageIndex) : children}
        </div>
      </div>
    );
  }

  // ─── Slides mode: vertical scroll of pages ─────────────────
  if (viewMode === 'slides') {
    return (
      <div ref={containerRef} className={cn('flex-1 overflow-y-auto bg-muted/50 py-8', className)}>
        <div className="flex flex-col items-center gap-6">
          {pages.map((page, index) => (
            <div key={page.id} className="relative group">
              {/* Page label */}
              <div className="absolute -top-5 left-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {page.name}
              </div>
              <div
                onClick={() => setActivePage(index)}
                className={cn(
                  'relative shadow-lg cursor-pointer transition-all',
                  index === activePageIndex ? 'ring-2 ring-primary' : 'ring-1 ring-border hover:ring-primary/40',
                )}
                style={{
                  width: page.width * scale,
                  height: page.height * scale,
                  background: page.background,
                }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: page.width, height: page.height }}>
                  {showGrid && <GridOverlay />}
                  {renderPage ? renderPage(index) : (index === activePageIndex ? children : null)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Freeform mode: infinite canvas with pan & zoom ────────
  return (
    <div ref={containerRef} className={cn('flex-1 overflow-hidden bg-muted/50 cursor-grab active:cursor-grabbing relative', className)}>
      <div
        className="absolute"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {pages.map((page, index) => (
          <div
            key={page.id}
            onClick={() => setActivePage(index)}
            className={cn(
              'absolute shadow-lg',
              index === activePageIndex && 'ring-2 ring-primary',
            )}
            style={{
              left: index * (page.width + 100),
              top: 0,
              width: page.width,
              height: page.height,
              background: page.background,
            }}
          >
            {showGrid && <GridOverlay />}
            {renderPage ? renderPage(index) : (index === activePageIndex ? children : null)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Grid Overlay ─────────────────────────────────────────────────────
function GridOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-30"
      style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    />
  );
}
