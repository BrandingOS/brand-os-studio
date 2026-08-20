/**
 * DesignTile — one saved design in the grid.
 *
 * Same tile as everything else on the page, because a design filed in
 * "Campaigns / Summer Launch" is in the same place as the photos beside it.
 * What differs is only what it IS and what you can do with it: open it in the
 * editor, file it, delete it. There is no download — a design is a document,
 * and exporting one is the editor's job.
 */
import * as React from 'react';
import { MoreHorizontal, PenTool, SquareArrowOutUpRight } from 'lucide-react';
import { DsMenu, DsMenuItem, DsMenuDivider } from '@/shared/ds';
import type { DesignSummary } from '@/core/types/services';
import type { BrandFolder } from '@/shared/types/brand';
import { buildFolderTree, type FolderNode } from '@/shared/folders';

function flatten(nodes: FolderNode[], depth = 0): Array<{ folder: BrandFolder; depth: number }> {
  return nodes.flatMap((n) => [{ folder: n.folder, depth }, ...flatten(n.children, depth + 1)]);
}

export interface DesignTileProps {
  design: DesignSummary;
  folders: BrandFolder[];
  onOpen: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onDelete: () => void;
  onDragItemStart?: () => void;
  onDragItemEnd?: () => void;
}

export function DesignTile({
  design,
  folders,
  onOpen,
  onMoveToFolder,
  onDelete,
  onDragItemStart,
  onDragItemEnd,
}: DesignTileProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pane, setPane] = React.useState<'root' | 'folder'>('root');
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) {
      setPane('root');
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const rows = React.useMemo(() => flatten(buildFolderTree(folders)), [folders]);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const name = design.name || 'Untitled design';

  return (
    <div
      className="fl-tile fl-tile--design"
      data-menu-open={menuOpen || undefined}
      role="button"
      tabIndex={0}
      aria-label={name}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', name);
        e.dataTransfer.effectAllowed = 'move';
        onDragItemStart?.();
      }}
      onDragEnd={() => onDragItemEnd?.()}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="fl-tile-well">
        {design.thumbnailUrl ? (
          <div className="fl-preview">
            <img
              src={design.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              data-state="ready"
              draggable={false}
            />
          </div>
        ) : (
          <div className="fl-preview fl-preview--glyph fl-preview--tile" aria-hidden>
            <PenTool strokeWidth={1.5} />
          </div>
        )}

        <div className="fl-tile-rail" onClick={stop}>
          <button type="button" className="fl-tile-act" aria-label="Open in editor" onClick={onOpen}>
            <SquareArrowOutUpRight size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="fl-tile-act"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={14} strokeWidth={1.8} />
          </button>
        </div>

        {menuOpen && (
          <div ref={menuRef} className="fl-menu-anchor" onClick={stop}>
            <DsMenu aria-label={`Actions for ${name}`}>
              {pane === 'root' ? (
                <>
                  <DsMenuItem
                    onClick={() => {
                      onOpen();
                      setMenuOpen(false);
                    }}
                  >
                    Open in editor
                  </DsMenuItem>
                  <DsMenuItem onClick={() => setPane('folder')}>Move to folder…</DsMenuItem>
                  <DsMenuDivider />
                  <DsMenuItem
                    danger
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                  >
                    Delete
                  </DsMenuItem>
                </>
              ) : (
                <>
                  <DsMenuItem onClick={() => setPane('root')}>Back</DsMenuItem>
                  <DsMenuDivider />
                  <DsMenuItem
                    onClick={() => {
                      onMoveToFolder(null);
                      setMenuOpen(false);
                    }}
                  >
                    Folders (root)
                  </DsMenuItem>
                  {rows.map(({ folder, depth }) => (
                    <DsMenuItem
                      key={folder.id}
                      style={{ paddingLeft: 10 + depth * 12 }}
                      onClick={() => {
                        onMoveToFolder(folder.id);
                        setMenuOpen(false);
                      }}
                    >
                      {folder.name}
                    </DsMenuItem>
                  ))}
                  {rows.length === 0 && <DsMenuItem disabled>No folders yet</DsMenuItem>}
                </>
              )}
            </DsMenu>
          </div>
        )}
      </div>

      <div className="fl-tile-meta">
        <div className="fl-tile-name" title={name}>
          {name}
        </div>
        <div className="fl-tile-sub">
          <span className="fl-tile-cat">{design.contentType ?? 'Design'}</span>
          {design.width && design.height && (
            <>
              <span className="fl-tile-dot" aria-hidden>
                ·
              </span>
              <span className="fl-tile-spec">
                {design.width}×{design.height}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
