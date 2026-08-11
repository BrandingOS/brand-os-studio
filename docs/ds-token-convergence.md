# Studio token convergence — workspace.css → `--ds-*`

Status: **approved plan, not yet executed** (authored 2026-08-11 from the
new-ui audit). Goal: `--ds-*` (tokens.json) becomes the only Studio chrome
token system, via a temporary compatibility bridge that is deleted at a
measurable point — never a second permanent mapping layer.

Out of scope, permanently: customer-brand `--brand-*` / `--pres-*` runtime
tokens (different job), Classic/shadcn styling (`src/components/ui`,
index.css HSL tokens), and any visual redesign beyond the one deliberate
value flip described in Phase 2.

## 1 · Mapping — exact semantic equivalents (bridge these)

Workspace tokens are defined twice (light block `workspace.css:21`, dark
override `:105`) plus a small second block (`:2895`). Usage counts below are
css+tsx combined.

| workspace token | uses | `--ds-*` equivalent | value delta at flip |
|---|---|---|---|
| `--background` | 21 | `--ds-bg` | #f7f5f3 → #f5f4ef (tiny warm shift) |
| `--surface` | 70 | `--ds-surface` | identical (#ffffff) |
| `--surface-hover` | 31 | `--ds-surface-hover` | #f8f8f7 → #efeee8 (most visible: quiet fills get warmer) |
| `--surface-sunken` | 27 | `--ds-surface-hover` | #f2f1f0 ≈ #efeee8 — DS spec's "quiet fills" covers sunken wells |
| `--border` | 216 | `--ds-border` | rgba(13,13,13,.12) → solid #e6e4dd (equal weight on light surfaces) |
| `--dash` | 13 | `--ds-dash` | ≈ |
| `--text-primary` | 138 | `--ds-text` | #0d0d0d → #0e0e0e |
| `--text-secondary` | 60 | `--ds-text-secondary` | #6e6a69 → #55534c (slightly darker/warmer) |
| `--text-muted` | 137 | `--ds-text-muted` | ≈ |
| `--text-subtle` | 4 | `--ds-text-muted` | already aliased to muted today |
| `--accent` | 32 | `--ds-accent` | #0d0d0d → #111113 |
| `--accent-contrast` | 12 | `--ds-accent-fg` | ≈ |
| `--accent-ring` | 12 | `--ds-focus-ring` | ≈ |
| `--critical` / `--critical-soft` | 7 | `--ds-danger` / `--ds-danger-bg` | warm red family |
| `--ok` / `--ok-bg` | 6 | `--ds-success` / `--ds-success-bg` | ≈ |
| `--shadow-xs/sm/md` | 21 | same-name `--ds-shadow-*` | warmer shadow tint |
| `--shadow-lg` | 8 | `--ds-shadow-float` | ≈ |
| `--ease` | 177 | `--ds-ease` | **byte-identical already** |

## 2 · Genuinely missing tokens — add exactly two

| workspace token | uses | action |
|---|---|---|
| `--border-strong` | 17 | add `--ds-border-strong` (state ramp of border; real, widespread) |
| `--dash-strong` | 12 | add `--ds-dash-strong` (hover ramp of dash) |

Mapping these onto `--ds-focus-border` would blur focus semantics into
plain emphasis — two honest tokens beat one overloaded one. Add to
tokens.json (both modes) + Controller registry in the same commit.

## 3 · Deliberate DS omissions — bridge to an existing token, converge at migration

| workspace token | uses | bridge target | rationale |
|---|---|---|---|
| `--surface-elevated` | 44 | `--ds-surface` | DS expresses elevation with shadows, not a tinted surface; components pick a shadow when they migrate |
| `--accent-muted` | 36 | `--ds-surface-hover` | DS "quiet fill" role |
| `--accent-hover` / `--accent-active` | 4 | `--ds-accent` | DS rule: hover never shifts color (lift + shadow instead); adopted per-component |
| `--link` | 2 | `--ds-text` | DS has no blue link — charcoal + underline; check both call sites at bridge time |

## 4 · Implementation details — must NOT become tokens

`--pill-bg`, `--pill-bg-focus` (nav pill), `--dz-bg`, `--dz-bg-hover`
(drop zone), `--cp-h` (command palette height), `--page-bg`, `--rule`
(derived color-mix), `--radix-popper-available-height` (Radix runtime).
These stay local variables in their component blocks; when a component
migrates they get re-derived from ds tokens in place (e.g.
`--pill-bg: var(--ds-surface-hover)`), or inlined and removed.

## 5 · The bridge — shape and safety

```css
/* TEMPORARY BRIDGE — delete this whole block when the §7 grep is zero.
   Old workspace token names aliased to canonical --ds-* values. Do not
   add names here; do not reference these names in new code. */
[data-workspace] {
  --background: var(--ds-bg);
  --surface: var(--ds-surface);
  /* … every §1 + §3 row … */
}
```

Why it's safe:
- WorkspaceShell renders `<div data-workspace data-theme={light|dark}>` —
  `--ds-*` re-resolve per `data-theme` on that same element, so ONE scoped
  alias block is automatically mode-correct. The dark-mode workspace
  overrides (`:105`) for bridged names are deleted in the same commit.
- **Name-collision hazard**: `--border`, `--background`, `--accent`,
  `--ring` also exist at `:root` as shadcn HSL fragments (index.css). The
  bridge must stay strictly inside `[data-workspace]`; never hoist old
  names to `:root`.
- The flip is the one deliberate visual change of the whole plan: a
  micro warm-shift on ~5 values plus hover-color unification. Screenshot
  Studio home / setup / brand-kit in both modes before/after and eyeball.

## 6 · Migration order (each step lands green, independently revertable)

1. **Tokens**: add `--ds-border-strong` + `--ds-dash-strong` to tokens.json
   (+ gen, + Controller registry). No consumers yet — zero risk.
2. **Bridge commit** (the value flip): alias block in, dark duplicates of
   bridged names out, screenshots, full test run.
3. **Shell + navigation rename**: workspace.css shell/nav class rules and
   shell TSX inline styles change `var(--x)` → `var(--ds-x)`. Pure
   refactor — aliases already made the values identical, so this step is
   zero-visual by construction.
4. **Pilot page — `/b/:slug/setup`**: token renames only (no component
   swaps). Chosen because it exercises shell, sidebar rail, and forms
   while avoiding brand-kit (owner-sensitive, actively iterated).
5. **Sweep** remaining Studio surfaces one at a time: tools hub,
   design-alt, editor shell, guideline (frozen surface — rename-only,
   no other changes), brand-kit LAST and with owner review.
6. **Delete** (see §7) + remove the dead tailwind `cosmos.*` color mapping
   in the same commit.

## 7 · Deletion criterion — exact

The bridge (and any remaining old-name definitions) is deleted the day
this returns zero matches outside the bridge block itself:

```bash
grep -rEn "var\(--(background|surface(-elevated|-hover|-sunken)?|border(-strong)?|dash(-strong)?|text-(primary|secondary|muted|subtle)|accent(-contrast|-ring|-muted|-hover|-active)?|critical(-soft)?|ok(-bg)?|link|shadow-(xs|sm|md|lg)|ease|rule)\)" \
  src --include='*.tsx' --include='*.ts' --include='*.css' \
  | grep -v "TEMPORARY BRIDGE"
```

Optional CI guard after deletion: a unit test asserting workspace.css
contains no definitions of the old names, so they can't creep back.

Note: the Guideline rebuild (owner decision, CLAUDE.md) will delete a
block of old-name consumers wholesale — if it lands mid-plan, re-run the
grep before doing manual sweep work there.
