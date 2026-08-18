-- ════════════════════════════════════════════════════════════════════════════
-- 030 — Cross-device user preferences
-- ════════════════════════════════════════════════════════════════════════════
--
-- Today every one of these lives in localStorage and dies with the browser:
--   brandos:ui-preference   (useUiPreference.ts — studio | classic)
--   brandos-theme           (useWorkspaceTheme.ts, shared with next-themes)
--   brandos:inner-nav-open  (InnerNavRail.tsx)
--   brandos:ai-image:prefs  (generatePrefs.ts — brandAware/model/count)
--   brandos:features-seen   (useFeatureSeen.ts)
--   brandos-workspace       (workspaceStore.ts — last workspace id)
-- Change device and every one of them resets. This is their server home.
--
-- WHY A TABLE AND NOT `profiles.preferences JSONB`
--   1. `profiles` has NO INSERT policy for authenticated — rows appear only via
--      the SECURITY DEFINER handle_new_user() trigger. Fine for a column, but
--      it means every preference write is an UPDATE on the row that also holds
--      the moderation columns.
--   2. Migration 029 puts a BEFORE UPDATE guard on profiles. A preferences
--      column would have to be whitelisted through that guard forever, and
--      every future profiles column would need the same judgment call.
--   3. `trg_profiles_updated_at` fires on every profile update, so debounced
--      preference writes would make profiles.updated_at mean "someone toggled
--      a nav rail" — destroying it for admin triage.
--   4. Preferences are the highest-frequency per-user write in the app. They
--      should not contend with the moderation row, and a bad payload should
--      only ever be able to corrupt its own table.
--
-- SHAPE mirrors the client's `UserPreferences` object exactly, so the Supabase
-- implementation is a transport swap rather than a data-model change — the same
-- reasoning 018 used for brand_kit_state.
--
-- Reversible: supabase/migrations/down/030_user_preferences.down.sql
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_preferences (
  -- No FK to auth.users: keeps this table independent of the profiles/auth
  -- cascade chain, and 029's purge_account_data() deletes it explicitly (under
  -- a to_regclass guard, so 029 and 030 can deploy in either order).
  user_id     UUID        PRIMARY KEY,
  version     INTEGER     NOT NULL DEFAULT 1,
  preferences JSONB       NOT NULL DEFAULT '{}'::jsonb
                          CHECK (jsonb_typeof(preferences) = 'object'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_preferences IS
  'One row per user. `preferences` mirrors the client UserPreferences object '
  '(theme, uiPreference, innerNavOpen, aiGenerate, dismissed, lastWorkspaceId). '
  'localStorage remains the synchronous read cache; this row is the source of truth.';

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Self-scoped, all four verbs. Unlike account_deletion_requests this IS the
-- user's own data, so there is no reason to route it through an RPC.
DROP POLICY IF EXISTS user_preferences_select_own ON public.user_preferences;
CREATE POLICY user_preferences_select_own ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_preferences_insert_own ON public.user_preferences;
CREATE POLICY user_preferences_insert_own ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_preferences_update_own ON public.user_preferences;
CREATE POLICY user_preferences_update_own ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  -- The WITH CHECK is what stops a user re-parenting their row onto another
  -- uid — exactly the gap 029 closes on profiles.
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_preferences_delete_own ON public.user_preferences;
CREATE POLICY user_preferences_delete_own ON public.user_preferences
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Deliberately NO admin policy: preferences are not moderation data, and the
-- admin panel has no reason to read a user's nav-rail state.

-- A client-writable JSONB column is free storage unless it is bounded. 16 KB is
-- ~40x the largest realistic payload (features-seen with a hundred ids).
CREATE OR REPLACE FUNCTION public.user_preferences_size_guard()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF pg_column_size(NEW.preferences) > 16384 THEN
    RAISE EXCEPTION 'user_preferences payload too large (% bytes, max 16384)',
      pg_column_size(NEW.preferences) USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_preferences_size ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_size
  BEFORE INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.user_preferences_size_guard();

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Guard rails ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='user_preferences'
       AND cmd='UPDATE' AND with_check IS NOT NULL) THEN
    RAISE EXCEPTION '030: user_preferences UPDATE must carry a WITH CHECK';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='user_preferences'
       AND cmd <> 'INSERT'
       AND (qual IS NULL OR qual NOT LIKE '%auth.uid()%')) THEN
    RAISE EXCEPTION '030: every user_preferences policy must be self-scoped';
  END IF;

  RAISE NOTICE '030 OK — user_preferences is self-scoped and size-bounded.';
END $$;
