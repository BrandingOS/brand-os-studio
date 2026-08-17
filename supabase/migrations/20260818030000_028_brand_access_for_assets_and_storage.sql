-- ════════════════════════════════════════════════════════════════════════════
-- 028 — the same brand-access question for assets and storage
-- ════════════════════════════════════════════════════════════════════════════
--
-- 026 introduced `can_view_brand` / `can_edit_brand` because `is_brand_member`
-- only knows the workspace path and therefore locks the OWNER out of a
-- directly-owned brand (`brands.workspace_id IS NULL`).
--
-- That gap is not limited to the new tables. It also affects, today:
--
--   public.assets           the Brand Library. The owner of a workspace-less
--                           brand cannot insert — so "Save to Brand Assets"
--                           returns 42501 for those brands. Found in QA.
--   storage.objects         the brand-assets bucket, keyed on the first path
--                           segment. Same gap, so the same owner cannot read
--                           or write their own brand's files from the browser.
--                           (The Edge Function writes with the service role,
--                           which is why generated images still appear — but
--                           re-signing a URL client-side would fail.)
--
-- This is a pre-existing 001-era bug, surfaced by this phase because saving a
-- generated image is one of its acceptance criteria. The fix is narrow: ask the
-- access question the same way `brands` itself asks it. Nothing is widened
-- beyond what the `brands` policies already permit.
--
-- Additive: policies re-pointed at the helpers. No table, column or data is
-- touched, and the storage path convention is unchanged.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── public.assets ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select"
  ON public.assets FOR SELECT TO authenticated
  USING (public.can_view_brand(brand_id));

DROP POLICY IF EXISTS "assets_insert" ON public.assets;
CREATE POLICY "assets_insert"
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_brand(brand_id));

DROP POLICY IF EXISTS "assets_update" ON public.assets;
CREATE POLICY "assets_update"
  ON public.assets FOR UPDATE TO authenticated
  USING (public.can_edit_brand(brand_id))
  WITH CHECK (public.can_edit_brand(brand_id));

DROP POLICY IF EXISTS "assets_delete" ON public.assets;
CREATE POLICY "assets_delete"
  ON public.assets FOR DELETE TO authenticated
  USING (public.can_edit_brand(brand_id));

-- ─── storage.objects — the brand-assets bucket ──────────────────────────────
--
-- The first path segment is the brand id. A path whose first segment is not a
-- uuid (the `ai-refs/<userId>/…` prefix) would raise 22P02 on the cast, so the
-- predicate guards the shape before casting — that was already latent and is
-- closed here rather than left as a trap.

DROP POLICY IF EXISTS "brand_assets_read" ON storage.objects;
CREATE POLICY "brand_assets_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.can_view_brand((string_to_array(name, '/'))[1]::uuid)
  );

DROP POLICY IF EXISTS "brand_assets_insert" ON storage.objects;
CREATE POLICY "brand_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.can_edit_brand((string_to_array(name, '/'))[1]::uuid)
  );

DROP POLICY IF EXISTS "brand_assets_update" ON storage.objects;
CREATE POLICY "brand_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.can_edit_brand((string_to_array(name, '/'))[1]::uuid)
  );

DROP POLICY IF EXISTS "brand_assets_delete" ON storage.objects;
CREATE POLICY "brand_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.can_edit_brand((string_to_array(name, '/'))[1]::uuid)
  );

-- The 001-era owner-only duplicates were never dropped and OR with the above.
-- They only ever NARROW to brand owners, so removing them changes no access —
-- it removes a second source of authority for the same question.
DROP POLICY IF EXISTS "Users can view their brand assets"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their brand assets" ON storage.objects;

-- ─── Guard rail ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assets'
      AND cmd = 'INSERT' AND with_check LIKE '%can_edit_brand%'
  ) THEN
    RAISE EXCEPTION '028: assets INSERT must go through can_edit_brand';
  END IF;
END $$;
