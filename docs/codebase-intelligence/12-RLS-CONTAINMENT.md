# 12 — RLS Containment: Workspace-Membership Privilege Escalation

> **Stage A — security containment only.** This is the single code change authorized in
> this work stream. Scope was held to the confirmed cross-tenant workspace-takeover
> vulnerability and its directly-related membership escalation path. No auth, service,
> store, or unrelated database code was touched.
> Evidence tags: **VERIFIED** (traced in code/SQL), **CANNOT VERIFY LIVE** (needs a running DB).

## 1. The vulnerability (recap, VERIFIED)

Confirmed in `11-CRITICAL-VERIFICATION.md` §7 (Verified P0 #1). The `wm_insert_admin`
policy from `supabase/migrations/20260412000000_001_workspaces_and_rls.sql:548-555`:

```sql
CREATE POLICY "wm_insert_admin" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK ( public.is_workspace_member(workspace_id, 'admin')
               OR (user_id = auth.uid() AND role = 'owner') );
```

The second disjunct is satisfiable by **any authenticated user** for **any** `workspace_id`:
`user_id = auth.uid()` and `role = 'owner'` are both attacker-controlled, and INSERT does not
require SELECT on the target workspace. The victim `workspace_id` is even readable by `anon`
via `brands_select_public` (`:590-593`) — public brand rows expose `workspace_id`.

The planted row becomes authoritative because `is_workspace_member()` (`:346-362`) is
`SECURITY DEFINER`, reads `workspace_members` directly (bypassing RLS), and uses
`role <= _min_role` over enum `workspace_role {owner<admin<editor<exporter<viewer}` — so
`is_workspace_member(victim,'admin')` returns true (`owner <= admin`). That cascades to
`workspaces_update_admin`, member management, `brands_*`/`assets_*` via `is_brand_member`'s
workspace fallback (`:397-404`), and subscription/invoice reads (003) — **full cross-tenant
takeover**. Migration 004's `admin_workspace_members_all` is permissive (OR) and cannot close it.

**Adjacent variant also found (VERIFIED):** `wm_update_admin` (`:557-560`) had a `USING` clause
but **no `WITH CHECK`**, so an already-legitimate admin could `UPDATE` their own row
`role: admin → owner` (self-promotion to owner) or overwrite the real owner's row. This is a
lesser, within-tenant escalation but part of the same "workspace membership privilege-escalation
path" named in scope, so it is fixed here too.

## 2. Constraint that shaped the fix — a legitimate self-insert-as-owner flow exists (VERIFIED)

The naive fix ("delete the self-owner clause") would break real functionality:
`SupabaseWorkspaceService.create()` (`src/core/adapters/database/SupabaseWorkspaceService.ts:40-58`,
called from `src/shared/store/workspaceStore.ts:85`) creates a workspace with
`owner_id = user.id`, then **client-side self-inserts** `(workspace_id, user_id=self,
role='owner')`. Without a self-insert path, creating an additional workspace would fail.

The signup path is different: `handle_new_user_workspace()` (`:411-451`) is `SECURITY DEFINER`
and bypasses RLS, so it never needed the policy clause. The `admin-invite` Edge Function uses the
service role and does not insert `workspace_members` at all (VERIFIED — it only touches
`auth.admin.inviteUserByEmail` + `early_access`).

**Therefore the fix must keep self-insert-as-owner but tie it to genuine ownership of the target
workspace.** `workspaces_insert_auth` (`:519-522`) enforces `owner_id = auth.uid()` at creation,
and changing `owner_id` afterward requires workspace-admin (which this fix prevents planting), so
`workspaces.owner_id` is a trustworthy ownership signal an attacker cannot forge for a victim.

## 3. The fix

Migration: **`supabase/migrations/20260809000000_011_fix_workspace_member_escalation.sql`**
(down: `supabase/migrations/down/011_fix_workspace_member_escalation.down.sql`). Idempotent
`DROP POLICY IF EXISTS` + `CREATE`.

**New helper** `public.is_workspace_owner(uuid)` — `SECURITY DEFINER`, mirrors
`is_workspace_member`. It is **required for correctness**, not decoration: at the instant
`SupabaseWorkspaceService.create()` self-inserts the owner row, no `workspace_members` row exists
yet, so `workspaces_select_member` would hide the just-created workspace from its own creator. An
inline `EXISTS (SELECT … FROM public.workspaces …)` inside the policy runs under the caller's RLS
and would therefore evaluate to false and **block the legitimate bootstrap**. A `SECURITY DEFINER`
helper reads `owner_id` directly (bypassing that RLS), exactly as `is_workspace_member` does. The
attacker's `auth.uid()` still never equals a victim workspace's `owner_id`, so the guard holds.

**INSERT** — self-insert-as-owner gated on real ownership:
```sql
WITH CHECK (
  public.is_workspace_member(workspace_id, 'admin')                 -- (a) admin adds members
  OR ( user_id = (SELECT auth.uid())
       AND role = 'owner'
       AND public.is_workspace_owner(workspace_id) )                -- (b) genuine owner bootstrap
);
```

**UPDATE** — add a `WITH CHECK` and an owner-row guard:
```sql
USING      ( public.is_workspace_member(workspace_id,'admin') AND role <> 'owner' )
WITH CHECK ( public.is_workspace_member(workspace_id,'admin') AND role <> 'owner' );
```

**DELETE** — left unchanged: `wm_delete_admin` already requires workspace-admin AND
`role != 'owner'`, so it has no cross-tenant or owner-seizure variant.

**Existing helpers left unchanged (deliberately):** `is_workspace_member` / `is_brand_member` are
correct — they only *read*. Their `SECURITY DEFINER` + `role <= _min_role` behavior was never the
bug; the bug was letting an attacker *write* the row they read. Once planting is blocked, the
helpers are safe. The only helper added is `is_workspace_owner` (§3), which is required to make
clause (b) evaluate correctly under RLS (see rationale above).

## 4. Why each legitimate flow still works (VERIFIED by predicate tracing)

| Flow | Path | Passes because |
|---|---|---|
| New-user personal workspace | `handle_new_user_workspace()` trigger | `SECURITY DEFINER` → RLS bypassed entirely |
| Create additional workspace | `SupabaseWorkspaceService.create()` | clause (b): caller owns the just-created workspace (`owner_id = self`) |
| Admin adds editor/viewer/exporter | client / admin UI | clause (a): `is_workspace_member(ws,'admin')` |
| Admin updates a non-owner member's role | client / admin UI | UPDATE `USING`+`WITH CHECK`: admin, target & new role `<> 'owner'` |
| Super-admin management | migration 004 `admin_workspace_members_all` FOR ALL | permissive OR, unaffected |

## 5. Why the exploit and its variants are now closed (VERIFIED by predicate tracing)

| Attack | New outcome | Reason |
|---|---|---|
| Authed user self-inserts `owner` into victim WS | **blocked** | clause (b) `is_workspace_owner(victim)` is false (victim `owner_id` ≠ attacker); clause (a) false (not a member) |
| Self-insert `editor`/`viewer` into victim WS | **blocked** | clause (a) false; clause (b) requires `role='owner'` |
| Admin self-promotes `admin → owner` (UPDATE) | **blocked** | new row `role = 'owner'` fails UPDATE `WITH CHECK` (`role <> 'owner'`) |
| Admin demotes/seizes the real owner's row (UPDATE) | **blocked** | target row `role = 'owner'` fails `USING` (`role <> 'owner'`) |
| Admin deletes the owner's row | **blocked** | pre-existing `wm_delete_admin` (`role != 'owner'`) |
| Post-attack helper authority | **not authoritative** | no planted row exists, so `is_workspace_member(victim,·)` returns false |

## 6. Adjacent membership RLS inspected for equivalent variants (VERIFIED)

| Policy | Self-insert / self-escalate variant? | Verdict |
|---|---|---|
| `wm_insert_admin` | had it | **FIXED** here |
| `wm_update_admin` | had it (admin→owner via missing WITH CHECK) | **FIXED** here |
| `wm_delete_admin` | none (requires admin + `role != 'owner'`) | safe, unchanged |
| `bm_insert` (brand_members, `:627-630`) | `WITH CHECK is_brand_member(brand_id,'admin')` — **no self-insert clause** | safe (requires existing brand/workspace admin), unchanged |
| `bm_update` / `bm_delete` (`:632-640`) | `USING is_brand_member(brand_id,'admin')` | safe — but note the same **missing-WITH-CHECK on `bm_update`** shape exists; it is NOT a cross-tenant hole (requires existing brand-admin) and brand roles have no "owner" tier, so no owner-seizure. Flagged for the Stage-B authz redesign, **not fixed here** (out of the confirmed-vuln scope). |
| `workspaces_insert_auth` (`:519-522`) | `owner_id = auth.uid()` | safe — this is the ownership anchor the fix relies on |

**Note carried to Stage B (not fixed now):** `bm_update` lacks a `WITH CHECK`, mirroring the
`wm_update` shape. It is not exploitable cross-tenant (needs existing brand/workspace-admin) and
brand membership has no owner tier, so it is a hardening item, not a containment item. Recorded in
the target-authz design rather than patched here to honor the "fix ONLY the confirmed
cross-tenant takeover" scope.

## 7. Verification status

- **Static proof: VERIFIED.** RLS predicate evaluation is deterministic; §5/§6 trace each
  attacker-controlled input against each policy clause and the enum ordering. The exploit's two
  necessary conditions (writable planted row + helper reading it) are broken at the write step.
- **Executable proof: shipped, run pending a DB.** `supabase/tests/011_workspace_member_escalation.test.sql`
  is a self-asserting script (each case `RAISE`s on the wrong outcome; ends with
  `✓ ALL 011 RLS ASSERTIONS PASSED`; wrapped in `BEGIN … ROLLBACK`, writes nothing). It encodes:
  Proof 1 (+1b) cross-tenant self-insert blocked; Proof 4 helper non-authoritative; Proof 2 admin
  can still add/update members; Proof 3a/3b/3c owner protected against promote/demote/delete; plus
  a regression case for the legitimate create-workspace owner bootstrap.
- **CANNOT VERIFY LIVE (this session):** no local Postgres / `psql` is available and the full
  Supabase Docker stack was not started (cost + hang risk without GNU `timeout`). **Owner/CI runs:**
  ```bash
  supabase db reset          # applies migrations 001..011 to the local shadow DB
  psql "$LOCAL_DB_URL" -f supabase/tests/011_workspace_member_escalation.test.sql
  # expect: "✓ ALL 011 RLS ASSERTIONS PASSED", exit 0
  ```
  This test is the seed of the CI "RLS assertions" gate proposed in the Stage-B architecture
  (`docs/target-architecture/02-TARGET-ARCHITECTURE.md`).

## 8. Deploy note (VERIFIED repo-side; live state UNKNOWN)

Migration 001 is applied in production (the app authenticates and reads brands), so the vulnerable
policy is live. This fix must be pushed with `supabase db push`. Per `11` §11, the repo cannot
confirm which later migrations (008–010) are already applied; 011 is independent of those and only
touches the two `workspace_members` policies, so it applies cleanly regardless. Recommend deploying
011 **before** any further Stage-B work.

## 9. Scope discipline

Changed: exactly two RLS policies on `public.workspace_members`, plus a new self-asserting test and
this doc. Not changed: helper functions, other tables' policies, auth flow, services, stores, the
`bm_update` hardening item (deferred to Stage B with rationale), and everything else. No
opportunistic refactor.
