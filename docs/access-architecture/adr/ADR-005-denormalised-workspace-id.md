# ADR-005 · Child tables carry `workspace_id`, enforced by composite FK

**Status:** accepted 2026-08-29

**Context.** RLS on `assets`, `designs`, `brand_folders` … is evaluated per row; deriving
the workspace by joining `brands` per row turns every list into a nested loop and makes
policies harder to read. The brief warned against casual denormalisation.

**Decision.** Add `workspace_id` to each brand-child table with FK
`(brand_id, workspace_id) → brands(id, workspace_id)` and an immutable-column trigger. The
database guarantees the copy is correct; policies can use either key. Set-returning helpers
(`brands_with_capability`) keep per-statement cost to one membership scan regardless.

**Consequences.** One extra uuid per row; migration 036/037 backfills and validates.
