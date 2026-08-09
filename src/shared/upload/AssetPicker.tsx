/**
 * AssetPicker — reusable asset library modal.
 *
 * Reads/writes the brand library through the canonical ASSETS service
 * (SupabaseAssetsService → public.assets when authed; LocalAssetsService for
 * guests) — the SAME store the DAM (`DamPage`) and `AssetSourcePopover` use — so
 * every editor picker shares one asset-library authority (previously this read
 * the legacy `brand.assets` array, which is dropped for authenticated users).
 *
 * Used by: ImageInspector ("replace image"), InsertMenu ("Insert from brand
 * assets"), AssetManagerModule (manage mode). Uploads go to the storage bucket
 * (not dataURL-in-JSONB).
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, X, Upload as UploadIcon, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useBrandStore } from '@/shared/store/brandStore';
import { useService, SERVICE_KEYS } from '@/core';
import type { IAssetsService } from '@/core/types/services';
import { storageService } from '@/shared/services/storage.supabase';
import type { Asset } from '@/shared/types/brand';

function detectType(file: File): Asset['type'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'document';
  return 'image';
}

export interface AssetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (asset: Asset) => void;
  mode?: 'select' | 'manage';
  /** Filter to specific asset categories. */
  categories?: Asset['category'][];
  /** Filter to specific asset types. */
  types?: Asset['type'][];
  title?: string;
}

export function AssetPicker({
  open,
  onClose,
  onSelect,
  mode = 'select',
  categories,
  types,
  title = 'Brand Assets',
}: AssetPickerProps) {
  const currentBrand = useBrandStore((s) => s.current);
  const assetsService = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const brandId = currentBrand?.id;
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!brandId) return;
    try {
      setAllAssets(await assetsService.listForBrand(brandId));
    } catch {
      setAllAssets([]);
    }
  }, [brandId, assetsService]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter((a) => {
      if (categories && !categories.includes(a.category)) return false;
      if (types && !types.includes(a.type)) return false;
      if (activeCategory !== 'all' && a.category !== activeCategory) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [allAssets, search, activeCategory, categories, types]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allAssets.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, [allAssets]);

  const handleDelete = async (assetId: string) => {
    await assetsService.delete(assetId);
    setAllAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const handleUpload = async (files: File[]) => {
    if (!brandId || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        let url: string;
        let storagePath: string | undefined;
        try {
          const path = `${crypto.randomUUID()}-${file.name}`;
          url = (await storageService.uploadAsset(brandId, file, path)).url;
          storagePath = path;
        } catch {
          url = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
        }
        await assetsService.create({
          brandId,
          name: file.name,
          type: detectType(file),
          category: (categories && categories[0]) || 'reference',
          source: 'upload',
          url,
          storagePath,
          size: file.size,
          tags: [],
          metadata: { originalName: file.name, format: file.type },
        });
      }
      await refresh();
      toast.success(`Uploaded ${files.length} asset${files.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
    }
  };

  const handleClick = (asset: Asset) => {
    if (mode === 'select' && onSelect) {
      onSelect(asset);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-3 py-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void handleUpload(files);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
          >
            <UploadIcon className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        {/* Category tabs */}
        {availableCategories.length > 0 && (
          <div className="flex items-center gap-2 py-2 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All ({allAssets.length})
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap capitalize ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto py-3">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {allAssets.length === 0 ? 'No assets yet — upload something to get started.' : 'No assets match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleClick(asset)}
                  className={`group relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-primary hover:shadow-md transition-all ${mode === 'select' ? 'cursor-pointer' : ''}`}
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] p-1.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {asset.name}
                  </div>
                  {mode === 'manage' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                      className="absolute top-1 right-1 p-1 rounded bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                      aria-label="Delete asset"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
