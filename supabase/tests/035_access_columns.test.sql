-- ============================================================================
-- 035 — access enums and columns. Self-asserting; BEGIN … ROLLBACK.
-- ============================================================================
BEGIN;
DO $$
BEGIN
  IF to_regtype('public.workspace_role_v2') IS NULL THEN RAISE EXCEPTION '035: workspace_role_v2 missing'; END IF;
  IF to_regtype('public.brand_role') IS NULL THEN RAISE EXCEPTION '035: brand_role missing'; END IF;
  IF to_regtype('public.member_status') IS NULL THEN RAISE EXCEPTION '035: member_status missing'; END IF;
  IF to_regtype('public.brand_access_mode') IS NULL THEN RAISE EXCEPTION '035: brand_access_mode missing'; END IF;
  IF to_regtype('public.invitation_status') IS NULL THEN RAISE EXCEPTION '035: invitation_status missing'; END IF;
  IF to_regtype('public.share_target') IS NULL THEN RAISE EXCEPTION '035: share_target missing'; END IF;
  -- 039 renames role_v2 → role, so assert the enum the column carries, not its name.
  IF (SELECT atttypid::regtype::text FROM pg_attribute
       WHERE attrelid='public.workspace_members'::regclass AND attname='role')
     <> 'workspace_role_v2' THEN
    RAISE EXCEPTION '035: workspace_members.role does not carry workspace_role_v2';
  END IF;
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='credits_monthly_cap';
  IF NOT FOUND THEN RAISE EXCEPTION '035: credits_monthly_cap missing'; END IF;
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='brands' AND column_name='archived_at';
  IF NOT FOUND THEN RAISE EXCEPTION '035: brands.archived_at missing'; END IF;
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='is_personal';
  IF NOT FOUND THEN RAISE EXCEPTION '035: workspaces.is_personal missing'; END IF;
  PERFORM 1 FROM pg_constraint WHERE conname='brands_id_workspace_unique';
  IF NOT FOUND THEN RAISE EXCEPTION '035: brands (id, workspace_id) unique missing'; END IF;
  PERFORM 1 FROM pg_extension WHERE extname='citext';
  IF NOT FOUND THEN RAISE EXCEPTION '035: citext not installed'; END IF;

  INSERT INTO public.workspaces (id,name,slug,owner_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000035','t','t-035','11111111-0000-0000-0000-000000000035');
  -- guest ⇒ selected
  BEGIN
    INSERT INTO public.workspace_members (workspace_id,user_id,role,brand_access_mode)
      VALUES ('aaaaaaaa-0000-0000-0000-000000000035','22222222-0000-0000-0000-000000000035','guest','all');
    RAISE EXCEPTION '035: guest with mode=all was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  -- admin ⇒ all + no default brand role
  BEGIN
    INSERT INTO public.workspace_members (workspace_id,user_id,role,brand_access_mode,default_brand_role)
      VALUES ('aaaaaaaa-0000-0000-0000-000000000035','33333333-0000-0000-0000-000000000035','admin','all','editor');
    RAISE EXCEPTION '035: admin with a default brand role was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  -- member is free
  INSERT INTO public.workspace_members (workspace_id,user_id,role,brand_access_mode,default_brand_role)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000035','44444444-0000-0000-0000-000000000035','member','selected','designer');
  RAISE NOTICE '✓ ALL 035 ASSERTIONS PASSED';
END $$;
ROLLBACK;
