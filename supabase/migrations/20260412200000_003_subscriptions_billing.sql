-- ============================================================================
-- Phase 3: Subscriptions, Invoices, Usage Tracking
-- ============================================================================
-- Stripe billing tables. Writes are restricted to service_role (Edge Functions)
-- to prevent client-side tampering with subscription data.
-- ============================================================================

-- ─── 1. Subscriptions Table ─────────────────────────────────────────────────

CREATE TABLE public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'free',
  status                  TEXT NOT NULL DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at               TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions (stripe_customer_id);
CREATE INDEX idx_subscriptions_workspace ON public.subscriptions (workspace_id);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. Invoices Table ──────────────────────────────────────────────────────

CREATE TABLE public.invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_paid       INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  status            TEXT NOT NULL,
  invoice_url       TEXT,
  invoice_pdf       TEXT,
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_workspace ON public.invoices (workspace_id, created_at DESC);

-- ─── 3. Usage Tracking Table ────────────────────────────────────────────────

CREATE TABLE public.usage_tracking (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric        TEXT NOT NULL,
  value         BIGINT NOT NULL DEFAULT 0,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, metric, period_start)
);

CREATE INDEX idx_usage_workspace ON public.usage_tracking (workspace_id, metric);

CREATE TRIGGER trg_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. RLS Policies ────────────────────────────────────────────────────────

-- == Subscriptions ==
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their subscription
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, 'viewer'));

-- Only service_role can insert/update/delete (Edge Functions)
-- No INSERT/UPDATE/DELETE policies for authenticated role

-- == Invoices ==
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Only workspace owner/admin can view invoices
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, 'admin'));

-- Only service_role can insert/update/delete

-- == Usage Tracking ==
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Workspace members can view usage
DROP POLICY IF EXISTS "usage_select" ON public.usage_tracking;
CREATE POLICY "usage_select"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, 'viewer'));

-- Only service_role can insert/update/delete

-- ─── 5. Default Free Subscription for Existing Workspaces ───────────────────
-- Create a free subscription record for every workspace that doesn't have one.

DO $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN
    SELECT w.id, w.owner_id
    FROM public.workspaces w
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subscriptions s WHERE s.workspace_id = w.id
    )
  LOOP
    INSERT INTO public.subscriptions (workspace_id, stripe_customer_id, plan, status)
    VALUES (ws.id, 'pending_' || ws.id, 'free', 'active');
  END LOOP;
END;
$$;
