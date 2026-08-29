# Access Architecture — 10 · UX Design (Members · Invite · Brand Access · Switching)

All chrome uses `@/shared/ds` (DsButton, DsInput, DsSelect, DsSegmented, DsModal, DsMenu,
DsBadge, DsTabBar, DsEmptyState, DsBanner) and `PageHeader`; nothing from shadcn. Pre-flight
report is produced per component when built.

## 1. Workspace switcher
Top-left slot of `AppRail` / `WorkspaceShell` (where the brand switcher already lives, above
it): the current workspace name with a `DsMenu` listing every workspace the user belongs to
(role badge beside each), "Create workspace" (entitlement-gated, disabled with reason), and
"Workspace settings". Switching: `accessStore.setCurrent(id)` → `brandStore.resetScope()` +
`loadAll(id)` → navigate to `/dashboard`. Personal workspace is listed first. A brand URL
always implies its workspace: opening `/b/:slug` for a brand in another workspace the user
can reach switches silently (the URL is the source of truth); one they cannot reach shows the
404-shaped panel.

## 2. Settings → Workspace (`/settings/workspace`, owner/admin)
General (name, logo), Plan summary link, Danger zone (Transfer ownership · Delete workspace).

## 3. Settings → Members (`/settings/members`, owner/admin; members see a read-only directory)
Two `DsTabBar` tabs: **People** · **Invitations**. (Usage and Billing are their own settings
pages; "Access/Roles" lives in the member sheet.)

**People** — table rows:
```
[avatar] Sarah Ahmed              Editor · All brands            Active     ⋯
         sarah@kaafex.com
[avatar] Dana Ortiz               Designer · 2 brands            Active     ⋯
[avatar] Grace Lee    GUEST       Viewer · 1 brand               Active     ⋯
[avatar] Sam Park                 Member · All brands            Suspended  ⋯
```
Second column = brand summary: `<default brand role> · All brands` or `<role> · N brands`;
owner/admin rows say `Owner` / `Admin` only. Row menu: Change access, Suspend/Reactivate,
Remove, Transfer ownership (owner only). Clicking a row opens the **member sheet** (right
`DsModal` panel): identity, workspace role select, brand access (All / Selected with a
brand picker showing a role select per brand), **Advanced access** disclosure (the
overridable capabilities for that role as switches, grouped by area, showing "Included in
role" vs "Added" vs "Removed"), and an activity strip (joined, invited by, last change).
Every change is one write with a `DsToast`.

**Invitations** — pending rows: email, role + brand summary, invited by, expires in N days,
actions Copy link · Resend · Revoke. Empty state explains the flow.

**Invite member** button (header) → `InviteMemberModal`:
```
Email                [                      ]
Role                 ( Member ▾ )   Owner not offered; Admin/Member/Guest
Brand access         ● Selected brands   ○ All brands      (All is disabled for Guest)
                     [ Client A  · Designer ▾ ] [ Client B · Designer ▾ ]  + Add brand
Message (optional)   [                      ]
▸ Advanced access                                 (plan-gated: "Pro" badge on Free)
                                    [Cancel] [Send invite]
```
Default role Member, default mode Selected (owner decision #1), default brand role Editor
for members, Viewer for guests; guest template denies `ai.generate` unless ticked under
Advanced. Seat counter under the button: "4 of 5 seats · 1 of 5 guest seats". At the limit
the button is disabled with the reason and an Upgrade link.

## 4. Brand → Share → **Access** tab (`/b/:slug/share?tab=access`)
Answers the five questions in the brief:
```
Who has access to Kaafex

Alice Hamza     Owner        Everything            via workspace
Adam Ortiz      Admin        Everything            via workspace
Emma Said       Editor       Editor                via workspace (all brands)
Dana Ortiz      Designer     Designer              direct
Grace Lee       Guest        Viewer + export       direct
                                                    [Manage access]
```
"via workspace" rows are read-only here (edit in Members); "direct" rows can be changed or
removed inline (`brand.access.manage`). **Add people** picks from existing members whose
mode is Selected (adding a brand grant) — inviting new people goes through Members so seats
are counted once. Managers see it; editors see the list read-only (`brand.access.view`).

## 5. Permission-aware surfaces (03 §4.3 applied)
- Nav (`AppRail`, `WorkspaceShell` tabs): items filtered by capability; Guest never sees
  Members/Settings/Usage; Viewer sees Setup/Strategy as read-only pages, not hidden — the
  brand's definition is what a viewer came to see.
- Setup/Strategy/Brand Kit/Guideline in read-only: `ReadOnlyNotice` at top, controls
  removed via `<Can>`; the Rebrand pill and `+` buttons absent.
- Design editor for viewers: opens read-only (canvas locked, Export hidden unless granted).
- Folders for viewers: no upload zone; download only if `designs.export`.
- AI Generate panel without `ai.generate`: panel absent, not disabled.
- Plan/limit denials: disabled control + reason tooltip + inline `DsBanner` for soft limits.

## 6. Usage (`/settings/usage`, `workspace.usage.view`)
Balance, "this month" spend, ledger list, and a **by person** breakdown from
`ai_usage_events` (name · generations · credits); a per-brand breakdown beneath it.
Credits never show dollars in the headline (existing `CreditsPill` rule).

## 7. Invitation landing (`/invite/:token`, public)
Card: "Alice invited you to **Kaafex** as Member (2 brands)". Signed-out: Create account /
Sign in (email pre-filled, locked). Signed-in with matching email: **Join workspace**.
Mismatch: the masked address and a Switch account action. Invalid: one neutral message.
