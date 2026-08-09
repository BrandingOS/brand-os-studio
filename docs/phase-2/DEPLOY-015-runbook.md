# Deploy runbook — migration 015 (designs table, server-backed designs)

Same shape as 013/014. **Additive, non-destructive, reversible.** Creates
`public.designs` (owner-scoped RLS) so authenticated users' saved designs persist
server-side (cross-device, survive cache-clear) instead of localStorage.

The application is **tolerant of the pre-015 state**: `SupabaseDesignStorage`
delegates to `LocalDesignStorage` on a `42P01`/`PGRST205` missing-table error and
merges any pre-015 local designs on read — so shipping the code before the deploy
causes no breakage and no data loss.

## 1. Command

```bash
supabase db push --linked   # applies 015; 011–014 already remote, skipped
```
Migration file: `supabase/migrations/20260812000000_015_designs.sql`.

## 2. Checks BEFORE
```bash
supabase migration list --linked   # 014 remote, 015 pending (local only)
```
Confirm 009/010 remain in `supabase/deferred-migrations/` (out of the push path).

## 3. Checks AFTER
```bash
supabase migration list --linked   # 015 in BOTH local + remote
```
```sql
SELECT to_regclass('public.designs');            -- not null
SELECT count(*) FROM pg_policies WHERE tablename='designs';  -- 1 (designs_owner_all)
```

## 4. SUCCESS
- `015` remote; `public.designs` exists with RLS enabled + `designs_owner_all`.
- An authenticated user saves a design, reloads / opens on another device → it loads
  from the server (not just this browser's localStorage).

## 5. STOP / FAILURE
- If `db push` errors, do NOT force. The app keeps working (designs fall back to
  localStorage). Rollback: `supabase/migrations/down/015_designs.down.sql`.

## Follow-on (not required for durable save)
- Brand/workspace-member SHARING of designs (currently owner-scoped RLS only).
- Regenerate `src/integrations/supabase/types` so `SupabaseDesignStorage` can drop
  its untyped-table cast.
- One-time backfill of existing localStorage designs → server (optional; the read
  merge already keeps them visible).
