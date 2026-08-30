-- Down for 040. Order matters: the table's triggers depend on the validator functions, so
-- the table goes first. (Rollback rehearsal, 2026-08-30.)
DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP FUNCTION IF EXISTS public.accept_invitation(text);
DROP FUNCTION IF EXISTS public.invitation_preview(text);
DROP FUNCTION IF EXISTS public.revoke_invitation(uuid);
DROP FUNCTION IF EXISTS public.resend_invitation(uuid);
DROP FUNCTION IF EXISTS public.create_invitation(uuid, text, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.validate_invitation_grants() CASCADE;
DROP FUNCTION IF EXISTS public.hash_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.new_invite_token() CASCADE;
