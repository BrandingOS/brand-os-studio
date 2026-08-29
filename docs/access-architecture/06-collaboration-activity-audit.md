# Access Architecture — 06 · Collaboration · Activity · Audit

## 1. Collaboration levels (ADR-007: no CRDT, no Yjs, no Liveblocks)

| level | what | status after this initiative |
|---|---|---|
| 1 | shared access + permissions | ✅ built (02–03) |
| 2 | attribution + activity history | ✅ built (§2–3) |
| 3 | safe concurrent editing: conflict detection, no silent overwrite | ✅ built for the server-backed structured resources (§1.1) |
| 4 | presence / cursors / live co-editing | presence avatars already exist in the editor; nothing more. The design editor is a Fabric canvas whose document is a JSON blob autosaved every 1.2 s — a CRDT would mean rewriting the editor's data model, which no requirement here justifies. |

### 1.1 Optimistic concurrency on the resources that matter
`brands`, `designs`, `brand_kit_state`, `workspaces` get `version integer not null default 1`
and `updated_by uuid`. A BEFORE UPDATE trigger `bump_version` increments `version` and
stamps `updated_by = auth.uid()`. Writers send the version they loaded:

- `brands`: `update_brand_checked(id, expected_version, patch jsonb)` RPC → if
  `version <> expected` → returns `{ conflict: true, version, updated_by, updated_at }`
  without writing. The adapter (`brands.supabase.ts`) retries **once** by reloading the row
  and re-applying its **patch** (Setup already produces diffs, so a colour edit lands on top of
  a colleague's font edit); if the same keys collide, the store surfaces `ConflictNotice`
  ("Updated by Sarah 10s ago — reload to see her changes; your change to Primary colour was
  not saved").
- `designs`: same RPC shape; no auto-merge (a canvas document is one blob). On conflict the
  editor shows a blocking notice with **Reload** / **Save a copy** — never silently overwrites.
  The editor also subscribes to `postgres_changes` on its own design row and shows "Omar is
  editing this design" from presence + a passive "newer version available" pill on remote update.
- `brand_kit_state`: the existing schema-version guard becomes a row-version guard.
- `assets`, `brand_folders`, `workspace` settings: single-field writes; last-write-wins is
  acceptable and documented (renaming a file twice is not a data-loss class).

Local-only resources (guideline document, kit customisations, checkpoints, comments,
approvals) are single-device by nature today; they are **not** made multi-user by this
initiative (ADR-008 lists them as the next phase's migration set), and the Guideline page
shows a one-line notice when the brand has other members ("Guidelines are saved on this
device for now").

## 2. Attribution
- `updated_by` on brands/designs/brand_kit_state/workspaces (trigger-stamped, never client-set).
- `assets.uploaded_by`, `designs.user_id`, `image_generation_jobs.user_id` already exist.
- `identityMeta` provenance on Brand Core stays; the Setup UI gets "Last edited by X · 3m ago"
  from `updated_by` + `profiles` (readable via `profiles_select_coworkers`).

## 3. Product activity feed (`activity_log`, existing) — extended, not replaced
- Add `workspace_id` (nullable, backfilled from brand), `actor_id` semantics = existing `user_id`.
- Emitters added at the mutation seams (not per component): brand core write (`brand.updated`,
  with the changed section names), logo/colour/font replace, strategy change, kit
  generate/approve/upload, guideline built/rebuilt, design created/deleted/exported,
  AI generation requested (with credits), member invited/joined/removed/role changed, share
  link created/revoked. Written by the same server RPC/trigger that performs the change where
  one exists; by the store's write path otherwise (`activityService.log`).
- The fake seeded events on `/dashboard/activity` are removed.
- Readable by `activity.view` at the brand or workspace scope.

## 4. Security audit log (`audit_events`, new) — separate from the feed
```
audit_events(
  id bigserial pk, workspace_id not null, brand_id,
  actor_id uuid, actor_kind ('user'|'system'|'service'),
  action text not null,            -- 'member.invited' | 'member.role_changed' | 'ownership.transferred' | …
  target_kind text, target_id text,
  before jsonb, after jsonb,       -- only for role/access/settings changes; never secrets, never full documents
  metadata jsonb, ip inet, user_agent text,
  created_at timestamptz not null default now())
```
- **Append-only**: no UPDATE/DELETE policy for any client role; written only by triggers and
  SECURITY DEFINER functions. Readable by `audit.view` (owner/admin) scoped to their workspace.
- Written for: invitation created/resent/revoked/accepted, member joined/removed/suspended/
  role changed/access changed/overrides changed, ownership transferred, workspace settings
  changed/deleted, brand created/archived/deleted/access changed, share link created/
  revoked, credits granted/adjusted, plan changed (webhook), reservation expired, reconcile
  mismatch, account deletion requested/purged (existing flow hooks in).
- Retention: `audit.retention_days` entitlement (30/180/400); nightly cron deletes older rows
  **per workspace** using the workspace's own entitlement. Platform admins keep a 400-day
  floor via the override table for regulated customers.
- `ip`/`user_agent` are filled only by Edge Function paths (triggers have no request).

## 5. Realtime
- Access revocation: `accessStore` subscribes to the caller's own `workspace_members` and
  `brand_access` rows; a DELETE/UPDATE triggers re-hydration (Realtime enforces RLS, and the
  member policies let a user see their own row). A removed member's open tab loses its
  data on the next query regardless — RLS is the boundary; realtime only makes the UI honest
  sooner.
- Design "newer version" pill (above).
- No other realtime is introduced.
