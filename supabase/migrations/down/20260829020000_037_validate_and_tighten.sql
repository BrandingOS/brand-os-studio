-- Down for 037. Recreates brand_members (empty — its data lives in brand_access),
-- restores the single-column brand_id FKs, relaxes NOT NULL.
DROP VIEW IF EXISTS public.brand_members_legacy;
CREATE TABLE IF NOT EXISTS public.brand_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, user_id)
);
ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_access DROP CONSTRAINT IF EXISTS brand_access_brand_workspace_fk;
ALTER TABLE public.brand_access DROP CONSTRAINT IF EXISTS brand_access_membership_fk;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations','brand_identity_publications','image_projects'] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_brand_workspace_fk');
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id DROP NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE', t, t || '_brand_id_fkey');
  END LOOP;
END $$;
ALTER TABLE public.brands ALTER COLUMN workspace_id DROP NOT NULL;
-- is_brand_member stays pointed at brand_access (harmless while brand_members is empty).
