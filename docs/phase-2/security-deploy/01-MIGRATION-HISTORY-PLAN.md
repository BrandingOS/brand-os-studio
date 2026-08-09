# 01 — Migration History Plan (009 / 010 resolution)

> Production has **never applied** 009 or 010, so we have freedom to clean up these unreleased
> migrations to produce a safer canonical history. This document classifies each and defines the
> repository's migration sequence **after** the security release.

## What 009 and 010 contain (VERIFIED)

**009_templates_phase_4**
- Creates `template_categories`, `templates` (+ indexes, RLS policies incl. `anon` read).
- `ALTER TABLE designs ADD COLUMN thumbnail_url / source_template_id / is_template /
  template_category_id` — **depends on a `designs` table that no migration creates.**
- `ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN` — the second admin flag.

**010_brand_kit_premium**
- `ALTER TABLE brands ADD COLUMN brand_kit_designs JSONB` (Phase-0 flagged as a dead column).
- Creates `brand_kit_exports` (+ index, RLS policies).

## Classification

| Migration | Classification | Why |
|---|---|---|
| **009** | **REQUIRES PRODUCT DECISION + REWORK BEFORE ANY DEPLOY** | Un-deployable as written (`ALTER TABLE designs` with no `designs` table → would error). Templates server-backing is Owner-Decision-7 CORE-keep but **deferred timing** (Stage 3+). `profiles.is_admin` is **SUPERSEDED** by the target single-admin-system (`platform_roles`, target-arch 03). |
| **009 → `profiles.is_admin` specifically** | **SUPERSEDED** | The target unifies admin rights into one `platform_roles` system; do not introduce a second `is_admin` column. |
| **010** | **KEEP FOR FUTURE (deferred)** | Premium/export feature; Owner Decision 7 defers marketplace/premium. `brands.brand_kit_designs` column is **likely dead/superseded** (no live reader — Phase-0 06). Has a working down migration. |

**Neither may deploy now.** Preserved (not deleted) in `supabase/deferred-migrations/` — because
"do not preserve merely because filenames exist" cuts both ways: they are kept only because the
*capabilities* (templates backing, exports) are on the roadmap, not because the files exist.

## Action taken (executed, reversible)
Relocated out of the push path (Supabase scans only `supabase/migrations/*.sql`):
```
supabase/migrations/20260504000000_009_templates_phase_4.sql  → supabase/deferred-migrations/
supabase/migrations/20260512230000_010_brand_kit_premium.sql  → supabase/deferred-migrations/
supabase/migrations/down/010_brand_kit_premium.down.sql       → supabase/deferred-migrations/down/
+ supabase/deferred-migrations/README.md (explains status + reintroduction rules)
```

## Repository migration sequence AFTER the security release

`supabase/migrations/` (the push path) — every file here either matches remote or is a security fix:
```
…001..007 (applied)
20260427000000_008_ai_rate_limits.sql          (applied in prod)
20260809000000_011_fix_workspace_member_escalation.sql   (security — to deploy)
20260809010000_012_restrict_profiles_visibility.sql      (security — to deploy)
```
→ `supabase db push` pending set = **exactly {011, 012}**. No gap problem (timestamp gaps are legal;
ordering is preserved).

`supabase/deferred-migrations/` (NOT scanned by push):
```
20260504000000_009_templates_phase_4.sql      (rework required before reuse)
20260512230000_010_brand_kit_premium.sql
down/010_brand_kit_premium.down.sql
README.md
```

## Reintroduction rules (when a deferred feature is actually built)
1. **Rework 009** so it no longer depends on a non-existent `designs` (create `designs` first, or
   split the `designs` ALTERs out). Drop `profiles.is_admin` in favor of `platform_roles`.
2. **Re-timestamp** the reworked migration to fall **after** the then-current production head.
3. Verify against a shadow DB, then move into `supabase/migrations/` and `db push`.
4. Never move 009/010 back as-is — 009 will fail and both carry deferred scope.

## Why this is safe
- Truthful history: remote will contain exactly what the push-path files contain.
- No `supabase migration repair`/history manipulation (which would make history lie about
  un-applied objects).
- Future `supabase db push` "does not unexpectedly deploy stale/deferred schema" — the explicit
  requirement — because the deferred schema is no longer on the push path.
