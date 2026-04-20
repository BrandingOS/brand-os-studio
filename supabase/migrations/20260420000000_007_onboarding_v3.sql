-- ============================================================================
-- Phase: Onboarding v3
-- ============================================================================
-- Creates the onboarding-scratch storage bucket with per-user RLS policies,
-- and a rate-limit table (server-side only) for AI function call throttling.
-- ============================================================================

-- ─── 1. Storage buckets ─────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-scratch', 'onboarding-scratch', false)
ON CONFLICT (id) DO NOTHING;

-- brand-assets bucket assumed to already exist. If not, uncomment:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('brand-assets', 'brand-assets', false)
-- ON CONFLICT (id) DO NOTHING;

-- ─── 2. Storage policies on onboarding-scratch ──────────────────────────────

CREATE POLICY "scratch_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-scratch'
  AND (storage.foldername(name))[1] IS NOT NULL
);

CREATE POLICY "scratch_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-scratch'
);

CREATE POLICY "scratch_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-scratch'
);

-- ─── 3. Rate-limit table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_rate_limits (
  id           BIGSERIAL    PRIMARY KEY,
  session_id   TEXT         NOT NULL,
  function_name TEXT        NOT NULL,
  called_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_rate_limits_session_fn_idx
  ON public.onboarding_rate_limits (session_id, function_name, called_at DESC);

ALTER TABLE public.onboarding_rate_limits ENABLE ROW LEVEL SECURITY;

-- Block all client access — this table is written/read by Edge Functions only
CREATE POLICY "rate_limits_no_client_access"
ON public.onboarding_rate_limits FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
