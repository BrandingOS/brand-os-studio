# Access Architecture — 03 · Authorization Model

_One vocabulary, one resolver, two enforcement points (Postgres for security, React for UX)._

## 1. Capabilities — derived from the real surfaces in 01 §4

Naming: `<scope>.<area>.<verb>`. Workspace scope first, then brand scope.

### Workspace scope (context: `workspaceId`)
```
workspace.view                 see the workspace exists, its name, switch into it
workspace.settings.view
workspace.settings.edit        rename, logo, defaults
workspace.delete               soft-delete the workspace
workspace.transfer_ownership   promote another member to owner / demote self
workspace.billing.view         plan, invoices
workspace.billing.manage       Stripe checkout / portal
workspace.usage.view           credits balance, ledger, who consumed
workspace.credits.manage       manual adjustments (platform admins only in V1; reserved)
members.view                   the member directory
members.invite
members.manage                 change role, brand access, overrides, suspend
members.remove
brands.view                    list brands the caller can reach (always implied by any brand access)
brands.create
brands.delete                  hard delete a brand (also requires brand manager OR ws admin+)
audit.view                     the security audit log
activity.view                  the product activity feed (workspace-wide)
```

### Brand scope (context: `brandId`)
```
brand.view                     open the brand at all (implied by every other brand capability)
brand.settings.view
brand.settings.edit            name, slug, general, sharing tab
brand.archive
brand.access.view              who has access to this brand
brand.access.manage            grant/revoke brand_access rows, change brand roles
brand.setup.edit               Setup: colors, logos, fonts, icons, photos, websites, about
brand.strategy.edit            Strategy cards, import from brief, rebrand with AI, checkpoints
brand.kit.edit                 kit lifecycle (generate/approve/customise/upload deliverable)
brand.kit.export               export kit / download cards & bundles
brand.guideline.edit           build/rebuild/edit pages, write-back to brand (also needs setup/strategy edit for that)
brand.guideline.export
designs.create
designs.edit                   edit any design in the brand
designs.delete                 delete any design (own designs: implied by designs.create — see §4)
designs.export
templates.publish              save-as-template (private or community submission)
library.upload
library.edit                   rename, tags, category, move, folders
library.delete
ai.generate                    spend workspace credits on this brand
share.view                     see existing links
share.manage                   create/revoke share links, toggle public, publish identity
comments.create
approvals.review               approve/reject
activity.view                  brand activity feed
```

Platform roles (`user_roles`: super_admin/admin/moderator) are **out of this model**. They
gate `/admin/*` only and are unchanged, except the self-promotion hole is closed.

## 2. Role presets → capabilities (the matrix)

Stored in `role_capabilities(scope, role, capability)` seeded by migration; mirrored in
`src/shared/access/catalog.ts`; a unit test parses the migration and asserts parity.

### 2.1 Workspace roles
| capability | Owner | Admin | Member | Guest |
|---|:-:|:-:|:-:|:-:|
| workspace.view | ✅ | ✅ | ✅ | ✅ |
| workspace.settings.view | ✅ | ✅ | ✅ | — |
| workspace.settings.edit | ✅ | ✅ | — | — |
| workspace.delete | ✅ | — | — | — |
| workspace.transfer_ownership | ✅ | — | — | — |
| workspace.billing.view | ✅ | ✅ | — | — |
| workspace.billing.manage | ✅ | ✅ | — | — |
| workspace.usage.view | ✅ | ✅ | — | — |
| members.view | ✅ | ✅ | ✅ | — |
| members.invite | ✅ | ✅ | — | — |
| members.manage | ✅ | ✅ | — | — |
| members.remove | ✅ | ✅ | — | — |
| brands.view | ✅ | ✅ | ✅ | ✅ |
| brands.create | ✅ | ✅ | — | — |
| brands.delete | ✅ | ✅ | — | — |
| audit.view | ✅ | ✅ | — | — |
| activity.view (ws) | ✅ | ✅ | ✅ | — |

Overridable at workspace scope (`members.capability_overrides`): `brands.create`,
`workspace.usage.view`, `workspace.billing.view`, `members.view`, `activity.view`. Everything
else is role-bound — you cannot grant `members.manage` to a Member; make them an Admin.
Denies may remove any overridable capability from Member/Guest; Owner/Admin accept no overrides.

### 2.2 Brand roles
| capability | Manager | Editor | Designer | Viewer |
|---|:-:|:-:|:-:|:-:|
| brand.view | ✅ | ✅ | ✅ | ✅ |
| brand.settings.view | ✅ | ✅ | ✅ | ✅ |
| brand.settings.edit | ✅ | — | — | — |
| brand.archive | ✅ | — | — | — |
| brand.access.view | ✅ | ✅ | — | — |
| brand.access.manage | ✅ | — | — | — |
| brand.setup.edit | ✅ | ✅ | — | — |
| brand.strategy.edit | ✅ | ✅ | — | — |
| brand.kit.edit | ✅ | ✅ | — | — |
| brand.kit.export | ✅ | ✅ | ✅ | — |
| brand.guideline.edit | ✅ | ✅ | — | — |
| brand.guideline.export | ✅ | ✅ | ✅ | — |
| designs.create | ✅ | ✅ | ✅ | — |
| designs.edit | ✅ | ✅ | ✅ | — |
| designs.delete | ✅ | ✅ | — | — |
| designs.export | ✅ | ✅ | ✅ | — |
| templates.publish | ✅ | ✅ | ✅ | — |
| library.upload | ✅ | ✅ | ✅ | — |
| library.edit | ✅ | ✅ | ✅ | — |
| library.delete | ✅ | ✅ | — | — |
| ai.generate | ✅ | ✅ | ✅ | — |
| share.view | ✅ | ✅ | — | — |
| share.manage | ✅ | — | — | — |
| comments.create | ✅ | ✅ | ✅ | ✅ |
| approvals.review | ✅ | ✅ | — | — |
| activity.view (brand) | ✅ | ✅ | ✅ | — |

Overridable at brand scope (`brand_access.capability_overrides`): every brand capability
except `brand.view`, `brand.settings.edit`, `brand.access.manage`, `brand.archive`, `share.manage`
(manager-only, role-bound). So: a Viewer can be granted `designs.export` + `brand.guideline.export`
(the "client with exports" case); a Designer can be denied `ai.generate`; an Editor can be
granted `share.view`.

**Guest defaults:** the invite UI applies a guest template on top of the chosen brand role:
`ai.generate` denied unless the inviter ticks it (owner decision #2). Stored as a deny
override, so the backend stays purely capability-based.

## 3. Resolution — deterministic, one function

```
effective_capabilities(user, workspace, brand?) → set<capability>

1. platform super_admin        → all capabilities (admin surfaces only; never reached by product UI)
2. m := workspace_members(workspace, user); if none or status ≠ active or workspace.deleted → ∅
3. WS := role_capabilities('workspace', m.role) ⊕ m.capability_overrides   (grant ∪, then deny −)
4. if brand is null → return WS
5. b := brands(brand); if b.workspace_id ≠ workspace or b is null → ∅ (cross-tenant guess = nothing)
6. if b.archived_at not null and m.role ∉ {owner, admin} and brand role ≠ manager → {brand.view} only
7. brand role r :=
     m.role ∈ {owner, admin}                 → manager
     m.brand_access_mode = all               → brand_access(brand,user).role ?? m.default_brand_role
     m.brand_access_mode = selected          → brand_access(brand,user).role ?? NONE
   if r = NONE → return WS  (workspace caps only; the brand does not exist for them)
8. BR := role_capabilities('brand', r) ⊕ brand_access.capability_overrides
9. return WS ∪ BR
```

Overrides can only add capabilities from the overridable set for that scope and can never
add a capability the role's *ceiling* excludes: the trigger that validates
`capability_overrides` rejects anything outside `overridable_capabilities(scope, role)`.
Invitations carry overrides through the same validator, so an invite cannot grant more than a
member could hold (invariant "invitations cannot grant more permissions than intended").

**Resource-ownership rule (the only one):** `designs.delete` is also satisfied for a design
whose `user_id = auth.uid()` when the caller holds `designs.create` on that brand. Designers
can delete their own drafts and nobody else's. No other table has an ownership rule.

## 4. Enforcement

### 4.1 Postgres (security)
- `public.has_capability(_capability text, _workspace_id uuid, _brand_id uuid default null) → boolean`
  STABLE SECURITY DEFINER, implements §3 exactly.
- Set-returning helpers for RLS without per-row recursion:
  `public.brands_with_capability(_capability text) → SETOF uuid` and
  `public.workspaces_with_capability(_capability text) → SETOF uuid`, both STABLE. A policy
  written as `brand_id IN (SELECT public.brands_with_capability('designs.view'))` is
  evaluated once per statement (uncorrelated subquery → hashed), so listing 2,000 assets
  costs one membership scan, not 2,000.
- Every tenant table's policies are rewritten against these helpers, `TO authenticated`,
  with `WITH CHECK` on every INSERT/UPDATE, and the tenant columns (`workspace_id`,
  `brand_id`, `user_id` where it means ownership) are **immutable** via a generic
  `guard_immutable_columns` trigger — the re-parenting class of bug becomes impossible even
  if a policy is later written badly.
- Service-role code (Edge Functions) calls `has_capability` explicitly before touching tenant
  data — `requireCapability(client, cap, ctx)` in `_shared/authz.ts` — and never accepts a
  workspace id from the body without resolving it through membership.

### 4.2 React (UX)
`src/shared/access/`:
- `catalog.ts` — capability ids, roles, matrix, overridable sets, labels/descriptions for UI.
- `resolve.ts` — pure TS implementation of §3 over plain data; tested against the same JSON
  fixtures the SQL tests use (`supabase/tests/fixtures/access-cases.json`), so the two
  resolvers cannot drift.
- `accessStore.ts` — zustand; hydrated on sign-in by one RPC `my_access()` returning
  `{ workspaces: [{ id, name, slug, role, mode, defaultBrandRole, overrides, brands: [{ id, role, overrides }] }] }`;
  refreshed on `visibilitychange`, on any 401/403/`PGRST301` from PostgREST, and on Realtime
  `postgres_changes` for the caller's own `workspace_members`/`brand_access` rows (Realtime
  honours RLS, so a member only ever sees their own rows). Never persisted to localStorage —
  a removed user must not keep a cached yes.
- Hooks: `useCan(capability, { workspaceId?, brandId? })`, `useBrandAccess(brandId)`,
  `useWorkspaceAccess()`, `useCurrentWorkspace()`.
- Components: `<Can capability ctx fallback>`, `<AccessGate>` (route-level: renders
  NotFoundPanel for no access — 403 and 404 look identical to the user, by design, and the
  panel offers "Switch workspace" when the brand exists in another workspace the user can
  reach), `<ReadOnlyNotice>` for view-only surfaces.
- Denied-reason vocabulary shared with the server (`AccessDenialReason`), see 04 §6.

### 4.3 UX policy — hidden / disabled / read-only / request
| situation | treatment |
|---|---|
| a whole section the role never has (Guest → Members, Viewer → Setup edit) | **hidden** from nav |
| a section the role can view but not edit | **read-only**: content renders, controls removed, one `ReadOnlyNotice` at the top ("You can view this brand. Ask a manager for edit access.") |
| an action that exists on the page but the role lacks (Designer → delete another's design) | **hidden** (menu item absent) |
| an action blocked by plan/limit/credits, not by role | **disabled with reason** (tooltip + the semantic reason: "Brand limit reached on Free" / "Needs 14 credits; you have 6") |
| a brand the user cannot reach | **404-shaped** NotFoundPanel |
"Request access" is deliberately not built in V1; the notice names who can grant it.
