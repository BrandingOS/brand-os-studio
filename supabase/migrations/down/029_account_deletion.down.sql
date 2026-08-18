-- Reverses 029.
--
-- Destroys the deletion-request audit trail and the billing archive, and
-- RESTORES the unrestricted profiles_update_own policy exactly as 001:36 left
-- it — which means it also restores the hole where a user can rewrite their own
-- `status` / `admin_notes`. This file exists for symmetry with the rest of
-- supabase/migrations/down/, not for routine use.
--
-- Safe to run with the client shipped: features/auth/deletion/accountDeletion.ts
-- treats a missing table/function (42P01 / PGRST202 / PGRST205) as "feature not
-- deployed" and hides the whole Danger-Zone control, the same way
-- SupabaseKitStateRepository treats a missing brand_kit_state.

DROP FUNCTION IF EXISTS public.finish_account_deletion(UUID, BOOLEAN, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.claim_due_account_deletions(INT);
DROP FUNCTION IF EXISTS public.owned_storage_object_names(UUID, TEXT);
DROP FUNCTION IF EXISTS public.purge_account_data(UUID);
DROP FUNCTION IF EXISTS public.prepare_account_purge(UUID);
DROP FUNCTION IF EXISTS public.account_deletion_preview();
DROP FUNCTION IF EXISTS public.cancel_account_deletion();
DROP FUNCTION IF EXISTS public.request_account_deletion(TEXT);
DROP FUNCTION IF EXISTS public.account_deletion_grace_days();

DELETE FROM public.platform_config WHERE key = 'account_deletion_grace_days';

DROP TABLE IF EXISTS public.account_deletion_requests;
DROP TABLE IF EXISTS public.billing_archive;

DROP TRIGGER  IF EXISTS trg_profiles_guard_privileged ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_guard_privileged_columns();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());
