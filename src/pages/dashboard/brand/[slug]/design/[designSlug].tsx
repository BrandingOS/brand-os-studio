/**
 * Production editor route — minimum viable wiring.
 *
 * This route was scoped forward from Phase 4.5 to unblock the
 * brandkit migration in Phase 3 Step 9. The following Phase 4.5
 * concerns are intentionally NOT handled here:
 *
 *   - Auth / permission gates (assumes the user has brand access;
 *     ProtectedRoute at the App.tsx route mount handles top-level
 *     auth, but per-brand permission checks are Phase 4.5).
 *   - 404 / 403 polish (basic redirect + toast only).
 *   - Deep linking refinement.
 *   - Share URL parameters.
 *   - Brand picker → URL navigation wiring (the Editor's brand
 *     picker still uses the onBrandSwitch callback for now; Phase
 *     4.5 wires it to actually navigate to a different doc URL).
 *   - Loading skeletons / Suspense boundaries beyond a basic spinner.
 *
 * Phase 4.5 owns finishing all of the above.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Editor } from '@/features/editor/shell/Editor';
import {
  BrandOSDocumentSchema,
  type BrandOSDocument,
} from '@/features/editor/schema';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import { PageSpinner } from '@/components/PageSpinner';

export default function BrandDesignEditorPage() {
  const { slug, designSlug } = useParams<{
    slug: string;
    designSlug: string;
  }>();
  const navigate = useNavigate();
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const { brand, isLoading: brandLoading, error: brandError } = useBrandBySlug(slug);

  const [doc, setDoc] = useState<BrandOSDocument | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

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
        // Validate against the schema — guard against legacy /
        // corrupted blobs in localStorage from the pre-migration
        // editor.
        const parsed = BrandOSDocumentSchema.parse(raw);
        setDoc(parsed);
      } catch (err) {
        if (cancelled) return;
        // Schema parse failures land here too — surfaced as
        // load-failure rather than a hard crash.
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

  // Brand resolution failed → bounce to the workspace dashboard. The
  // user might have a typo in the slug or the brand was deleted.
  // Only triggers on an actual `brandError` from useBrandBySlug (which
  // sets 'Brand not found' when getBySlug returns null) — the initial
  // render's `brand=null + isLoading=false` window is NOT an error,
  // it's the pre-fetch state, so we wait for the hook to commit.
  useEffect(() => {
    if (!brandLoading && brandError) {
      toast.error(`Brand "${slug}" not found`);
      navigate('/dashboard', { replace: true });
    }
  }, [brandLoading, brandError, slug, navigate]);

  // Doc resolution failed → bounce to the brand's design launchpad
  // and toast the user. The launchpad is the natural retry surface
  // (template gallery sits behind the same scope).
  useEffect(() => {
    if (!docLoading && docError && brand) {
      const message =
        docError === 'not-found'
          ? `Design not found in ${brand.name}`
          : `Design failed to load — it may be from an older editor and is no longer compatible.`;
      toast.error(message);
      navigate(`/b/${brand.slug}/design`, { replace: true });
    }
  }, [docLoading, docError, brand, navigate]);

  // Always show the spinner during the dual-load window. Both effects
  // above redirect on failure, so reaching the !brand or !doc branch
  // after loading completes is the redirect-in-flight state.
  if (brandLoading || docLoading || !brand || !doc) {
    return <PageSpinner />;
  }

  return (
    <Editor
      initialDocument={doc}
      brand={brand}
      save={async (next) => {
        await designStorage.saveDesign(brand.id, doc.id, next);
      }}
    />
  );
}
