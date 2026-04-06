/**
 * AssetPicker — reusable asset library modal.
 *
 * Reads `currentBrand.assets` and renders a searchable, filterable grid.
 * Used by:
 *   - ImageInspector ("replace image" → opens picker)
 *   - InsertMenu ("Insert from brand assets")
 *   - AssetManagerModule (manage mode wraps this with full CRUD)
 *
 * Modes:
 *   - 'select' (default): single click → onSelect(asset) → close
 *   - 'manage': adds delete buttons, no auto-close on click
 */

import { useState, useMemo } from 'react';
import { Search, X, Upload as UploadIcon, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBrandStore } from '@/shared/store/brandStore';
import { UploadButton } from './UploadButton';
import type { Asset } from '@/shared/types/brand';

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
  const updateBrand = useBrandStore((s) => s.update);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const allAssets = currentBrand?.assets ?? [];

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
    if (!currentBrand) return;
    const next = (currentBrand.assets ?? []).filter((a) => a.id !== assetId);
    await updateBrand(currentBrand.id, { assets: next });
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
          <UploadButton
            kind="asset"
            persistAsAsset
            multiple
            label="Upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            <UploadIcon className="h-4 w-4" /> Upload
          </UploadButton>
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
