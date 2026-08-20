/**
 * Folders — per-brand asset library (Classic, /a/:slug/folders).
 *
 * Presentation only. Every write — upload, delete, rename, tags, category,
 * the legacy `brand.assets` migration — lives in `useAssetLibrary`, which
 * the Studio surface (`features/folders/`) shares. Bug fixes to the data
 * path belong there, not here.
 */
import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetUploadZone } from './components/AssetUploadZone';
import { AssetFiltersBar } from './components/AssetFiltersBar';
import { AssetGrid } from './components/AssetGrid';
import { AssetLightbox } from './components/AssetLightbox';
import { useAssetLibrary } from './useAssetLibrary';
import type { Asset } from '@/shared/types/brand';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import {
  FolderOpen,
  LayoutGrid,
  Image as ImageIcon,
  Camera,
  Smile,
  Share2,
  Box,
  Bookmark,
  CheckSquare,
  Trash2,
  Download,
  X,
  PenTool,
  Sparkles,
} from 'lucide-react';

const ASSET_CATEGORIES = ['all', 'logo', 'photo', 'icon', 'social', 'mockup', 'reference'] as const;
type AssetCategory = (typeof ASSET_CATEGORIES)[number];

function isAssetCategory(value: string | null): value is AssetCategory {
  return value !== null && (ASSET_CATEGORIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type FolderTab = 'assets' | 'designs';
const FOLDER_TABS: FolderTab[] = ['assets', 'designs'];

function isFolderTab(v: string | null): v is FolderTab {
  return v !== null && (FOLDER_TABS as string[]).includes(v);
}

export default function DamPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { current, loadBySlug } = useBrandStore();
  const library = useAssetLibrary(current);
  const assets = library.assets;
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const category: AssetCategory = isAssetCategory(categoryParam) ? categoryParam : 'all';
  const setCategory = (next: AssetCategory) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('category');
    else params.set('category', next);
    setSearchParams(params, { replace: true });
  };

  const tabParam = searchParams.get('tab');
  const activeTab: FolderTab = isFolderTab(tabParam) ? tabParam : 'assets';
  const setTab = (next: FolderTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'assets') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [activeAsset, setActiveAsset] = React.useState<Asset | null>(null);
  const uploading = library.uploading;

  // Bulk selection
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  const innerNav = React.useMemo<InnerNavConfig | undefined>(
    () =>
      slug
        ? {
            title: 'Folders',
            icon: FolderOpen,
            storageKey: 'brandos:folders-nav-open',
            groups: [
              {
                id: 'tabs',
                label: 'View',
                items: [
                  { id: 'assets',  label: 'Assets',  icon: FolderOpen, href: `/b/${slug}/folders` },
                  { id: 'designs', label: 'Designs', icon: PenTool,    href: `/b/${slug}/folders?tab=designs` },
                ],
              },
              {
                id: 'filters',
                label: 'Categories',
                items: [
                  { id: 'all',       label: 'All assets', icon: LayoutGrid, href: `/b/${slug}/folders` },
                  { id: 'logo',      label: 'Logos',      icon: ImageIcon,  href: `/b/${slug}/folders?category=logo` },
                  { id: 'photo',     label: 'Photos',     icon: Camera,     href: `/b/${slug}/folders?category=photo` },
                  { id: 'icon',      label: 'Icons',      icon: Smile,      href: `/b/${slug}/folders?category=icon` },
                  { id: 'social',    label: 'Social',     icon: Share2,     href: `/b/${slug}/folders?category=social` },
                  { id: 'mockup',    label: 'Mockups',    icon: Box,        href: `/b/${slug}/folders?category=mockup` },
                  { id: 'reference', label: 'References', icon: Bookmark,   href: `/b/${slug}/folders?category=reference` },
                ],
              },
            ],
          }
        : undefined,
    [slug],
  );

  useBrandPageConfig({ brandName: current?.name, maxWidth: '7xl', innerNav });

  const filtered = React.useMemo(() => {
    let arr = assets;
    if (category !== 'all') {
      arr = arr.filter((a) => a.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return [...arr].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0;
      return tb - ta;
    });
  }, [assets, category, search]);

  const handleUpload = (files: File[]) => library.upload(files);

  const handleDelete = async (assetId: string) => {
    await library.remove(assetId);
    setActiveAsset(null);
  };

  const handleRename = (assetId: string, name: string) => library.rename(assetId, name);
  const handleAddTag = (assetId: string, tag: string) => library.addTag(assetId, tag);
  const handleRemoveTag = (assetId: string, tag: string) => library.removeTag(assetId, tag);

  const handleCategoryChange = async (assetId: string, newCategory: string) => {
    const category = newCategory as Asset['category'];
    await library.setCategory(assetId, category);
    if (activeAsset?.id === assetId) {
      setActiveAsset({ ...activeAsset, category });
    }
  };

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await library.removeMany(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkDownload = () => {
    library.downloadMany(assets.filter((a) => selectedIds.has(a.id)));
  };

  if (!current) {
    return <div className="p-8">Loading brand…</div>;
  }

  return (
    <>
      <PageHeader
        compact
        title="Folders"
        subtitle={`${assets.length} asset${assets.length !== 1 ? 's' : ''} in ${current.name}'s library`}
        actions={
          activeTab === 'assets' ? (
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) deselectAll();
              }}
              className="gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectionMode ? 'Done' : 'Select'}
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => isFolderTab(v) && setTab(v)} className="w-full mb-6">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="assets" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            <span>Assets</span>
          </TabsTrigger>
          <TabsTrigger value="designs" className="gap-2">
            <PenTool className="w-4 h-4" />
            <span>Designs</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'designs' && (
        <Card className="p-10 text-center bg-muted/20">
          <PenTool className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium mb-1">No saved designs yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Canvas designs you create will be listed here once saving is wired up.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/b/${slug}/design`)}>
              Start a design
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/b/${slug}/templates`)} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Browse templates
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'assets' && (
      <div className="space-y-6">
        <AssetUploadZone onUpload={handleUpload} uploading={uploading} />

        <AssetFiltersBar
          categories={[...ASSET_CATEGORIES]}
          activeCategory={category}
          onCategoryChange={(c) => isAssetCategory(c) && setCategory(c)}
          search={search}
          onSearchChange={setSearch}
          view={view}
          onViewChange={setView}
          totalCount={assets.length}
          filteredCount={filtered.length}
        />

        {/* Bulk action bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
              Select All ({filtered.length})
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs">
              Deselect
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDownload} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}

        <AssetGrid
          assets={filtered}
          view={view}
          onOpen={setActiveAsset}
          selectedIds={selectionMode ? selectedIds : undefined}
          onToggleSelect={selectionMode ? toggleSelect : undefined}
          selectionMode={selectionMode}
        />

        {activeAsset && (
          <AssetLightbox
            asset={activeAsset}
            onClose={() => setActiveAsset(null)}
            onDelete={() => handleDelete(activeAsset.id)}
            onRename={(name) => handleRename(activeAsset.id, name)}
            onAddTag={(tag) => handleAddTag(activeAsset.id, tag)}
            onRemoveTag={(tag) => handleRemoveTag(activeAsset.id, tag)}
            onCategoryChange={(cat) => handleCategoryChange(activeAsset.id, cat)}
          />
        )}
      </div>
      )}
    </>
  );
}
