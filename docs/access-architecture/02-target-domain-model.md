# Access Architecture — 02 · Target Domain Model

_Status: design, 2026-08-29. Companion to `01-current-state-map.md`. Decisions referenced as
ADR-nnn live in `adr/`._

## 1. The hierarchy — and why there is no fourth layer

```
USER  (auth.users → profiles)
  │  belongs to many
  ▼
WORKSPACE  (tenant · billing boundary · credit wallet · plan)
  │  contains many
  ▼
BRAND  (belongs to exactly one workspace)
  │  owns
  ▼
BRAND RESOURCES  (assets, folders, designs, kit state, guidelines, publications, jobs…)
```

`workspaces` is already the row that `subscriptions`, `credit_accounts`, `invoices`,
`usage_tracking` and `workspace_members` hang off. It IS the company / agency / team /
personal account. The UI may label it "Company" or "Team"; the database has one concept.
**ADR-001** records the decision not to add Organization/Team/Company tables.

Two kinds of workspace, one table: `workspaces.is_personal` (true for the one auto-created at
signup). A personal workspace is an ordinary workspace whose only difference is that it
cannot be deleted while it is the user's last workspace, and it is the default landing target.

## 2. Entities

### 2.1 `workspaces` (existing, evolved)
| column | change |
|---|---|
| `owner_id` | **keeps existing, becomes derived.** The members table is authoritative; a trigger keeps `owner_id` = the earliest active owner. No policy reads it any more. |
| `is_personal boolean not null default false` | new; backfilled true for the signup-created workspace of each user |
| `deleted_at timestamptz` | new; soft delete with a 30-day purge window (mirrors account deletion) |
| `version integer not null default 1` | new; optimistic concurrency on settings writes |

### 2.2 `workspace_members` (existing, evolved) — **the** membership row
| column | meaning |
|---|---|
| `workspace_id`, `user_id` | unique pair (existing) |
| `role workspace_role_v2` | `owner · admin · member · guest` (ADR-002) |
| `status member_status` | `active · suspended`. There is no `invited` status: an invitation is its own row; there are no placeholder members. `removed` = row deleted (audit event keeps the history). Suspend has **no UI in V1** (Remove covers the product case); the column exists so account-deletion and future SSO deprovisioning can revoke without deleting history. |
| `brand_access_mode brand_access_mode` | `all · selected`. Forced to `all` for owner/admin, forced to `selected` for guest (CHECK constraint). |
| `default_brand_role brand_role` | the brand role applied to every brand when mode = `all`, and the default offered when granting selected brands. NULL for owner/admin (they are implicit managers). |
| `capability_overrides jsonb` | `{ "grant": [...], "deny": [...] }` — workspace-scope capabilities only; validated by trigger against the overridable set (ADR-003) |
| `credits_monthly_cap bigint` | NULL = no cap; a per-person ceiling on credits reserved in the calendar month (04 §3.1) |
| `invited_by`, `joined_at`, `created_at`, `updated_at` | existing |
| `suspended_at`, `suspended_by`, `suspend_reason` | new |

### 2.3 `brand_access` (replaces `brand_members`) — per-brand grant
| column | meaning |
|---|---|
| `workspace_id` | denormalised, CHECK-enforced = brand's workspace via composite FK `(brand_id, workspace_id) → brands(id, workspace_id)` — a grant can never point across tenants |
| `brand_id`, `user_id` | unique pair |
| `role brand_role` | `manager · editor · designer · viewer` (ADR-002) |
| `capability_overrides jsonb` | brand-scope capabilities only |
| `granted_by`, `created_at`, `updated_at` | |
| FK `(workspace_id, user_id) → workspace_members(workspace_id, user_id) ON DELETE CASCADE` | **removing the membership removes every brand grant** — the invariant the brief asks for, enforced by the database, not by application code |

A row is meaningful only for members whose `brand_access_mode = selected`, or as a per-brand
override when mode = `all`. Owner/admin rows are refused by trigger (they are implicit
managers everywhere; a stored row would be a second source of truth).

### 2.4 `brands` (existing, evolved)
| column | change |
|---|---|
| `workspace_id` | **NOT NULL** after backfill (ADR-004). `user_id` stays as `created_by` semantics; renamed in a later cleanup, not now (26 client call sites). |
| `archived_at timestamptz` | new; archived brands are hidden from lists, still readable by managers, restorable |
| `version integer not null default 1` | new; optimistic concurrency |
| `updated_by uuid` | new; attribution |
| UNIQUE `(id, workspace_id)` | new; target for composite FKs so child rows can carry a tenant-checked `workspace_id` |

### 2.5 `workspace_invitations` (new) — see `05-invitations-and-sharing.md`

### 2.6 `share_links` (new) — see `05-invitations-and-sharing.md`

### 2.7 `role_capabilities` (new, seeded) — see `03-authorization-model.md`

### 2.8 Plans, entitlements, credits, usage — see `04-credits-entitlements-limits.md`
`plan_entitlements`, `workspace_entitlement_overrides`, `credit_reservations`, `ai_usage_events`
(new); `credit_accounts`, `credit_ledger`, `subscriptions` (existing).

### 2.9 `audit_events` (new) — see `06-collaboration-activity-audit.md`

## 3. Tenant key on every tenant-owned row

Every table that RLS must isolate gets an answer to "which workspace, which brand":

| table | brand_id | workspace_id | strategy |
|---|---|---|---|
| brands | — | ✅ NOT NULL | direct |
| assets, brand_folders, designs, brand_kit_state, brand_kit_adoptions, brand_context_signals, comments, approvals, guideline_presentations, image_projects, brand_identity_publications | ✅ | **added**, composite FK to `brands(id, workspace_id)` | denormalised tenant id, DB-guaranteed consistent (ADR-005) |
| guideline_slides | via presentation | via presentation | join (low volume) |
| image_generation_jobs, credit_*, subscriptions, invoices, usage_tracking | (jobs ✅) | ✅ existing | direct |
| workspace_members, brand_access, workspace_invitations, share_links, audit_events, credit_reservations, ai_usage_events | as applicable | ✅ | direct |
| activity_log, notifications | nullable ✅ | **added** nullable | direct |
| user_preferences, onboarding_answers, account_deletion_requests, user_roles | — | — | user-scoped |

ADR-005 explains why the denormalisation is justified: RLS on `designs`/`assets` is evaluated
per row on every list; a join to `brands` per row is the difference between an index probe and
a nested loop, and the composite FK makes the copy impossible to get wrong.

## 4. Ownership invariants (enforced in Postgres)

1. Every non-deleted workspace has **≥ 1 active owner** — trigger `workspace_members_guard_last_owner` (BEFORE UPDATE/DELETE) raises `last_owner` when the row being demoted/removed/suspended is the last active owner.
2. Multiple owners are allowed (agencies with two partners). Ownership transfer = promote another member to owner, then optionally demote yourself; `transfer_ownership(ws, to_user)` does both atomically.
3. A user cannot change their own role (trigger: `auth.uid() = OLD.user_id AND NEW.role <> OLD.role` → `self_role_change`), except leaving (`leave_workspace()` RPC, which applies rule 1).
4. Deleting a user account: `prepare_account_purge` (existing, migration 029) is extended — for each workspace where the user is the last owner: if the workspace has other active members, the earliest admin (else member) is promoted to owner and an audit event is written; otherwise the workspace is soft-deleted with the account. No workspace is ever orphaned.
5. Workspace deletion requires an owner and `workspace.delete`; it is a soft delete that cascades visibility immediately (policies filter `deleted_at IS NULL`) and purges after 30 days via the existing purge cron.
6. Brand ownership derives from the workspace. There is no `brand.owner`. "Who manages this brand" is answered by `brand_access` rows with `role = manager` plus the workspace's owners/admins.

## 5. Role semantics (summary; full matrix in 03)

| Workspace role | Sees | Manages |
|---|---|---|
| **Owner** | everything | everything, incl. billing, ownership transfer, workspace deletion |
| **Admin** | everything | members, invitations, brands (implicit Manager on every brand), billing; not ownership transfer / delete workspace |
| **Member** | brands per access mode | only what the brand role allows; never members/billing/settings |
| **Guest** | only selected brands | nothing at workspace level; cannot see the member directory; counted as a guest seat |

| Brand role | Can |
|---|---|
| **Manager** | everything in the brand incl. brand settings, public publishing, brand-level access list, archive, community submission |
| **Editor** | edit all brand content (setup, strategy, kit incl. approve, designs, library), AI, export, share links, card |
| **Designer** | designs create/edit; kit generate/customise (not approve); library upload; AI; export; **not** Setup/Strategy edit, not approve, not delete others' work |
| **Viewer** | view brand content (Setup, Strategy, Kit, Guideline, designs, library) read-only; no settings; no export by default (the *download* switch grants it) |

Guest is a workspace role, not a flag (ADR-002): it changes what the workspace shows, not
only which brands. A guest with brand role Editor on Brand A is exactly the freelancer case.

## 6. Lifecycle

| event | effect |
|---|---|
| invite | `workspace_invitations` row; no membership yet |
| accept | membership + brand_access rows inserted in one transaction; invitation → accepted |
| suspend | `status = suspended`: every policy treats the member as absent; UI shows "suspended" on the row; reversible |
| remove | membership row deleted → brand_access cascades → audit event `member.removed` with a snapshot of what was removed |
| leave | same as remove, self-initiated, guarded by last-owner rule |
| archive brand | `archived_at`; read-only for managers, hidden for others; restorable |
| delete brand | soft (`archived_at` + `deleted_at`)… **no** — brands already cascade hard-delete a large tree today and the dashboard deletes brands routinely; a soft delete here would double every brand query's filters. Decision: brand delete stays a hard delete gated by `brands.delete` (workspace admin+), **offered only on an archived brand** (the live brand's menu has Archive; "Delete permanently" lives in the archived list), with a confirmation naming the counts per brand; audit event carries the brand snapshot summary. (ADR-006) |
| delete workspace | soft, 30-day purge |
| subscription cancelled | plan → free at period end (existing webhook); entitlements shrink; nothing is deleted; over-limit workspaces become read-only for *creating* (brands, invites) but never for reading or editing existing work |
