/**
 * Folders — the brand asset library (Studio, `/b/:slug/folders`).
 *
 * The page is the collection. Everything that is not an asset — filters,
 * search, view, upload — is one compact toolbar band above it; the giant
 * permanent dropzone that used to own half the viewport is now a modal you
 * open, plus a drop veil that appears only while files are actually over
 * the window.
 *
 * The data layer is shared with Classic's DamPage via `useAssetLibrary`,
 * so upload, delete, rename, tagging and the legacy migration have exactly
 * one implementation. This file owns presentation and page-local state
 * (filters, selection, which modal is open) and nothing else.
 */
import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Download, FolderOpen, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { DsButton, DsConfirmDialog, DsSkeleton } from '@/shared/ds';
import { useAssetLibrary } from '@/features/dam/useAssetLibrary';
import type { Asset } from '@/shared/types/brand';
import { LibraryToolbar, type LibraryTab } from './components/LibraryToolbar';
import { AssetTile } from './components/AssetTile';
import { AssetRow } from './components/AssetRow';
import { AssetDetailModal } from './components/AssetDetailModal';
import { UploadAssetsModal } from './components/UploadAssetsModal';
import { DesignsPanel } from './components/DesignsPanel';
import {
  categoryCounts,
  dragCarriesFiles,
  isLibraryCategory,
  queryAssets,
  type LibraryCategory,
  type SortKey,
} from './model';
import './folders.css';

const SKELETON_TILES = 12;

function isTab(v: string | null): v is LibraryTab {
  return v === 'assets' || v === 'designs';
}

function isSort(v: string | null): v is SortKey {
  return v === 'recent' || v === 'name' || v === 'size';
}

/**
 * A link worth copying — an absolute URL to the file.
 *
 * A data: URL is excluded: it is the whole file inlined, it can be megabytes,
 * and pasting it into Slack shares nothing anyone can open. Everything else
 * (including the app-relative paths the seed brands use) resolves against
 * the current origin.
 */
function shareableUrl(asset: Asset): string | undefined {
  if (!asset.url || asset.url.startsWith('data:') || asset.url.startsWith('blob:')) return undefined;
  try {
    return new URL(asset.url, window.location.origin).href;
  } catch {
    return undefined;
  }
}

export default function FoldersPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand } = useBrandFromSlug(slug);
  const library = useAssetLibrary(brand);

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const category: LibraryCategory = isLibraryCategory(categoryParam) ? categoryParam : 'all';
  const tabParam = searchParams.get('tab');
  const tab: LibraryTab = isTab(tabParam) ? tabParam : 'assets';
  const sortParam = searchParams.get('sort');
  const sort: SortKey = isSort(sortParam) ? sortParam : 'recent';

  const setParam = React.useCallback(
    (key: string, value: string, fallback: string) => {
      const params = new URLSearchParams(searchParams);
      if (value === fallback) params.delete(key);
      else params.set(key, value);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<Asset | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = React.useState(false);
  const [designCount, setDesignCount] = React.useState<number | null>(null);

  const filtered = React.useMemo(
    () => queryAssets(library.assets, { category, search, sort }),
    [library.assets, category, search, sort],
  );
  const counts = React.useMemo(() => categoryCounts(library.assets), [library.assets]);

  const activeIndex = activeId ? filtered.findIndex((a) => a.id === activeId) : -1;
  const activeAsset = activeIndex >= 0 ? filtered[activeIndex] : null;

  // Selection only ever refers to assets still on screen; deleting or
  // filtering one away must not leave a phantom in the bulk-action count.
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const live = new Set(library.assets.map((a) => a.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [library.assets]);

  /* ── Page-wide drag & drop ─────────────────────────────────────────
     A counter, not a boolean: dragging over a child fires dragleave on
     the parent, and a boolean flickers the veil off on every hop. */
  const [dragDepth, setDragDepth] = React.useState(0);
  const dragging = dragDepth > 0 && tab === 'assets';

  const carriesFiles = (e: React.DragEvent) => dragCarriesFiles(e.dataTransfer?.types);

  const onDragEnter = (e: React.DragEvent) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    setDragDepth((d) => d + 1);
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!carriesFiles(e)) return;
    setDragDepth((d) => Math.max(0, d - 1));
  };
  const onDrop = (e: React.DragEvent) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    setDragDepth(0);
    if (tab !== 'assets') return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void library.upload(files);
  };

  /* ── Selection ─────────────────────────────────────────────────── */

  const toggleSelect = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const selectedAssets = React.useMemo(
    () => library.assets.filter((a) => selectedIds.has(a.id)),
    [library.assets, selectedIds],
  );

  /* ── Per-asset handlers ────────────────────────────────────────── */

  const copyLink = async (asset: Asset) => {
    const url = shareableUrl(asset);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const cardHandlers = (asset: Asset) => ({
    asset,
    selected: selectedIds.has(asset.id),
    selectionMode,
    onOpen: () => setActiveId(asset.id),
    onToggleSelect: () => toggleSelect(asset.id),
    onDownload: () => library.download(asset),
    onRename: (name: string) => void library.rename(asset.id, name),
    onChangeCategory: (c: Asset['category']) => void library.setCategory(asset.id, c),
    onCopyLink: shareableUrl(asset) ? () => void copyLink(asset) : undefined,
    onDelete: () => setPendingDelete(asset),
  });

  const navigateDetail = React.useCallback(
    (delta: 1 | -1) => {
      setActiveId((current) => {
        if (!current) return current;
        const i = filtered.findIndex((a) => a.id === current);
        if (i < 0) return current;
        const next = (i + delta + filtered.length) % filtered.length;
        return filtered[next]?.id ?? current;
      });
    },
    [filtered],
  );

  /* ── Render ────────────────────────────────────────────────────── */

  if (!brand) {
    return (
      <WorkspaceShell>
        <div className="board-wrap fl-board">
          <div className="fl-grid" aria-busy="true">
            {Array.from({ length: SKELETON_TILES }, (_, i) => (
              <DsSkeleton key={i} height={216} radius={14} />
            ))}
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  const libraryIsEmpty = !library.loading && library.assets.length === 0;

  return (
    <WorkspaceShell>
      <div
        className="board-wrap fl-board"
        data-dragging={dragging || undefined}
        onDragEnter={onDragEnter}
        onDragOver={(e) => {
          if (carriesFiles(e)) e.preventDefault();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <LibraryToolbar
          tab={tab}
          onTabChange={(t) => setParam('tab', t, 'assets')}
          totalCount={library.assets.length}
          filteredCount={filtered.length}
          designCount={designCount}
          category={category}
          onCategoryChange={(c) => setParam('category', c, 'all')}
          counts={counts}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={(s) => setParam('sort', s, 'recent')}
          view={view}
          onViewChange={setView}
          selectionMode={selectionMode}
          onToggleSelection={() => (selectionMode ? clearSelection() : setSelectionMode(true))}
          onUpload={() => setUploadOpen(true)}
        />

        {tab === 'designs' ? (
          <DesignsPanel brandId={brand.id} slug={slug ?? brand.slug} onCount={setDesignCount} />
        ) : library.loading ? (
          <div className="fl-grid" aria-busy="true">
            {Array.from({ length: SKELETON_TILES }, (_, i) => (
              <DsSkeleton key={i} height={216} radius={14} />
            ))}
          </div>
        ) : libraryIsEmpty ? (
          <div className="fl-blank">
            <div className="fl-blank-glyph" aria-hidden>
              <FolderOpen size={22} strokeWidth={1.5} />
            </div>
            <h2 className="fl-blank-title">{brand.name}'s library is empty</h2>
            <p className="fl-blank-copy">
              Add logos, photography, icons and documents once — every editor, template and
              export in BrandingOS reads from here.
            </p>
            <div className="fl-blank-actions">
              <DsButton tone="primary" onClick={() => setUploadOpen(true)}>
                <Upload size={14} strokeWidth={1.8} />
                Upload assets
              </DsButton>
              <DsButton tone="tertiary" onClick={() => navigate(`/b/${slug}/setup`)}>
                Go to Setup
              </DsButton>
            </div>
            <p className="fl-blank-hint">or drop files anywhere on this page</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="fl-nomatch">
            <p>No assets match this filter.</p>
            <DsButton
              tone="tertiary"
              size="sm"
              onClick={() => {
                setSearch('');
                setParam('category', 'all', 'all');
              }}
            >
              Clear filters
            </DsButton>
          </div>
        ) : view === 'grid' ? (
          <div className="fl-grid">
            {filtered.map((a) => (
              <AssetTile key={a.id} {...cardHandlers(a)} />
            ))}
          </div>
        ) : (
          <div className="fl-list">
            {filtered.map((a) => (
              <AssetRow key={a.id} {...cardHandlers(a)} />
            ))}
          </div>
        )}

        {dragging && (
          <div className="fl-dropveil" aria-hidden>
            <div className="fl-dropveil-card">
              <Upload size={20} strokeWidth={1.6} />
              <span>Drop to add to {brand.name}</span>
            </div>
          </div>
        )}
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <div className="fl-bulkbar" role="status">
          <span className="fl-bulkbar-count">{selectedIds.size} selected</span>
          <button
            type="button"
            className="fl-bulkbar-link"
            onClick={() => setSelectedIds(new Set(filtered.map((a) => a.id)))}
          >
            Select all ({filtered.length})
          </button>
          <div className="fl-bulkbar-sep" aria-hidden />
          <DsButton tone="secondary" size="sm" onClick={() => library.downloadMany(selectedAssets)}>
            <Download size={13} strokeWidth={1.8} />
            Download
          </DsButton>
          <DsButton tone="danger" size="sm" onClick={() => setPendingBulkDelete(true)}>
            <Trash2 size={13} strokeWidth={1.8} />
            Delete
          </DsButton>
          <button type="button" className="fl-bulkbar-link" onClick={clearSelection}>
            Cancel
          </button>
        </div>
      )}

      {activeAsset && (
        <AssetDetailModal
          asset={activeAsset}
          index={activeIndex}
          total={filtered.length}
          onNavigate={navigateDetail}
          onClose={() => setActiveId(null)}
          onRename={(name) => void library.rename(activeAsset.id, name)}
          onChangeCategory={(c) => void library.setCategory(activeAsset.id, c)}
          onAddTag={(t) => void library.addTag(activeAsset.id, t)}
          onRemoveTag={(t) => void library.removeTag(activeAsset.id, t)}
          onDownload={() => library.download(activeAsset)}
          onDelete={() => setPendingDelete(activeAsset)}
        />
      )}

      <UploadAssetsModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={library.upload}
        uploading={library.uploading}
        progress={library.progress}
      />

      <DsConfirmDialog
        open={pendingDelete !== null}
        title="Delete this asset?"
        description={
          <>
            <b>{pendingDelete?.name}</b> will be removed from {brand.name}'s library. Anything
            already using it keeps its own copy.
          </>
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (!target) return;
          if (activeId === target.id) setActiveId(null);
          void library.remove(target.id);
        }}
      />

      <DsConfirmDialog
        open={pendingBulkDelete}
        title={`Delete ${selectedIds.size} asset${selectedIds.size === 1 ? '' : 's'}?`}
        description={`They will be removed from ${brand.name}'s library. This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPendingBulkDelete(false)}
        onConfirm={() => {
          setPendingBulkDelete(false);
          const ids = Array.from(selectedIds);
          clearSelection();
          void library.removeMany(ids);
        }}
      />
    </WorkspaceShell>
  );
}
