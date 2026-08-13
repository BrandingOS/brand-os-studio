-- ============================================================================
-- Phase 2: Comments, Approvals, Activity Log, Notifications
-- ============================================================================
-- Migrates four localStorage-backed features to Supabase with proper RLS.
-- ============================================================================

-- ─── 1. Comments Table ──────────────────────────────────────────────────────

CREATE TABLE public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL,
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  page_key    TEXT NOT NULL,
  anchor      TEXT,
  author_id   UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  body        TEXT NOT NULL,
  mentions    UUID[] DEFAULT '{}',
  parent_id   UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  resolved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_brand_page ON public.comments (brand_id, page_key);
CREATE INDEX idx_comments_thread ON public.comments (thread_id);
CREATE INDEX idx_comments_parent ON public.comments (parent_id);

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. Approvals Table ─────────────────────────────────────────────────────

CREATE TABLE public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  ref_id          TEXT NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  thumbnail_url   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  submitted_by    UUID NOT NULL,
  submitted_by_name TEXT,
  reviewed_by     UUID,
  reviewed_by_name TEXT,
  reviewed_at     TIMESTAMPTZ,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approvals_brand ON public.approvals (brand_id);
CREATE INDEX idx_approvals_status ON public.approvals (brand_id, status);

CREATE TRIGGER trg_approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Activity Log Table (append-only) ────────────────────────────────────

CREATE TABLE public.activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  brand_name  TEXT,
  user_id     UUID,
  user_name   TEXT,
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_brand ON public.activity_log (brand_id, created_at DESC);
CREATE INDEX idx_activity_user ON public.activity_log (user_id, created_at DESC);

-- ─── 4. Notifications Table ─────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  href        TEXT,
  brand_id    UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read = false;

-- ─── 5. RLS Policies ────────────────────────────────────────────────────────

-- == Comments ==
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));

DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_brand_member(brand_id, 'viewer')
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "comments_update" ON public.comments;
CREATE POLICY "comments_update"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_brand_member(brand_id, 'editor')
  );

DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_brand_member(brand_id, 'admin')
  );

-- == Approvals ==
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals_select" ON public.approvals;
CREATE POLICY "approvals_select"
  ON public.approvals FOR SELECT
  TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));

DROP POLICY IF EXISTS "approvals_insert" ON public.approvals;
CREATE POLICY "approvals_insert"
  ON public.approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_brand_member(brand_id, 'editor')
    AND submitted_by = auth.uid()
  );

DROP POLICY IF EXISTS "approvals_update" ON public.approvals;
CREATE POLICY "approvals_update"
  ON public.approvals FOR UPDATE
  TO authenticated
  USING (public.is_brand_member(brand_id, 'editor'));

DROP POLICY IF EXISTS "approvals_delete" ON public.approvals;
CREATE POLICY "approvals_delete"
  ON public.approvals FOR DELETE
  TO authenticated
  USING (public.is_brand_member(brand_id, 'admin'));

-- == Activity Log (append-only for users, read by workspace members) ==
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON public.activity_log;
CREATE POLICY "activity_select"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    -- Can see activity for brands in your workspace
    (brand_id IS NOT NULL AND public.is_brand_member(brand_id, 'viewer'))
    -- Can see your own activity
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "activity_insert" ON public.activity_log;
CREATE POLICY "activity_insert"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE policies — activity log is immutable

-- == Notifications ==
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Any auth user can create notifications for others

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
