import { useParams } from 'react-router-dom';
import { GuidelineBuilder } from '@/features/guideline/builder/GuidelineBuilder';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import '@/features/guideline/guideline.css';

/**
 * Brand-scoped Guideline tab at /b/:slug/guideline.
 *
 * In the Studio shell rather than fullscreen, unlike the design canvas: a
 * guideline is a document about the brand, so switching brands mid-edit is a
 * real thing to want, and the tab bar is how that happens. The builder's own
 * rail and sidebar sit beside the document, under that chrome.
 *
 * `key={slug}` force-remounts on a brand switch — the builder holds selection
 * and scroll state that means nothing for a different brand.
 */
export default function BrandGuidelineTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading, error } = useBrandFromSlug(slug);

  if (isLoading && !brand) {
    return (
      <WorkspaceShell>
        <div className="gl-state" role="main">
          <h1>Loading brand…</h1>
          <p>One moment while we resolve this brand.</p>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !brand) {
    return (
      <WorkspaceShell>
        <div className="gl-state" role="main">
          <h1>We couldn’t find that brand.</h1>
          <p>{error ?? 'The brand may have been renamed or deleted.'}</p>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <GuidelineBuilder key={slug} brand={brand} slug={slug ?? ''} />
    </WorkspaceShell>
  );
}
