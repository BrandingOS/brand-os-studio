# Code → Figma — progress and generation log

Branch `feat/code-to-figma` · worktree `/Users/home/Projects/brandingOS-figma`

## Figma artifacts — migration record

| # | File key | Plan | Status |
|---|---|---|---|
| 1 | `ENUyRqutR5XS9VNRG405P5` | Personal Components (starter) | **Preflight evidence only.** Never a production artifact. Keep. |
| 2 | `weFwq43BkXMD1xWwf3fVIJ` | Personal Components (starter) | **Superseded fallback.** First production attempt; 3 pages / 9 sections. Untouched and retained per owner instruction until the new file is verified. Do not delete. |
| 3 | `lWCd3Ex1occA58zmJ2glfO` | Brand OS (pro) | **Abandoned, empty.** Created with an HTML-escaped ampersand in its name; `figma.root.name` is not settable (`set_name: Setting the document name is currently not supported`), so it could not be corrected. Its only write rolled back. No MCP delete tool exists — left in place, harmless. |
| 4 | **`ZTR7jwR1cvjYvs0N9kuHCX`** | **Brand OS (pro, Full seat)** | **PRODUCTION ARTIFACT.** `BrandingOS — Product Design System & Application` |

**Production URL:** https://www.figma.com/design/ZTR7jwR1cvjYvs0N9kuHCX

### Why the target moved

Owner decision 8 originally pinned the artifact to Personal Components, on the
stated rationale "where write access was proven". Two facts changed that:

1. Personal Components is **starter** — 20 MCP tool calls per *month*, which the
   preflight and the start of Cycle 0 exhausted. The quota is scoped to the
   **file's owning plan**, not the user: a read against the Personal Components
   file was refused with an upgrade URL naming that team, while calls against
   Brand OS succeed.
2. Brand OS was upgraded to **pro** with a **Full** seat, satisfying decision 8's
   own rationale.

The owner explicitly superseded decision 8. See `CONSTRAINTS.md` for the measured
limits.

### Pro capabilities verified live in the production file

| Capability | Evidence |
|---|---|
| Unlimited pages | 13 pages created; starter refused past 3 |
| **Multi-mode variables** | probe collection carried `Light` + `Dark` with distinct values per mode |
| MCP allowance | writes succeed here, refused in Personal Components |

**Consequence for the design:** `theme=light\|dark` as a variant axis is
**withdrawn**. Themes become real variable modes, which roughly halves every
component set. The variant axis survives only where a theme causes a genuine
*structural* difference, not merely a colour difference — that exception is
carried in the specification.

Library publishing is available on Pro but is **deliberately not used yet**:
publish only when the corresponding final quality gate passes.

## Cycle status

| Cycle | State | Notes |
|---|---|---|
| 0 — Specification and production bridge | **in progress** | Worktree ✅ · snapshot ✅ · production file ✅ · native write/read ✅ · 13-page structure ✅ · spec rewrite → in progress · independent review → pending |
| 1 — Product truth and coverage inventory | pending | |
| 2 — Real vertical slice | pending | Gate that first permits "end-to-end validated" |
| 3 — Foundations | pending | Now uses real Light/Dark modes |
| 4 — Shared components | pending | batches of 3–5 |
| 5 — Common chrome and navigation | pending | |
| 6 — Setup | pending | |
| 7 — Brand Kit browsing | pending | |
| 8 — Brand Kit editors | pending | |
| 9 — Design | pending | |
| 10 — Responsive and RTL hardening | pending | |
| 11 — Complete regeneration and QA | pending | |
| 12 — Delivery | pending | |

## Generation metadata

| Field | Value |
|---|---|
| Source branch | `feat/code-to-figma` |
| Base commit | `8aabd54b` |
| Last generation | Cycle 0 — page skeleton |
| Transport | Figma MCP (Brand OS, pro) — primary; `figma-plugin/` retained as fallback |

## Quota discipline

MCP calls are metered (200/day, 10/min on Pro). Rules adopted after the starter
ceiling was hit:

- Reviewer subagents receive **captured evidence**, never live MCP access. The
  preflight reviewer's read-only audit spent roughly a third of a month's starter
  quota.
- Batch writes per slice; do not read back what the write already returned.
- `whoami`, `create_new_file` and `add_code_connect_map` are quota-exempt and may
  be used freely.
