# ADR-004 · Every brand belongs to exactly one workspace

**Status:** accepted 2026-08-29

**Context.** `brands.workspace_id` is nullable; workspace-less brands are owned by
`user_id`, which forced the dual predicate in `can_view_brand` and left half the tables
on the older helper (01 §1.5-10).

**Decision.** Backfill workspace-less brands into the creator's personal workspace, then
`NOT NULL`. `user_id` remains as creator attribution only. Brand access derives from the
workspace and `brand_access`; there is no user-owned brand.

**Consequences.** One predicate family everywhere; the personal workspace is a real
workspace, so a solo user who later invites a colleague needs no migration of their brands.
