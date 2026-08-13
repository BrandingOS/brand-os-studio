-- ============================================================================
-- Admin: Early Access management columns + RLS
-- ============================================================================

-- Add status and admin_notes to early_access
-- T087 FIX (2026-08-13): guarded on `public.early_access` existing.
-- That table belongs to the LANDING PAGE and was provisioned outside this
-- repository's migration chain, so no migration here creates it. On a fresh
-- database this file therefore died with "relation public.early_access does
-- not exist", blocking `supabase db reset`. The admin policy is applied only
-- when the table is present; production, where it exists, is unaffected —
-- and this version is already recorded as applied there in any case.

DO $guard$
BEGIN
  IF to_regclass('public.early_access') IS NULL THEN
    RAISE NOTICE 'Skipping early_access admin policy: table not present (landing-page table, provisioned outside this chain).';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.early_access
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT ''pending'',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_early_access_status ON public.early_access (status);
CREATE INDEX IF NOT EXISTS idx_early_access_created ON public.early_access (created_at DESC);

-- Admin RLS policy — super admins can read/write all early_access rows
DROP POLICY IF EXISTS "admin_early_access_all" ON public.early_access;
CREATE POLICY "admin_early_access_all" ON public.early_access
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());';
END $guard$;
