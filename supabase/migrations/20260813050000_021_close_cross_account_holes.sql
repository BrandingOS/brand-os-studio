-- 021 — Close two cross-account holes (security)
--
-- NON-DESTRUCTIVE to data. Replaces two RLS policies; no table, column or row
-- is touched.
--
-- Both were found by review and CONFIRMED against the FINAL migration chain
-- (not an isolated historical file) by inspecting `pg_policies` after a clean
-- `supabase db reset`. Neither is caused by the Brand System Foundation work;
-- both are pre-existing. They are fixed here rather than deferred because a
-- confirmed cross-account hole is a release blocker.
--
-- ─────────────────────────────────────────────────────────────────────────
-- A. public.notifications — any user could create a notification for anyone
-- ─────────────────────────────────────────────────────────────────────────
-- `notifications_insert` used `WITH CHECK (true)`, so ANY authenticated user
-- could insert a row for ANY `user_id` with arbitrary `title`, `body` and
-- `href`. That is cross-account spam and, because `href` renders as an
-- in-app link, a phishing vector inside a trusted surface.
--
-- Verified before tightening: NO product code calls
-- `INotificationsService.create` — `SupabaseNotificationsService.create`
-- exists but has zero callers — so restricting client inserts to the caller's
-- own row breaks nothing today.
--
-- If genuine cross-user notifications are added later ("X commented on your
-- design"), they must be created by TRUSTED code — a SECURITY DEFINER function
-- that validates actor and target, an Edge Function, or the service role —
-- never by widening this policy again.
--
-- ─────────────────────────────────────────────────────────────────────────
-- B. storage onboarding-scratch — "own" policies that were not owner-scoped
-- ─────────────────────────────────────────────────────────────────────────
-- `scratch_select_own` and `scratch_delete_own` are NAMED for ownership but
-- their predicate was only `bucket_id = 'onboarding-scratch'`. Any
-- authenticated user could therefore read or DELETE any other user's
-- onboarding uploads — which are logos and brand imagery, uploaded before a
-- brand exists. The names hid the gap.
--
-- Scoped to `owner`, which Supabase Storage stamps with the uploader's uid.
-- That is robust regardless of the object-key convention, unlike a path-prefix
-- rule which would silently stop matching if the key format changed.
--
-- Anonymous onboarding (uploads made before sign-in) has `owner IS NULL`;
-- those objects stay readable by their session as before, because a NULL owner
-- cannot be attributed to another user either. They remain writable only
-- through the unchanged insert policy.
--
-- Reversible: supabase/migrations/down/021_close_cross_account_holes.down.sql
-- (deliberately a no-op — see that file.)

-- ── A. notifications ────────────────────────────────────────────────────
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ── B. onboarding scratch storage ───────────────────────────────────────
DROP POLICY IF EXISTS "scratch_select_own" ON storage.objects;
CREATE POLICY "scratch_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-scratch'
  AND (owner = (SELECT auth.uid()) OR owner IS NULL)
);

DROP POLICY IF EXISTS "scratch_delete_own" ON storage.objects;
CREATE POLICY "scratch_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-scratch'
  AND (owner = (SELECT auth.uid()) OR owner IS NULL)
);

-- Guard rail: fail loudly if either hole is somehow still open afterwards.
DO $$
DECLARE open_insert INT; unscoped INT;
BEGIN
  SELECT count(*) INTO open_insert
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'notifications'
     AND cmd = 'INSERT' AND coalesce(with_check, '') = 'true';

  IF open_insert > 0 THEN
    RAISE EXCEPTION 'notifications INSERT is still unrestricted after 021';
  END IF;

  SELECT count(*) INTO unscoped
    FROM pg_policies
   WHERE schemaname = 'storage' AND policyname IN ('scratch_select_own', 'scratch_delete_own')
     AND qual NOT LIKE '%owner%';

  IF unscoped > 0 THEN
    RAISE EXCEPTION 'onboarding-scratch policies are still not owner-scoped after 021';
  END IF;

  RAISE NOTICE 'Cross-account holes closed: notification inserts are self-scoped; onboarding scratch is owner-scoped.';
END $$;
