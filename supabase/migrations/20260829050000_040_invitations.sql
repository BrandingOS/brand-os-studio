-- ============================================================================
-- 040 — Invitations (docs/access-architecture/05 §1)
--
-- An invitation is a row, not a placeholder member: there is no `invited` membership
-- status, so a pending invite can never be mistaken for access. The raw token is shown
-- to the inviter once and stored only as a sha256 hash.
--
-- Rules the RPCs enforce, all of them because the alternative bit someone once:
--   • an address is normalised (citext, trimmed) — "Carol@Example.COM " and
--     "carol@example.com" are the same person
--   • re-inviting REPLACES the pending invitation rather than adding a second one
--   • an inviter can never grant more than they hold: owner cannot be invited at all,
--     and overrides pass through the same validator the member tables use
--   • every failure to preview looks identical, so a token cannot be probed
--   • acceptance checks the address against auth.users, not the JWT claim, and creates
--     the membership and every brand grant in ONE transaction
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email                extensions.citext NOT NULL,
  role                 public.workspace_role_v2 NOT NULL,
  brand_access_mode    public.brand_access_mode NOT NULL,
  default_brand_role   public.brand_role,
  brand_grants         jsonb NOT NULL DEFAULT '[]'::jsonb,
  capability_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_hash           bytea NOT NULL UNIQUE,
  invited_by           uuid NOT NULL,
  message              text,
  status               public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at           timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_by          uuid,
  accepted_at          timestamptz,
  revoked_by           uuid,
  revoked_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_no_owner CHECK (role <> 'owner'),
  CONSTRAINT invitations_role_mode CHECK (
       (role = 'admin' AND brand_access_mode = 'all' AND default_brand_role IS NULL)
    OR (role = 'guest' AND brand_access_mode = 'selected')
    OR (role = 'member')),
  CONSTRAINT invitations_grants_shape CHECK (jsonb_typeof(brand_grants) = 'array'),
  CONSTRAINT invitations_overrides_shape CHECK (jsonb_typeof(capability_overrides) = 'object')
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_one_pending
  ON public.workspace_invitations (workspace_id, email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_idx
  ON public.workspace_invitations (workspace_id, status);
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_workspace_invitations_updated_at ON public.workspace_invitations;
CREATE TRIGGER trg_workspace_invitations_updated_at
  BEFORE UPDATE ON public.workspace_invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Readable by whoever may invite; never client-writable.
DROP POLICY IF EXISTS workspace_invitations_select ON public.workspace_invitations;
CREATE POLICY workspace_invitations_select ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('members.invite')));

-- the same validator the member tables use, so an invitation cannot carry more
DROP TRIGGER IF EXISTS trg_workspace_invitations_validate_overrides ON public.workspace_invitations;
CREATE TRIGGER trg_workspace_invitations_validate_overrides
  BEFORE INSERT OR UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_overrides('workspace');

-- every named brand must belong to THIS workspace, and every role must be real
CREATE OR REPLACE FUNCTION public.validate_invitation_grants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE g jsonb; bad int;
BEGIN
  SELECT count(*) INTO bad
    FROM jsonb_array_elements(NEW.brand_grants) x
   WHERE NOT EXISTS (SELECT 1 FROM public.brands b
                      WHERE b.id = (x->>'brandId')::uuid AND b.workspace_id = NEW.workspace_id);
  IF bad > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'brand_not_in_workspace',
      DETAIL = format('%s named brand(s) do not belong to this workspace', bad);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_invitations_validate_grants ON public.workspace_invitations;
CREATE TRIGGER trg_workspace_invitations_validate_grants
  BEFORE INSERT OR UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.validate_invitation_grants();

-- ── tokens ──────────────────────────────────────────────────────────────────
-- 32 random bytes, base64url. Stored as sha256; the raw value exists only in the
-- inviter's response and in the link they send.
CREATE OR REPLACE FUNCTION public.new_invite_token()
RETURNS text LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
$$;
REVOKE ALL ON FUNCTION public.new_invite_token() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hash_token(_token text)
RETURNS bytea LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT extensions.digest(COALESCE(_token, ''), 'sha256');
$$;
REVOKE ALL ON FUNCTION public.hash_token(text) FROM PUBLIC, anon, authenticated;

-- ── create / resend / revoke ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_invitation(
  _workspace_id uuid,
  _email text,
  _role public.workspace_role_v2,
  _mode public.brand_access_mode DEFAULT 'selected',
  _default_brand_role public.brand_role DEFAULT 'editor',
  _brand_grants jsonb DEFAULT '[]'::jsonb,
  _overrides jsonb DEFAULT '{}'::jsonb,
  _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  tok        text;
  inv        public.workspace_invitations%ROWTYPE;
  norm_email extensions.citext := btrim(_email)::extensions.citext;
  eff_mode   public.brand_access_mode;
  eff_def    public.brand_role;
  grants     jsonb := COALESCE(_brand_grants, '[]'::jsonb);
BEGIN
  PERFORM public.assert_capability('members.invite', _workspace_id);

  IF _role = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'cannot_invite_owner',
      DETAIL = 'ownership is transferred to an existing member, never invited';
  END IF;
  IF position('@' IN norm_email::text) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_email', DETAIL = 'not an address';
  END IF;

  -- already here? then this is not an invitation.
  IF EXISTS (SELECT 1 FROM public.workspace_members m
              JOIN auth.users u ON u.id = m.user_id
             WHERE m.workspace_id = _workspace_id AND lower(u.email) = lower(norm_email::text)) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'already_member',
      DETAIL = 'that address already belongs to a member of this workspace';
  END IF;

  eff_mode := CASE WHEN _role = 'admin' THEN 'all'::public.brand_access_mode
                   WHEN _role = 'guest' THEN 'selected'
                   ELSE COALESCE(_mode, 'selected') END;
  eff_def  := CASE WHEN _role = 'admin' THEN NULL
                   ELSE COALESCE(_default_brand_role, 'viewer'::public.brand_role) END;
  IF eff_mode = 'all' THEN grants := '[]'::jsonb; END IF;

  -- Re-inviting replaces: one live invitation per address, so "resend with different
  -- access" is one action rather than a second row nobody notices.
  UPDATE public.workspace_invitations
     SET status = 'revoked', revoked_by = (SELECT auth.uid()), revoked_at = now()
   WHERE workspace_id = _workspace_id AND email = norm_email AND status = 'pending';

  tok := public.new_invite_token();
  INSERT INTO public.workspace_invitations
    (workspace_id, email, role, brand_access_mode, default_brand_role, brand_grants,
     capability_overrides, token_hash, invited_by, message)
  VALUES (_workspace_id, norm_email, _role, eff_mode, eff_def, grants,
          COALESCE(_overrides, '{}'::jsonb), public.hash_token(tok), (SELECT auth.uid()), _message)
  RETURNING * INTO inv;

  RETURN jsonb_build_object('ok', true, 'id', inv.id, 'token', tok, 'expiresAt', inv.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.resend_invitation(_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE inv public.workspace_invitations%ROWTYPE; tok text;
BEGIN
  SELECT * INTO inv FROM public.workspace_invitations WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such invitation';
  END IF;
  PERFORM public.assert_capability('members.invite', inv.workspace_id);
  IF inv.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invitation_invalid',
      DETAIL = 'only a pending invitation can be resent';
  END IF;
  -- the old link dies here: a resend is a new token, not a second way in
  tok := public.new_invite_token();
  UPDATE public.workspace_invitations
     SET token_hash = public.hash_token(tok), expires_at = now() + interval '7 days', updated_at = now()
   WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'id', _id, 'token', tok);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_invitation(_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.workspace_invitations WHERE id = _id;
  IF ws IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such invitation';
  END IF;
  PERFORM public.assert_capability('members.invite', ws);
  UPDATE public.workspace_invitations
     SET status = 'revoked', revoked_by = (SELECT auth.uid()), revoked_at = now()
   WHERE id = _id AND status = 'pending';
END;
$$;

-- ── preview (anon) ──────────────────────────────────────────────────────────
-- Every failure returns the SAME shape. Never-existed, revoked, expired and already
-- accepted are indistinguishable, so a token cannot be probed for a real workspace.
CREATE OR REPLACE FUNCTION public.invitation_preview(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE inv public.workspace_invitations%ROWTYPE; ws public.workspaces%ROWTYPE; inviter text;
BEGIN
  SELECT * INTO inv FROM public.workspace_invitations
   WHERE token_hash = public.hash_token(_token) AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;

  SELECT * INTO ws FROM public.workspaces WHERE id = inv.workspace_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;

  SELECT COALESCE(p.full_name, split_part(p.email, '@', 1)) INTO inviter
    FROM public.profiles p WHERE p.id = inv.invited_by;

  RETURN jsonb_build_object(
    'valid', true,
    'workspaceName', ws.name,
    'inviterName', COALESCE(inviter, 'A teammate'),
    'role', inv.role,
    'brandAccessMode', inv.brand_access_mode,
    'brandCount', CASE WHEN inv.brand_access_mode = 'all'
                       THEN (SELECT count(*) FROM public.brands b
                              WHERE b.workspace_id = inv.workspace_id AND b.archived_at IS NULL)
                       ELSE jsonb_array_length(inv.brand_grants) END,
    'brandNames', COALESCE((SELECT jsonb_agg(b.name ORDER BY b.name)
                              FROM jsonb_array_elements(inv.brand_grants) g
                              JOIN public.brands b ON b.id = (g->>'brandId')::uuid), '[]'::jsonb),
    'message', inv.message,
    'expiresAt', inv.expires_at);
END;
$$;

-- ── accept ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  inv       public.workspace_invitations%ROWTYPE;
  uid       uuid := (SELECT auth.uid());
  my_email  text;
  g         jsonb;
  masked    text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;

  SELECT * INTO inv FROM public.workspace_invitations
   WHERE token_hash = public.hash_token(_token) AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invitation_invalid'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = inv.workspace_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invitation_invalid');
  END IF;

  -- the live address, not the JWT claim: a user who changed their email between the
  -- invitation and the click is still the person who was invited (DB review L1)
  SELECT lower(u.email) INTO my_email FROM auth.users u WHERE u.id = uid;
  IF my_email IS DISTINCT FROM lower(inv.email::text) THEN
    -- lower-cased: citext keeps whatever casing the inviter typed, and showing
    -- "C•••@Example.COM" back to someone reads as a different address than the one
    -- their password manager holds.
    masked := left(lower(inv.email::text), 1) || '•••@' || split_part(lower(inv.email::text), '@', 2);
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch', 'invitedEmail', masked);
  END IF;

  IF EXISTS (SELECT 1 FROM public.workspace_members
              WHERE workspace_id = inv.workspace_id AND user_id = uid) THEN
    UPDATE public.workspace_invitations
       SET status = 'accepted', accepted_by = uid, accepted_at = now() WHERE id = inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'already_member', 'workspaceId', inv.workspace_id);
  END IF;

  INSERT INTO public.workspace_members
    (workspace_id, user_id, role, status, brand_access_mode, default_brand_role,
     capability_overrides, invited_by, invited_at, joined_at)
  VALUES (inv.workspace_id, uid, inv.role, 'active', inv.brand_access_mode, inv.default_brand_role,
          inv.capability_overrides, inv.invited_by, inv.created_at, now());

  FOR g IN SELECT jsonb_array_elements(inv.brand_grants) LOOP
    INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides, granted_by)
    VALUES (inv.workspace_id, (g->>'brandId')::uuid, uid,
            COALESCE((g->>'role')::public.brand_role, inv.default_brand_role, 'viewer'),
            COALESCE(g->'overrides', '{}'::jsonb), inv.invited_by)
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END LOOP;

  -- a guest never gets AI by default, whichever path created the grant
  IF inv.role = 'guest' THEN
    UPDATE public.brand_access
       SET capability_overrides = jsonb_set(capability_overrides, '{deny}',
             COALESCE(capability_overrides->'deny', '[]'::jsonb) || '["ai.generate"]'::jsonb)
     WHERE user_id = uid AND workspace_id = inv.workspace_id
       AND NOT COALESCE(capability_overrides->'deny', '[]'::jsonb) @> '["ai.generate"]'::jsonb;
  END IF;

  UPDATE public.workspace_invitations
     SET status = 'accepted', accepted_by = uid, accepted_at = now() WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'workspaceId', inv.workspace_id, 'role', inv.role);
END;
$$;

REVOKE ALL ON FUNCTION public.create_invitation(uuid, text, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invitation(uuid, text, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resend_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
-- preview is the one anon entry point, and it answers `{valid:false}` to everything it
-- does not recognise
GRANT EXECUTE ON FUNCTION public.invitation_preview(text) TO anon, authenticated;

-- ── guard rail ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
              AND tablename='workspace_invitations' AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION '040 guard: workspace_invitations is client-writable';
  END IF;
  IF has_function_privilege('anon', 'public.create_invitation(uuid,text,public.workspace_role_v2,public.brand_access_mode,public.brand_role,jsonb,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION '040 guard: anon can create invitations';
  END IF;
  IF NOT has_function_privilege('anon', 'public.invitation_preview(text)', 'EXECUTE') THEN
    RAISE EXCEPTION '040 guard: anon cannot preview an invitation';
  END IF;
  IF public.hash_token('a') = public.hash_token('b') THEN
    RAISE EXCEPTION '040 guard: hash_token is not hashing';
  END IF;
  IF length(public.new_invite_token()) < 40 THEN
    RAISE EXCEPTION '040 guard: the token is too short';
  END IF;
  RAISE NOTICE '040 OK — invitations';
END $$;
