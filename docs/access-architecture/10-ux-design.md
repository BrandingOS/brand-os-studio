# Access Architecture — 10 · UX Design (Members · Invite · Brand Access · Switching)

All chrome uses `@/shared/ds` (DsButton, DsInput, DsSelect, DsSegmented, DsCheckbox,
DsModal, DsMenu, DsBadge, DsTabBar, DsEmptyState, DsBanner, DsSkeleton); nothing from
shadcn. Settings pages follow the existing settings pattern (`.ws-hero` eyebrow + `DsTabBar`),
not `PageHeader`. A pre-flight report is produced per component when built. Every new
surface names its shell below.

**Feature-local components (rung F, announced here):** `MembersTable` (there is no `DsTable`;
`DsAssetRow` is asset-specific), `PersonAvatar` (initials via the existing
`initialsFromName`; never a letter tile, never `BrandAvatar`), `MemberSheet` (a centered
`DsModal` — `DsModal` is `position: fixed` and renders in place, so no slide-in transform
on any ancestor), `InviteMemberModal`, `BrandAccessList`, `WorkspaceSwitcher`,
`AccessDeniedPanel`, `ReadOnlyNotice`, `RoleMatrixModal`. Rows keep `overflow: visible` so
the in-place `DsSelect`/`DsMenu` can escape (same rule as Folders tiles).

## 1. Workspace switcher — shells: `WorkspaceShellAlt` and `WorkspaceShell`; never `AppRail`
- `WorkspaceShellAlt` (dashboard, settings, learn, templates) gains a **left context slot**
  beside the wordmark; the switcher renders there.
- `WorkspaceShell` (brand scope) renders the switcher as a compact prefix in its existing
  top-left slot, before `BrandSwitcher` (`Kaafex ▸ Vector`).
- `AppRail` is Classic (`/a`), bug-fix only — untouched.
- The control is a `DsMenu`: every workspace the user belongs to with a role badge, the
  personal one first; "Create workspace" (entitlement-gated, disabled with reason);
  "Workspace settings" (`workspace.settings.view`). Switching: `accessStore.setCurrent(id)` →
  `brandStore.resetScope()` + `loadAll(id)` → `/dashboard`.
- A brand URL implies its workspace: opening `/b/:slug` for a brand in another workspace the
  user can reach switches silently (URL is the source of truth).
- **Hidden entirely for guests**, and for anyone who belongs to exactly one workspace.

## 2. Landing rules
- A user whose accessible brand count is **1** and who lacks `brands.create` skips
  `/dashboard` and lands inside that brand (`getBrandHomeUrl(slug)`). This is the client and
  the single-brand freelancer; they never see the projects grid or the word "workspace".
- Guests with several brands get `/dashboard` with the grid only: no folder tabs, no
  rubber-band selection, no create card, and a card menu reduced to Open.

## 3. Settings → Workspace (`/settings/workspace`, `workspace.settings.view`)
General (name, logo — edit needs `workspace.settings.edit`), plan summary link, Danger zone
(Transfer ownership · Delete workspace — owner only).

## 4. Settings → Members (`/settings/members`) — shell `SettingsLayout`
Visible to `members.view` (Members see a read-only directory; Guests never see the nav
item). Two `DsTabBar` tabs: **People** · **Invitations**. Header: seat counter
("4 of 5 seats · 1 of 5 guest seats"), **What can each role do?** (opens `RoleMatrixModal`
— the 8-column table from 03 §2, the only place the product defines Editor vs Designer),
and **Invite member** (disabled with the reason at the seat limit, with an Upgrade link).

**People** — `MembersTable`, with search (name/email) and a role filter:
```
[PA] Sarah Ahmed              Editor · All brands              ⋯
     sarah@kaafex.com
[PA] Dana Ortiz               Designer · 2 brands              ⋯
[PA] Grace Lee    GUEST       Viewer · 1 brand · exports       ⋯
```
Second column: `<default brand role> · All brands` or `<role> · N brands`, plus the named
switches that differ from the role default (`· exports`, `· no AI`); Owner/Admin rows say
`Owner` / `Admin`. Row menu (`members.manage`): Change access, Remove, Transfer ownership
(owner only). Clicking a row opens `MemberSheet`:
- identity; workspace role select (Owner is not in the list — use Transfer ownership)
- brand access: **All brands** — "as **Editor ▾** on every brand, including ones added later"
  — or **Selected brands**: a multi-select brand picker with search, one role applied to the
  selection, then per-row role selects
- named switches: **Can download and export** · **Can use AI generation** · **Can see
  billing** (Members only); **Monthly AI limit** (credits, blank = none)
- every write is one RPC; a change that *removes* access confirms with the delta first
  ("Sarah will lose access to 29 brands." / "Dana will no longer be able to use AI on Client B.")

**Invitations** — pending rows: email, role + brand summary, invited by, expires in N days;
actions Copy link · Resend · Revoke. Empty state explains the flow.

### `InviteMemberModal`
```
Email                [                      ]
Role                 ( Member ▾ )              Admin / Member / Guest — Owner never offered
Brand access         ● Selected brands   ○ All brands   (All disabled for Guest)
   Selected:         [ search brands…            ]  ☐ Client A  ☐ Client B  ☐ Client C
                     apply role ( Designer ▾ ) to selection → per-row role selects appear
   All:              as ( Editor ▾ ) on every brand, including ones added later
Access               ☑ Can download and export   ☐ Can use AI generation   ☐ Can see billing
Message (optional)   [                      ]
                                                          [Cancel] [Send invite]
```
Defaults: role Member; mode Selected (owner decision #1); brand role Editor for Members,
Viewer for Guests; AI off for Guests and Viewers, on otherwise; export on except Viewers.
For Guests the switches are labelled for the brands: "Can use AI generation on these brands".

## 5. Brand → Share → **Access** tab (`/b/:slug/share?tab=access`) — shell `WorkspaceShell`
```
Who has access to Vector

[PA] Alice Hamza     Owner        Everything                  via workspace
[PA] Adam Ortiz      Admin        Everything                  via workspace
[PA] Emma Said       Editor       Editor                      via workspace (all brands)
[PA] Dana Ortiz      Designer     Designer · no AI            direct              ⋯
[PA] Grace Lee       Guest        Viewer · exports            direct              ⋯
[PA] carol@…         —            Editor                      invited · 5 days    ⋯
                                                                    [Add people]
```
"via workspace" rows are read-only here (edit in Members). "direct" rows can be changed or
removed inline (`brand.access.manage`), with the same delta confirmation; pending
invitations that name this brand are listed. **Add people** picks from existing members
whose mode is Selected (adds a grant) — inviting new people goes through Members so seats are
counted once. `brand.access.view` sees the list read-only.

## 6. Permission-aware surfaces (03 §4.3 applied)
- Nav (`WorkspaceShell` tabs, `WorkspaceShellAlt` items): filtered by capability; Guests
  never see Members/Settings/Usage; Viewers see Setup/Strategy/Kit/Guideline as read-only
  pages — the brand's definition is what a viewer came for; Brand Settings is Editor+.
- Read-only pages: `ReadOnlyNotice reason="no_edit_access"` naming a manager; controls
  removed via `<Can>`; Rebrand pill and `+` absent. Archived: `reason="archived"`.
- Viewers without export: Download **disabled with reason**, everywhere else hidden.
- Dashboard card menu: Rename/Change cover/Shuffle/Move to folder need `brand.card.edit`;
  Archive needs `brand.archive`; **Delete permanently** appears only in the archived list and
  needs `brands.delete`; bulk delete confirms with counts per brand. Dashboard folders are
  workspace-shared.
- Design editor for Viewers: read-only (canvas locked). AI Generate panel without
  `ai.generate`: absent. Folders without `library.upload`: no upload zone.
- Plan/limit denials: disabled control + reason tooltip + `DsBanner` for soft limits.
- Before `my_access()` resolves, gated regions render `DsSkeleton` — never the denied branch.

## 7. Usage (`/settings/usage`, `workspace.usage.view`) — shell `SettingsLayout`
Balance, this month's spend, ledger, **by person** (name · generations · credits · monthly
limit) and **by brand** from `ai_usage_events`. No dollars in the headline.

## 8. Invitation landing (`/invite/:token`, public)
Card: for Members "Alice invited you to **Kaafex**" (+ role); for Guests "Alice invited you
to work on **Client A** and **Client B**". Signed-out: Create account / Sign in with the
email pre-filled and locked. Signed-in, matching email: **Join**. Mismatch: masked address +
Switch account. Invalid/expired/revoked: one neutral message.

## 9. Deferred from V1 (recorded so nobody re-argues them)
Generic capability override editor (Pro `advanced_access`), Suspend UI, member activity
strip, "Copy access from…", "Request access", saved custom roles.
