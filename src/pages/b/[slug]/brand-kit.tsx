import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '@/features/brand-kit/BrandKitCosmosPage';
import { BrandSetupChecklist } from '@/features/brand-setup/BrandSetupChecklist';

/**
 * Brand-scoped Brand Kit tab at /b/:slug/brand-kit.
 *
 * Loads the brand by slug and projects it to the same MockBrand shape
 * Setup renders from — so the Kit page always reflects the data you
 * just edited on the Setup tab. `key={brand.id}` forces a clean
 * remount on brand switch so scroll + active-section state reset.
 *
 * Phase 11.2 — mounts a `BrandSetupChecklist` above the Kit page when
 * starter steps remain incomplete; the widget hides itself entirely
 * once every step is done so configured brands aren't permanently
 * nagged.
 */
export default function BrandBrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);

  if (!brand) return null;

  // `empty:hidden` collapses the checklist wrapper to display:none
  // whenever BrandSetupChecklist returns null for a fully-configured
  // brand. Without it the empty wrapper + flex gap left a 32px band
  // above the sticky WorkspaceShell navbar.
  return (
    <div className="flex flex-col">
      <div className="px-4 sm:px-6 pt-4 empty:hidden">
        <BrandSetupChecklist brand={brand} />
      </div>
      <BrandKitCosmosPage
        key={brand.id}
        brand={brandToMockBrand(brand)}
        sourceBrand={brand}
      />
    </div>
  );
}
