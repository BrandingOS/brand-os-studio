// Dev harness for the unified editor.
//
// Phase 5a (current): mounts <Editor> with the social-post fixture and
// the seeded `raqm` brand so the new top-bar brand picker has data to
// render. Persists to localStorage.
//
// ─── Phase 8 E2E harness — what `/_dev/brand/:slug/editor` would need ───
//
// The Phase 8 browser E2E tests need a harness that exercises the
// canonical `/b/:brandSlug/design/:designSlug` flow without depending
// on Phase 4.5's full route handler. A reasonable next iteration of
// this scaffold lives at `/_dev/brand/:slug/editor` and would need:
//
//   1. Read `:slug` from the URL via `useParams`. Resolve the brand
//      through `useService<IBrandsService>(SERVICE_KEYS.BRANDS).getBySlug(slug)`
//      so the brand context comes from the URL/route (per the brand-
//      context purity audit, issue #4) — NOT from a global store.
//   2. Choose a content type from a query param (`?type=presentation`)
//      so the same harness exercises every `ContentTypeConfig` —
//      single-page social-post + multi-page presentation + business-card,
//      etc. — without per-route code.
//   3. Persist via `IDesignStorage.saveDesign(brandId, designId, doc)`
//      instead of localStorage so the round-trip exercises the real
//      adapter the Phase 4 templates work will land on.
//   4. Resolve a `BrandKit` via `useBrandKit(brand)` and pass into
//      `applyBrandToDocument` so cross-page consistency tests
//      (Phase 3 step 6 Sonner) and brand-locked recovery (4c.3) can
//      run end-to-end with a real brand, not a hardcoded fixture id.
//   5. Accept seeded fixtures via query param (`?fixture=social-post`)
//      so individual E2E tests can target known starting documents.
//
// Don't build this yet — Step 8 will. Sketched here so the gap is
// captured next to the existing scaffold.

import { useMemo } from 'react';
import { Editor } from '@/features/editor/shell/Editor';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';
import { raqmBrand } from '@/data/brands/raqm';

const STORAGE_KEY = 'brandos.editor.phase1.devDoc';

function loadDoc(): BrandOSDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return BrandOSDocumentSchema.parse(JSON.parse(raw));
  } catch {
    // fall through to fixture
  }
  return BrandOSDocumentSchema.parse(socialPostFixture);
}

async function saveDoc(doc: BrandOSDocument): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}

export default function DevEditorPage() {
  const initial = useMemo(loadDoc, []);
  return <Editor initialDocument={initial} save={saveDoc} brand={raqmBrand} />;
}
