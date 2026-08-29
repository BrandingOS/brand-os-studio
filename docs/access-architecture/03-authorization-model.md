# Access Architecture — 03 · Authorization Model

_One vocabulary, one resolver, two enforcement points (Postgres for security, React for UX)._

## 1. Capabilities — derived from the real surfaces in 01 §4

Naming: `<scope>.<area>.<verb>`. Workspace scope first, then brand scope.
Capabilities marked **reserved** exist in the catalog (so UI and future policies share a
name) but are shown nowhere and resolve to `false` for everyone: their resources are still
per-device (ADR-008). Nothing may be "granted" for a thing the server cannot enforce.

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
members.manage                 change role, brand access, named access switches
members.remove
brands.list                    list the brands the caller can reach (implied by any brand access)
brands.create
brands.delete                  permanently delete an ARCHIVED brand
audit.view                     the security audit log
activity.view                  the product activity feed (workspace-wide)
```

### Brand scope (context: `brandId`)
```
brand.view                     open the brand at all (implied by every other brand capability)
brand.settings.view            brand settings dialog (general/colors/typography/voice/strategy/sharing)
brand.settings.edit            name, slug, general, sharing tab, custom domain
brand.card.edit                dashboard project card: label, cover, shuffle, dashboard folder
brand.archive                  archive / restore
brand.access.view              who has access to this brand
brand.access.manage            grant/revoke brand_access rows, change brand roles, named switches
brand.setup.edit               Setup: colors, logos, fonts, icons, photos, websites, about
brand.strategy.edit            Strategy cards, import from brief, rebrand with AI, checkpoints
brand.kit.generate             generate / regenerate / customise / upload a deliverable
brand.kit.approve              approve, set primary, dismiss, archive a deliverable (the brand-defining act)
brand.kit.export               export kit / download cards & bundles
brand.guideline.edit           RESERVED (guideline documents are per-device today)
brand.guideline.export         RESERVED until export exists
designs.create
designs.edit                   edit any design in the brand
designs.delete                 delete any design (own designs: implied by designs.create — see §4)
designs.export
templates.save                 save a design as a PRIVATE template
templates.submit_community     submit to the community queue (never a guest)
library.upload
library.edit                   rename, tags, category, move, folders
library.delete
ai.generate                    spend workspace credits on this brand
share.view                     see existing share links
share.link                     create/revoke share links for a design or guideline
share.publish_public           brands.is_public, identity publication, custom domain
comments.create                RESERVED (comments are per-device today)
approvals.review               RESERVED (approvals are per-device today)
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
| brands.list | ✅ | ✅ | ✅ | ✅ |
| brands.create | ✅ | ✅ | — | — |
| brands.delete | ✅ | ✅ | — | — |
| audit.view | ✅ | ✅ | — | — |
| activity.view (ws) | ✅ | ✅ | ✅ | — |

**Admin is an implicit Manager on every brand.** The Admin description says so plainly
("Admins can do anything in every brand"); an ops manager who should manage people but not
brands does not exist as a role in V1 — a Member with the *billing* switch covers the
bookkeeper, and brand-level management stays with Managers.

Overridable at workspace scope (`workspace_members.capability_overrides`): `brands.create`,
`workspace.usage.view`, `workspace.billing.view`, `workspace.billing.manage`, `members.view`,
`activity.view`. Everything else is role-bound — you cannot grant `members.manage` to a
Member; make them an Admin. Owner/Admin accept no overrides.

### 2.2 Brand roles
| capability | Manager | Editor | Designer | Viewer |
|---|:-:|:-:|:-:|:-:|
| brand.view | ✅ | ✅ | ✅ | ✅ |
| brand.settings.view | ✅ | ✅ | — | — |
| brand.settings.edit | ✅ | — | — | — |
| brand.card.edit | ✅ | ✅ | — | — |
| brand.archive | ✅ | — | — | — |
| brand.access.view | ✅ | ✅ | — | — |
| brand.access.manage | ✅ | — | — | — |
| brand.setup.edit | ✅ | ✅ | — | — |
| brand.strategy.edit | ✅ | ✅ | — | — |
| brand.kit.generate | ✅ | ✅ | ✅ | — |
| brand.kit.approve | ✅ | ✅ | — | — |
| brand.kit.export | ✅ | ✅ | ✅ | — |
| designs.create | ✅ | ✅ | ✅ | — |
| designs.edit | ✅ | ✅ | ✅ | — |
| designs.delete | ✅ | ✅ | — | — |
| designs.export | ✅ | ✅ | ✅ | — |
| templates.save | ✅ | ✅ | ✅ | — |
| templates.submit_community | ✅ | — | — | — |
| library.upload | ✅ | ✅ | ✅ | — |
| library.edit | ✅ | ✅ | ✅ | — |
| library.delete | ✅ | ✅ | — | — |
| ai.generate | ✅ | ✅ | ✅ | — |
| share.view | ✅ | ✅ | — | — |
| share.link | ✅ | ✅ | — | — |
| share.publish_public | ✅ | — | — | — |
| activity.view (brand) | ✅ | ✅ | ✅ | — |

Reserved (not in the matrix, resolve false): `brand.guideline.edit`, `brand.guideline.export`,
`comments.create`, `approvals.review`. `templates.submit_community` is additionally
hard-denied for `workspace role = guest` inside the resolver, whatever the brand role.

### 2.3 Named access switches (every plan) and the override storage
The three cases the brief actually lists are first-class switches in the invite modal, the
member sheet and the Brand Access tab — on every plan:

| switch | stores | default |
|---|---|---|
| **Can download and export** | grant/deny `designs.export`, `brand.kit.export` | on for Manager/Editor/Designer, off for Viewer |
| **Can use AI generation** | grant/deny `ai.generate` | on for Manager/Editor/Designer; **off for any Guest** and for Viewer |
| **Can see billing** (workspace, Members only) | grant `workspace.billing.view` | off |

**The guest default is applied by the server, not remembered by a UI.** `create_invitation`
and `grant_brand_access` both apply the guest template when the workspace role is `guest`:
`ai.generate` is denied unless the call explicitly passes `allow_ai = true` (owner decision
#2). Every entry point — invite modal, member sheet, Brand Access tab "Add people" — goes
through those two RPCs, so none can bypass it.

They are stored as `capability_overrides` on `brand_access` / `workspace_members`, so the
backend stays purely capability-based and a generic override editor (the Pro feature
`advanced_access`, **deferred** from V1) reads and writes the same rows. Overridable-at-brand
set for that future editor: every brand capability except `brand.view`, `brand.settings.edit`,
`brand.access.manage`, `brand.archive`, `share.publish_public`, `templates.submit_community`.

## 3. Resolution — deterministic, one function

```
effective_capabilities(user, workspace, brand?) → set<capability>

1. platform super_admin        → all capabilities (admin surfaces only; never reached by product UI)
2. m := workspace_members(workspace, user); if none or status ≠ active or workspace.deleted → ∅
   (a membership row for a non-existent workspace or a deleted user never exists: FKs)
3. WS := role_capabilities('workspace', m.role) ⊕ m.capability_overrides   (grant ∪, then deny −)
4. if brand is null → return WS
5. b := brands(brand); if b.workspace_id ≠ workspace or b is null → ∅ (cross-tenant guess = nothing)
6. if b.archived_at not null → everyone is read-only: {brand.view}, plus {brand.archive}
   for owner/admin/manager (to restore) — nobody edits an archived brand
7. brand role r :=
     m.role ∈ {owner, admin}                 → manager
     m.brand_access_mode = all               → brand_access(brand,user).role ?? m.default_brand_role
     m.brand_access_mode = selected          → brand_access(brand,user).role ?? NONE
   if r = NONE → return WS  (workspace caps only; the brand does not exist for them)
8. BR := role_capabilities('brand', r) ⊕ brand_access.capability_overrides
   if m.role = guest → BR := BR − {templates.submit_community}
   BR := BR − RESERVED
9. return WS ∪ BR
```

Overrides can only add capabilities from the overridable set for that scope and can never
add a capability the role's *ceiling* excludes: the trigger that validates
`capability_overrides` fires `BEFORE INSERT OR UPDATE` **unconditionally** (not `OF
capability_overrides`), so a role change re-validates and strips any override outside
`overridable_capabilities(scope, NEW.role)` — a demotion can never leave stale grants behind.
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
  if a policy is later written badly. The trigger exempts internal writes exactly as
  `profiles_guard_privileged_columns` (029) does: `auth.uid() IS NULL` (SECURITY DEFINER
  purge/migration context) or `is_super_admin()`. `prepare_account_purge` legitimately
  reassigns `brands.user_id` on last-owner succession; a migration guard-rail runs it
  end-to-end after 038.
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
  `AccessDeniedPanel`: when the caller is an ACTIVE MEMBER of the brand's workspace it is a
  real 403 — "You don't have access to Kaafex. Ask Alice Hamza or Adam Ortiz." (owners/admins
  are visible to members through `members.view`; guests get the 404 shape because they have
  no directory); for non-members and cross-tenant guesses it is the 404 shape — one component,
  two copy branches), `<ReadOnlyNotice reason>` with three reasons: `no_edit_access` (names
  one or two managers, copy-email action), `archived` ("This brand is archived. A manager can
  restore it."), `plan_readonly`.
- Denied-reason vocabulary shared with the server (`AccessDenialReason`), see 04 §6.

### 4.3 UX policy — hidden / disabled / read-only / request
| situation | treatment |
|---|---|
| a whole section the role never has (Guest → Members, Viewer → Setup edit) | **hidden** from nav |
| a section the role can view but not edit | **read-only**: content renders, controls removed, one `ReadOnlyNotice reason="no_edit_access"` at the top naming a manager |
| a **Viewer** looking at a deliverable without export | **disabled with reason** ("Downloads are off for your access — ask Alice.") — the one place absence would read as a missing feature |
| an action that exists on the page but the role lacks (Designer → delete another's design) | **hidden** (menu item absent) |
| an action blocked by plan/limit/credits, not by role | **disabled with reason** (tooltip + the semantic reason: "Brand limit reached on Free" / "Needs 14 credits; you have 6") |
| a brand the user cannot reach, same workspace | **403** naming who can grant access |
| a brand the user cannot reach, other/no workspace, or a guest | **404-shaped** |
"Request access" is deliberately not built in V1; the notices name who can grant it.
