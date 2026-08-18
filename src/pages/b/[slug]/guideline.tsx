import { useParams } from 'react-router-dom';
import { GuidelineWorkspace } from '@/features/guideline/GuidelineWorkspace';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';

/**
 * Brand-scoped Guideline tab at /b/:slug/guideline.
 *
 * A landing, in the Studio shell, that opens the fullscreen deck editor at
 * /b/:slug/guideline/:templateId. Same shape as the Design tab: the surface in
 * the shell is a launchpad, and canvases live on their own routes.
 *
 * This replaced a bespoke `ChronicleShell` document editor that rebuilt the
 * workspace navigation from scratch in its own dark chrome and whose Remix,
 * Background, Generate-image and Create-theme controls were toasts. The slide
 * deck it now opens is the one that was already at /b/:slug/brand-guides.
 *
 * `key={slug}` force-remounts when the user switches brands.
 */
export default function BrandGuidelineTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading, error } = useBrandFromSlug(slug);

  return (
    <GuidelineWorkspace
      key={slug}
      slug={slug ?? ''}
      brand={brand}
      isLoading={isLoading}
      error={error}
    />
  );
}
