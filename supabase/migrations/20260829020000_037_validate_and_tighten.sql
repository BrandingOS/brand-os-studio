-- ============================================================================
-- 037 — Validate and tighten tenancy (ADR-004, ADR-005)
--
--   • brands.workspace_id becomes NOT NULL (036 moved every brand into one)
--   • every brand-child table gets a composite FK
--       (brand_id, workspace_id) → brands(id, workspace_id) ON DELETE CASCADE
--     created NOT VALID, validated, then its old single-column brand_id FK is dropped
--     (the composite is a superset check) and workspace_id becomes NOT NULL
--   • brand_access gets both composite FKs: to brands and to workspace_members —
--     removing a membership removes every brand grant, by the database
--   • the four NOT VALID constraints from 017/032 are validated
--   • is_brand_member() is re-pointed at brand_access, THEN brand_members is dropped;
--     brand_members_legacy stays as a view for one release
--
-- Both role columns (role, role_v2) remain side by side; nothing compiled against the
-- old enum changes here — that is 039, in one transaction (DB review B1).
-- ============================================================================

-- ── counts captured for the guard rail ──────────────────────────────────────
CREATE TEMP TABLE tighten_before AS
SELECT 'assets' AS t, count(*) AS n FROM public.assets
UNION ALL SELECT 'designs', count(*) FROM public.designs
UNION ALL SELECT 'brand_folders', count(*) FROM public.brand_folders
UNION ALL SELECT 'brand_access', count(*) FROM public.brand_access;

-- ── brands ──────────────────────────────────────────────────────────────────
ALTER TABLE public.brands ALTER COLUMN workspace_id SET NOT NULL;

-- ── is_brand_member reads brand_access from now on ──────────────────────────
-- Same signature and semantics as 001's version, so every policy that still names it
-- keeps working between 037 and 039. brand_access roles map onto the old ordinal
-- (manager ⇒ admin, editor ⇒ editor, designer/viewer ⇒ viewer).
CREATE OR REPLACE FUNCTION public.is_brand_member(_brand_id uuid, _min_role public.workspace_role DEFAULT 'viewer')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_access ba
    WHERE ba.brand_id = _brand_id
      AND ba.user_id = (SELECT auth.uid())
      AND (CASE ba.role
             WHEN 'manager' THEN 'admin'::public.workspace_role
             WHEN 'editor'  THEN 'editor'::public.workspace_role
             ELSE 'viewer'::public.workspace_role END) <= _min_role
  ) OR EXISTS (
    SELECT 1
    FROM public.brands b
    JOIN public.workspace_members m ON m.workspace_id = b.workspace_id
    WHERE b.id = _brand_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role <= _min_role
  );
$$;

-- ── workspace_id is derived, never guessed ──────────────────────────────────
-- A brand created without a workspace lands in its creator's personal workspace
-- (mirrors 027's rule for image_projects); a child row created without one takes
-- its brand's. The composite FK then proves the value; these triggers only spare
-- callers from sending a value the database already knows.
CREATE OR REPLACE FUNCTION public.brands_default_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.id INTO NEW.workspace_id
      FROM public.workspaces w
     WHERE w.owner_id = COALESCE(NEW.user_id, (SELECT auth.uid())) AND w.deleted_at IS NULL
     ORDER BY w.is_personal DESC, w.created_at
     LIMIT 1;
    IF NEW.workspace_id IS NULL THEN
      RAISE EXCEPTION 'brand has no workspace and its creator owns none' USING ERRCODE = '23502';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_brands_default_workspace ON public.brands;
CREATE TRIGGER trg_brands_default_workspace
  BEFORE INSERT ON public.brands FOR EACH ROW EXECUTE FUNCTION public.brands_default_workspace();

CREATE OR REPLACE FUNCTION public.set_workspace_id_from_brand()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.brand_id IS NOT NULL THEN
    SELECT b.workspace_id INTO NEW.workspace_id FROM public.brands b WHERE b.id = NEW.brand_id;
  END IF;
  RETURN NEW;
END;
$$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations',
    'brand_identity_publications','image_projects','activity_log','notifications','brand_access'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_workspace_from_brand', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id_from_brand()',
                   'trg_' || t || '_workspace_from_brand', t);
  END LOOP;
END $$;
-- image_projects already had resolve_image_project_workspace (027); the new trigger is a
-- no-op when that one has filled the column, and the composite FK arbitrates.

-- ── purge_account_data: brand_members → brand_access ────────────────────────
-- 029's purge deletes the user's brand_members rows. Re-point that one reference at
-- brand_access by rewriting the function from its own definition; everything else in
-- it is untouched (Plan B extends it for last-owner succession).
DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef('public.purge_account_data(uuid)'::regprocedure) INTO def;
  IF def LIKE '%public.brand_members%' THEN
    EXECUTE replace(def, 'public.brand_members', 'public.brand_access');
  END IF;
END $$;

-- ── composite FKs on the brand-child tables ─────────────────────────────────
DO $$
DECLARE
  t text;
  old_fk text;
  brand_attnum int2;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations',
    'brand_identity_publications','image_projects'
  ] LOOP
    -- composite FK, validated
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_brand_workspace_fk') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (brand_id, workspace_id)
           REFERENCES public.brands (id, workspace_id) ON DELETE CASCADE NOT VALID',
        t, t || '_brand_workspace_fk');
    END IF;
    EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', t, t || '_brand_workspace_fk');

    -- workspace_id is now guaranteed present and correct
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL', t);

    -- drop the now-redundant single-column brand_id FK (whatever it was named)
    SELECT a.attnum INTO brand_attnum
      FROM pg_attribute a WHERE a.attrelid = ('public.' || quote_ident(t))::regclass AND a.attname = 'brand_id';
    FOR old_fk IN
      SELECT c.conname FROM pg_constraint c
       WHERE c.conrelid = ('public.' || quote_ident(t))::regclass
         AND c.contype = 'f'
         AND c.conkey = ARRAY[brand_attnum]
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, old_fk);
    END LOOP;
  END LOOP;
END $$;

-- image_projects had its own workspace FK (nullable) — keep the column NOT NULL now that
-- 036 filled it from the brand; the composite FK above already pins it to the brand.

-- ── brand_access: pinned to the brand AND to the membership ─────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_access_brand_workspace_fk') THEN
    ALTER TABLE public.brand_access
      ADD CONSTRAINT brand_access_brand_workspace_fk FOREIGN KEY (brand_id, workspace_id)
      REFERENCES public.brands (id, workspace_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_access_membership_fk') THEN
    ALTER TABLE public.brand_access
      ADD CONSTRAINT brand_access_membership_fk FOREIGN KEY (workspace_id, user_id)
      REFERENCES public.workspace_members (workspace_id, user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── validate the constraints 017/032 left NOT VALID ─────────────────────────
ALTER TABLE public.assets  VALIDATE CONSTRAINT assets_origin_check;
ALTER TABLE public.assets  VALIDATE CONSTRAINT assets_fav_dislike_exclusive;
ALTER TABLE public.assets  VALIDATE CONSTRAINT assets_folder_fk;
ALTER TABLE public.designs VALIDATE CONSTRAINT designs_folder_fk;

-- ── retire brand_members ────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.brand_members CASCADE;
CREATE OR REPLACE VIEW public.brand_members_legacy AS
  SELECT id, brand_id, user_id,
         CASE role WHEN 'manager' THEN 'admin'::public.workspace_role
                   WHEN 'editor'  THEN 'editor'::public.workspace_role
                   ELSE 'viewer'::public.workspace_role END AS role,
         created_at
  FROM public.brand_access;
REVOKE ALL ON public.brand_members_legacy FROM PUBLIC, anon, authenticated;

-- ── guard rail ──────────────────────────────────────────────────────────────
DO $$
DECLARE r record; n bigint; t text;
BEGIN
  FOR r IN SELECT * FROM tighten_before LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.t) INTO n;
    IF n <> r.n THEN RAISE EXCEPTION '037 guard: %.count changed during tightening (% → %)', r.t, r.n, n; END IF;
  END LOOP;
  IF to_regclass('public.brand_members') IS NOT NULL THEN RAISE EXCEPTION '037 guard: brand_members still exists'; END IF;
  FOREACH t IN ARRAY ARRAY['assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations','brand_identity_publications','image_projects'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_brand_workspace_fk' AND convalidated) THEN
      RAISE EXCEPTION '037 guard: composite FK missing or not validated on %', t;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('assets_origin_check','assets_fav_dislike_exclusive','assets_folder_fk','designs_folder_fk') AND NOT convalidated) THEN
    RAISE EXCEPTION '037 guard: a 017/032 constraint is still NOT VALID';
  END IF;
  RAISE NOTICE '037 OK — tenancy tightened';
END $$;
DROP TABLE tighten_before;
