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
-- Strict equality, with NO `owner IS NULL` escape. A null owner is not "this
-- session's own upload" — it matches for EVERY authenticated user, which is the
-- same cross-account hole in miniature. It is also unreachable: the unchanged
-- `scratch_insert_own` policy is `TO authenticated`, so a client upload always
-- carries an owner. Rows with a null owner can only come from the service role,
-- and server-managed objects have no reason to be client-readable.
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
  AND owner = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "scratch_delete_own" ON storage.objects;
CREATE POLICY "scratch_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-scratch'
  AND owner = (SELECT auth.uid())
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
     AND (qual NOT LIKE '%owner%' OR qual LIKE '%owner IS NULL%');

  IF unscoped > 0 THEN
    RAISE EXCEPTION 'onboarding-scratch policies are not strictly owner-scoped after 021 '
      '(missing owner check, or a null-owner escape that matches for every user)';
  END IF;

  RAISE NOTICE 'Cross-account holes closed: notification inserts are self-scoped; onboarding scratch is owner-scoped.';
END $$;
