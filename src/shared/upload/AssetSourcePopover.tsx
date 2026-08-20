/**
 * AssetSourcePopover — the canonical "pick an image" surface.
 *
 * Anywhere in the app that needs to swap a brand image (logo slots,
 * pattern tiles, mockup overlays, etc.) opens THIS component. It shows
 * two sources side by side:
 *   1. Upload from device — native file picker with a formats hint.
 *   2. BRAND ASSETS (n)   — scrollable grid of the brand's image assets,
 *      filtered to whatever categories the caller cares about.
 *
 * The design is intentionally the same in light and dark mode so it
 * reads consistently wherever it pops up — no more one-off pickers.
 *
 * Usage:
 *   <AssetSourcePopover
 *     trigger={<button>change logo</button>}
 *     categories={['logo','icon']}
 *     onPick={(source) => {
 *       if (source.kind === 'file') await upload(source.file);
 *       if (source.kind === 'asset') setLogoUrl(source.asset.url);
 *     }}
 *   />
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Upload as UploadIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBrandStore } from '@/shared/store/brandStore';
import { useService, SERVICE_KEYS } from '@/core';
import type { IAssetsService } from '@/core/types/services';
import type { Asset } from '@/shared/types/brand';

export type AssetSource =
  | { kind: 'file'; file: File }
  | { kind: 'asset'; asset: Asset };

export interface AssetSourcePopoverProps {
  trigger: React.ReactNode;
  /**
   * Whose library to show. Defaults to the store's `current` brand, which is
   * right inside a brand's own workspace and wrong everywhere a surface lists
   * SEVERAL brands — the dashboard has no current brand, so without this the
   * grid would offer an empty picker on every card.
   */
  brandId?: string;
  /** Controlled open state, for a picker opened from somewhere other than its
   *  own trigger (a menu item, a keyboard shortcut). Omit for self-managed. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Filter the Brand Assets grid to specific categories. */
  categories?: Asset['category'][];
  /** Filter to specific asset types. Defaults to images. */
  types?: Asset['type'][];
  /** Subtitle under "Upload from device". Defaults to common image formats. */
  formatsHint?: string;
  /** Accept attr for the native file input. Defaults to image types. */
  accept?: string;
  /** Multiple files from the desktop. */
  multiple?: boolean;
  /** Called once the user picks a source. */
  onPick: (source: AssetSource) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function AssetSourcePopover({
  trigger,
  categories,
  types = ['image'],
  formatsHint = 'PNG, JPG, SVG, WebP',
  accept = 'image/png,image/jpeg,image/svg+xml,image/webp',
  multiple = false,
  onPick,
  align = 'start',
  side = 'bottom',
  brandId: brandIdProp,
  open: openProp,
  onOpenChange,
}: AssetSourcePopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const currentBrand = useBrandStore((s) => s.current);
  // Read the brand's library from the canonical ASSETS service (same store the
  // DAM writes to: public.assets when authed, localStorage for guests) instead
  // of `brand.assets`, which is dropped for authenticated users.
  const assetsService = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const brandId = brandIdProp ?? currentBrand?.id;

  useEffect(() => {
    if (!open || !brandId) return; // fetch lazily, only when the picker opens
    let cancelled = false;
    assetsService
      .listForBrand(brandId)
      .then((a) => {
        if (!cancelled) setAllAssets(a);
      })
      .catch(() => {
        if (!cancelled) setAllAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, brandId, assetsService]);

  const assets = useMemo<Asset[]>(() => {
    return allAssets.filter((a) => {
      if (categories && !categories.includes(a.category)) return false;
      if (types && !types.includes(a.type)) return false;
      return true;
    });
  }, [allAssets, categories, types]);

  const handleUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => onPick({ kind: 'file', file }));
    setOpen(false);
  };

  const handleAssetClick = (asset: Asset) => {
    onPick({ kind: 'asset', asset });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[320px] p-0 overflow-hidden bg-popover border-border/60"
      >
        {/* Upload from device ---------------------------------------- */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <UploadIcon className="h-4 w-4 text-foreground/80" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Upload from device</div>
            <div className="text-xs text-muted-foreground mt-0.5">{formatsHint}</div>
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => handleUpload(e.target.files)}
          tabIndex={-1}
        />

        <div className="border-t border-border/60" />

        {/* Brand Assets header --------------------------------------- */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
            Brand Assets ({assets.length})
          </span>
        </div>

        {/* Brand Assets grid ----------------------------------------- */}
        <div className="max-h-[280px] overflow-y-auto px-3 pb-3">
          {assets.length === 0 ? (
            <div className="px-1 py-6 text-center text-xs text-muted-foreground/70">
              No image assets in brand library
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleAssetClick(asset)}
                  title={asset.name}
                  className="group relative aspect-square rounded-md bg-muted/40 overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
