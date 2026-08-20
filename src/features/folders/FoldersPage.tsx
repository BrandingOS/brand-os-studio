/**
 * Folders — one brand filesystem, three views into it (`/b/:slug/folders`).
 *
 * The folder tree belongs to the BRAND, not to a tab. `Campaigns / Summer
 * Launch` is one place; Library, Designs and Kit are what you can see while
 * standing in it. Open a folder, switch tabs, and you are still in the same
 * folder looking at a different kind of thing. There is deliberately no
 * per-tab folder tree — that is three file managers and three "Social"
 * folders, which is the thing this page exists not to be.
 *
 *   Library  source assets and files
 *   Designs  creative work in progress
 *   Kit      approved final brand deliverables
 *
 * Folder membership is nullable everywhere, so an item that has never been
 * filed lives at the root and each content type joined the tree at its own
 * pace: assets since migration 017, designs from 032, kit as additive JSON.
 *
 * Subfolders render in EVERY tab, because they are the brand's. A folder that
 * happens to hold no designs must not vanish when you switch to Designs —
 * losing the path under your feet is exactly the disorientation a shared tree
 * exists to prevent.
 */
import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Download, FolderOpen, FolderPlus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { DsButton, DsConfirmDialog, DsSkeleton } from '@/shared/ds';
import {
  childrenOf,
  countByFolder,
  descendantIds,
  folderPath,
  useBrandFolders,
} from '@/shared/folders';
import { useAssetLibrary } from '@/features/dam/useAssetLibrary';
import type { Asset, BrandFolder } from '@/shared/types/brand';
import type { DeliverableKey } from '@/features/brand-kit/kit/types';
import { LibraryToolbar, type LibraryTab } from './components/LibraryToolbar';
import { AssetTile } from './components/AssetTile';
import { AssetRow } from './components/AssetRow';
import { FolderTile, FolderRow } from './components/FolderTile';
import { DesignTile } from './components/DesignTile';
import { KitTile } from './components/KitTile';
import { AssetDetailModal } from './components/AssetDetailModal';
import { UploadAssetsModal } from './components/UploadAssetsModal';
import { NewFolderModal } from './components/NewFolderModal';
import { AddKitDeliverableModal } from './components/AddKitDeliverableModal';
import { useDesignLibrary } from './useDesignLibrary';
import { useKitLibrary } from './useKitLibrary';
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
  return v === 'library' || v === 'designs' || v === 'kit';
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

/** What is being dragged onto a folder. Kit deliverables are filed by menu. */
type DragPayload = { kind: 'asset' | 'design'; id: string } | null;

export default function FoldersPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand } = useBrandFromSlug(slug);

  const library = useAssetLibrary(brand);
  const designLib = useDesignLibrary(brand?.id);
  const kit = useKitLibrary(brand);
  const tree = useBrandFolders(brand?.id);

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const category: LibraryCategory = isLibraryCategory(categoryParam) ? categoryParam : 'all';
  const tabParam = searchParams.get('tab');
  const tab: LibraryTab = isTab(tabParam) ? tabParam : 'library';
  const sortParam = searchParams.get('sort');
  const sort: SortKey = isSort(sortParam) ? sortParam : 'recent';

  // The folder lives in its own param, so switching tabs keeps it. An id that
  // no longer resolves yields an empty path — i.e. the root — rather than a
  // page pointing at nothing.
  const folderParam = searchParams.get('folder');
  const path = React.useMemo(() => folderPath(tree.folders, folderParam), [tree.folders, folderParam]);
  const folderId = path.length > 0 ? path[path.length - 1].id : null;

  const setParam = React.useCallback(
    (key: string, value: string | null, fallback: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (value === null || value === fallback) params.delete(key);
      else params.set(key, value);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const navigateFolder = React.useCallback(
    (next: string | null) => setParam('folder', next, null),
    [setParam],
  );

  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [kitAddOpen, setKitAddOpen] = React.useState(false);
  const [kitAddSlot, setKitAddSlot] = React.useState<DeliverableKey | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Asset | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = React.useState(false);
  const [pendingFolderDelete, setPendingFolderDelete] = React.useState<BrandFolder | null>(null);
  const [dragged, setDragged] = React.useState<DragPayload>(null);
  const [dropFolderId, setDropFolderId] = React.useState<string | null>(null);

  /* ── What is in this folder ────────────────────────────────────── */

  const subfolders = React.useMemo(() => childrenOf(tree.folders, folderId), [tree.folders, folderId]);

  // A search reaches into the whole subtree. Searching one level deep is not
  // searching; at the root it becomes a search of the entire brand.
  const searchScope = React.useMemo(() => {
    if (!search.trim()) return null;
    return folderId ? descendantIds(tree.folders, folderId) : new Set(tree.folders.map((f) => f.id));
  }, [search, folderId, tree.folders]);

  const filteredAssets = React.useMemo(
    () =>
      queryAssets(library.assets, {
        category,
        search,
        sort,
        folderId,
        searchFolderIds: searchScope,
      }),
    [library.assets, category, search, sort, folderId, searchScope],
  );

  const inScope = React.useCallback(
    (itemFolderId: string | null | undefined) => {
      const id = itemFolderId ?? null;
      if (!searchScope) return id === folderId;
      if (id === null) return folderId === null;
      return searchScope.has(id);
    },
    [folderId, searchScope],
  );

  const matchesSearch = React.useCallback(
    (text: string) => {
      const q = search.trim().toLowerCase();
      return !q || text.toLowerCase().includes(q);
    },
    [search],
  );

  const filteredDesigns = React.useMemo(
    () =>
      designLib.designs.filter(
        (d) => inScope(d.folderId) && matchesSearch(d.name || 'Untitled design'),
      ),
    [designLib.designs, inScope, matchesSearch],
  );

  const filteredKit = React.useMemo(
    () => kit.entries.filter((e) => inScope(e.folderId) && matchesSearch(e.def.label)),
    [kit.entries, inScope, matchesSearch],
  );

  /** A folder tile counts what you can SEE in it — i.e. the current tab. */
  const folderCounts = React.useMemo(() => {
    const items =
      tab === 'library'
        ? library.assets
        : tab === 'designs'
          ? designLib.designs
          : kit.entries.map((e) => ({ folderId: e.folderId }));
    return countByFolder(tree.folders, items);
  }, [tab, library.assets, designLib.designs, kit.entries, tree.folders]);

  const counts = React.useMemo(() => categoryCounts(library.assets), [library.assets]);

  const activeIndex = activeId ? filteredAssets.findIndex((a) => a.id === activeId) : -1;
  const activeAsset = activeIndex >= 0 ? filteredAssets[activeIndex] : null;

  // Selection only ever refers to assets still on screen; deleting or
  // filtering one away must not leave a phantom in the bulk-action count.
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const live = new Set(library.assets.map((a) => a.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [library.assets]);

  /* ── Files dragged in from the desktop ─────────────────────────
     A counter, not a boolean: dragging over a child fires dragleave on
     the parent, and a boolean flickers the veil off on every hop. */
  const [dragDepth, setDragDepth] = React.useState(0);
  const fileDragging = dragDepth > 0 && tab === 'library';

  const carriesFiles = (e: React.DragEvent) => dragCarriesFiles(e.dataTransfer?.types);

  /**
   * Newly uploaded assets arrive unfiled, but the user aimed at the folder
   * they were standing in. Files the just-completed batch by name — the
   * upload has already refreshed the list by the time this runs.
   */
  const fileNewUploads = React.useCallback(
    async (names: string[]) => {
      if (!folderId || names.length === 0) return;
      const wanted = new Set(names);
      const fresh = library.assets.filter((a) => !a.folderId && wanted.has(a.name));
      for (const asset of fresh) await library.moveToFolder(asset.id, folderId);
    },
    [folderId, library],
  );

  const uploadHere = React.useCallback(
    async (files: File[]) => {
      const names = files.map((f) => f.name);
      await library.upload(files);
      await fileNewUploads(names);
    },
    [library, fileNewUploads],
  );

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
    if (tab !== 'library') return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void uploadHere(files);
  };

  /* ── Moving items between folders ──────────────────────────────── */

  const dropInto = React.useCallback(
    async (target: string | null) => {
      if (!dragged) return;
      const payload = dragged;
      setDragged(null);
      setDropFolderId(null);
      if (payload.kind === 'asset') await library.moveToFolder(payload.id, target);
      else await designLib.moveToFolder(payload.id, target);
    },
    [dragged, library, designLib],
  );

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

  /* ── Per-item handlers ─────────────────────────────────────────── */

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

  const clearDrag = () => {
    setDragged(null);
    setDropFolderId(null);
  };

  const cardHandlers = (asset: Asset) => ({
    asset,
    selected: selectedIds.has(asset.id),
    selectionMode,
    folders: tree.folders,
    onOpen: () => setActiveId(asset.id),
    onToggleSelect: () => toggleSelect(asset.id),
    onDownload: () => library.download(asset),
    onRename: (name: string) => void library.rename(asset.id, name),
    onChangeCategory: (c: Asset['category']) => void library.setCategory(asset.id, c),
    onMoveToFolder: (target: string | null) => void library.moveToFolder(asset.id, target),
    onCopyLink: shareableUrl(asset) ? () => void copyLink(asset) : undefined,
    onDelete: () => setPendingDelete(asset),
    onDragItemStart: () => setDragged({ kind: 'asset', id: asset.id }),
    onDragItemEnd: clearDrag,
  });

  const folderHandlers = (folder: BrandFolder) => ({
    folder,
    count: folderCounts.get(folder.id) ?? 0,
    onOpen: () => navigateFolder(folder.id),
    onRename: (name: string) => void tree.rename(folder.id, name),
    onDelete: () => setPendingFolderDelete(folder),
    dropActive: dropFolderId === folder.id,
    onDropItem: dragged ? () => void dropInto(folder.id) : undefined,
    onDragStateChange: (over: boolean) => setDropFolderId(over ? folder.id : null),
  });

  const navigateDetail = React.useCallback(
    (delta: 1 | -1) => {
      setActiveId((current) => {
        if (!current) return current;
        const i = filteredAssets.findIndex((a) => a.id === current);
        if (i < 0) return current;
        const next = (i + delta + filteredAssets.length) % filteredAssets.length;
        return filteredAssets[next]?.id ?? current;
      });
    },
    [filteredAssets],
  );

  const openKitUpload = (key: DeliverableKey | null) => {
    setKitAddSlot(key);
    setKitAddOpen(true);
  };

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

  const loadingTab =
    tab === 'library' ? library.loading : tab === 'designs' ? designLib.loading : kit.loading;

  const itemCount =
    tab === 'library'
      ? filteredAssets.length
      : tab === 'designs'
        ? filteredDesigns.length
        : filteredKit.length;

  // The onboarding invitation is for a brand with NOTHING anywhere. Once a
  // folder or any item exists, the filesystem itself is the page.
  const brandIsEmpty =
    !library.loading &&
    !tree.loading &&
    library.assets.length === 0 &&
    tree.folders.length === 0 &&
    designLib.designs.length === 0 &&
    kit.entries.length === 0;

  const here = path.length > 0 ? path[path.length - 1].name : 'Folders';
  const filtering = Boolean(search.trim()) || category !== 'all';

  return (
    <WorkspaceShell>
      <div
        className="board-wrap fl-board"
        data-dragging={fileDragging || undefined}
        onDragEnter={onDragEnter}
        onDragOver={(e) => {
          if (carriesFiles(e)) e.preventDefault();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <LibraryToolbar
          tab={tab}
          onTabChange={(t) => setParam('tab', t, 'library')}
          totalCount={library.assets.length}
          filteredCount={filteredAssets.length}
          designCount={designLib.loading ? null : filteredDesigns.length}
          kitCount={kit.loading ? null : filteredKit.length}
          path={path}
          onNavigateFolder={navigateFolder}
          onNewFolder={() => setNewFolderOpen(true)}
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
          onDownloadKit={() => void kit.downloadAll(filteredKit)}
          onAddKitDeliverable={() => openKitUpload(null)}
          kitBusy={kit.busy}
        />

        {brandIsEmpty ? (
          <div className="fl-blank">
            <div className="fl-blank-glyph" aria-hidden>
              <FolderOpen size={22} strokeWidth={1.5} />
            </div>
            <h2 className="fl-blank-title">{brand.name} has nothing filed yet</h2>
            <p className="fl-blank-copy">
              Add logos, photography, icons and documents once — every editor, template and
              export in BrandingOS reads from here. Folders are shared: one Campaigns folder
              holds its files, its designs and its deliverables.
            </p>
            <div className="fl-blank-actions">
              <DsButton tone="primary" onClick={() => setUploadOpen(true)}>
                <Upload size={14} strokeWidth={1.8} />
                Upload files
              </DsButton>
              <DsButton tone="tertiary" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus size={14} strokeWidth={1.8} />
                New folder
              </DsButton>
            </div>
            <p className="fl-blank-hint">or drop files anywhere on this page</p>
          </div>
        ) : loadingTab ? (
          <div className="fl-grid" aria-busy="true">
            {Array.from({ length: SKELETON_TILES }, (_, i) => (
              <DsSkeleton key={i} height={216} radius={14} />
            ))}
          </div>
        ) : subfolders.length === 0 && itemCount === 0 ? (
          <div className="fl-nomatch">
            <p>{emptyLine(tab, filtering)}</p>
            <div className="fl-blank-actions">
              {filtering && (
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
              )}
              {!filtering && tab === 'library' && (
                <DsButton tone="tertiary" size="sm" onClick={() => setUploadOpen(true)}>
                  Upload files
                </DsButton>
              )}
              {!filtering && tab === 'kit' && (
                <DsButton tone="tertiary" size="sm" onClick={() => openKitUpload(null)}>
                  Add a deliverable
                </DsButton>
              )}
              {!filtering && (
                <DsButton tone="tertiary" size="sm" onClick={() => setNewFolderOpen(true)}>
                  New folder
                </DsButton>
              )}
            </div>
          </div>
        ) : view === 'grid' ? (
          <div className="fl-grid">
            {subfolders.map((f) => (
              <FolderTile key={f.id} {...folderHandlers(f)} />
            ))}
            {tab === 'library' &&
              filteredAssets.map((a) => <AssetTile key={a.id} {...cardHandlers(a)} />)}
            {tab === 'designs' &&
              filteredDesigns.map((d) => (
                <DesignTile
                  key={d.id}
                  design={d}
                  folders={tree.folders}
                  onOpen={() => navigate(`/b/${slug}/design/${d.id}`)}
                  onMoveToFolder={(target) => void designLib.moveToFolder(d.id, target)}
                  onDelete={() => void designLib.remove(d.id)}
                  onDragItemStart={() => setDragged({ kind: 'design', id: d.id })}
                  onDragItemEnd={clearDrag}
                />
              ))}
            {tab === 'kit' &&
              filteredKit.map((entry) => (
                <KitTile
                  key={entry.def.key}
                  brand={brand}
                  entry={entry}
                  folders={tree.folders}
                  onOpen={() => void kit.downloadOne(entry)}
                  onDownload={() => void kit.downloadOne(entry)}
                  onUploadOwn={() => openKitUpload(entry.def.key)}
                  onMoveToFolder={(target) => kit.setFolder(entry.def.key, target)}
                  onRemove={() => kit.removeItem(entry.def.key, entry.item.id)}
                />
              ))}
          </div>
        ) : (
          <div className="fl-list">
            {subfolders.map((f) => (
              <FolderRow key={f.id} {...folderHandlers(f)} />
            ))}
            {tab === 'library' &&
              filteredAssets.map((a) => <AssetRow key={a.id} {...cardHandlers(a)} />)}
            {tab !== 'library' && itemCount > 0 && (
              <div className="fl-list-note">
                {itemCount} {tab === 'kit' ? 'deliverables' : 'designs'} here — switch to grid
                view to see them.
              </div>
            )}
          </div>
        )}

        {fileDragging && (
          <div className="fl-dropveil" aria-hidden>
            <div className="fl-dropveil-card">
              <Upload size={20} strokeWidth={1.6} />
              <span>Drop into {here}</span>
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
            onClick={() => setSelectedIds(new Set(filteredAssets.map((a) => a.id)))}
          >
            Select all ({filteredAssets.length})
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
          total={filteredAssets.length}
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
        onUpload={uploadHere}
        uploading={library.uploading}
        progress={library.progress}
        destination={here}
      />

      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        folders={tree.folders}
        parentId={folderId}
        parentName={here}
        onCreate={async (name) => {
          await tree.create(name, folderId);
        }}
      />

      <AddKitDeliverableModal
        open={kitAddOpen}
        onClose={() => setKitAddOpen(false)}
        slots={kit.slots}
        filledKeys={new Set(kit.entries.map((e) => e.def.key))}
        onUpload={async (key, file) => {
          await kit.uploadInto(key, file);
          // It lands where the user was standing, like an upload does.
          if (folderId) kit.setFolder(key, folderId);
        }}
        busy={kit.busy}
        initialKey={kitAddSlot}
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

      <DsConfirmDialog
        open={pendingFolderDelete !== null}
        title={`Delete "${pendingFolderDelete?.name ?? ''}"?`}
        description="The folder and any folders inside it are removed. Nothing filed in them is deleted — those items become unfiled and stay in the brand."
        confirmLabel="Delete folder"
        onCancel={() => setPendingFolderDelete(null)}
        onConfirm={() => {
          const target = pendingFolderDelete;
          setPendingFolderDelete(null);
          if (!target) return;
          // Standing inside a folder that is about to vanish would leave the
          // page pointing at nothing; step out first.
          if (path.some((f) => f.id === target.id)) navigateFolder(null);
          void tree.remove(target.id).then(() => {
            void library.refresh();
            void designLib.refresh();
          });
        }}
      />
    </WorkspaceShell>
  );
}

function emptyLine(tab: LibraryTab, filtering: boolean): string {
  if (filtering) return 'Nothing here matches this filter.';
  if (tab === 'designs') return 'No designs in this folder yet.';
  if (tab === 'kit') return 'No brand deliverables in this folder yet.';
  return 'This folder is empty.';
}
