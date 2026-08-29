-- Down for 040.
DROP FUNCTION IF EXISTS public.accept_invitation(text);
DROP FUNCTION IF EXISTS public.invitation_preview(text);
DROP FUNCTION IF EXISTS public.revoke_invitation(uuid);
DROP FUNCTION IF EXISTS public.resend_invitation(uuid);
DROP FUNCTION IF EXISTS public.create_invitation(uuid, text, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.validate_invitation_grants();
DROP TABLE IF EXISTS public.workspace_invitations;
DROP FUNCTION IF EXISTS public.hash_token(text);
DROP FUNCTION IF EXISTS public.new_invite_token();
