// /editor — instant-on launcher.
//
// User intent: typing /editor (or clicking a "New design" entry)
// should land them inside the unified editor on a real, persisted
// "Untitled design" — no template picker, no launchpad, no detour.
//
// Behavior on mount:
//   1. Resolve a default brand. Priority:
//        ?brand=<slug> query param → first brand from IBrandsService
//        → seed `raqm` as a last-resort fallback (dev-friendly).
//   2. Build a blank social-post BrandOSDocument scaffold.
//   3. Persist via IDesignStorage so the design appears in
//      My Designs immediately (name = "Untitled design").
//   4. Replace-navigate to /b/<slug>/design/<new-id>.
//
// `replace` instead of push so the browser back button doesn't loop
// the user through this transient launcher route.

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useService, SERVICE_KEYS } from '@/core';
import type { IBrandsService, IDesignStorage } from '@/core';
import { CONTENT_TYPES } from '@/features/editor/content-types';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import { getSeedBrandBySlug } from '@/data/brands';
import { PageSpinner } from '@/components/PageSpinner';

const DEFAULT_CONTENT_TYPE = 'social-post';

function blankDoc(brand: Brand, designId: string): BrandOSDocument {
  const cfg = CONTENT_TYPES[DEFAULT_CONTENT_TYPE];
  const w = cfg?.defaultDimensions.width ?? 1080;
  const h = cfg?.defaultDimensions.height ?? 1080;
  return {
    schemaVersion: 1,
    id: designId,
    contentType: DEFAULT_CONTENT_TYPE,
    brandId: brand.id,
    masterPages: [],
    pages: [
      {
        id: crypto.randomUUID(),
        name: 'Page 1',
        width: w,
        height: h,
        background: '#ffffff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: {},
  };
}

async function resolveBrand(
  brandsService: IBrandsService,
  preferredSlug: string | null,
): Promise<Brand | null> {
  if (preferredSlug) {
    try {
      const direct = await brandsService.getBySlug(preferredSlug);
      if (direct) return direct;
    } catch {
      /* fall through */
    }
    const seeded = getSeedBrandBySlug(preferredSlug);
    if (seeded) return seeded;
  }
  try {
    const list = await brandsService.list();
    if (list.length > 0) return list[0];
  } catch {
    /* fall through */
  }
  return getSeedBrandBySlug('raqm') ?? null;
}

export default function EditorLauncherPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const brandsService = useService<IBrandsService>(SERVICE_KEYS.BRANDS);
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  // StrictMode in dev double-invokes effects. Guard with a ref so we
  // don't seed twice and end up with two Untitled designs per visit.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const preferred = search.get('brand');
        const brand = await resolveBrand(brandsService, preferred);
        if (!brand) {
          toast.error('No brand found — create a brand first.');
          navigate('/dashboard', { replace: true });
          return;
        }
        const designId = crypto.randomUUID();
        const doc = blankDoc(brand, designId);
        await designStorage.saveDesign(brand.id, designId, doc, {
          id: designId,
          name: 'Untitled design',
          contentType: doc.contentType,
          width: doc.pages[0]?.width,
          height: doc.pages[0]?.height,
          updatedAt: new Date().toISOString(),
        });
        navigate(`/b/${brand.slug}/design/${designId}`, { replace: true });
      } catch (err) {
        console.error('[EditorLauncher] failed to create blank design:', err);
        toast.error('Could not start a new design — please try again.');
        navigate('/dashboard', { replace: true });
      }
    })();
  }, [brandsService, designStorage, navigate, search]);

  return <PageSpinner />;
}
