/**
 * /b/:slug/tools/typescale and /dashboard/brand/:slug/tools/typescale —
 * in-app route. Auto-saves to the brand via useTypescaleDraft → setTypescale.
 */
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

import { TypescaleEditor, useSeedTypescale } from '@/features/tools/typescale';
import { useBrandStore } from '@/shared/store/brandStore';

export default function InAppTypescalePage() {
  const { slug } = useParams<{ slug: string }>();
  const brand = useBrandStore(s => s.list.find(b => b.slug === slug) ?? (s.current?.slug === slug ? s.current : undefined));
  const loadBySlug = useBrandStore(s => s.loadBySlug);
  const seed = useSeedTypescale(brand ?? null);

  useEffect(() => {
    if (!brand && slug) loadBySlug(slug);
  }, [brand, slug, loadBySlug]);

  if (!brand) return <div className="p-8 text-sm text-muted-foreground">Loading brand…</div>;
  const initial = brand.typescale ?? seed;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-semibold">Typescale — {brand.name}</h1>
        <TypescaleEditor variant="full" brandId={brand.id} initial={initial} showBrandSync />
      </div>
    </div>
  );
}
