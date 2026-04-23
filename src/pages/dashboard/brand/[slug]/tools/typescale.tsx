/**
 * /b/:slug/tools/typescale and /dashboard/brand/:slug/tools/typescale —
 * in-app route. Auto-saves to the brand via useTypescaleDraft → setTypescale.
 *
 * Wrapped in <CosmosWorkspaceShell> so it shares the same top nav and
 * theme toggle as the rest of the /b/:slug/* routes. The editor itself
 * renders the cosmos `.shell` grid directly.
 */
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
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

  if (!brand) {
    return (
      <CosmosWorkspaceShell>
        <div style={{ padding: '32px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
          Loading brand…
        </div>
      </CosmosWorkspaceShell>
    );
  }
  const initial = brand.typescale ?? seed;

  return (
    <CosmosWorkspaceShell>
      <TypescaleEditor variant="full" brandId={brand.id} initial={initial} showBrandSync />
    </CosmosWorkspaceShell>
  );
}
