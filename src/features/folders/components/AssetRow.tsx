/**
 * AssetRow — one asset in the library's list view.
 *
 * Same interaction contract as AssetTile (whole row activates, actions
 * appear on hover/focus), laid out for scanning: thumb · name · category ·
 * size · date. The list is for finding a known file; the grid is for
 * looking at the collection.
 */
import * as React from 'react';
import { Check, Download, Maximize2, MoreHorizontal } from 'lucide-react';
import type { Asset, BrandFolder } from '@/shared/types/brand';
import { AssetPreview } from './AssetPreview';
import { AssetActionsMenu } from './AssetActionsMenu';
import { assetExtension, categoryLabel, formatBytes, isLibraryCategory } from '../model';

export interface AssetRowProps {
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

function formatDate(value: Asset['createdAt']): string {
  if (!value) return '—';
  const d = new Date(value as unknown as string);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AssetRow({
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
}: AssetRowProps) {
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
      className="fl-row"
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
      <button
        type="button"
        className="fl-row-check"
        aria-label={selected ? `Deselect ${asset.name}` : `Select ${asset.name}`}
        aria-pressed={selected}
        onClick={(e) => {
          stop(e);
          onToggleSelect();
        }}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </button>

      <AssetPreview asset={asset} variant="inline" />

      <div className="fl-row-name-cell">
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
          <span className="fl-row-name" title={asset.name}>
            {asset.name}
          </span>
        )}
      </div>

      <span className="fl-row-cell fl-row-cat">
        {isLibraryCategory(asset.category) ? categoryLabel(asset.category) : asset.category}
      </span>
      <span className="fl-row-cell fl-row-ext">{assetExtension(asset) || '—'}</span>
      <span className="fl-row-cell fl-row-size">{formatBytes(asset.size)}</span>
      <span className="fl-row-cell fl-row-date">{formatDate(asset.createdAt)}</span>

      <div className="fl-row-rail" onClick={stop}>
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
        {menuOpen && (
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
        )}
      </div>
    </div>
  );
}
