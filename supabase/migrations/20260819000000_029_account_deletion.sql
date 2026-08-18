-- ════════════════════════════════════════════════════════════════════════════
-- 029 — Account deletion with a grace period
-- ════════════════════════════════════════════════════════════════════════════
--
-- A user may ask for their account to be deleted. Nothing is destroyed on the
-- spot: a request row is written with a purge date `grace_days` out, the user
-- keeps full access, and they can cancel at any point in that window. A daily
-- cron Edge Function (`purge-deleted-accounts`) performs the erasure after it.
--
-- The grace period defaults to 7 DAYS because src/pages/legal/
-- AccountDeletionPage.tsx already publishes "permanently erased within 7 days".
-- That page is a promise we shipped; the product matches it rather than the
-- other way round. It is read from platform_config so it can be changed
-- without a migration if the copy ever changes.
--
-- WHY A TABLE AND NOT COLUMNS ON `profiles`
--   `profiles_update_own` (001:36) is `FOR UPDATE USING (id = auth.uid())` with
--   NO WITH CHECK and no column restriction, so ANY column added to profiles is
--   client-writable — a user could set their own purge date, in the past. This
--   table has no client write policy at all: request and cancel go through the
--   two SECURITY DEFINER functions below, which read auth.uid() and take no
--   user argument. The row also OUTLIVES the purge as the audit record.
--
-- WHY PENDING DELETION IS NOT `profiles.status`
--   `checkAccountStatus` (src/features/auth/session/authController.ts:97) signs
--   out anyone whose status is 'suspended' or 'banned'. Reusing status would
--   lock the user out of the very window in which they are meant to be able to
--   change their mind. profiles.status is NOT touched by this migration.
--
-- VERIFIED SCHEMA FACTS (checked against a real database, 2026-08-18)
--   * profiles.id DOES carry `REFERENCES auth.users(id) ON DELETE CASCADE`
--     (constraint `profiles_id_fkey`, confdeltype 'c'). It comes from the
--     original 20250905213158 migration; 001 recreates the table with
--     CREATE TABLE IF NOT EXISTS, so it never dropped it. Deleting the auth
--     user therefore cascades into profiles on its own.
--   * EXACTLY TWO foreign keys point AT profiles, both NO ACTION (confdeltype
--     'a'): announcements.created_by and platform_config.updated_by. They
--     block that cascade with 23503, which is why prepare_account_purge()
--     detaches them first — and why adminService.deleteUser() fails today for
--     any user who ever wrote an announcement.
--
-- Reversible: supabase/migrations/down/029_account_deletion.down.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. The request table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No FK to auth.users, deliberately: the row must SURVIVE the purge as the
  -- audit record of what was erased and when.
  user_id          UUID        NOT NULL,
  -- Snapshot. After the purge there is no profile and no auth row to join to.
  email            TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','cancelled','purging','purged','failed')),
  grace_days       INTEGER     NOT NULL DEFAULT 7 CHECK (grace_days BETWEEN 0 AND 90),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The moment the purge becomes due. Written by the RPC only.
  purge_after      TIMESTAMPTZ NOT NULL,
  cancelled_at     TIMESTAMPTZ,
  purge_started_at TIMESTAMPTZ,
  purged_at        TIMESTAMPTZ,
  attempts         INTEGER     NOT NULL DEFAULT 0,
  last_error       TEXT,
  reason           TEXT,
  -- What the purge actually did: workspaces deleted / transferred, counts.
  outcome          JSONB,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT account_deletion_requests_dates_sane
    CHECK (purge_after >= requested_at)
);

-- One LIVE request per user; historical rows accumulate freely.
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_active_uniq
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('pending', 'purging');

-- The cron's only query.
CREATE INDEX IF NOT EXISTS account_deletion_requests_due_idx
  ON public.account_deletion_requests (purge_after)
  WHERE status = 'pending';

-- Stale-lock reclaim + admin history.
CREATE INDEX IF NOT EXISTS account_deletion_requests_purging_idx
  ON public.account_deletion_requests (purge_started_at)
  WHERE status = 'purging';
CREATE INDEX IF NOT EXISTS account_deletion_requests_user_idx
  ON public.account_deletion_requests (user_id, requested_at DESC);

DROP TRIGGER IF EXISTS trg_account_deletion_requests_updated_at
  ON public.account_deletion_requests;
CREATE TRIGGER trg_account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.account_deletion_requests IS
  'A scheduled account erasure. Client-readable (own rows) and client-UNWRITABLE: '
  'created and cancelled only through request_account_deletion() / '
  'cancel_account_deletion(). Survives the purge as the audit record.';

-- ─── 2. RLS — read your own, write nothing ──────────────────────────────────

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS adr_select_own ON public.account_deletion_requests;
CREATE POLICY adr_select_own ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Support/compliance needs to see the queue. Read-only: even an admin must not
-- hand-edit a purge date, because the RPCs are the only audited path.
DROP POLICY IF EXISTS adr_select_admin ON public.account_deletion_requests;
CREATE POLICY adr_select_admin ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above());

-- NO INSERT / UPDATE / DELETE policy for any client role, deliberately.

-- ─── 3. Billing archive — the 7-year tax record that outlives the account ───
--
-- invoices.workspace_id is ON DELETE CASCADE (003:38), so purging the user's
-- workspace destroys the very records AccountDeletionPage.tsx promises to keep
-- "for up to 7 years as required by tax law". The tax-relevant fields are
-- copied here first. No user id, no workspace id, no email — nothing that
-- identifies a person, so retaining it does not undercut the erasure.

CREATE TABLE IF NOT EXISTS public.billing_archive (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT        NOT NULL UNIQUE,
  amount_paid       INTEGER     NOT NULL,
  currency          TEXT        NOT NULL,
  status            TEXT        NOT NULL,
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,
  invoice_created_at TIMESTAMPTZ,
  purged_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_archive ENABLE ROW LEVEL SECURITY;
-- No policy of any kind: service_role bypasses RLS, every client is denied.

COMMENT ON TABLE public.billing_archive IS
  'Tax records kept after an account is erased. Deliberately carries NO '
  'identifying column — see supabase/migrations/…029 and the retention promise '
  'in src/pages/legal/AccountDeletionPage.tsx.';

-- ─── 4. Column guard on public.profiles ─────────────────────────────────────
--
-- `profiles_update_own` lets a user update their own row with no column
-- restriction, so today a signed-in user can set their own `status`,
-- `suspension_reason` and `admin_notes` — i.e. un-suspend themselves, or
-- annotate the moderation record support reads. A WITH CHECK cannot fix this:
-- it is evaluated against NEW only and has no access to OLD, so it can express
-- "status must be 'active'" but not "status must not CHANGE" — and the former
-- would break the admin path.
--
-- A BEFORE UPDATE trigger can compare OLD and NEW. It reverts the privileged
-- columns for anyone who is not a trusted actor, so the write still SUCCEEDS
-- (no 42501 storm in the client) but silently has no effect on those columns.
-- Postgres evaluates the RLS WITH CHECK against the row AFTER BEFORE triggers,
-- so the two compose rather than fight.
--
-- Trusted actors:
--   * auth.uid() IS NULL — service_role, psql, and every SECURITY DEFINER
--     internal (handle_new_user's insert path lands here).
--   * is_super_admin()   — exactly matches `admin_profiles_all` (004:88), which
--     is the ONLY policy granting cross-user profile writes today. Moderators
--     cannot write profiles now and must not gain the ability here.

CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor UUID := (SELECT auth.uid());
BEGIN
  IF actor IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Identity is immutable from a client.
  NEW.id         := OLD.id;
  NEW.created_at := OLD.created_at;
  -- `email` mirrors auth.users and is maintained by handle_new_user(); letting
  -- a client rewrite it would desynchronise the two and break admin lookup.
  -- A real email change goes through supabase.auth.updateUser({email}), whose
  -- USER_UPDATED event re-syncs this column server-side.
  NEW.email      := OLD.email;
  -- Moderation state belongs to admins.
  NEW.status            := OLD.status;
  NEW.suspension_reason := OLD.suspension_reason;
  NEW.admin_notes       := OLD.admin_notes;

  -- Deliberately NOT guarded, i.e. still self-editable:
  --   full_name, avatar_url  — the user's own profile fields
  --   last_sign_in           — written by authController.updateLastSignIn (:119)
  --   updated_at             — owned by set_updated_at()
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();

-- Row identity, restored. 20250905213158:142 had this WITH CHECK; 001:36
-- recreated the policy without it. Belt and braces with the trigger above.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ─── 5. Grace period is configurable, with a hard default ───────────────────

CREATE OR REPLACE FUNCTION public.account_deletion_grace_days()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT GREATEST(0, LEAST(90, COALESCE(
    (SELECT (value #>> '{}')::INT
       FROM public.platform_config
      WHERE key = 'account_deletion_grace_days'
        AND jsonb_typeof(value) = 'number'),
    7)));
$$;

INSERT INTO public.platform_config (key, value)
VALUES ('account_deletion_grace_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── 6. Request / cancel / preview ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.request_account_deletion(_reason TEXT DEFAULT NULL)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  uid   UUID := (SELECT auth.uid());
  mail  TEXT;
  days  INTEGER := public.account_deletion_grace_days();
  row   public.account_deletion_requests;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Idempotent: asking twice returns the SAME request, it does not extend the
  -- window. A double-submit must never silently move the purge date.
  SELECT * INTO row FROM public.account_deletion_requests r
   WHERE r.user_id = uid AND r.status IN ('pending','purging')
   LIMIT 1;
  IF FOUND THEN RETURN row; END IF;

  SELECT p.email INTO mail FROM public.profiles p WHERE p.id = uid;
  IF mail IS NULL THEN
    SELECT u.email INTO mail FROM auth.users u WHERE u.id = uid;
  END IF;

  INSERT INTO public.account_deletion_requests
    (user_id, email, grace_days, purge_after, reason)
  VALUES
    (uid, COALESCE(mail, 'unknown'), days, now() + make_interval(days => days),
     NULLIF(left(COALESCE(_reason, ''), 500), ''))
  RETURNING * INTO row;

  -- Visible in the admin activity feed without widening any policy.
  INSERT INTO public.activity_log (user_id, event_type, title, description, metadata)
  VALUES (uid, 'account_deletion_requested', 'Account deletion requested',
          'Scheduled for ' || to_char(row.purge_after, 'YYYY-MM-DD'),
          jsonb_build_object('requestId', row.id, 'graceDays', days));

  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS public.account_deletion_requests
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  uid UUID := (SELECT auth.uid());
  row public.account_deletion_requests;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- 'purging' is NOT cancellable: by then the auth user is already gone and
  -- erasure has begun. Only 'pending' can be called back.
  UPDATE public.account_deletion_requests r
     SET status = 'cancelled', cancelled_at = now()
   WHERE r.user_id = uid AND r.status = 'pending'
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_pending_deletion_request' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.activity_log (user_id, event_type, title, metadata)
  VALUES (uid, 'account_deletion_cancelled', 'Account deletion cancelled',
          jsonb_build_object('requestId', row.id));

  RETURN row;
END;
$$;

-- What the confirmation dialog must be able to say, computed server-side so the
-- client is not stitching it together from RLS-filtered reads.
CREATE OR REPLACE FUNCTION public.account_deletion_preview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  uid UUID := (SELECT auth.uid());
  result JSONB;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  WITH owned AS (
    SELECT w.id,
           EXISTS (SELECT 1 FROM public.workspace_members m
                    WHERE m.workspace_id = w.id AND m.user_id <> uid) AS shared
      FROM public.workspaces w WHERE w.owner_id = uid
  ),
  doomed_ws AS (SELECT id FROM owned WHERE NOT shared),
  kept_ws   AS (SELECT id FROM owned WHERE shared),
  doomed_brands AS (
    SELECT b.id, b.name FROM public.brands b
     WHERE b.workspace_id IN (SELECT id FROM doomed_ws)
        OR (b.workspace_id IS NULL AND b.user_id = uid)
  )
  SELECT jsonb_build_object(
    'graceDays',            public.account_deletion_grace_days(),
    'workspacesDeleted',    (SELECT count(*) FROM doomed_ws),
    'workspacesTransferred',(SELECT count(*) FROM kept_ws),
    'transferTargets',      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('workspaceId', k.id, 'newOwnerEmail', s.email))
          FROM kept_ws k
          CROSS JOIN LATERAL (
            SELECT p.email FROM public.workspace_members m
              JOIN public.profiles p ON p.id = m.user_id
             WHERE m.workspace_id = k.id AND m.user_id <> uid
             ORDER BY m.role ASC, m.joined_at ASC NULLS LAST, m.created_at ASC
             LIMIT 1) s), '[]'::jsonb),
    'brandsDeleted',        (SELECT count(*) FROM doomed_brands),
    'brandNames',           COALESCE((SELECT jsonb_agg(t.name ORDER BY t.name)
                                        FROM (SELECT name FROM doomed_brands LIMIT 25) t), '[]'::jsonb),
    'designsDeleted',       (SELECT count(*) FROM public.designs d WHERE d.user_id = uid),
    'assetsDeleted',        (SELECT count(*) FROM public.assets a
                              WHERE a.brand_id IN (SELECT id FROM doomed_brands)),
    'imageProjectsDeleted', (SELECT count(*) FROM public.image_projects ip WHERE ip.user_id = uid),
    'creditsForfeited',     COALESCE((SELECT sum(ca.balance_credits) FROM public.credit_accounts ca
                                       WHERE ca.workspace_id IN (SELECT id FROM doomed_ws)), 0)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_account_deletion()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.account_deletion_preview()     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.account_deletion_grace_days()  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_deletion_preview()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_deletion_grace_days()  TO authenticated, service_role;

-- ─── 7. The purge, server-side ──────────────────────────────────────────────
--
-- Three functions, called in order by the Edge Function, because two of the
-- steps between them can only be done outside the database: deleting the auth
-- user through GoTrue's Admin API, and deleting storage BLOBS (removing
-- storage.objects rows from SQL would orphan the S3 objects forever, which is
-- the opposite of an erasure).
--
-- All are service_role-only. EXECUTE is revoked from anon + authenticated.

-- 7a. PREPARE. Everything that must happen BEFORE the auth user disappears:
--     detach the FKs that would block the delete, hand over shared workspaces,
--     archive the tax records, and hand back the storage prefixes to sweep.
CREATE OR REPLACE FUNCTION public.prepare_account_purge(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ws            RECORD;
  successor     UUID;
  transfers     JSONB := '[]'::jsonb;
  doomed_ws     UUID[] := '{}';
  doomed_brands UUID[] := '{}';
  archived      INTEGER := 0;
BEGIN
  -- (i) The two FKs that reference public.profiles(id) with NO ON DELETE
  --     action (006:202, 006:231). profiles.id itself is
  --     `REFERENCES auth.users(id) ON DELETE CASCADE`, so deleting the auth
  --     user cascades into profiles — and if this user ever wrote an
  --     announcement or touched platform_config, THAT cascade raises 23503 and
  --     the whole delete fails. Detach first, unconditionally. (This is also
  --     why adminService.deleteUser() is broken today for such a user.)
  UPDATE public.announcements   SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.platform_config SET updated_by = NULL WHERE updated_by = _user_id;
  UPDATE public.credit_ledger   SET created_by = NULL WHERE created_by = _user_id;

  -- (ii) Workspaces this user owns. Sole-member → doomed. Shared → transferred.
  --
  --      Destroying a shared workspace would delete OTHER people's brands,
  --      assets and paid subscription — data this user does not own and never
  --      consented to destroy, and it contradicts the warning copy ("the brands
  --      you own"). account_deletion_preview() discloses the transfer first.
  FOR ws IN SELECT w.id FROM public.workspaces w WHERE w.owner_id = _user_id LOOP
    SELECT m.user_id INTO successor
      FROM public.workspace_members m
     WHERE m.workspace_id = ws.id AND m.user_id <> _user_id
     -- workspace_role enum order is owner < admin < editor < exporter < viewer,
     -- so ASC puts the strongest remaining member first.
     ORDER BY m.role ASC, m.joined_at ASC NULLS LAST, m.created_at ASC
     LIMIT 1;

    IF successor IS NULL THEN
      doomed_ws := array_append(doomed_ws, ws.id);
    ELSE
      UPDATE public.workspaces SET owner_id = successor WHERE id = ws.id;
      INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
      VALUES (ws.id, successor, 'owner', now())
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
      -- brands.user_id is NOT NULL with no FK, so leaving the departing uid
      -- there would dangle. Repoint at the new owner.
      UPDATE public.brands SET user_id = successor
       WHERE workspace_id = ws.id AND user_id = _user_id;
      -- adopted_by / user_id here are NOT NULL and are brand-level facts the
      -- surviving members rely on, so they move rather than being cleared.
      UPDATE public.brand_kit_adoptions a SET adopted_by = successor
        FROM public.brands b
       WHERE b.id = a.brand_id AND b.workspace_id = ws.id AND a.adopted_by = _user_id;
      UPDATE public.guideline_presentations g SET user_id = successor
        FROM public.brands b
       WHERE b.id = g.brand_id AND b.workspace_id = ws.id AND g.user_id = _user_id;

      INSERT INTO public.notifications (user_id, type, title, body, href)
      VALUES (successor, 'system', 'You now own a workspace',
              'The previous owner deleted their BrandOS account. Ownership has passed to you.',
              '/settings/account');

      transfers := transfers || jsonb_build_object('workspaceId', ws.id, 'newOwner', successor);
    END IF;
    successor := NULL;
  END LOOP;

  -- (iii) Brands that will be destroyed: everything in a doomed workspace, plus
  --       every directly-owned (workspace-less) brand.
  SELECT COALESCE(array_agg(b.id), '{}') INTO doomed_brands
    FROM public.brands b
   WHERE b.workspace_id = ANY (doomed_ws)
      OR (b.workspace_id IS NULL AND b.user_id = _user_id);

  -- (iv) Tax records. invoices.workspace_id is ON DELETE CASCADE (003:38), so
  --      the workspace delete below would destroy the records that
  --      AccountDeletionPage.tsx promises to retain for 7 years. Copy the
  --      tax-relevant fields somewhere that carries no identifying column.
  INSERT INTO public.billing_archive
    (stripe_invoice_id, amount_paid, currency, status,
     period_start, period_end, invoice_created_at)
  SELECT i.stripe_invoice_id, i.amount_paid, i.currency, i.status,
         i.period_start, i.period_end, i.created_at
    FROM public.invoices i
   WHERE i.workspace_id = ANY (doomed_ws)
  ON CONFLICT (stripe_invoice_id) DO NOTHING;
  GET DIAGNOSTICS archived = ROW_COUNT;

  RETURN jsonb_build_object(
    'userId', _user_id,
    'workspacesDeleted',     COALESCE(to_jsonb(doomed_ws), '[]'::jsonb),
    'workspacesTransferred', transfers,
    'brandIds',              COALESCE(to_jsonb(doomed_brands), '[]'::jsonb),
    'invoicesArchived',      archived
  );
END;
$$;

-- 7b. PURGE. Called AFTER the auth user is gone and storage is swept.
--     Everything here is DELETE … WHERE / UPDATE … WHERE, so it is re-runnable.
CREATE OR REPLACE FUNCTION public.purge_account_data(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  doomed_brands UUID[];
  doomed_ws     UUID[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO doomed_ws
    FROM public.workspaces WHERE owner_id = _user_id;

  SELECT COALESCE(array_agg(b.id), '{}') INTO doomed_brands
    FROM public.brands b
   WHERE b.workspace_id = ANY (doomed_ws)
      OR (b.workspace_id IS NULL AND b.user_id = _user_id);

  -- ── (1) The user's own content inside SURVIVING brands ───────────────────
  -- Their comments are their words; delete them. comments.author_id is NOT NULL
  -- so anonymising is not an option, and a sentinel uuid would be worse.
  DELETE FROM public.comments      WHERE author_id = _user_id;
  DELETE FROM public.notifications WHERE user_id   = _user_id;

  -- Workflow records OTHER people depend on are anonymised, not erased.
  -- approvals.submitted_by is NOT NULL, so only the human-readable name can go;
  -- the bare uuid is left because it identifies nobody once auth.users and
  -- profiles are gone, and nulling it is not possible without dropping the
  -- other members' review history.
  UPDATE public.approvals SET submitted_by_name = 'Deleted user'
   WHERE submitted_by = _user_id;
  UPDATE public.approvals SET reviewed_by = NULL, reviewed_by_name = 'Deleted user'
   WHERE reviewed_by  = _user_id;
  UPDATE public.activity_log SET user_id = NULL, user_name = 'Deleted user'
   WHERE user_id = _user_id;
  UPDATE public.assets SET uploaded_by = NULL WHERE uploaded_by = _user_id;
  UPDATE public.workspace_members SET invited_by = NULL WHERE invited_by = _user_id;

  -- ── (2) Membership: leave every workspace and brand ──────────────────────
  DELETE FROM public.brand_members     WHERE user_id = _user_id;
  DELETE FROM public.workspace_members WHERE user_id = _user_id;

  -- ── (3) Brands the user owns. brand_id FKs cascade from here: assets,
  --        brand_folders, brand_kit_adoptions, brand_context_signals,
  --        brand_kit_state, brand_identity_publications, comments, approvals,
  --        designs, guideline_presentations → guideline_slides,
  --        image_projects → jobs → diagnostics. activity_log.brand_id and
  --        notifications.brand_id are ON DELETE SET NULL, not cascade.
  DELETE FROM public.brands WHERE id = ANY (doomed_brands);

  -- ── (4) Workspaces the user solely owned. Cascades: subscriptions,
  --        invoices (already archived in prepare_account_purge),
  --        usage_tracking, credit_accounts, credit_ledger, workspace_members.
  DELETE FROM public.workspaces w
   WHERE w.id = ANY (doomed_ws)
     AND NOT EXISTS (SELECT 1 FROM public.workspace_members m
                      WHERE m.workspace_id = w.id);

  -- ── (5) Rows keyed purely on the user ────────────────────────────────────
  -- designs / image_projects / image_generation_jobs / ai_rate_limits carry
  -- `REFERENCES auth.users(id) ON DELETE CASCADE` and are therefore ALREADY
  -- gone if the auth user was deleted first, as the Edge Function does. Kept
  -- explicitly so this function is also correct when called on its own.
  DELETE FROM public.designs               WHERE user_id = _user_id;
  DELETE FROM public.image_generation_jobs WHERE user_id = _user_id;
  DELETE FROM public.image_projects        WHERE user_id = _user_id;
  DELETE FROM public.ai_rate_limits        WHERE user_id = _user_id;
  DELETE FROM public.onboarding_answers    WHERE user_id = _user_id;
  DELETE FROM public.user_roles            WHERE user_id = _user_id;

  -- Ordered LAST among public tables: announcements / platform_config reference
  -- it with NO ON DELETE action (detached in prepare_account_purge).
  DELETE FROM public.profiles WHERE id = _user_id;

  -- ── (6) Tables outside this migration chain, best-effort ─────────────────
  -- public.early_access belongs to the landing page (005 guards it the same
  -- way) and keys on email, not user_id.
  IF to_regclass('public.early_access') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.early_access e
              USING public.account_deletion_requests r
              WHERE r.user_id = $1 AND lower(e.email) = lower(r.email)'
      USING _user_id;
  END IF;

  -- public.user_preferences arrives in migration 030. Guarded so 029 and 030
  -- can deploy in either order.
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_preferences WHERE user_id = $1' USING _user_id;
  END IF;

  RETURN jsonb_build_object(
    'brandsDeleted',     COALESCE(array_length(doomed_brands, 1), 0),
    'workspacesDeleted', COALESCE(array_length(doomed_ws, 1), 0));
END;
$$;

-- 7c. The object keys the Edge Function must remove from onboarding-scratch.
--     Storage's JS client cannot filter by owner, and 021 made those objects
--     owner-scoped rather than path-scoped, so the names have to come from SQL.
CREATE OR REPLACE FUNCTION public.owned_storage_object_names(_user_id UUID, _bucket TEXT)
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT o.name FROM storage.objects o
   WHERE o.bucket_id = _bucket AND o.owner = _user_id;
$$;

-- 7d. Claim / finish. Claiming makes the cron re-entrant.
CREATE OR REPLACE FUNCTION public.claim_due_account_deletions(_limit INT DEFAULT 25)
RETURNS SETOF public.account_deletion_requests
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Reclaim rows a previous run died inside.
  UPDATE public.account_deletion_requests
     SET status = 'pending', purge_started_at = NULL
   WHERE status = 'purging' AND purge_started_at < now() - INTERVAL '1 hour';

  RETURN QUERY
  UPDATE public.account_deletion_requests r
     SET status = 'purging', purge_started_at = now(), attempts = r.attempts + 1
   WHERE r.id IN (
     SELECT d.id FROM public.account_deletion_requests d
      WHERE d.status = 'pending' AND d.purge_after <= now() AND d.attempts < 5
      ORDER BY d.purge_after ASC
      LIMIT GREATEST(1, LEAST(200, _limit))
      FOR UPDATE SKIP LOCKED)
  RETURNING r.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_account_deletion(
  _id UUID, _ok BOOLEAN, _outcome JSONB DEFAULT NULL, _error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.account_deletion_requests
     SET status     = CASE WHEN _ok THEN 'purged'
                           WHEN attempts >= 5 THEN 'failed'
                           ELSE 'pending' END,
         purged_at  = CASE WHEN _ok THEN now() ELSE purged_at END,
         purge_started_at = CASE WHEN _ok THEN purge_started_at ELSE NULL END,
         outcome    = COALESCE(_outcome, outcome),
         last_error = CASE WHEN _ok THEN NULL ELSE left(COALESCE(_error, ''), 2000) END
   WHERE id = _id;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_purge(UUID)                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_account_data(UUID)                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owned_storage_object_names(UUID, TEXT)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_account_deletions(INT)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_account_deletion(UUID, BOOLEAN, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_purge(UUID)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_account_data(UUID)                           TO service_role;
GRANT EXECUTE ON FUNCTION public.owned_storage_object_names(UUID, TEXT)             TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_account_deletions(INT)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_account_deletion(UUID, BOOLEAN, JSONB, TEXT) TO service_role;

-- ─── 8. Guard rails — fail the migration loudly if an invariant did not take ─

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='account_deletion_requests' AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION '029: account_deletion_requests must not be client-writable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='billing_archive') THEN
    RAISE EXCEPTION '029: billing_archive must have no client policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='public.profiles'::regclass AND tgname='trg_profiles_guard_privileged') THEN
    RAISE EXCEPTION '029: the profiles privileged-column guard trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='profiles'
       AND policyname='profiles_update_own' AND with_check IS NOT NULL) THEN
    RAISE EXCEPTION '029: profiles_update_own must carry a WITH CHECK';
  END IF;

  RAISE NOTICE '029 OK — deletion requests are RPC-only; profiles moderation columns are admin-only.';
END $$;
