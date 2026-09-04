/**
 * Brand Identity at /b/:slug/identity — the owner's view.
 *
 * Loads the brand and its Library, then hands both to the one page component.
 * The Library is fetched HERE rather than inside the page because the page is
 * also mounted publicly, where the material arrives from a published snapshot
 * instead of a live query — keeping the fetch at the route means the page never
 * has to know which world it is in.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { useService } from '@/core';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';
import { BrandIdentityPage } from '@/features/brand-identity/BrandIdentityPage';
import { loadIdentityMaterial, type IdentityMaterial } from '@/features/brand-identity/identityMaterial';
import { IdentityShareAction } from '@/features/brand-identity/publish/IdentityShareAction';

export default function BrandIdentityRoute() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);
  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const [material, setMaterial] = useState<IdentityMaterial>({ images: [], assetGroups: [] });

  useEffect(() => {
    if (!brand?.id) return;
    let alive = true;
    void loadIdentityMaterial(assets, brand.id).then((m) => {
      if (alive) setMaterial(m);
    });
    return () => {
      alive = false;
    };
  }, [assets, brand?.id]);

  if (!brand) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <BrandIdentityPage
      key={brand.id}
      brand={brand}
      images={material.images}
      assetGroups={material.assetGroups}
      mode="studio"
      actions={<IdentityShareAction />}
    />
  );
}
