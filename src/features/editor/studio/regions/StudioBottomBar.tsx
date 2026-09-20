// The bottom bar — pages on the left, the view on the right.
//
// Pages used to live in a 176px column down the right-hand side, taking
// canvas width permanently to show a list that is usually one item long.
// A horizontal strip costs the same 44px whether the document has one
// page or thirty, and puts page navigation where every deck tool has
// taught people to look for it.
//
// Zoom lives here too rather than floating over the artboard, so nothing
// overlaps the design.

import { Maximize2, Minus, Plus } from 'lucide-react';
import { DsMenu, DsMenuDivider, DsMenuItem } from '@/shared/ds';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../components/chrome';
import type { PageSummary } from '../state/studioStore';

const ICON = { size: 15, strokeWidth: 1.8 } as const;

interface Props {
  pages: PageSummary[];
  activePageId: string;
  multiPage: boolean;
  readOnly: boolean;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onZoomTo: (zoom: number) => void;
}

export function StudioBottomBar({
  pages,
  activePageId,
  multiPage,
  readOnly,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onZoomTo,
}: Props) {
  return (
    <footer className="st-bottombar" data-studio-bottombar>
      <div className="st-pages" data-studio-pages>
        {/* A single-page design says so once, rather than drawing a
            page-management UI for a document that has no pages to
            manage. */}
        {multiPage ? (
          pages.map((page, i) => (
            <PageChip
              key={page.id}
              page={page}
              index={i}
              active={page.id === activePageId}
              canDelete={pages.length > 1 && !readOnly}
              readOnly={readOnly}
              onSelect={() => onSelectPage(page.id)}
              onDuplicate={() => onDuplicatePage(page.id)}
              onDelete={() => onDeletePage(page.id)}
            />
          ))
        ) : (
          <span className="st-docmeta" style={{ paddingLeft: 4 }}>
            {pages[0] ? `${pages[0].width} × ${pages[0].height}` : ''}
          </span>
        )}
        {multiPage && !readOnly ? (
          <IconButton
            icon={<Plus {...ICON} />}
            label="Add page"
            showLabel
            onClick={onAddPage}
            data-studio-add-page=""
          />
        ) : null}
      </div>

      <div className="st-zoom" data-studio-zoom>
        <IconButton icon={<Minus {...ICON} />} label="Zoom out" shortcut="⌘−" onClick={onZoomOut} />
        <ZoomValue zoom={zoom} onZoomTo={onZoomTo} onFit={onFit} />
        <IconButton icon={<Plus {...ICON} />} label="Zoom in" shortcut="⌘+" onClick={onZoomIn} />
        <IconButton
          icon={<Maximize2 {...ICON} />}
          label="Fit to screen"
          shortcut="⌘0"
          onClick={onFit}
        />
      </div>
    </footer>
  );
}

function PageChip({
  page,
  index,
  active,
  canDelete,
  readOnly,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  page: PageSummary;
  index: number;
  active: boolean;
  canDelete: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useDismiss(wrap, menu, () => setMenu(false));

  return (
    <span ref={wrap} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        type="button"
        className={`st-page-chip ${active ? 'is-active' : ''}`}
        onClick={onSelect}
        onContextMenu={(e) => {
          if (readOnly) return;
          e.preventDefault();
          setMenu(true);
        }}
        data-studio-page={page.id}
        aria-current={active ? 'true' : undefined}
        title={`${page.name} · ${page.width} × ${page.height}`}
      >
        <span
          className="st-page-thumb"
          aria-hidden
          // The chip carries the page's real proportions, so a portrait
          // page and a landscape one are distinguishable at a glance.
          style={{ aspectRatio: `${page.width} / ${page.height}` }}
        />
        {index + 1}
      </button>
      {menu ? (
        <span style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 40 }}>
          <DsMenu>
            <DsMenuItem
              onClick={() => {
                setMenu(false);
                onDuplicate();
              }}
            >
              Duplicate page
            </DsMenuItem>
            <DsMenuDivider />
            <DsMenuItem
              danger
              disabled={!canDelete}
              onClick={() => {
                setMenu(false);
                onDelete();
              }}
            >
              Delete page
            </DsMenuItem>
          </DsMenu>
        </span>
      ) : null}
    </span>
  );
}

const ZOOM_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4];

function ZoomValue({
  zoom,
  onZoomTo,
  onFit,
}: {
  zoom: number;
  onZoomTo: (z: number) => void;
  onFit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useDismiss(wrap, open, () => setOpen(false));

  return (
    <span ref={wrap} style={{ position: 'relative' }}>
      <button
        type="button"
        className="st-icon-btn st-zoom-value"
        onClick={() => setOpen((v) => !v)}
        aria-label="Zoom level"
        data-studio-zoom-value
      >
        {Math.round(zoom * 100)}%
      </button>
      {open ? (
        <span style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 40 }}>
          <DsMenu>
            <DsMenuItem
              kbd="⌘0"
              onClick={() => {
                setOpen(false);
                onFit();
              }}
            >
              Fit to screen
            </DsMenuItem>
            <DsMenuDivider />
            {ZOOM_PRESETS.map((z) => (
              <DsMenuItem
                key={z}
                kbd={z === 1 ? '⌘1' : undefined}
                onClick={() => {
                  setOpen(false);
                  onZoomTo(z);
                }}
              >
                {z * 100}%
              </DsMenuItem>
            ))}
          </DsMenu>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Close on an outside click or Escape.
 *
 * `DsMenu` is a surface, not a dismissable layer — it renders in place
 * with no portal and owns no behaviour, which is the deliberate trade
 * that keeps `--ds-*` resolving in the local theme scope. Dismissal is
 * therefore the caller's job, and this is it, in one place.
 */
function useDismiss(
  ref: React.RefObject<HTMLElement>,
  open: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    // Deferred so the press that opened the menu does not close it.
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', onDown);
      document.addEventListener('keydown', onKey, true);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close, ref]);
}
