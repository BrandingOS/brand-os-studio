/**
 * AssetPicker — the canonical "give me an image" UI.
 *
 * SINGLE SOURCE OF TRUTH for any control that needs the user to choose
 * an image. Two paths in one popover:
 *
 *   1. Upload from device — opens a file picker
 *   2. Pick from brand assets — grid of existing brand assets
 *
 * Use this everywhere you previously had an `<input type="file" />` for
 * an image — logo slots, editor insert image, background images, profile
 * pictures, etc. Don't roll your own popover. Don't roll your own grid.
 * If something is missing here, ADD it (a new prop or a variant) — don't
 * fork.
 *
 * Usage:
 * ```tsx
 * <AssetPicker
 *   brand={brand}
 *   accept="image/*"
 *   filter={(a) => a.type === 'logo' || a.type === 'image'}
 *   onUpload={async (file) => { ... }}
 *   onPick={(asset) => { ... }}
 *   trigger={
 *     <button className="...slot styles...">Upload logo</button>
 *   }
 * />
 * ```
 *
 * The trigger prop receives whatever clickable element you want — a
 * button, a dashed empty slot, an icon — and the popover opens beside it.
 */
import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Upload, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset, Brand } from '@/shared/types/brand';

export interface AssetPickerProps {
  /**
   * The brand whose assets to show in the "pick from brand" section.
   * If absent, only the upload-from-device option appears.
   */
  brand?: Pick<Brand, 'name' | 'assets'>;
  /** File input accept attribute. Defaults to all images. */
  accept?: string;
  /**
   * Optional filter applied to the brand assets list — useful when the
   * caller only wants logos, only icons, etc.
   */
  filter?: (asset: Asset) => boolean;
  /** Called when the user uploads a file from device. */
  onUpload: (file: File) => void | Promise<void>;
  /** Called when the user picks an existing brand asset. */
  onPick: (asset: Asset) => void | Promise<void>;
  /**
   * The clickable element that opens the picker popover. Render whatever
   * trigger you want — a button, a slot, an icon — and the popover opens
   * beside it. Trigger is `asChild`'d so its top-level node should accept
   * a ref (most native elements and shadcn Buttons do).
   */
  trigger: React.ReactNode;
  /** Popover side. Defaults to 'bottom'. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Popover alignment along the trigger. Defaults to 'start'. */
  align?: 'start' | 'center' | 'end';
  /** Optional accept-list copy shown under "Upload from device". */
  acceptLabel?: string;
  /** Width of the popover content in px. Defaults to 320. */
  width?: number;
}

export function AssetPicker({
  brand,
  accept = 'image/*',
  filter,
  onUpload,
  onPick,
  trigger,
  side = 'bottom',
  align = 'start',
  acceptLabel = 'PNG, JPG, SVG, WebP',
  width = 320,
}: AssetPickerProps) {
  const [open, setOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Only show assets that will actually render as a real image:
  // they must (a) have a URL, (b) be one of the image-shaped types.
  // Documents and URL-less placeholders are dropped here so the picker
  // never shows the FileText or broken-image fallback. The caller's
  // filter (if any) is applied AFTER this baseline.
  const assets = React.useMemo(() => {
    const all = brand?.assets ?? [];
    const renderable = all.filter(
      (a) => Boolean(a.url) && ['image', 'logo', 'icon'].includes(a.type),
    );
    return filter ? renderable.filter(filter) : renderable;
  }, [brand?.assets, filter]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpen(false);
    try {
      await onUpload(file);
    } finally {
      // Always clear so re-selecting the same file fires onChange.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePickAsset = async (asset: Asset) => {
    setOpen(false);
    await onPick(asset);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="p-0 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        style={{ width }}
      >
        {/* ── Upload from device row ───────────────────────────────── */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition hover:bg-muted/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Upload className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              Upload from device
            </div>
            <div className="text-[11px] text-muted-foreground">{acceptLabel}</div>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── Brand assets section ────────────────────────────────── */}
        <div className="p-3">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <FolderOpen className="h-3 w-3" />
            <span>
              {brand?.name ? `${brand.name} assets` : 'Brand assets'} (
              {assets.length})
            </span>
          </div>

          {assets.length === 0 ? (
            <p className="px-1 py-3 text-center text-[11px] italic text-muted-foreground">
              No assets in this brand yet.
              <br />
              Upload one above to get started.
            </p>
          ) : (
            <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto">
              {assets.map((a) => (
                <PickerThumb
                  key={a.id}
                  asset={a}
                  onClick={() => handlePickAsset(a)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Picker thumbnail. By the time this renders, the parent has already
 * filtered to displayable images (URL present, type ∈ image|logo|icon),
 * so we can render the <img> unconditionally and not worry about
 * fallbacks. The bed is intentionally a darker neutral so transparent
 * and white logos are visible — light bed + white logo = invisible.
 */
function PickerThumb({
  asset,
  onClick,
}: {
  asset: Asset;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={asset.name}
      className={cn(
        'group flex aspect-square items-center justify-center overflow-hidden rounded-lg',
        'border border-border bg-neutral-100 p-2 transition hover:border-primary hover:shadow-sm dark:bg-neutral-200',
      )}
    >
      <img
        src={asset.url}
        alt={asset.name}
        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.05]"
      />
    </button>
  );
}
