# Access Architecture — 11 · Review Log

Independent reviews of the DESIGN (before implementation) and, later, of the IMPLEMENTATION.
Every finding carries a disposition. BLOCKER/HIGH must be resolved; MEDIUM is judged; LOW is
recorded.

## Round 1 — design review, 2026-08-29

### Product + UX reviewer (27 findings)
| id | sev | finding | disposition |
|---|---|---|---|
| AX-01 | BLOCKER | capabilities granted for per-device resources (guideline/comments/approvals) | **Accepted.** Reserved capabilities: absent from every access UI, resolve false (03 §1, ADR-008). Guideline table stays the first follow-up (scope). |
| AX-02 | BLOCKER | switcher designed into `AppRail` (Classic) / wrong shell | **Accepted.** `WorkspaceShellAlt` left slot + `WorkspaceShell` prefix; `AppRail` untouched (10 §1). |
| AX-03 | HIGH | 404-for-403 wrong inside own workspace | **Accepted.** `AccessDeniedPanel` with 403 branch for active members naming owners/admins (03 §4.2). |
| AX-04 | HIGH | Designer locked out of Brand Kit | **Accepted.** `brand.kit.generate` (Designer) / `brand.kit.approve`. |
| AX-05 | HIGH | Editor cannot share | **Accepted.** `share.link` (Editor) / `share.publish_public` (Manager). |
| AX-06 | HIGH | Designer/Guest can submit client work to community | **Accepted.** `templates.save` / `templates.submit_community` (Manager, hard-denied for guests). |
| AX-07 | HIGH | named override cases paywalled | **Accepted.** Three named switches on every plan; generic editor deferred. |
| AX-08 | HIGH | no per-member credit ceiling | **Accepted.** `credits_monthly_cap` + `member_credit_cap_reached` (04 §2.5). |
| AX-09 | HIGH | first paint renders denied before hydration | **Accepted.** Tri-state access, skeleton while unknown, browser test. |
| AX-10 | HIGH | dashboard card has no capabilities | **Accepted.** `brand.card.edit`; shared dashboard folders; per-brand delete confirm. |
| AX-11 | HIGH | guest meets a 30-project dashboard and the word "workspace" | **Accepted** (single-brand redirect, reduced guest grid, no switcher, invite names brands). **Rejected:** renaming to "Team" — "Workspace" is already the product word; guests never see it (ADR-001). |
| AX-12 | MED | no people-only Admin; billing.manage not overridable | **Accepted** billing.manage overridable; Admin = implicit Manager stated plainly. |
| AX-13 | MED | hard delete one menu item away | **Accepted.** Delete only from the archived list. |
| AX-14 | MED | local-only notice copy | **Accepted.** New copy, non-dismissible with >1 member. |
| AX-15 | MED | DS primitives assumed | **Accepted.** Feature-local table/avatar/sheet as centered modal; settings pattern, no PageHeader. |
| AX-16 | MED | override editor + suspend over-built | **Accepted.** Generic editor and Suspend UI deferred; `status` column kept; role-matrix modal added. |
| AX-17 | MED | All-mode has no role control | **Accepted.** |
| AX-18 | MED | no fast path for many selected brands | **Accepted** multi-select picker with search; "copy access from" deferred. |
| AX-19 | MED | access changes never state the delta | **Accepted.** |
| AX-20 | MED | read-only/archived states anonymous | **Accepted.** `ReadOnlyNotice reason`. |
| AX-21 | MED | viewer's missing download reads as broken | **Accepted.** Disabled-with-reason for viewers only. |
| AX-22 | MED | viewer sees sharing tab | **Accepted.** `brand.settings.view` Editor+. |
| AX-23 | LOW | `my_access()` unbounded | **Accepted.** Brands per workspace, lazy. |
| AX-24 | LOW | no search/filter | **Accepted.** |
| AX-25 | LOW | `brands.view` misleading | **Accepted.** Renamed `brands.list`. |
| AX-26 | LOW | pending invites absent from Access tab | **Accepted.** |
| AX-27 | LOW | conflict vs undo stack | **Accepted.** |

### Security reviewer — pending (re-run on Sonnet after an Opus rate limit)
### Database reviewer — pending (same)
