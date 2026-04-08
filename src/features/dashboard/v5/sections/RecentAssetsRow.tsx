import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, FileText } from 'lucide-react';
import type { Brand, Asset } from '@/shared/types/brand';

interface RecentAssetsRowProps {
  brands: Brand[];
}

interface FlatAsset {
  asset: Asset;
  brand: Brand;
}

export function RecentAssetsRow({ brands }: RecentAssetsRowProps) {
  const navigate = useNavigate();
  const recent = React.useMemo<FlatAsset[]>(() => {
    const all: FlatAsset[] = [];
    for (const b of brands) {
      for (const a of b.assets ?? []) {
        all.push({ asset: a, brand: b });
      }
    }
    all.sort((a, b) => {
      const ta = a.asset.createdAt ? new Date(a.asset.createdAt as unknown as string).getTime() : 0;
      const tb = b.asset.createdAt ? new Date(b.asset.createdAt as unknown as string).getTime() : 0;
      return tb - ta;
    });
    return all.slice(0, 8);
  }, [brands]);

  if (recent.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">Recent assets</h2>
          <p className="text-sm text-muted-foreground">Across all your brands</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {recent.map(({ asset, brand }) => {
          const isImage = asset.type === 'image' || asset.type === 'logo' || asset.type === 'icon';
          return (
            <button
              type="button"
              key={asset.id}
              onClick={() => navigate(`/b/${brand.slug}/assets`)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40"
              title={`${asset.name} · ${brand.name}`}
            >
              {isImage && asset.url ? (
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted/30">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent p-2">
                <div className="truncate text-[10px] font-medium text-foreground">{asset.name}</div>
                <div className="truncate text-[9px] text-muted-foreground">{brand.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
