import * as React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import type { Asset } from '@/shared/types/brand';
import { cn } from '@/lib/utils';

interface AssetGridProps {
  assets: Asset[];
  view: 'grid' | 'list';
  onOpen: (asset: Asset) => void;
}

export function AssetGrid({ assets, view, onOpen }: AssetGridProps) {
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

  if (view === 'list') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {assets.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpen(a)}
            className={cn(
              'flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-muted/30',
              i !== assets.length - 1 && 'border-b border-border',
            )}
          >
            <AssetThumb asset={a} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{a.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {a.type} · {a.category} · {formatBytes(a.size)}
              </div>
            </div>
            <div className="hidden gap-1 sm:flex">
              {(a.tags ?? []).slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {assets.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpen(a)}
          className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)]"
        >
          <div className="aspect-square">
            <AssetThumb asset={a} size="lg" />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent p-2.5">
            <div className="truncate text-[11px] font-semibold text-foreground">{a.name}</div>
            <div className="truncate text-[10px] text-muted-foreground">{a.category}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function AssetThumb({ asset, size }: { asset: Asset; size: 'sm' | 'lg' }) {
  const isImage = ['image', 'logo', 'icon'].includes(asset.type) && asset.url;
  if (isImage) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        className={cn(
          'h-full w-full object-cover transition group-hover:scale-105',
          size === 'sm' && 'h-10 w-10 rounded-md',
        )}
      />
    );
  }
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-muted/30', size === 'sm' && 'h-10 w-10 rounded-md')}>
      <FileText className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
