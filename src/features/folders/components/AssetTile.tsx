/**
 * AssetTile — one asset in the library grid.
 *
 * The whole tile is the control: click opens the asset (or toggles it, in
 * selection mode), Enter/Space do the same from the keyboard. Actions are
 * NOT permanently painted on — the rail and the checkbox appear on hover or
 * keyboard focus, so a full grid reads as artwork rather than as a wall of
 * buttons.
 *
 * It is a div with role="button" rather than a <button> because it contains
 * buttons of its own, and a button inside a button is invalid HTML that
 * browsers resolve by dropping the inner one.
 */
import * as React from 'react';
import { Check, Download, Maximize2, MoreHorizontal } from 'lucide-react';
import type { Asset, BrandFolder } from '@/shared/types/brand';
import { AssetPreview } from './AssetPreview';
import { AssetActionsMenu } from './AssetActionsMenu';
import { assetMetaLine, categoryLabel, isLibraryCategory } from '../model';

export interface AssetTileProps {
  asset: Asset;
  selected: boolean;
  selectionMode: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onDownload: () => void;
  onRename: (name: string) => void;
  onChangeCategory: (category: Asset['category']) => void;
  onCopyLink?: () => void;
  onDelete: () => void;
  /** The brand's folder tree, for the "Move to folder…" pane. */
  folders?: BrandFolder[];
  onMoveToFolder?: (folderId: string | null) => void;
  /** Set while this item is being dragged, so folders can accept it. */
  onDragItemStart?: () => void;
  onDragItemEnd?: () => void;
}

export function AssetTile({
  asset,
  selected,
  selectionMode,
  onOpen,
  onToggleSelect,
  onDownload,
  onRename,
  onChangeCategory,
  onCopyLink,
  onDelete,
  folders,
  onMoveToFolder,
  onDragItemStart,
  onDragItemEnd,
}: AssetTileProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(asset.name);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== asset.name) onRename(next);
    setRenaming(false);
  };

  const activate = () => (selectionMode ? onToggleSelect() : onOpen());

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fl-tile fl-tile--asset"
      data-selected={selected || undefined}
      data-menu-open={menuOpen || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selectionMode ? selected : undefined}
      aria-label={asset.name}
      draggable={Boolean(onMoveToFolder) && !renaming}
      onDragStart={(e) => {
        // The payload is only a hint; the page holds the real dragged item.
        // Chromium refuses a drag with no data set at all.
        e.dataTransfer.setData('text/plain', asset.name);
        e.dataTransfer.effectAllowed = 'move';
        onDragItemStart?.();
      }}
      onDragEnd={() => onDragItemEnd?.()}
      onClick={activate}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="fl-tile-well">
        <AssetPreview asset={asset} />

        <button
          type="button"
          className="fl-tile-check"
          aria-label={selected ? `Deselect ${asset.name}` : `Select ${asset.name}`}
          aria-pressed={selected}
          onClick={(e) => {
            stop(e);
            onToggleSelect();
          }}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </button>

        <div className="fl-tile-rail" onClick={stop}>
          <button type="button" className="fl-tile-act" aria-label="Preview" onClick={onOpen}>
            <Maximize2 size={14} strokeWidth={1.8} />
          </button>
          <button type="button" className="fl-tile-act" aria-label="Download" onClick={onDownload}>
            <Download size={14} strokeWidth={1.8} />
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
          <div onClick={stop}>
            <AssetActionsMenu
              asset={asset}
              folders={folders}
              onMoveToFolder={onMoveToFolder}
              onRename={() => {
                setDraft(asset.name);
                setRenaming(true);
              }}
              onChangeCategory={onChangeCategory}
              onCopyLink={onCopyLink}
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
            aria-label="Asset name"
            onClick={stop}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <div className="fl-tile-name" title={asset.name}>
            {asset.name}
          </div>
        )}
        <div className="fl-tile-sub">
          <span className="fl-tile-cat">
            {isLibraryCategory(asset.category) ? categoryLabel(asset.category) : asset.category}
          </span>
          <span className="fl-tile-dot" aria-hidden>
            ·
          </span>
          <span className="fl-tile-spec">{assetMetaLine(asset)}</span>
        </div>
      </div>
    </div>
  );
}
