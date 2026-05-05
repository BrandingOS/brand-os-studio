/**
 * Production editor route — Phase 4.5 polished.
 *
 * Phase 3 Step 9 forward-pulled the minimum-viable shape; Phase 4.5
 * fills in the deferred concerns:
 *   • 404/403 polish — inline NotFoundPanel instead of redirect+toast.
 *   • Brand-picker URL navigation — picking a different brand from
 *     inside the editor navigates to that brand's design launchpad.
 *   • Share-link affordance — Share button in the editor topbar
 *     copies the canonical /b/:slug/design/:designSlug URL.
 *   • Per-brand permission gate — useBrandBySlug returning null on
 *     a non-null slug indicates "no access OR not found"; we render
 *     a single inline NotFoundPanel (no redirect-on-error to avoid
 *     URL state loss).
 *
 * Still deferred to later (no clear owner phase yet):
 *   • Real RBAC review (single is_admin boolean today; full role/
 *     permission model owed before opening to many admins).
 *   • Suspense boundaries beyond the basic full-page spinner — the
 *     editor itself is heavy, splitting it behind a Suspense bundle
 *     ships when bundle size justifies.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileQuestion, Home } from 'lucide-react';
// Phase 5 — lazy-load the unified Editor so the route's initial
// render isn't blocked by the heavy Fabric / adapter bundle. The
// 404/403 + spinner branches don't need the Editor code at all.
const Editor = lazy(() =>
  import('@/features/editor/shell/Editor').then((m) => ({ default: m.Editor })),
);
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import { PageSpinner } from '@/components/PageSpinner';
import { activityService } from '@/shared/services/activityService';

export default function BrandDesignEditorPage() {
  const { slug, designSlug } = useParams<{
    slug: string;
    designSlug: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const { brand, isLoading: brandLoading, error: brandError } = useBrandBySlug(slug);
  // The Design hero passes a typed prompt via ?prompt=… so the editor
  // can stage it in the AI prompt bar. We freeze the param value at
  // mount — once read, it's the user's text to keep or edit, not a
  // URL-driven re-render trigger.
  const initialPrompt = useMemo(() => {
    const v = searchParams.get('prompt');
    return v && v.trim().length > 0 ? v : undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [doc, setDoc] = useState<BrandOSDocument | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<'not-found' | 'parse-failed' | null>(null);

  // Load the document once we have a brand id + design slug.
  useEffect(() => {
    if (!brand?.id || !designSlug) return;
    let cancelled = false;
    setDocLoading(true);
    setDocError(null);

    void (async () => {
      try {
        const raw = await designStorage.loadDesign(brand.id, designSlug);
        if (cancelled) return;
        if (!raw) {
          setDocError('not-found');
          return;
        }
        const parsed = BrandOSDocumentSchema.parse(raw);
        setDoc(parsed);
      } catch (err) {
        if (cancelled) return;
        console.error('[BrandDesignEditorPage] design load failed:', err);
        setDocError('parse-failed');
      } finally {
        if (!cancelled) setDocLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand?.id, designSlug, designStorage]);

  // Phase 4.5 — brand-picker URL nav. When the user picks a
  // different brand from inside the editor, the design id no longer
  // applies (a design belongs to one brand). Navigate to the
  // chosen brand's design launchpad — the natural place to pick up
  // a different design under the new brand.
  const onBrandSwitch = useCallback((nextSlug: string) => {
    navigate(`/b/${nextSlug}/design`);
  }, [navigate]);

  // Phase 4.5 — share-link copy. The canonical URL pattern lives
  // at /b/:slug/design/:designSlug; just hand the current URL to
  // the clipboard.
  // (Wired into the Editor below via the optional onShare prop.)

  if (brandLoading) {
    return <PageSpinner />;
  }

  // Brand not found / no access → inline 404. Don't redirect; keep
  // the URL stable so the user can correct a typo or share.
  if (brandError || !brand) {
    return <NotFoundPanel
      title={`We couldn't find brand "${slug}"`}
      hint="The brand may have been deleted, or your account doesn't have access."
      primaryHref="/dashboard"
      primaryLabel="Back to dashboard"
    />;
  }

  if (docLoading) {
    return <PageSpinner />;
  }

  if (docError) {
    return <NotFoundPanel
      title={
        docError === 'not-found'
          ? `Design not found in ${brand.name}`
          : "We couldn't open this design"
      }
      hint={
        docError === 'parse-failed'
          ? 'It may be from an older editor and is no longer compatible.'
          : 'It may have been deleted, or the link is wrong.'
      }
      primaryHref={`/b/${brand.slug}/design`}
      primaryLabel={`Back to ${brand.name}`}
      secondaryHref="/dashboard"
      secondaryLabel="Dashboard"
    />;
  }

  if (!doc) {
    // Defensive — shouldn't reach here; covered by the loading +
    // error branches above. Render a spinner just in case.
    return <PageSpinner />;
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <Editor
        initialDocument={doc}
        brand={brand}
        initialPrompt={initialPrompt}
        onBrandSwitch={onBrandSwitch}
        save={async (next) => {
          await designStorage.saveDesign(brand.id, doc.id, next);
        }}
        onShare={() => {
          // Phase 8.1 — share link points at the public design portal
          // (/d/:brandSlug/:designSlug), an anonymous read-only view.
          // Anyone with the URL can see the design without an auth wall.
          const url = `${window.location.origin}/d/${brand.slug}/${designSlug}`;
          void copyToClipboard(url);
          // Phase 7.4c — log share to the activity feed so creators
          // can see "where this design went" across the workspace.
          void activityService.log({
            brandId: brand.id,
            brandName: brand.name,
            eventType: 'asset_exported',
            title: 'Design link copied',
            description: `Public link to "${doc?.metadata?.name ?? designSlug}"`,
            metadata: { share: true, designId: designSlug, url },
          });
        }}
      />
    </Suspense>
  );
}

// ─── 404 / 403 inline panel ───────────────────────────────────────────

interface NotFoundPanelProps {
  title: string;
  hint: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

function NotFoundPanel({
  title, hint, primaryHref, primaryLabel, secondaryHref, secondaryLabel,
}: NotFoundPanelProps) {
  return (
    <div
      data-design-route-not-found
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <FileQuestion className="h-12 w-12 text-muted-foreground" aria-hidden />
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link
          to={primaryHref}
          data-not-found-primary
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            to={secondaryHref}
            data-not-found-secondary
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/30"
            style={{ borderColor: 'var(--border)' }}
          >
            <Home className="h-3.5 w-3.5" /> {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ─── Clipboard ─────────────────────────────────────────────────────────

async function copyToClipboard(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Share link copied to clipboard.');
  } catch {
    // Clipboard API can fail on http / sandboxed iframes; toast
    // the URL so the user can copy manually.
    toast.message(`Copy this link: ${url}`);
  }
}
