/**
 * AssetCard / AssetThumb — the canonical asset thumbnail components.
 *
 * SINGLE SOURCE OF TRUTH for rendering an asset (logo, photo, icon,
 * document) anywhere in BrandOS. Use these in ANY surface that shows brand
 * assets. Do NOT roll your own card with `<button class="aspect-square ...">
 * <img class="object-cover" .../></button>` — that pattern has been written
 * three different ways in three different files and broken three different
 * times. Use this.
 *
 * Components:
 *
 * - `<AssetCard />` — the standard square card. Thumbnail well on top with
 *   `object-contain` (so logos fit, never crop), title + subtitle row below
 *   in its own padded section. Used by:
 *     - the Folders page asset grid (src/features/dam/components/AssetGrid)
 *     - the dashboard "Recent assets" row
 *     - any future surface that wants a clickable asset thumbnail
 *
 * - `<AssetThumb />` — the small inline thumbnail (e.g. left side of a
 *   list-view row). 40×40, rounded, padded, contained.
 *
 * Don't pass class overrides for sizing — the variants (`size`) cover the
 * cases that exist. If you need a new size, ADD it here, don't fork.
 */
import * as React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/shared/types/brand';

/**
 * Heuristic: which asset types should render as an image element vs the
 * generic file icon. Single place so the rule doesn't drift.
 */
function isImageAsset(asset: Pick<Asset, 'type' | 'url'>): boolean {
  return Boolean(asset.url) && ['image', 'logo', 'icon'].includes(asset.type);
}

/* ─────────────────────────────────────────────────────────────────────── */
/* AssetThumb — small inline thumbnail (40×40 by default)                  */
/* ─────────────────────────────────────────────────────────────────────── */

interface AssetThumbProps {
  asset: Pick<Asset, 'type' | 'url' | 'name'>;
  className?: string;
}

export function AssetThumb({ asset, className }: AssetThumbProps) {
  if (isImageAsset(asset)) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        className={cn(
          'h-10 w-10 shrink-0 rounded-md bg-muted/30 object-contain p-1',
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/30',
        className,
      )}
    >
      <FileText className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* AssetCard — square card with thumbnail well + label row                 */
/* ─────────────────────────────────────────────────────────────────────── */

export interface AssetCardProps {
  /** The asset (or asset-shaped object) to render. */
  asset: Pick<Asset, 'type' | 'url' | 'name'>;
  /**
   * The line under the title — usually the category (in the Folders grid)
   * or the brand name (in the dashboard "Recent assets" row). Pass an
   * empty string to suppress the line entirely.
   */
  subtitle?: string;
  /** Click handler — usually opens a lightbox or navigates to the asset. */
  onClick?: () => void;
  /** Optional native title (tooltip) — handy when names get truncated. */
  title?: string;
  className?: string;
}

export function AssetCard({
  asset,
  subtitle,
  onClick,
  title,
  className,
}: AssetCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? asset.name}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)]',
        className,
      )}
    >
      {/* Thumbnail well — square, padded, contained.
          The absolute-fill <img> guarantees the box constraint wins
          regardless of the source's intrinsic size. */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
        {isImageAsset(asset) ? (
          <img
            src={asset.url}
            alt={asset.name}
            className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {asset.type === 'document' ? (
              <FileText className="h-8 w-8 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Label row — lives BELOW the thumbnail, never overlapping. */}
      <div className="border-t border-border/60 px-3 py-2.5">
        <div className="truncate text-[12px] font-semibold text-foreground">
          {asset.name}
        </div>
        {subtitle !== '' && (
          <div className="truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {subtitle ?? ''}
          </div>
        )}
      </div>
    </button>
  );
}
