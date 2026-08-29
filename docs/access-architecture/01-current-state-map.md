# Access Architecture — 01 · Current State Map

_Reconnaissance snapshot, 2026-08-29. Read-only findings from five parallel investigators
(database, auth/services, edge functions, product surfaces, tests/billing). Every claim
below was verified against the repository; file:line references are as of branch
`feat/workspace-access-architecture` at its creation._

This document describes what EXISTS. It proposes nothing. The target architecture lives in
`02-target-domain-model.md` onward.

---

## 0. One-paragraph summary

BrandingOS already has a tenant model in the database — `workspaces`, `workspace_members`
(five-role enum `owner|admin|editor|exporter|viewer`), a per-brand override table
`brand_members`, `brands.workspace_id`, Stripe-backed `subscriptions` per workspace, and a
per-workspace credit wallet with atomic reserve/settle/release RPCs. **None of it reaches the
UI.** The frontend has no workspace switcher, no members page (the route is a redirect
commented "pure theatre… single-user for now"), no brand-scoped authorization, and `Brand`
in TypeScript carries no tenancy at all. RLS is the only enforced boundary, and it is
inconsistent: half the tenant tables use the modern `can_view_brand/can_edit_brand`
helpers, half still use `is_brand_member`, `designs` has no brand-membership check at all,
and several UPDATE policies lack `WITH CHECK`, so a brand editor can re-parent a brand into
another workspace. Roughly a dozen product resources (guidelines, kit customizations,
approvals, comments, templates…) are localStorage-only and therefore cannot be
authorized server-side until they move.

---

## 1. Database (Supabase project `ciojgoozobzbeglwdxcz`, Postgres 17)

### 1.1 Migrations
- 47 files; numbered era 001–034, highest **034**. 009/010 live in `supabase/deferred-migrations/`
  and were never applied (009 is un-deployable and silently un-hardens `set_updated_at`).
  033 was deleted and its history row removed by 034. `down/` covers 011–032 only.
- 011–021 confirmed applied to production; **022–034 have no written deployment confirmation.**
- `src/integrations/supabase/types.ts` is ~14 tables stale (stops at the 006 era).
- No local Supabase stack, no Docker, no psql on the dev machine (per `docs/phase-2/stage-1/01-*`).
  `supabase/tests/*.test.sql` are self-asserting SQL scripts, **never wired into CI and
  historically never executed** — RLS verification so far has been static.
- RLS is enabled on every table; **no table uses `FORCE ROW LEVEL SECURITY`**.

### 1.2 Tenant model as it exists
| Concept | Table | Notes |
|---|---|---|
| Tenant | `workspaces` | `owner_id` (no FK), `slug` unique, `settings` jsonb. Auto-created per user by `handle_new_user_workspace()` trigger on `profiles` insert. Any authenticated user may also insert more (`workspaces_insert_auth`). |
| Membership | `workspace_members` | `(workspace_id, user_id)` unique, `role workspace_role`, `invited_by`, `invited_at`, `joined_at`. **Ownership is dual-encoded**: `workspaces.owner_id` AND a member row with `role='owner'`; policies read both. |
| Role enum | `workspace_role` | `owner < admin < editor < exporter < viewer` — **declaration order is the authorization order** (`is_workspace_member` compares `role <= _min_role`). `exporter` is referenced by no policy. |
| Per-brand override | `brand_members` | `(brand_id, user_id)` unique, same enum. Read by `is_brand_member` first, then falls back to workspace membership. No UI writes it. |
| Brand | `brands` | `workspace_id` **nullable** (FK cascade) + `user_id` (no FK). Workspace-less brands are owned by `user_id` alone; `can_view_brand/can_edit_brand` (026) reconcile the two. |
| Platform roles | `user_roles` | `app_role` = `super_admin|admin|moderator|user`. Separate axis from workspace roles. |

### 1.3 Which tables carry which tenant key
- **`workspace_id`:** brands (nullable), subscriptions, invoices, usage_tracking, credit_accounts, credit_ledger, image_generation_jobs, image_projects (nullable).
- **`brand_id` only:** assets, brand_folders, brand_members, brand_kit_adoptions, brand_context_signals, brand_kit_state, designs, comments, approvals, guideline_presentations(+slides), brand_identity_publications.
- **user only:** user_preferences, onboarding_answers, user_roles, account_deletion_requests, profiles.
- **global:** platform_config, announcements, ai_rate_limits, billing_archive.

### 1.4 RLS helper functions (SECURITY DEFINER, `search_path=''`)
`is_workspace_member(ws, min_role)`, `is_workspace_owner(ws)`, `is_brand_member(brand, min_role)`,
`can_view_brand(brand)`, `can_edit_brand(brand)`, `shares_workspace_with(user)`,
`get_brand_workspace_id(brand)`, `is_super_admin()`, `is_admin_or_above()`, `is_moderator_or_above()`,
`has_role(user, role)`.

### 1.5 RLS gaps found (each becomes a test in the new suite)
1. `brands_update` has no `WITH CHECK` → an editor can rewrite `workspace_id` / `user_id`.
2. `workspaces_update_admin` has no `WITH CHECK` → an admin can set `owner_id = self`.
3. `designs_owner_all` checks only `user_id = auth.uid()` → any user can insert a design against **any** brand; brand members other than the creator cannot see it.
4. `presentations_insert` is `user_id = auth.uid() OR is_brand_member(...)` → same cross-brand insert.
5. `image_generation_jobs_cancel` `WITH CHECK` is only `user_id = auth.uid()` → job owner can set `status='succeeded'`, `charged_credits`, etc.
6. `notifications_update_own` no `WITH CHECK` → re-parent to another user.
7. `user_roles_admin_only` is `FOR ALL … has_role('admin')` → admin can insert a `super_admin` row for themselves.
8. `identity_publications_select_anon USING (true)` → anon can enumerate every snapshot (client-side `token` filter is the only guard).
9. `platform_config` readable by every authenticated user.
10. Still on `is_brand_member` (locks out workspace-less brand owners): brand_folders, brand_kit_adoptions, brand_context_signals, brand_kit_state, comments, approvals, activity_log, guideline_*, brand_members.
11. Policies without `TO` clause (apply to `public`): 015, 017, 018, guideline set.
12. Unbounded free credits: every workspace insert grants 500 credits via trigger; workspace creation is unlimited.
13. `admin-invite` gates on `role='admin'` but both real admins are `super_admin` → unreachable.
14. `NOT VALID` constraints never validated (017, 032).

### 1.6 Credits (migration 025) — **preserve**
- **1 credit = USD 0.01** (`pricing.ts:25`, `025:21`, table comment). Signup grant 500 = $5.00. _The task brief said $0.001; the repo says $0.01._
- `credit_accounts(workspace_id PK, balance_credits, reserved_credits, lifetime_granted, lifetime_spent)` all BIGINT with `>= 0` CHECKs. `credit_ledger` append-only, `kind ∈ grant|reserve|settle|refund|release|adjust`, partial unique `(workspace_id, idempotency_key)`.
- RPCs (service_role only): `reserve_credits` (single guarded atomic UPDATE, overdraw impossible, idempotent replay), `settle_credits` (charge clamped to reservation, refund row), `release_credits`, `grant_credits`, `ensure_credit_account`.
- Balance is the column, not a ledger sum; `balance_after` is a snapshot.
- **Missing:** reservation expiry/reaper (a crashed function holds credits forever), ledger↔balance reconciliation, `adjust` is never written, `image_generation_jobs.*_credits` are INTEGER vs BIGINT ledger.

### 1.7 Plans (migration 003) — exists, separate from credits
`subscriptions(workspace_id UNIQUE, plan free|pro|agency, status, stripe_*)`, `invoices`,
`usage_tracking(workspace_id, metric, value, period)`. `PLAN_LIMITS` in
`supabase/functions/_shared/plan-limits.ts` (brands, storage_mb, team_members, exports_month).
Stripe checkout/portal/webhook Edge Functions are real. No plan→credit allotment link exists.

### 1.8 Storage
Two private buckets. `brand-assets`: path `<brandId>/…`, policies (028) require uuid first
segment + `can_view_brand`/`can_edit_brand`; `ai-refs/<userId>/…` is reachable only via
service role. `onboarding-scratch`: `<sessionId>/…`, owner-scoped since 021. Output URLs are
signed for **one year**.

---

## 2. Edge Functions (13) and every service-role path

| Function | Auth | Tenant id from body | Verified? |
|---|---|---|---|
| `ai-generate-image` | JWT (`requireCaller`) | `brandId`, `projectId`, `designId` | brandId via RLS **read** (viewer-level, not editor); projectId **not** checked against brand |
| `anthropic-proxy` | none (body `sessionId`) | — | unmetered against credits; owner told to set verify_jwt OFF |
| `ai-apply-command` | none (sessionId) | `brandId` unused | unmetered |
| `generate-description`, `fetch-url-preview` | none (sessionId + age) | — | fetch-url has SSRF gaps (redirects, metadata IP, IPv6) |
| `upload-ai-reference` | JWT | — | path forced to verified userId ✅ |
| `finalize-onboarding-assets` | JWT | `brandId` ✅, `sessionId` ❌ | source session not tied to caller (IDOR) |
| `cleanup-onboarding-scratch` | **none** | — | mass-delete callable with anon key |
| `purge-deleted-accounts` | `x-cron-secret`, fails closed ✅ | — | ✅ |
| `check-plan-limit` | JWT | `workspaceId` ❌ | any user can read any workspace's plan/usage |
| `admin-invite` | JWT + `user_roles='admin'` | email | unreachable for super_admins; open redirect via `origin` |
| `stripe-checkout` / `stripe-portal` | JWT + owner/admin ✅ | `workspaceId` ✅ | success/cancel URLs caller-controlled |
| `stripe-webhook` | Stripe signature ✅ | from Stripe metadata ✅ | ✅ |

Rate limiting: one table `ai_rate_limits`, keyed by a **client-chosen** `sessionId`; only the
IP window survives rotation, and IP comes from forwarded headers. `ai-generate-image` is not
rate-limited at all (bounded by credits + 6 concurrent jobs/workspace). `corsHeaders` is `*`
everywhere; no security headers anywhere.

The image pipeline (`requireCaller → requireBrandAccess → idempotency lookup → job row →
reserve → provider under 170s deadline → store bytes → settle → succeeded`, with full release
on any throw) is the strongest code in the server layer and is the pattern to generalise.
Silent gaps: settle/release RPC errors are not checked.

---

## 3. Frontend

### 3.1 Auth
`authController.ts` is the single lifecycle owner. `PlatformRole` from `user_roles` (4s
timeout, default `user`). `ProtectedRoute` has two decisions: signed-in, and `role=`
(moderator) on exactly 3 routes. **No brand- or workspace-scoped guard exists.** Dev bypass
(`VITE_DEV_BYPASS_AUTH`) seeds `super_admin` on reload. One hardcoded-email admin check
survives at `features/brand/components/BrandNavbar.tsx:63`.

### 3.2 Workspace in the client
`workspaceStore` (list/current/members + CRUD) is loaded on sign-in and persisted as
`{current:{id}}` under `brandos-workspace`. `current` = persisted id if still a member, else
oldest workspace. **No switcher UI; `setCurrent` and `loadMembers` have no callers.**
`brandStore.loadAll()` calls `list()` with **no workspace argument** — brand scoping is 100% RLS.
`Brand` (TS) has no `workspaceId`/`ownerId`; `mapFromDatabase` drops both columns.

### 3.3 Authorization code that exists
- Dead: `shared/utils/permissions.ts` (`canRoleDo`), `shared/hooks/usePermissions.ts`,
  `shared/hooks/usePlanGate.ts`, `shared/utils/plan-gates.ts` — **zero importers**.
- Live: platform-role admin gates only (AdminLayout, UserMenu, useIsAdmin, kit catalog `isVisible`).
- The app cannot distinguish 403 from 404 (`design/[designSlug].tsx:11-14`).

### 3.4 Members / invites
`/settings/members` → redirect. `TeamPanel.tsx` (Classic setup page only) is `useState` mock
data. `IWorkspaceService.{getMembers,addMember,removeMember,updateMemberRole}` are implemented
against Supabase and called by nothing. `activityService` already defines
`member_invited|member_joined|member_removed` event types.

### 3.5 Sharing today — three unrelated mechanisms
1. `brand.isPublic` + slug routes — checked by `/brand/:slug/showcase` only.
2. Opaque tokens → `/i/:token` (`brand_identity_publications`, immutable inlined snapshot). Well designed.
3. Unguarded slug routes: `/p/:slug`, `/brand/:slug`, `/d/:brandSlug/:designSlug` (anon RLS "Phase 8.2", not done).
Making a brand private does not revoke a token link.

### 3.6 Realtime
`shared/services/realtime.ts` is complete and **unused**, except editor presence avatars.

---

## 4. Product surfaces (the raw material for the capability list)

### 4.1 Brand sections and their mutations
| Section | Mutations |
|---|---|
| Setup `/b/:slug/setup` | rename (changes slug), slogan, colors CRUD/reorder/role, logos add/replace/delete/primary/role/rename, photos, icons, fonts (files as data URLs), websites, About sections, Strategy cards, **Import strategy from brief**, **Rebrand with AI** (+checkpoints, localStorage), export section |
| Brand Kit `/brand-kit`, `/brand-kit-next` | add color/icon, icon weight/tint, download card/group, **Export kit**, kit lifecycle: generate/regenerate/approve/dismiss/setPrimary/duplicate/remove/**upload own deliverable**/setFolder/archive/customize |
| Guideline `/guideline` | build from brand, rebuild (destructive), page insert/duplicate/remove/move/edit/reset, **write value back to brand** (confirmed), undo/redo, discard |
| Design `/design`, `/design/:slug` | create, autosave (1200 ms), ⌘S, save as template (private / community-pending), duplicate, resize variants, republish family (destructive), export / export family zip, re-apply brand, **AI generate (spends credits)**, copy public link, delete, move to folder |
| Folders `/folders` | upload, rename, delete, bulk delete, download, tags, category, move, folder CRUD, upload into kit slot |
| Identity `/identity` | publish / republish / revoke share token |
| Share `/share` | toggle isPublic, copy links/embed |
| Settings `/settings` (brand) | general, colors, typography, voice, strategy, sharing (isPublic, customDomain). **No delete brand here.** |
| Brand Board | save whole board back to brand |
| Approvals `/approvals` | approve/reject (localStorage only) |
| Others | social-media, content (stub), bento, decks, blocks, canvas guidelines, tools — mostly localStorage |

### 4.2 Workspace-level mutations
Create brand (onboarding), rename project (`workspaceCard.label`), change/shuffle cover,
move projects to folder (folder = string on card), **bulk delete brands** (`window.confirm`),
delete project (card menu), account (name/email/password/delete w/ 7-day grace), preferences,
plans (Stripe checkout/portal), template builder publish, admin template queue approve/reject.

### 4.3 Persistence and concurrency
**There is not one optimistic-concurrency check in the product.** Brands, designs, assets,
folders are bare `.update().eq('id')` / upsert — last write wins; Setup autosaves at 400 ms,
the editor at 1200 ms. Only `SupabaseKitStateRepository` has a schema-version guard (older
client, not concurrent peer).

**Local-only in both modes (cannot be authorized server-side until moved):** guideline
document + page HTML (localStorage + IndexedDB), kit card customizations, branding
checkpoints, comments, approvals, notifications, content templates (the admin queue approves
localStorage rows), format presets, bento, blocks, case-study decks, saved/variable
templates, UI-color palettes, logo-maker flow, template-builder draft.

### 4.4 Activity/audit
`/dashboard/activity` renders `activity_log` (falls back to localStorage) with 14 event
types, seeded with fake events when empty. Emitters are sparse (public toggle, link copied,
asset upload). No per-resource history, no "who changed what", no audit trail.
`identityMeta` carries write provenance on Brand Core values but is surfaced nowhere.

---

## 5. Tooling and gates
- `npm run lint`, `typecheck:ci` (ratchet vs `.typecheck-baseline.txt`, 321 baseline errors),
  `vitest` projects `unit` (jsdom; includes `supabase/functions/**/*.test.ts`) and `browser`
  (Chromium). CI runs lint/typecheck/build/vitest. **No DB step in CI.**
- No ADR convention; specs at `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
- `codex` CLI available at `/opt/homebrew/bin/codex`.
- Landing early-access is a marketing table only; real invites go through `admin-invite` →
  GoTrue `inviteUserByEmail`.

---

## 6. What this means for the design (carried into 02+)
1. **Workspace IS the tenant/billing boundary already** (subscriptions, credits, members all hang off it). No new organization layer is needed — ADR-001.
2. The five-role enum with ordinal comparison, `brand_members`, and dual-encoded ownership are the things to **evolve**, not replace; the credit RPCs and the image job pipeline are the things to **preserve and generalise**.
3. Anything local-only is out of scope for server enforcement until it has a table; the design must say which of those move now (designs/assets/brands/kit state are already server-side) and which stay client-side and are therefore "personal" data.
4. The RLS gap list in §1.5 becomes the seed of the security test matrix.
