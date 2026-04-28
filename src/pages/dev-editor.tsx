// Dev harness for the unified editor.
//
// Phase 5b: mounts <Editor> with the social-post fixture, the seeded
// brand resolved from the URL hash (or `raqm` by default), and an
// `onBrandSwitch` handler that proves the picker callback wiring
// without depending on Phase 4.5's real router.
//
// onBrandSwitch behavior here:
//   1. Log the call (so the wiring is visible in the console).
//   2. Resolve the picked brand via IBrandsService.getBySlug.
//   3. Reset the document state to the social-post fixture (the only
//      fixture we have right now) and force-remount the <Editor>
//      via key={brand.slug} so the new brand context flows in.
//
// When the canonical route lands in Phase 4.5, the parent component
// handles onBrandSwitch by calling
//   navigate(`/b/${brandSlug}/design/${designSlug}`)
// and this dev harness becomes redundant.
//
// ─── Phase 8 E2E harness — what `/_dev/brand/:slug/editor` would need ───
//
// The Phase 8 browser E2E tests need a harness that exercises the
// canonical `/b/:brandSlug/design/:designSlug` flow without depending
// on Phase 4.5's full route handler. A reasonable next iteration of
// this scaffold lives at `/_dev/brand/:slug/editor` and would need:
//
//   1. Read `:slug` from the URL via `useParams` instead of a hash.
//   2. Choose a content type from a query param (`?type=presentation`).
//   3. Persist via `IDesignStorage.saveDesign(...)` instead of localStorage.
//   4. Resolve a `BrandKit` via `useBrandKit(brand)` and pass it through
//      so cross-page consistency tests run end-to-end with a real brand.
//   5. Accept seeded fixtures via query param (`?fixture=social-post`).

import { useCallback, useEffect, useState } from 'react';
import { Editor } from '@/features/editor/shell/Editor';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import presentationFixture from '@/features/editor/schema/__fixtures__/presentation.sample.json';
import { useService, SERVICE_KEYS } from '@/core';
import type { IBrandsService } from '@/core';
import type { Brand } from '@/shared/types/brand';
import { getSeedBrandBySlug } from '@/data/brands';

// New key — bumped when the default fixture changed from
// social-post to the multi-page presentation (Step 5/7 fix 1) so a
// stale single-page save in the old key doesn't block the
// PageNavigator from showing on first reload.
const STORAGE_KEY = 'brandos.editor.dev.v2.devDoc';

/**
 * Default fixture is the multi-page presentation so the editor's
 * PageNavigator + the Step 7 smart-duplicate submenu surface
 * automatically. Other fixtures load via `?fixture=social-post`
 * (or any future fixture name) on the dev URL.
 */
function pickFixtureFromQuery(): BrandOSDocument {
  if (typeof window === 'undefined') {
    return BrandOSDocumentSchema.parse(presentationFixture);
  }
  const params = new URLSearchParams(window.location.search);
  const name = params.get('fixture');
  if (name === 'social-post') {
    return BrandOSDocumentSchema.parse(socialPostFixture);
  }
  return BrandOSDocumentSchema.parse(presentationFixture);
}

function loadDoc(): BrandOSDocument {
  // Honor an explicit fixture query param even when localStorage
  // would have otherwise restored a prior session — switching the
  // URL to `?fixture=social-post` should give the user the
  // single-page surface immediately.
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const wantsExplicit = params?.has('fixture') ?? false;
  if (!wantsExplicit) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return BrandOSDocumentSchema.parse(JSON.parse(raw));
    } catch {
      /* fall through to default fixture */
    }
  }
  return pickFixtureFromQuery();
}

function freshFixture(): BrandOSDocument {
  return pickFixtureFromQuery();
}

// Round 2 fix 1 — auto-save is disabled in the dev harness. The
// editor mounts with `saveEnabled={false}`, so this stub never runs.
// Kept as a no-op for the prop's type contract.
async function saveDoc(_doc: BrandOSDocument): Promise<void> {
  // intentional no-op; the dev harness doesn't persist.
}

export default function DevEditorPage() {
  const brandsService = useService<IBrandsService>(SERVICE_KEYS.BRANDS);

  // Initial brand: try the URL hash (#brand=skam) first, fall back to raqm.
  const [brand, setBrand] = useState<Brand | undefined>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const m = hash.match(/brand=([a-z0-9-]+)/i);
    return m ? getSeedBrandBySlug(m[1]) : getSeedBrandBySlug('raqm');
  });

  // Keep the document state separate so brand switching can reset it
  // to a fresh fixture (proving the wiring without Phase 4.5's real
  // route + persistence).
  const [doc, setDoc] = useState<BrandOSDocument>(loadDoc);

  // Resolve the URL-hash brand against IBrandsService once on mount —
  // demonstrates the same code path Phase 4.5's route handler will
  // use. Uses getBySlug so the dropdown's 'list' call AND this
  // resolution share the service contract.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const m = hash.match(/brand=([a-z0-9-]+)/i);
      const slug = m ? m[1] : 'raqm';
      try {
        const fetched = await brandsService.getBySlug(slug);
        if (!cancelled && fetched) setBrand(fetched);
      } catch {
        /* keep the seed-derived brand */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandsService]);

  const handleBrandSwitch = useCallback(
    async (slug: string) => {
      // 1. Log so the wiring is visible during manual testing.
      console.info('[dev-editor] onBrandSwitch fired with slug:', slug);
      // 2. Resolve via IBrandsService — same path Phase 4.5 will use.
      try {
        const next = await brandsService.getBySlug(slug);
        if (!next) {
          console.warn('[dev-editor] no brand for slug', slug);
          return;
        }
        setBrand(next);
        // 3. Reset the document to a fresh fixture. The Editor is
        //    keyed on brand.slug below so this triggers a full
        //    remount with the new brand context.
        setDoc(freshFixture());
        if (typeof window !== 'undefined') {
          window.location.hash = `brand=${slug}`;
        }
      } catch (err) {
        console.error('[dev-editor] brand switch failed:', err);
      }
    },
    [brandsService],
  );

  return (
    <Editor
      // Force a remount when the brand changes so initialDocument /
      // brand / adapter all reset cleanly. This stand-in is what
      // Phase 4.5's route handler replaces.
      key={brand?.slug ?? 'no-brand'}
      initialDocument={doc}
      save={saveDoc}
      // Dev harness has no real persistence — show the
      // "Dev — saves disabled" badge instead of attempting writes
      // that occasionally trip browser localStorage quotas across
      // long-running dev sessions.
      saveEnabled={false}
      brand={brand}
      onBrandSwitch={handleBrandSwitch}
    />
  );
}
