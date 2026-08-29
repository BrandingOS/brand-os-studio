-- fixture: access
-- ============================================================================
-- 040 — invitations (docs/access-architecture/05 §1). Covers A9, A10, A28.
-- ============================================================================
BEGIN;

-- an owner invites; the raw token is returned exactly once
DO $$
DECLARE r jsonb; tok text; n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  r := public.create_invitation(pg_temp.ws('A'), 'Carol@Example.COM ', 'member', 'selected', 'editor',
        jsonb_build_array(jsonb_build_object('brandId', pg_temp.brand('A1')::text, 'role', 'editor')),
        '{}'::jsonb, 'join us');
  tok := r->>'token';
  IF tok IS NULL OR length(tok) < 40 THEN RAISE EXCEPTION '040: no usable token returned'; END IF;
  PERFORM pg_temp.back_to_super();

  -- stored hashed and case-folded, never in the clear
  SELECT count(*) INTO n FROM public.workspace_invitations
   WHERE workspace_id = pg_temp.ws('A') AND email = 'carol@example.com' AND status = 'pending';
  IF n <> 1 THEN RAISE EXCEPTION '040: the invitation was not stored normalised'; END IF;
  IF EXISTS (SELECT 1 FROM public.workspace_invitations WHERE token_hash::text LIKE '%' || tok || '%') THEN
    RAISE EXCEPTION '040: the raw token was stored';
  END IF;
  PERFORM set_config('test040.token', tok, true);
  RAISE NOTICE '✓ 040 create_invitation';
END $$;

-- anon may preview a live invitation, and learns nothing from a dead one
DO $$
DECLARE p jsonb;
BEGIN
  p := public.invitation_preview(current_setting('test040.token'));
  IF (p->>'valid')::boolean IS NOT TRUE THEN RAISE EXCEPTION '040: a live invitation did not preview'; END IF;
  IF (p->>'workspaceName') <> 'Kaafex' THEN RAISE EXCEPTION '040: preview lost the workspace name'; END IF;
  IF p ? 'email' THEN RAISE EXCEPTION '040: preview leaked the invited address'; END IF;

  p := public.invitation_preview('not-a-real-token-at-all-000000000000000000');
  IF (p->>'valid')::boolean IS NOT FALSE THEN RAISE EXCEPTION '040: an unknown token previewed as valid'; END IF;
  IF p ? 'workspaceName' THEN RAISE EXCEPTION '040: an invalid preview leaked a workspace name'; END IF;
  RAISE NOTICE '✓ 040 invitation_preview';
END $$;

-- A10 — an expired invitation cannot be accepted, and previews as invalid
DO $$
DECLARE r jsonb; p jsonb; tok text;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  r := public.create_invitation(pg_temp.ws('A'), 'late@example.com', 'member', 'all', 'viewer');
  tok := r->>'token';
  PERFORM pg_temp.back_to_super();
  UPDATE public.workspace_invitations SET expires_at = now() - interval '1 day'
   WHERE id = (r->>'id')::uuid;

  p := public.invitation_preview(tok);
  IF (p->>'valid')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'A10: an expired invitation previewed as valid'; END IF;

  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
  VALUES ('11111111-0000-0000-0000-0000000a0040','late@example.com','00000000-0000-0000-0000-000000000000',
          'authenticated','authenticated',now(),now(),'{}','{}',now());
  PERFORM pg_temp.act_as('11111111-0000-0000-0000-0000000a0040');
  r := public.accept_invitation(tok);
  IF (r->>'ok')::boolean IS NOT FALSE OR (r->>'error') <> 'invitation_invalid' THEN
    RAISE EXCEPTION 'A10: an expired invitation was accepted (%)', r;
  END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A10 invite.expired';
END $$;

-- A9 — a revoked invitation is dead
DO $$
DECLARE r jsonb; tok text;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  r := public.create_invitation(pg_temp.ws('A'), 'revoked@example.com', 'member', 'all', 'viewer');
  tok := r->>'token';
  PERFORM public.revoke_invitation((r->>'id')::uuid);
  PERFORM pg_temp.back_to_super();
  IF (public.invitation_preview(tok)->>'valid')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'A9: a revoked invitation still previews';
  END IF;
  RAISE NOTICE '✓ A9 invite.revoked_reuse';
END $$;

-- acceptance: the membership and every brand grant appear in one transaction, and the
-- address must match
DO $$
DECLARE r jsonb; n int; caps text[];
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
  VALUES ('11111111-0000-0000-0000-0000000c0040','carol@example.com','00000000-0000-0000-0000-000000000000',
          'authenticated','authenticated',now(),now(),'{}','{}',now()),
         ('11111111-0000-0000-0000-0000000e0040','eve@example.com','00000000-0000-0000-0000-000000000000',
          'authenticated','authenticated',now(),now(),'{}','{}',now());

  -- the wrong person cannot consume someone else's invitation
  PERFORM pg_temp.act_as('11111111-0000-0000-0000-0000000e0040');
  r := public.accept_invitation(current_setting('test040.token'));
  IF (r->>'error') <> 'email_mismatch' THEN RAISE EXCEPTION '040: a stranger accepted the invitation (%)', r; END IF;
  IF r->>'invitedEmail' NOT LIKE '%@example.com' OR r->>'invitedEmail' LIKE 'carol@%' THEN
    RAISE EXCEPTION '040: the mismatch message did not mask the address (%)', r->>'invitedEmail';
  END IF;
  PERFORM pg_temp.back_to_super();

  PERFORM pg_temp.act_as('11111111-0000-0000-0000-0000000c0040');
  r := public.accept_invitation(current_setting('test040.token'));
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '040: the invited user could not accept (%)', r; END IF;
  PERFORM pg_temp.back_to_super();

  SELECT count(*) INTO n FROM public.workspace_members
   WHERE workspace_id = pg_temp.ws('A') AND user_id = '11111111-0000-0000-0000-0000000c0040'
     AND role = 'member' AND brand_access_mode = 'selected';
  IF n <> 1 THEN RAISE EXCEPTION '040: acceptance did not create the membership'; END IF;
  SELECT count(*) INTO n FROM public.brand_access
   WHERE brand_id = pg_temp.brand('A1') AND user_id = '11111111-0000-0000-0000-0000000c0040' AND role = 'editor';
  IF n <> 1 THEN RAISE EXCEPTION '040: acceptance did not create the brand grant'; END IF;

  caps := public.effective_capabilities('11111111-0000-0000-0000-0000000c0040', pg_temp.ws('A'), pg_temp.brand('A1'));
  IF NOT (caps @> ARRAY['designs.edit']) THEN RAISE EXCEPTION '040: the accepted invitation granted nothing usable'; END IF;
  IF public.effective_capabilities('11111111-0000-0000-0000-0000000c0040', pg_temp.ws('A'), pg_temp.brand('A2')) @> ARRAY['brand.view'] THEN
    RAISE EXCEPTION '040: a selected-brands invitation reached a brand it did not name';
  END IF;

  -- the token is spent
  IF (public.invitation_preview(current_setting('test040.token'))->>'valid')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION '040: an accepted invitation is still live';
  END IF;
  RAISE NOTICE '✓ 040 accept_invitation';
END $$;

-- A28 — an invitation cannot grant more than the inviter could
DO $$
DECLARE r jsonb; ok boolean := false; ov jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));    -- admin
  BEGIN r := public.create_invitation(pg_temp.ws('A'), 'x@example.com', 'owner', 'all', NULL);
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'cannot_invite_owner'); END;
  IF NOT ok THEN RAISE EXCEPTION 'A28: an admin invited an owner'; END IF;

  -- an override outside the role's ceiling is stripped, not honoured
  r := public.create_invitation(pg_temp.ws('A'), 'y@example.com', 'member', 'all', 'viewer',
        '[]'::jsonb, '{"grant":["members.manage","brands.create"]}'::jsonb);
  SELECT capability_overrides INTO ov FROM public.workspace_invitations WHERE id = (r->>'id')::uuid;
  IF (ov->'grant') @> '["members.manage"]'::jsonb THEN
    RAISE EXCEPTION 'A28: an invitation carried a capability the role cannot hold';
  END IF;
  PERFORM pg_temp.back_to_super();

  -- a plain member cannot invite at all
  ok := false;
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  BEGIN r := public.create_invitation(pg_temp.ws('A'), 'z@example.com', 'member', 'all', 'viewer');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION 'A28: a member sent an invitation'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A28 invite.escalation';
END $$;

-- a second invitation to the same address REPLACES the first
DO $$
DECLARE a jsonb; b jsonb; n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  a := public.create_invitation(pg_temp.ws('A'), 'twice@example.com', 'member', 'all', 'viewer');
  b := public.create_invitation(pg_temp.ws('A'), 'twice@example.com', 'guest', 'selected', 'viewer');
  PERFORM pg_temp.back_to_super();
  SELECT count(*) INTO n FROM public.workspace_invitations
   WHERE workspace_id = pg_temp.ws('A') AND email = 'twice@example.com' AND status = 'pending';
  IF n <> 1 THEN RAISE EXCEPTION '040: % live invitations for one address', n; END IF;
  IF (public.invitation_preview(a->>'token')->>'valid')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION '040: the replaced invitation is still live';
  END IF;
  RAISE NOTICE '✓ 040 replace-on-reinvite';
END $$;

-- the table itself is not client-readable: a pending invitation is not a directory
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  SELECT count(*) INTO n FROM public.workspace_invitations;
  IF n <> 0 THEN RAISE EXCEPTION '040: a member read % invitation rows', n; END IF;
  PERFORM pg_temp.back_to_super();
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  SELECT count(*) INTO n FROM public.workspace_invitations WHERE workspace_id = pg_temp.ws('A');
  IF n = 0 THEN RAISE EXCEPTION '040: an owner cannot see their own pending invitations'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ ALL 040 ASSERTIONS PASSED';
END $$;
ROLLBACK;
