import { useParams } from 'react-router-dom';
import { StudioBrandShell } from './_studioBrandShell';
import { TemplatesPanel } from '@/features/editor/shell/v2/panels/TemplatesPanel';
import { BrandMemoryColorsPanel } from '@/features/brand-memory/BrandMemoryColorsPanel';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';

/**
 * Brand-scoped Templates tab at `/b/:slug/templates` (Phase B port).
 *
 * Mounts the Phase 4 Content Universe — the same `TemplatesPanel`
 * the unified editor uses for in-canvas template browsing — as a
 * standalone page inside the Studio shell. The panel is passed
 * `mode='browser'`: AI image generation falls back to clipboard
 * (no active adapter); template clicks behave the same as in-editor
 * (seed brand-bound doc → save via IDesignStorage → navigate to
 * /b/:slug/design/:newSlug).
 *
 * The legacy /a/:slug/templates page (BrandTemplatesPage) is left
 * untouched — Classic-preference users still see the old
 * Print/Social/Screen/Utility catalog.
 */
export default function BrandTemplatesStudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);

  if (!brand) {
    return (
      <StudioBrandShell>
        <div className="workspace-empty" role="main">
          <span className="workspace-empty-eyebrow">Templates</span>
          <h1>{isLoading ? 'Loading brand…' : "We couldn't find that brand."}</h1>
          <p>
            {isLoading
              ? 'One moment while we resolve this brand.'
              : 'The brand may have been renamed or deleted.'}
          </p>
        </div>
      </StudioBrandShell>
    );
  }

  return (
    <StudioBrandShell>
      <div data-templates-studio-page className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curated templates, AI generation, and your saved designs — all
            brand-aware.
          </p>
        </header>
        <BrandMemoryColorsPanel brandId={brand.id} className="mb-4" />
        <TemplatesPanel mode="browser" />
      </div>
    </StudioBrandShell>
  );
}
