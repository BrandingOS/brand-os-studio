-- ─── 008 — AI rate limits ──────────────────────────────────────────────────
--
-- Replaces `onboarding_rate_limits` with a generalized `ai_rate_limits`
-- table that supports both authenticated (user-keyed) and onboarding-light
-- (session-keyed) rate limiting, secondary IP caps, and per-call cost
-- tracking for Anthropic spend visibility.
--
-- Identity is exclusive: either user_id OR session_id is set, never both.
-- Non-AI rate-limited functions (e.g. fetch-url-preview) leave the
-- AI metadata columns null.

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id                  BIGSERIAL    PRIMARY KEY,

  -- Identity (XOR — see check below).
  user_id             UUID         NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id          TEXT         NULL,

  -- Secondary identity for IP-based caps (session-keyed onboarding only).
  ip_address          INET         NULL,

  function_name       TEXT         NOT NULL,
  called_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- AI metadata — null for non-AI rate-limited calls.
  model               TEXT         NULL,
  input_tokens        INTEGER      NULL,
  output_tokens       INTEGER      NULL,
  cost_estimate_usd   NUMERIC(10,6) NULL,

  CONSTRAINT ai_rate_limits_identity_xor
    CHECK ((user_id IS NOT NULL) <> (session_id IS NOT NULL))
);

-- Indexes for the three rate-limit lookup patterns.
CREATE INDEX IF NOT EXISTS ai_rate_limits_user_fn_idx
  ON public.ai_rate_limits (user_id, function_name, called_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_rate_limits_session_fn_idx
  ON public.ai_rate_limits (session_id, function_name, called_at DESC)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_rate_limits_ip_fn_idx
  ON public.ai_rate_limits (ip_address, function_name, called_at DESC)
  WHERE ip_address IS NOT NULL;

-- Cost-summary lookups.
CREATE INDEX IF NOT EXISTS ai_rate_limits_called_at_idx
  ON public.ai_rate_limits (called_at DESC);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Block all client access. Only service role (Edge Functions) reads/writes.
-- Idempotent: drop-then-create so re-runs against a drifted DB succeed.
DROP POLICY IF EXISTS "ai_rate_limits_no_client_access" ON public.ai_rate_limits;
CREATE POLICY "ai_rate_limits_no_client_access"
ON public.ai_rate_limits FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- ─── Backfill existing rate-limit history ──────────────────────────────────
-- Preserve in-flight onboarding session rate-limit state so we don't
-- silently reset everyone's limits on deploy. Best-effort: filter source
-- rows to those that satisfy the new XOR identity check, so a single
-- malformed legacy row (null/empty session_id, null function_name) does
-- not fail the entire migration. Wrapped in a DO block guarded by a
-- table-exists check so re-runs after the legacy table is dropped pass
-- through silently.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'onboarding_rate_limits'
  ) THEN
    INSERT INTO public.ai_rate_limits (session_id, function_name, called_at)
    SELECT session_id, function_name, called_at
    FROM public.onboarding_rate_limits
    WHERE session_id IS NOT NULL
      AND session_id <> ''
      AND function_name IS NOT NULL;
  END IF;
END $$;

-- ─── Drop legacy table ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.onboarding_rate_limits;
