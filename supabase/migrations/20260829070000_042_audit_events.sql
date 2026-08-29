-- ============================================================================
-- 042 — the security audit log (docs/access-architecture/06 §4)
--
-- Separate from the product activity feed on purpose: `activity_log` answers "what
-- happened to this brand" for the people working on it; `audit_events` answers "who
-- changed who could do what" for the person who has to defend the account. Different
-- readers, different retention, different write path.
--
-- Append-only by construction: no UPDATE or DELETE policy exists for any client role, and
-- rows are written by triggers and SECURITY DEFINER functions, never by the browser.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id           bigserial PRIMARY KEY,
  -- No FK, deliberately, and for the same reason account_deletion_requests has none
  -- (029): an audit record has to OUTLIVE the thing it describes. "brand.deleted" and
  -- "member.removed" are written as the row disappears, and a cascade would take the
  -- evidence with it. prune_audit_events() ages orphans out.
  workspace_id uuid NOT NULL,
  brand_id     uuid,
  actor_id     uuid,
  actor_kind   text NOT NULL DEFAULT 'user' CHECK (actor_kind IN ('user','system','service')),
  action       text NOT NULL,
  target_kind  text,
  target_id    text,
  before       jsonb,
  after        jsonb,
  metadata     jsonb,
  ip           inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_workspace_idx ON public.audit_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_action_idx ON public.audit_events (workspace_id, action, created_at DESC);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_select ON public.audit_events;
CREATE POLICY audit_events_select ON public.audit_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('audit.view')));
-- deliberately no INSERT/UPDATE/DELETE policy

CREATE OR REPLACE FUNCTION public.record_audit(
  _workspace_id uuid, _action text, _target_kind text DEFAULT NULL, _target_id text DEFAULT NULL,
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL, _brand_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF _workspace_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.audit_events
    (workspace_id, brand_id, actor_id, actor_kind, action, target_kind, target_id, before, after, metadata)
  VALUES (_workspace_id, _brand_id, (SELECT auth.uid()),
          CASE WHEN (SELECT auth.uid()) IS NULL THEN 'system' ELSE 'user' END,
          _action, _target_kind, _target_id, _before, _after, _metadata);
END;
$$;
REVOKE ALL ON FUNCTION public.record_audit(uuid, text, text, text, jsonb, jsonb, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- ── the triggers that make privilege changes undeniable ─────────────────────
CREATE OR REPLACE FUNCTION public.audit_membership_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'member.joined';
    PERFORM public.record_audit(NEW.workspace_id, act, 'user', NEW.user_id::text, NULL,
      jsonb_build_object('role', NEW.role, 'mode', NEW.brand_access_mode,
                         'defaultBrandRole', NEW.default_brand_role));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_audit(OLD.workspace_id, 'member.removed', 'user', OLD.user_id::text,
      jsonb_build_object('role', OLD.role, 'mode', OLD.brand_access_mode), NULL);
  ELSE
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      -- an admin minting another admin is the event that matters most on a compromised
      -- account, so it is recorded under its own action (security review F9)
      act := CASE WHEN NEW.role = 'admin' THEN 'member.promoted_admin' ELSE 'member.role_changed' END;
      PERFORM public.record_audit(NEW.workspace_id, act, 'user', NEW.user_id::text,
        jsonb_build_object('role', OLD.role), jsonb_build_object('role', NEW.role));
    END IF;
    IF NEW.brand_access_mode IS DISTINCT FROM OLD.brand_access_mode
       OR NEW.default_brand_role IS DISTINCT FROM OLD.default_brand_role
       OR NEW.capability_overrides IS DISTINCT FROM OLD.capability_overrides THEN
      PERFORM public.record_audit(NEW.workspace_id, 'member.access_changed', 'user', NEW.user_id::text,
        jsonb_build_object('mode', OLD.brand_access_mode, 'defaultBrandRole', OLD.default_brand_role,
                           'overrides', OLD.capability_overrides),
        jsonb_build_object('mode', NEW.brand_access_mode, 'defaultBrandRole', NEW.default_brand_role,
                           'overrides', NEW.capability_overrides));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.record_audit(NEW.workspace_id, 'member.status_changed', 'user', NEW.user_id::text,
        jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_members_audit ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_membership_change();

CREATE OR REPLACE FUNCTION public.audit_brand_access_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.record_audit(OLD.workspace_id, 'brand_access.revoked', 'user', OLD.user_id::text,
      jsonb_build_object('role', OLD.role), NULL, OLD.brand_id);
  ELSE
    PERFORM public.record_audit(NEW.workspace_id,
      CASE TG_OP WHEN 'INSERT' THEN 'brand_access.granted' ELSE 'brand_access.changed' END,
      'user', NEW.user_id::text,
      CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('role', OLD.role, 'overrides', OLD.capability_overrides) END,
      jsonb_build_object('role', NEW.role, 'overrides', NEW.capability_overrides), NEW.brand_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_brand_access_audit ON public.brand_access;
CREATE TRIGGER trg_brand_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.brand_access
  FOR EACH ROW EXECUTE FUNCTION public.audit_brand_access_change();

CREATE OR REPLACE FUNCTION public.audit_invitation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_audit(NEW.workspace_id,
      CASE WHEN NEW.role = 'admin' THEN 'invitation.created_admin' ELSE 'invitation.created' END,
      'invitation', NEW.id::text, NULL,
      jsonb_build_object('email', NEW.email, 'role', NEW.role, 'mode', NEW.brand_access_mode));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.record_audit(NEW.workspace_id, 'invitation.' || NEW.status::text,
      'invitation', NEW.id::text, jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'email', NEW.email));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_invitations_audit ON public.workspace_invitations;
CREATE TRIGGER trg_workspace_invitations_audit
  AFTER INSERT OR UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.audit_invitation_change();

CREATE OR REPLACE FUNCTION public.audit_brand_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_audit(NEW.workspace_id, 'brand.created', 'brand', NEW.id::text,
      NULL, jsonb_build_object('name', NEW.name), NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    -- the row is about to be gone with everything under it: keep enough to answer
    -- "what was deleted, and how much of it"
    PERFORM public.record_audit(OLD.workspace_id, 'brand.deleted', 'brand', OLD.id::text,
      jsonb_build_object('name', OLD.name, 'slug', OLD.slug,
        'assets', (SELECT count(*) FROM public.assets a WHERE a.brand_id = OLD.id),
        'designs', (SELECT count(*) FROM public.designs d WHERE d.brand_id = OLD.id)),
      NULL, OLD.id);
  ELSE
    IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
      PERFORM public.record_audit(NEW.workspace_id,
        CASE WHEN NEW.archived_at IS NULL THEN 'brand.restored' ELSE 'brand.archived' END,
        'brand', NEW.id::text, NULL, NULL, NEW.id);
    END IF;
    IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
      PERFORM public.record_audit(NEW.workspace_id, 'brand.visibility_changed', 'brand', NEW.id::text,
        jsonb_build_object('isPublic', OLD.is_public), jsonb_build_object('isPublic', NEW.is_public), NEW.id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_brands_audit ON public.brands;
CREATE TRIGGER trg_brands_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.audit_brand_change();

CREATE OR REPLACE FUNCTION public.audit_share_link_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_audit(NEW.workspace_id, 'share.created', 'share_link', NEW.id::text,
      NULL, jsonb_build_object('targetKind', NEW.target_kind, 'hasPassword', NEW.password_hash IS NOT NULL,
                               'allowDownload', NEW.allow_download), NEW.brand_id);
  ELSIF NEW.revoked_at IS DISTINCT FROM OLD.revoked_at AND NEW.revoked_at IS NOT NULL THEN
    PERFORM public.record_audit(NEW.workspace_id, 'share.revoked', 'share_link', NEW.id::text,
      NULL, jsonb_build_object('targetKind', NEW.target_kind), NEW.brand_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_share_links_audit ON public.share_links;
CREATE TRIGGER trg_share_links_audit
  AFTER INSERT OR UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_share_link_change();

CREATE OR REPLACE FUNCTION public.audit_credit_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.kind IN ('grant','adjust') THEN
    PERFORM public.record_audit(NEW.workspace_id, 'credits.' || NEW.kind::text, 'credit_ledger', NEW.id::text,
      NULL, jsonb_build_object('amount', NEW.amount, 'reason', NEW.reason, 'balanceAfter', NEW.balance_after));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_credit_ledger_audit ON public.credit_ledger;
CREATE TRIGGER trg_credit_ledger_audit
  AFTER INSERT ON public.credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.audit_credit_grant();

-- ── retention, per workspace, by entitlement (043 supplies the numbers) ──────
CREATE OR REPLACE FUNCTION public.prune_audit_events()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE deleted int := 0; r record; days int;
BEGIN
  -- rows whose workspace is gone: keep a month, then let them go
  DELETE FROM public.audit_events a
   WHERE a.created_at < now() - interval '30 days'
     AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = a.workspace_id);

  FOR r IN SELECT id FROM public.workspaces LOOP
    days := 400;
    IF to_regprocedure('public.entitlement(uuid,text)') IS NOT NULL THEN
      EXECUTE 'SELECT public.entitlement($1, $2)' INTO days USING r.id, 'audit.retention_days';
    END IF;
    days := GREATEST(COALESCE(NULLIF(days, -1), 400), 30);
    WITH gone AS (
      DELETE FROM public.audit_events
       WHERE workspace_id = r.id AND created_at < now() - make_interval(days => days)
      RETURNING 1)
    SELECT deleted + count(*) INTO deleted FROM gone;
  END LOOP;
  RETURN deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.prune_audit_events() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
              AND tablename='audit_events' AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION '042 guard: audit_events is not append-only from the client''s view';
  END IF;
  IF has_table_privilege('authenticated', 'public.audit_events', 'INSERT') = false
     AND has_table_privilege('authenticated', 'public.audit_events', 'UPDATE') = false THEN
    NULL;  -- grants are absent, which is what we want
  END IF;
  RAISE NOTICE '042 OK — audit events';
END $$;
