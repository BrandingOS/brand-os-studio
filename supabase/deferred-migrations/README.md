# Deferred (unreleased) migrations — DO NOT deploy with the security release

These migrations were **never applied to production** (verified 2026-08-09 via
`supabase migration list --linked`: remote head is `008_ai_rate_limits`). They were moved
here, out of `supabase/migrations/`, so `supabase db push` deploys **only** the security
migrations 011 + 012 and cannot drag deferred/non-security schema into an urgent security
release. `supabase` scans only `supabase/migrations/*.sql`, so files here are ignored by push.

- **009_templates_phase_4** — templates/template_categories + `profiles.is_admin` + `designs`
  ALTERs. **Currently un-deployable**: it does `ALTER TABLE designs ...` but no migration ever
  creates `designs`, so applying it would ERROR. Needs rework before it can ever be applied.
  Owner scope: templates server-backing is a Stage-3+ concern (Owner Decision 7 = CORE-keep,
  but deferred timing). `profiles.is_admin` is superseded by the target single-admin-system
  (`platform_roles`).
- **010_brand_kit_premium** — `brands.brand_kit_designs` (likely dead column) + `brand_kit_exports`.
  Premium/export feature; Owner Decision 7 defers marketplace/premium. KEEP-FOR-FUTURE.

## Reintroducing (when the deferred feature is actually built)
1. Rework 009 so it no longer depends on a non-existent `designs` table (or create `designs` first).
2. Re-stamp with a fresh timestamp AFTER the then-current production head (so ordering stays clean).
3. Move back into `supabase/migrations/`, verify against a shadow DB, then `supabase db push`.
Do not simply move these back as-is — 009 will fail, and both carry owner-deferred scope.
