-- ============================================================================
-- Admin: Early Access management columns + RLS
-- ============================================================================

-- Add status and admin_notes to early_access
ALTER TABLE public.early_access
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_early_access_status ON public.early_access (status);
CREATE INDEX IF NOT EXISTS idx_early_access_created ON public.early_access (created_at DESC);

-- Admin RLS policy — super admins can read/write all early_access rows
CREATE POLICY "admin_early_access_all" ON public.early_access
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
