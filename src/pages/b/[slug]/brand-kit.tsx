import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { BrandKitCosmosPage } from '@/features/brand-kit-v2-cosmos/BrandKitCosmosPage';

/**
 * Brand-scoped Brand Kit tab at /b/:slug/brand-kit.
 *
 * Loads the brand by slug from the store and renders the cosmos v2
 * BrandKit surface (sidebar + read-only board inside
 * `CosmosWorkspaceShell`). The `key={slug}` forces a remount when
 * switching brands so section scroll / active-row state is reset.
 *
 * If the slug doesn't resolve (still loading / not found), the page
 * still renders the shell with a "No brand loaded" state in each
 * section — never a blank screen.
 */
export default function BrandBrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);

  return <BrandKitCosmosPage key={slug} brand={brand} />;
}
