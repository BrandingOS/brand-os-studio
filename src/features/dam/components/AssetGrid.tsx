/**
 * AssetGrid — the Folders page asset list, in two views.
 *
 * Both grid and list view render the canonical AssetCard / AssetThumb from
 * `@/shared/ui/AssetCard`. This file does NOT reimplement the card chrome —
 * if you need to change how assets look, change AssetCard.
 */
import * as React from 'react';
import { Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import type { Asset } from '@/shared/types/brand';
import { cn } from '@/lib/utils';
import { AssetCard, AssetThumb } from '@/shared/ui/AssetCard';

interface AssetGridProps {
  assets: Asset[];
  view: 'grid' | 'list';
  onOpen: (asset: Asset) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

export function AssetGrid({ assets, view, onOpen, selectedIds, onToggleSelect, selectionMode }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-semibold text-foreground">No assets here yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Drag a file into the upload zone above to start your library.
        </p>
      </div>
    );
  }

  const handleClick = (asset: Asset, e: React.MouseEvent) => {
    if (selectionMode && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(asset.id);
    } else {
      onOpen(asset);
    }
  };

  if (view === 'list') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {assets.map((a, i) => {
          const isSelected = selectedIds?.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={(e) => handleClick(a, e)}
              className={cn(
                'flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-muted/30',
                i !== assets.length - 1 && 'border-b border-border',
                isSelected && 'bg-primary/5',
              )}
            >
              {selectionMode && (
                <div className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                )}>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
              )}
              <AssetThumb asset={a} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{a.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {a.type} · {a.category} · {formatBytes(a.size)}
                </div>
              </div>
              <div className="hidden gap-1 sm:flex">
                {(a.tags ?? []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {assets.map((a) => {
        const isSelected = selectedIds?.has(a.id);
        return (
          <div key={a.id} className="relative">
            {selectionMode && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(a.id); }}
                className={cn(
                  'absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/70 bg-black/20 backdrop-blur',
                )}
              >
                {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            )}
            <AssetCard
              asset={a}
              subtitle={a.category}
              onClick={() => selectionMode ? onToggleSelect?.(a.id) : onOpen(a)}
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          </div>
        );
      })}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
