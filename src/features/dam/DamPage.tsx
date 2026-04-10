/**
 * Folders — per-brand asset library.
 *
 * Mounted at /dashboard/brand/:slug/folders (and the short-form
 * /b/:slug/folders). The legacy /dam path resolves to the same page via
 * a redirect for bookmark compatibility — internally everything points at
 * /folders. The component file keeps its DamPage name to avoid a noisy
 * rename, but the user-facing URL and nav label are both "Folders" now.
 *
 * v5 PRD Phase 3. Frontify DAM-style: drag-drop upload, categories, tags,
 * filters, grid + lightbox. Works against Brand.assets via useBrandStore;
 * no separate backend yet (file storage is a follow-up sprint).
 */
import * as React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AssetUploadZone } from './components/AssetUploadZone';
import { AssetFiltersBar } from './components/AssetFiltersBar';
import { AssetGrid } from './components/AssetGrid';
import { AssetLightbox } from './components/AssetLightbox';
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
} from 'lucide-react';

const ASSET_CATEGORIES = ['all', 'logo', 'photo', 'icon', 'social', 'mockup', 'reference'] as const;
type AssetCategory = (typeof ASSET_CATEGORIES)[number];

function isAssetCategory(value: string | null): value is AssetCategory {
  return value !== null && (ASSET_CATEGORIES as readonly string[]).includes(value);
}

export default function DamPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug, update } = useBrandStore();
  const [searchParams, setSearchParams] = useSearchParams();
  // Category is driven by the URL so the inner nav's href filter items can
  // highlight the active one and the user can deep-link / bookmark a view.
  const categoryParam = searchParams.get('category');
  const category: AssetCategory = isAssetCategory(categoryParam) ? categoryParam : 'all';
  const setCategory = (next: AssetCategory) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('category');
    else params.set('category', next);
    setSearchParams(params, { replace: true });
  };

  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [activeAsset, setActiveAsset] = React.useState<Asset | null>(null);

  useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  // Build the inner-nav config — href filter items mirroring asset categories.
  const innerNav = React.useMemo<InnerNavConfig | undefined>(
    () =>
      slug
        ? {
            title: 'Folders',
            icon: FolderOpen,
            storageKey: 'brandos:folders-nav-open',
            groups: [
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

  const handleUpload = async (files: File[]) => {
    if (!current) return;
    const newAssets: Asset[] = [];
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      newAssets.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        category: 'photo',
        source: 'upload',
        url: dataUrl,
        size: file.size,
        tags: [],
        metadata: { originalName: file.name, format: file.type },
        createdAt: new Date(),
      });
    }
    await update(current.id, { assets: [...assets, ...newAssets] });
    toast.success(`Uploaded ${newAssets.length} asset${newAssets.length === 1 ? '' : 's'}`);
  };

  const handleDelete = async (assetId: string) => {
    if (!current) return;
    const next = assets.filter((a) => a.id !== assetId);
    await update(current.id, { assets: next });
    toast.success('Asset deleted');
    setActiveAsset(null);
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

  if (!current) {
    return <div className="p-8">Loading brand…</div>;
  }

  return (
    <>
      <PageHeader
        compact
        title="Folders"
        subtitle={`${current.name}'s asset library — logos, photos, icons, mockups, and references.`}
      />

      <div className="space-y-6">
        <AssetUploadZone onUpload={handleUpload} />

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

        <AssetGrid
          assets={filtered}
          view={view}
          onOpen={setActiveAsset}
        />

        {activeAsset && (
          <AssetLightbox
            asset={activeAsset}
            onClose={() => setActiveAsset(null)}
            onDelete={() => handleDelete(activeAsset.id)}
            onRename={(name) => handleRename(activeAsset.id, name)}
            onAddTag={(tag) => handleAddTag(activeAsset.id, tag)}
          />
        )}
      </div>
    </>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
