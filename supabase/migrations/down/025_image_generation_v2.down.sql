-- Reverses 025. Destroys all generation jobs, projects and credit history.
DROP TRIGGER IF EXISTS trg_workspaces_credit_account ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace_credits();

DROP FUNCTION IF EXISTS public.grant_credits(UUID, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.release_credits(UUID, UUID, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.settle_credits(UUID, UUID, BIGINT, BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.reserve_credits(UUID, UUID, BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.ensure_credit_account(UUID);
DROP FUNCTION IF EXISTS public.default_credit_grant();

DROP TABLE IF EXISTS public.credit_ledger;
DROP TABLE IF EXISTS public.credit_accounts;
DROP TABLE IF EXISTS public.image_generation_job_diagnostics;
DROP TABLE IF EXISTS public.image_generation_jobs;
DROP TABLE IF EXISTS public.image_projects;

DROP TYPE IF EXISTS public.credit_entry_kind;
DROP TYPE IF EXISTS public.generation_job_status;
