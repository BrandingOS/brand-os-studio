-- Reverses 030. Server-side preferences are lost; every user falls back to
-- whatever their browser's localStorage mirror holds, which is exactly the
-- pre-030 behaviour.
--
-- Safe to run with the client shipped: SupabaseUserPreferencesService delegates
-- to LocalUserPreferencesService on 42P01 / PGRST205, the same tolerance
-- SupabaseKitStateRepository has for a missing brand_kit_state. The legacy
-- localStorage keys are never deleted by the seeding path, so a rollback is a
-- no-op for the user rather than a data loss.

DROP TRIGGER  IF EXISTS trg_user_preferences_size ON public.user_preferences;
DROP FUNCTION IF EXISTS public.user_preferences_size_guard();
DROP TABLE    IF EXISTS public.user_preferences;
