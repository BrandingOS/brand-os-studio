/**
 * RecentAssetsRow — dashboard "Recent assets across all your brands" row.
 *
 * Renders the canonical AssetCard from `@/shared/ui/AssetCard`. Do NOT
 * reimplement the asset card chrome here — the Folders page uses the same
 * component, so any visual change to asset cards belongs in AssetCard.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Brand, Asset } from '@/shared/types/brand';
import { AssetCard } from '@/shared/ui/AssetCard';

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
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">
            Recent assets
          </h2>
          <p className="text-sm text-muted-foreground">Across all your brands</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {recent.map(({ asset, brand }) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            // Subtitle is the BRAND name here (vs the category in Folders)
            // so users can tell which brand each asset belongs to.
            subtitle={brand.name}
            title={`${asset.name} · ${brand.name}`}
            onClick={() => navigate(`/dashboard/brand/${brand.slug}/folders`)}
          />
        ))}
      </div>
    </section>
  );
}
