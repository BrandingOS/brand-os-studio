# Access Architecture — 07 · Security Threat Model

Actors: **anon** (no JWT), **member** (any workspace role), **guest**, **removed member**
(stale tab), **workspace admin**, **platform admin**, **service role** (Edge Functions).
Assets: tenant data, credits, storage objects, tokens (invite/share), audit integrity.

## 1. Trust boundaries
1. PostgREST + RLS — the boundary for everything the browser reads/writes directly.
2. SECURITY DEFINER RPCs — the only way state that policies cannot express is changed
   (invites, accept, transfer ownership, checked updates, credits). Each starts with an
   explicit `has_capability` check and `search_path = ''`.
3. Edge Functions with service role — bypass RLS; therefore every one begins with
   `requireCaller` + `requireCapability`, never trusts a tenant id from the body, and resolves
   workspace from brand or membership.
4. Storage policies — path-encoded tenancy + `brands_with_capability`.
5. Client — UX only. Assumed hostile.

## 2. Attack matrix → control → test id
| # | attack | control | test |
|---|---|---|---|
| A1 | User A reads Brand B by id | `brands_select` = `id IN brands_with_capability('brand.view')` | `rls.brands.cross_tenant_read` |
| A2 | Body `workspaceId` swapped in an Edge Function | functions resolve ws via membership; `check-plan-limit` rewritten | `edge.plan_limit.foreign_ws` |
| A3 | Read another tenant's design | `designs` policy on brand capability (today: none) | `rls.designs.cross_brand` |
| A4 | Fetch storage object from another brand | path uuid + `brands_with_capability('brand.view')`; signed URLs are 1h for refs and **7 days** for outputs (down from 1 year) | `storage.cross_brand_object` |
| A5 | Call RPC directly despite hidden UI | every RPC checks capability | `rpc.*.denied` |
| A6 | Guest lists workspace members | `workspace_members_select` requires `members.view` (guest lacks) — guest sees only own row | `rls.members.guest_directory` |
| A7 | Viewer UPDATE via REST | all UPDATE policies require edit capability + `WITH CHECK` | `rls.*.viewer_update` |
| A8 | Removed member reuses old tab | membership row gone → every policy false; JWT still valid but yields nothing | `rls.removed_member` |
| A9 | Revoked invitation reused | status ≠ pending → `invalid` | `invite.revoked_reuse` |
| A10 | Expired invitation accepted | `expires_at` check inside `accept_invitation` | `invite.expired` |
| A11 | Member edits own role | trigger `self_role_change` + UPDATE policy excludes own row | `rls.members.self_role` |
| A12 | Admin promotes self to owner | `role='owner'` only writable via `transfer_ownership` (owner-only); direct UPDATE to owner refused by policy `WITH CHECK role <> 'owner'` | `rls.members.admin_to_owner` |
| A13 | Last owner leaves | `guard_last_owner` trigger | `invariant.last_owner` |
| A14 | User inserts `brand_access` row directly | INSERT policy requires `brand.access.manage` on that brand; composite FK forbids foreign brand/workspace | `rls.brand_access.self_grant` |
| A15 | Guess a share token | 256-bit random, sha256 stored, uniform `invalid`, password attempts rate-limited | `share.guess` |
| A16 | Change AI job's workspace id | jobs `workspace_id` derived server-side; client UPDATE policy limited to `status → cancelled` via RPC `cancel_job` (the column-free UPDATE policy is removed) | `rls.jobs.tamper` |
| A17 | Two requests spend the same credits | guarded UPDATE `balance >= amount` | `credits.concurrent_reserve` |
| A18 | Retry charges twice | job idempotency key + ledger idempotency | `credits.retry_idempotent` |
| A19 | Failed request holds credits forever | `credit_reservations.expires_at` + reaper | `credits.reservation_expiry` |
| A20 | Cross-workspace search leaks metadata | every list query is RLS-scoped; `my_access()` returns only own memberships; `profiles_select_coworkers` stays | `rls.profiles.coworker_only` |
| A21 | Realtime subscription leaks rows | Realtime honours RLS; test subscribes as guest and asserts no foreign rows | `realtime.guest_leak` |
| A22 | Audit log exposes another tenant | `audit_events_select` = `workspace_id IN workspaces_with_capability('audit.view')` | `rls.audit.cross_tenant` |
| A23 | Editor moves a brand to another workspace | `guard_immutable_columns` on `brands.workspace_id`; policy `WITH CHECK` | `rls.brands.reparent` |
| A24 | Admin inserts `super_admin` in `user_roles` | policy: admins may insert only `moderator`/`admin`; super_admin rows only via `is_super_admin()` | `rls.user_roles.escalation` |
| A25 | Unlimited workspaces = unlimited free credits | `workspaces.owned` entitlement in `create_workspace` RPC; direct INSERT policy removed; signup grant only for `is_personal` | `entitlement.workspace_cap` |
| A26 | `cleanup-onboarding-scratch` called by anyone | requires `x-cron-secret` like the purge function | `edge.cleanup.secret` |
| A27 | `finalize-onboarding-assets` moves another user's scratch | source `sessionId` must be owned by caller (`storage.objects.owner`) | `edge.finalize.session_idor` |
| A28 | Invite grants more than inviter could | overrides validated against role ceiling; inviter cannot invite above own role | `invite.escalation` |
| A29 | Text AI unmetered / session-key rotation | metered + user-keyed rate limit | `edge.text_ai.metered` |
| A30 | Anon enumerates identity publications | anon SELECT removed; RPC only | `share.enumerate` |

## 3. Service-role inventory (post-change) — every path names its gate
Documented in `08-migration-plan.md` §5 and enforced by a unit test
(`supabase/functions/__tests__/serviceRoleGates.test.ts`) that greps each function for
`createServiceClient(` and asserts a preceding `requireCaller(`/`requireCapability(`/
`requireCronSecret(` call in the same handler.

## 4. Things deliberately out of scope (and why they are safe to defer)
- CSP/HSTS headers on Pages — infrastructure, not tenant isolation; noted for the owner.
- `corsHeaders: *` — functions require a JWT; CORS is not an authz boundary. Noted.
- SSO/SAML/SCIM — extension points: `workspaces.settings.sso` reserved key; memberships already
  carry `invited_by` = null for provisioned users.
