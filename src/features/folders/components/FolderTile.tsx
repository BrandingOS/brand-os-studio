/**
 * FolderTile / FolderRow — a folder in the grid, beside the content.
 *
 * Folders render in EVERY tab, because they belong to the brand rather than
 * to Library, Designs or Kit. Hiding a folder that happens to hold no designs
 * would mean the path under your feet changes when you switch tabs, and the
 * organisational context is exactly what must not change.
 *
 * The count rolls up descendants, so a folder of subfolders never reads "0
 * items" over a subtree full of work.
 */
import * as React from 'react';
import { Folder, MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';
import { DsMenu, DsMenuItem, DsMenuDivider } from '@/shared/ds';
import type { BrandFolder } from '@/shared/types/brand';

export interface FolderTileProps {
  folder: BrandFolder;
  /** Items of the CURRENT tab beneath this folder, descendants included. */
  count: number;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  /** Set while an item is being dragged over it — the drop target state. */
  dropActive?: boolean;
  onDropItem?: () => void;
  onDragStateChange?: (over: boolean) => void;
}

function useFolderMenu(onClose: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return ref;
}

function FolderMenu({
  folder,
  onRename,
  onDelete,
  onClose,
}: {
  folder: BrandFolder;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useFolderMenu(onClose);
  return (
    <div ref={ref} className="fl-menu-anchor">
      <DsMenu aria-label={`Actions for ${folder.name}`}>
        <DsMenuItem
          icon={<PencilLine size={14} strokeWidth={1.8} />}
          onClick={() => {
            onRename();
            onClose();
          }}
        >
          Rename
        </DsMenuItem>
        <DsMenuDivider />
        <DsMenuItem
          danger
          icon={<Trash2 size={14} strokeWidth={1.8} />}
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          Delete folder
        </DsMenuItem>
      </DsMenu>
    </div>
  );
}

export function FolderTile({
  folder,
  count,
  onOpen,
  onRename,
  onDelete,
  dropActive,
  onDropItem,
  onDragStateChange,
}: FolderTileProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(folder.name);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== folder.name) onRename(next);
    setRenaming(false);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fl-tile fl-tile--folder"
      data-menu-open={menuOpen || undefined}
      data-drop-active={dropActive || undefined}
      role="button"
      tabIndex={0}
      aria-label={`Folder ${folder.name}`}
      onClick={() => !renaming && onOpen()}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragOver={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragStateChange?.(true);
      }}
      onDragLeave={() => onDragStateChange?.(false)}
      onDrop={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        e.stopPropagation();
        onDragStateChange?.(false);
        onDropItem();
      }}
    >
      <div className="fl-tile-well fl-folder-well">
        <Folder size={40} strokeWidth={1.2} aria-hidden />
        <div className="fl-tile-rail" onClick={stop}>
          <button
            type="button"
            className="fl-tile-act"
            aria-label={`More actions for ${folder.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={14} strokeWidth={1.8} />
          </button>
        </div>
        {menuOpen && (
          <div onClick={stop}>
            <FolderMenu
              folder={folder}
              onRename={() => {
                setDraft(folder.name);
                setRenaming(true);
              }}
              onDelete={onDelete}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        )}
      </div>

      <div className="fl-tile-meta">
        {renaming ? (
          <input
            className="fl-tile-rename"
            value={draft}
            autoFocus
            aria-label="Folder name"
            onClick={stop}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <div className="fl-tile-name" title={folder.name}>
            {folder.name}
          </div>
        )}
        <div className="fl-tile-sub">
          <span className="fl-tile-cat">{count === 1 ? '1 item' : `${count} items`}</span>
        </div>
      </div>
    </div>
  );
}

export function FolderRow({
  folder,
  count,
  onOpen,
  onRename,
  onDelete,
  dropActive,
  onDropItem,
  onDragStateChange,
}: FolderTileProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(folder.name);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== folder.name) onRename(next);
    setRenaming(false);
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fl-row fl-row--folder"
      data-menu-open={menuOpen || undefined}
      data-drop-active={dropActive || undefined}
      role="button"
      tabIndex={0}
      aria-label={`Folder ${folder.name}`}
      onClick={() => !renaming && onOpen()}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragOver={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        onDragStateChange?.(true);
      }}
      onDragLeave={() => onDragStateChange?.(false)}
      onDrop={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        e.stopPropagation();
        onDragStateChange?.(false);
        onDropItem();
      }}
    >
      <span className="fl-row-check" aria-hidden />
      <div className="fl-folder-thumb" aria-hidden>
        <Folder size={20} strokeWidth={1.4} />
      </div>
      <div className="fl-row-name-cell">
        {renaming ? (
          <input
            className="fl-tile-rename"
            value={draft}
            autoFocus
            aria-label="Folder name"
            onClick={stop}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <span className="fl-row-name">{folder.name}</span>
        )}
      </div>
      <span className="fl-row-cell fl-row-cat">Folder</span>
      <span className="fl-row-cell fl-row-ext">—</span>
      <span className="fl-row-cell fl-row-size">{count === 1 ? '1 item' : `${count} items`}</span>
      <span className="fl-row-cell fl-row-date">—</span>

      <div className="fl-row-rail" onClick={stop}>
        <button
          type="button"
          className="fl-tile-act"
          aria-label={`More actions for ${folder.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal size={14} strokeWidth={1.8} />
        </button>
        {menuOpen && (
          <FolderMenu
            folder={folder}
            onRename={() => {
              setDraft(folder.name);
              setRenaming(true);
            }}
            onDelete={onDelete}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
