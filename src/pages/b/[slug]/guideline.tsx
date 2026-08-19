import { useParams } from 'react-router-dom';
import { GuidelineBuilder } from '@/features/guideline/builder/GuidelineBuilder';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import '@/features/guideline/guideline.css';

/**
 * Brand-scoped Guideline tab at /b/:slug/guideline.
 *
 * A thin brand resolver, the same shape as `pages/b/[slug]/setup.tsx`: the
 * feature mounts its own `WorkspaceShell` because it contributes top-bar
 * actions (undo/redo), and the page has nothing to add.
 *
 * `key={slug}` force-remounts on a brand switch — the builder holds selection,
 * scroll and undo state that means nothing for a different brand.
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

  return <GuidelineBuilder key={slug} brand={brand} slug={slug ?? ''} />;
}
