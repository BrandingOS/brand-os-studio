/**
 * Folders — per-brand asset library.
 *
 * Mounted at /b/:slug/folders. Supports drag-drop upload (with Supabase
 * storage fallback to data URLs), smart category detection, bulk
 * operations, and activity logging.
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
import { storageService } from '@/shared/services/storage.supabase';
import { activityService } from '@/shared/services/activityService';
import { detectAssetType, detectCategory } from './utils';
import type { Asset } from '@/shared/types/brand';
import { toast } from 'sonner';
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

function getImageDimensions(url: string): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    if (url.startsWith('data:') && !url.startsWith('data:image')) {
      resolve(undefined);
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(undefined);
    img.src = url;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function isSupabaseUrl(url: string): boolean {
  return url.includes('supabase') && !url.startsWith('data:');
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
  const { current, loadBySlug, update } = useBrandStore();
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
  const [uploading, setUploading] = React.useState(false);

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

  const assets = current?.assets ?? [];

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

  // Upload with Supabase storage (fallback to data URL)
  const handleUpload = async (files: File[]) => {
    if (!current) return;
    setUploading(true);
    const newAssets: Asset[] = [];

    for (const file of files) {
      let url: string;
      try {
        const result = await storageService.uploadAsset(
          current.id, file, `${crypto.randomUUID()}-${file.name}`,
        );
        url = result.url;
      } catch {
        url = await fileToDataUrl(file);
      }

      const dimensions = file.type.startsWith('image/') ? await getImageDimensions(url) : undefined;

      newAssets.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: detectAssetType(file),
        category: detectCategory(file.name, file.type),
        source: 'upload',
        url,
        size: file.size,
        tags: [],
        metadata: { originalName: file.name, format: file.type, dimensions },
        createdAt: new Date(),
      });
    }

    await update(current.id, { assets: [...assets, ...newAssets] });
    setUploading(false);
    toast.success(`Uploaded ${newAssets.length} asset${newAssets.length === 1 ? '' : 's'}`);

    activityService.log({
      brandId: current.id,
      brandName: current.name,
      eventType: 'asset_uploaded',
      title: `Uploaded ${newAssets.length} asset${newAssets.length === 1 ? '' : 's'}`,
      description: newAssets.map((a) => a.name).join(', '),
    });
  };

  const handleDelete = async (assetId: string) => {
    if (!current) return;
    const asset = assets.find((a) => a.id === assetId);
    const next = assets.filter((a) => a.id !== assetId);
    await update(current.id, { assets: next });

    // Clean up Supabase storage if applicable
    if (asset?.url && isSupabaseUrl(asset.url)) {
      try {
        const pathMatch = asset.url.match(/brand-assets\/(.+)$/);
        if (pathMatch) await storageService.deleteFile(pathMatch[1]);
      } catch { /* best effort */ }
    }

    toast.success('Asset deleted');
    setActiveAsset(null);

    activityService.log({
      brandId: current.id,
      brandName: current.name,
      eventType: 'asset_exported',
      title: `Deleted asset: ${asset?.name || 'Unknown'}`,
    });
  };

  const handleRename = async (assetId: string, name: string) => {
    if (!current) return;
    const next = assets.map((a) => (a.id === assetId ? { ...a, name } : a));
    await update(current.id, { assets: next });
  };

  const handleAddTag = async (assetId: string, tag: string) => {
    if (!current || !tag.trim()) return;
    const next = assets.map((a) =>
      a.id === assetId ? { ...a, tags: Array.from(new Set([...(a.tags ?? []), tag.trim()])) } : a,
    );
    await update(current.id, { assets: next });
  };

  const handleRemoveTag = async (assetId: string, tag: string) => {
    if (!current) return;
    const next = assets.map((a) =>
      a.id === assetId ? { ...a, tags: (a.tags ?? []).filter((t) => t !== tag) } : a,
    );
    await update(current.id, { assets: next });
  };

  const handleCategoryChange = async (assetId: string, newCategory: string) => {
    if (!current) return;
    const next = assets.map((a) =>
      a.id === assetId ? { ...a, category: newCategory as Asset['category'] } : a,
    );
    await update(current.id, { assets: next });
    // Update the active asset if it's the one being changed
    if (activeAsset?.id === assetId) {
      setActiveAsset({ ...activeAsset, category: newCategory as Asset['category'] });
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
    if (!current || selectedIds.size === 0) return;
    const count = selectedIds.size;
    const next = assets.filter((a) => !selectedIds.has(a.id));
    await update(current.id, { assets: next });
    setSelectedIds(new Set());
    setSelectionMode(false);
    toast.success(`Deleted ${count} asset${count === 1 ? '' : 's'}`);

    activityService.log({
      brandId: current.id,
      brandName: current.name,
      eventType: 'asset_exported',
      title: `Bulk deleted ${count} asset${count === 1 ? '' : 's'}`,
    });
  };

  const handleBulkDownload = () => {
    // Download each selected asset individually (ZIP requires jszip import which is heavy)
    const selected = assets.filter((a) => selectedIds.has(a.id));
    for (const asset of selected) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = asset.name;
      link.click();
    }
    toast.success(`Downloading ${selected.length} asset${selected.length === 1 ? '' : 's'}`);
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
