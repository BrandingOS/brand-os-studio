-- ============================================================================
-- Verification for migration 029 — account deletion + the profiles column guard.
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no
-- writes persist). Requires migrations 001..029 applied. Run with:
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/029_account_deletion.test.sql
--
-- Principals are real auth.users rows, NOT arbitrary UUIDs: profiles.id carries
-- `REFERENCES auth.users(id) ON DELETE CASCADE` (verified against the local
-- stack — profiles_id_fkey, confdeltype 'c'), so a bare profiles insert would
-- violate it. handle_new_user() then creates the profile AND a personal
-- workspace for each of them.
--
--   USER_A 11111111-… the account being deleted
--   USER_B 22222222-… a stranger
--   USER_C 33333333-… a co-member of USER_A's SHARED workspace
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.act_as_superuser() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END;
$$;

-- ─── Setup (superuser → RLS bypassed) ───────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.com');

-- A SHARED workspace owned by A with C in it, alongside A's personal one.
INSERT INTO public.workspaces (id, name, slug, owner_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Shared WS', 'shared-ws',
   '11111111-1111-1111-1111-111111111111');
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member');

-- A brand in the shared workspace (must SURVIVE) and one in A's personal
-- workspace (must DIE).
INSERT INTO public.brands (id, workspace_id, user_id, name, slug, primary_color) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', 'Shared Brand', 'shared-brand', '#123456'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
   (SELECT id FROM public.workspaces WHERE owner_id='11111111-1111-1111-1111-111111111111'
      AND id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 1),
   '11111111-1111-1111-1111-111111111111', 'Personal Brand', 'personal-brand', '#654321');

-- A is an announcement author — the FK that blocks a naive profile delete.
INSERT INTO public.announcements (title, body, created_by)
VALUES ('Hello', 'Body', '11111111-1111-1111-1111-111111111111');

-- A paid invoice on A's personal workspace — must reach billing_archive.
INSERT INTO public.subscriptions (workspace_id, stripe_customer_id, plan)
VALUES ((SELECT id FROM public.workspaces WHERE owner_id='11111111-1111-1111-1111-111111111111'
           AND id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 1), 'cus_test', 'pro');
INSERT INTO public.invoices (workspace_id, stripe_invoice_id, amount_paid, currency, status)
VALUES ((SELECT id FROM public.workspaces WHERE owner_id='11111111-1111-1111-1111-111111111111'
           AND id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 1),
        'in_test_1', 1900, 'usd', 'paid');

-- ════════════════════════════════════════════════════════════════════════════
-- 1. request_account_deletion — grace period, idempotency
-- ════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE r1 public.account_deletion_requests; r2 public.account_deletion_requests;
BEGIN
  r1 := public.request_account_deletion('just testing');
  IF r1.status <> 'pending' THEN RAISE EXCEPTION 'FAIL: new request should be pending'; END IF;
  IF r1.grace_days <> 7 THEN
    RAISE EXCEPTION 'FAIL: grace should default to 7 (the published promise), got %', r1.grace_days;
  END IF;
  IF r1.purge_after < now() + INTERVAL '6 days'
     OR r1.purge_after > now() + INTERVAL '8 days' THEN
    RAISE EXCEPTION 'FAIL: purge_after should be ~7 days out, got %', r1.purge_after;
  END IF;

  -- Asking twice must NOT extend the window or create a second row.
  r2 := public.request_account_deletion('again');
  IF r2.id <> r1.id THEN RAISE EXCEPTION 'FAIL: second request created a new row'; END IF;
  IF r2.purge_after <> r1.purge_after THEN
    RAISE EXCEPTION 'FAIL: second request moved the purge date';
  END IF;
  RAISE NOTICE 'PASS 1 — request is idempotent and 7 days out';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. The request row is readable only by its owner, and writable by nobody
-- ════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE leaked INT; moved INT;
BEGIN
  SELECT count(*) INTO leaked FROM public.account_deletion_requests;
  IF leaked <> 0 THEN RAISE EXCEPTION 'FAIL: stranger can read % deletion request(s)', leaked; END IF;

  UPDATE public.account_deletion_requests SET purge_after = now() - INTERVAL '1 day';
  GET DIAGNOSTICS moved = ROW_COUNT;
  IF moved <> 0 THEN RAISE EXCEPTION 'FAIL: stranger moved % purge date(s)', moved; END IF;
  RAISE NOTICE 'PASS 2 — stranger cannot read or move a deletion request';
END $$;

SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE moved INT; own INT;
BEGIN
  SELECT count(*) INTO own FROM public.account_deletion_requests;
  IF own <> 1 THEN RAISE EXCEPTION 'FAIL: owner should see exactly 1 request, saw %', own; END IF;

  -- Even the OWNER has no write policy: the RPCs are the only audited path.
  UPDATE public.account_deletion_requests SET purge_after = now() - INTERVAL '1 day';
  GET DIAGNOSTICS moved = ROW_COUNT;
  IF moved <> 0 THEN RAISE EXCEPTION 'FAIL: owner backdated their own purge'; END IF;
  RAISE NOTICE 'PASS 2b — even the owner cannot backdate their purge';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. The profiles column guard
-- ════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.act_as_superuser();
UPDATE public.profiles SET status = 'suspended', suspension_reason = 'spam'
 WHERE id = '11111111-1111-1111-1111-111111111111';

SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE s TEXT; reason TEXT; notes TEXT; mail TEXT; nm TEXT;
BEGIN
  -- The write SUCCEEDS (no 42501 storm) but the privileged columns do not move.
  UPDATE public.profiles
     SET status = 'active', suspension_reason = NULL,
         admin_notes = 'I am lovely', email = 'hacker@example.com',
         full_name = 'A Real Name'
   WHERE id = '11111111-1111-1111-1111-111111111111';

  SELECT status, suspension_reason, admin_notes, email, full_name
    INTO s, reason, notes, mail, nm
    FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111';

  IF s <> 'suspended' THEN RAISE EXCEPTION 'FAIL: user un-suspended themselves (status=%)', s; END IF;
  IF reason IS DISTINCT FROM 'spam' THEN RAISE EXCEPTION 'FAIL: user cleared suspension_reason'; END IF;
  IF notes IS NOT NULL THEN RAISE EXCEPTION 'FAIL: user wrote admin_notes'; END IF;
  IF mail <> 'a@example.com' THEN RAISE EXCEPTION 'FAIL: user rewrote their profiles.email'; END IF;
  -- …and the fields that ARE theirs still round-trip.
  IF nm <> 'A Real Name' THEN RAISE EXCEPTION 'FAIL: user cannot edit their own full_name'; END IF;
  RAISE NOTICE 'PASS 3 — moderation columns are admin-only, full_name is not';
END $$;

-- A super_admin must still be able to moderate.
SELECT pg_temp.act_as_superuser();
INSERT INTO public.user_roles (user_id, role)
VALUES ('22222222-2222-2222-2222-222222222222', 'super_admin');

SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE s TEXT;
BEGIN
  UPDATE public.profiles SET status = 'banned'
   WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT status INTO s FROM public.profiles WHERE id='11111111-1111-1111-1111-111111111111';
  IF s <> 'banned' THEN RAISE EXCEPTION 'FAIL: super_admin cannot moderate (status=%)', s; END IF;
  RAISE NOTICE 'PASS 3b — the admin path still works';
END $$;

SELECT pg_temp.act_as_superuser();
UPDATE public.profiles SET status='active', suspension_reason=NULL
 WHERE id='11111111-1111-1111-1111-111111111111';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. cancel_account_deletion
-- ════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE r public.account_deletion_requests; raised BOOLEAN := false;
BEGIN
  r := public.cancel_account_deletion();
  IF r.status <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: cancel did not cancel'; END IF;
  IF r.cancelled_at IS NULL THEN RAISE EXCEPTION 'FAIL: cancelled_at not stamped'; END IF;

  BEGIN
    PERFORM public.cancel_account_deletion();
  EXCEPTION WHEN OTHERS THEN raised := true;
  END;
  IF NOT raised THEN RAISE EXCEPTION 'FAIL: cancelling twice should raise'; END IF;

  -- Cancelling frees the partial unique index, so a NEW request is possible.
  r := public.request_account_deletion(NULL);
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'FAIL: cannot re-request after cancelling'; END IF;
  RAISE NOTICE 'PASS 4 — cancel works, is not repeatable, and re-request is allowed';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. prepare_account_purge — transfer vs destroy, and the invoice archive
-- ════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.act_as_superuser();
DO $$
DECLARE plan JSONB; new_owner UUID; role_now public.workspace_role;
        brand_owner UUID; archived INT;
BEGIN
  plan := public.prepare_account_purge('11111111-1111-1111-1111-111111111111');

  IF jsonb_array_length(plan->'workspacesTransferred') <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected the SHARED workspace to transfer, got %',
      plan->'workspacesTransferred';
  END IF;
  IF jsonb_array_length(plan->'workspacesDeleted') <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected the personal workspace to be doomed, got %',
      plan->'workspacesDeleted';
  END IF;

  SELECT owner_id INTO new_owner FROM public.workspaces
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF new_owner <> '33333333-3333-3333-3333-333333333333' THEN
    RAISE EXCEPTION 'FAIL: shared workspace did not pass to the remaining member';
  END IF;

  SELECT role INTO role_now FROM public.workspace_members
   WHERE workspace_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     AND user_id='33333333-3333-3333-3333-333333333333';
  IF role_now <> 'owner' THEN RAISE EXCEPTION 'FAIL: successor was not promoted to owner'; END IF;

  SELECT user_id INTO brand_owner FROM public.brands
   WHERE id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  IF brand_owner <> '33333333-3333-3333-3333-333333333333' THEN
    RAISE EXCEPTION 'FAIL: surviving brand still points at the departing user';
  END IF;

  -- Only the doomed workspace's brand should be listed for destruction.
  IF NOT (plan->'brandIds') @> '["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"]'::jsonb THEN
    RAISE EXCEPTION 'FAIL: personal brand missing from the doomed list';
  END IF;
  IF (plan->'brandIds') @> '["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"]'::jsonb THEN
    RAISE EXCEPTION 'FAIL: SHARED brand was marked for destruction';
  END IF;

  SELECT count(*) INTO archived FROM public.billing_archive WHERE stripe_invoice_id='in_test_1';
  IF archived <> 1 THEN RAISE EXCEPTION 'FAIL: invoice was not archived before purge'; END IF;

  IF EXISTS (SELECT 1 FROM public.announcements
              WHERE created_by='11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'FAIL: announcements.created_by was not detached';
  END IF;
  RAISE NOTICE 'PASS 5 — shared workspace transferred, personal doomed, invoice archived';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. The purge itself — cascade-safe, and re-runnable
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE counts JSONB;
BEGIN
  -- The Edge Function deletes the auth user FIRST. That cascades into profiles
  -- (profiles_id_fkey, ON DELETE CASCADE) — which is exactly the delete that
  -- announcements.created_by (NO ACTION) would have blocked with 23503 had
  -- prepare_account_purge not detached it above.
  DELETE FROM auth.users WHERE id='11111111-1111-1111-1111-111111111111';

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id='11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'FAIL: profile survived the auth-user cascade';
  END IF;

  counts := public.purge_account_data('11111111-1111-1111-1111-111111111111');

  IF EXISTS (SELECT 1 FROM public.brands WHERE id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2') THEN
    RAISE EXCEPTION 'FAIL: the personal brand survived';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1') THEN
    RAISE EXCEPTION 'FAIL: the SHARED brand was destroyed — collaborator data lost';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'FAIL: the SHARED workspace was destroyed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.workspace_members
              WHERE user_id='11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'FAIL: membership rows survived';
  END IF;
  -- The audit row must OUTLIVE the purge.
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests
                  WHERE user_id='11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'FAIL: the audit record was destroyed with the account';
  END IF;
  -- …and so must the tax record.
  IF NOT EXISTS (SELECT 1 FROM public.billing_archive WHERE stripe_invoice_id='in_test_1') THEN
    RAISE EXCEPTION 'FAIL: the archived invoice was destroyed';
  END IF;

  -- Idempotent: a retry after a mid-purge crash must be a clean no-op.
  PERFORM public.purge_account_data('11111111-1111-1111-1111-111111111111');
  RAISE NOTICE 'PASS 6 — purge is cascade-safe, spares collaborators, and re-runs cleanly';
END $$;

DO $$ BEGIN RAISE NOTICE '029 — ALL CHECKS PASSED'; END $$;

ROLLBACK;
