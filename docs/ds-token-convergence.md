# Studio token convergence — workspace.css → `--ds-*`

Status: **Phases 1–3 executed 2026-08-11.** Phase 3 (shell + navigation):
60 Category-A usages renamed to `--ds-*` (workspace.css shell/nav sections
top-nav · segmented-nav · theme-toggle · pill-btn · .shell, plus
workspace-home.css nav/profile blocks, plus the `--rule` re-base onto
`--ds-border`); computed-style probes byte-identical before/after in both
modes incl. nav hover; repo-wide Category-A grep 1945 → 1885. Shell's
three Category-B usages stay literal and are on record for later phases:
`.segmented-nav-pill` background (`--accent-muted`, active-tab tint) and
`.pill-btn--primary:hover` bg+border (`--accent-hover`, hover-color
affordance). Phases 4+ (Setup pilot onward) await explicit go.
(Authored 2026-08-11, revised same day: bridge is mechanical-only;
semantic collapses migrate per-component.) Goal: `--ds-*` (tokens.json) becomes the only Studio
chrome token system, via a temporary compatibility bridge that is deleted
at a measurable point — never a second permanent mapping layer.

**Governing principle: token convergence first, behavior migration
second.** The bridge phase is mechanically safe and behavior-preserving —
it renames roles, it never redesigns interactions. A bridge commit should
be visually/behaviorally boring enough that any screenshot delta outside
the enumerated expected list is treated as a regression and reverted.

Out of scope, permanently: customer-brand `--brand-*` / `--pres-*` runtime
tokens (different job), Classic/shadcn styling (`src/components/ui`,
index.css HSL tokens), and any visual redesign beyond the enumerated
value deltas in the bridge commit.

## 1 · Category A — mechanical aliases (enter the bridge immediately)

Old and new roles are genuinely equivalent; only the name (and slightly,
the value) changes. Usage counts are css+tsx combined.

| workspace token | uses | `--ds-*` equivalent | expected delta at flip |
|---|---|---|---|
| `--background` | 21 | `--ds-bg` | #f7f5f3 → #f5f4ef (tiny warm shift) |
| `--surface` | 70 | `--ds-surface` | light identical (#ffffff); dark #141414 → #1d1c1a — cards become distinguishable from the page (DS separates surface from bg in dark) |
| `--surface-hover` | 31 | `--ds-surface-hover` | #f8f8f7 → #efeee8 (quiet fills warmer) |
| `--border` | 216 | `--ds-border` | rgba(13,13,13,.12) → solid #e6e4dd (same role + weight) |
| `--border-strong` | 17 | `--ds-border-strong` *(new, §2)* | ≈ same weight |
| `--dash` | 13 | `--ds-dash` | ≈ |
| `--dash-strong` | 12 | `--ds-dash-strong` *(new, §2)* | ≈ |
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
| `--shadow-lg` | 8 | `--ds-shadow-float` | same "biggest float" role; geometry changes (single 24/56px layer → DS dual-layer float) |
| `--ease` | 177 | `--ds-ease` | **byte-identical already** |

That expected-delta column is the complete list of intended visual change
in the bridge commit. Anything else in the before/after screenshots is a
regression.

## 2 · Genuinely missing tokens — add exactly two

| new token | replaces | uses | value (EXACT copy of current workspace value — owner decision) |
|---|---|---|---|
| `--ds-border-strong` | `--border-strong` | 17 | light `rgba(13, 13, 13, 0.22)` · dark `rgba(247, 245, 243, 0.22)` |
| `--ds-dash-strong` | `--dash-strong` | 12 | light `rgba(13, 13, 13, 0.55)` · dark `rgba(247, 245, 243, 0.55)` |

Real, widespread state ramps with no DS counterpart; mapping them onto
`--ds-focus-border` would overload focus semantics. **Values are
initialized verbatim from workspace.css — Phase 1 is architectural
convergence, not visual tuning.** Any retuning onto the DS neutral ramp
happens later through the Design System Controller as an explicit design
decision. Added to tokens.json (both modes) + Controller registry
(status: done, Phase 1).

## 3 · Category B — semantic collapses (NOT bridged; per-component migration)

These roles intentionally disappear or change under the DS interaction
model. **They keep their current literal light+dark definitions untouched
through the bridge phase.** Each consumer migrates token AND replacement
behavior together; the old token's definition is deleted individually the
day its consumer count hits zero — independent of the bridge.

| workspace token | uses | DS replacement (adopted per-component) |
|---|---|---|
| `--surface-elevated` | 44 | `--ds-surface` **plus** an elevation shadow — DS expresses elevation with shadows, not a tinted surface. Migrate tint→shadow together per component. |
| `--surface-sunken` | 27 | Role doesn't exist in DS. Per call site: recessed wells → `--ds-surface-hover`; quiet section backgrounds → `--ds-surface-subtle`. A global alias would conflate a static well with a hover state. |
| `--accent-muted` | 36 | Mostly selection/active tints. Per call site: quiet fills → `--ds-surface-hover`; true selection states → the DS active treatment of that component. |
| `--accent-hover` | 3 | DS rule: hover never shifts color — lift + shadow instead. Do NOT remove the hover-color affordance until the component adopts the DS hover behavior that replaces it. |
| `--accent-active` | 1 | Same — press collapses the lift (DS), adopted with the component. |
| `--link` | 2 | DS has no blue link (charcoal + underline). Visible redesign — migrate both call sites deliberately, with eyes on them. |

## 4 · Implementation details — must NOT become tokens

`--pill-bg(-focus)` (nav pill), `--dz-bg(-hover)` (drop zone), `--cp-h`
(command palette height), `--page-bg`, `--rule` (derived
`color-mix(border)`), `--radix-popper-available-height` (Radix runtime).
These are legitimate **local** CSS custom properties. They stay in their
component blocks and get re-based onto ds tokens in place when their
component migrates (e.g. `--rule: color-mix(in srgb, var(--ds-border) 60%,
transparent)`); some may simply be inlined and removed. They are
explicitly **excluded** from the legacy-token deletion criterion and from
the CI guard — the guard prevents resurrection of legacy *design tokens*,
it does not forbid local custom properties.

## 5 · The bridge — shape and safety

```css
/* TEMPORARY BRIDGE — mechanical aliases ONLY (§1). Delete this whole
   block when the §7 category-A grep is zero. Do not add names here —
   category-B tokens (§3) migrate per-component, never via this block.
   Do not reference these old names in new code. */
[data-workspace] {
  --background: var(--ds-bg);
  --surface: var(--ds-surface);
  /* … every §1 row … */
}
```

Why it's safe:
- WorkspaceShell renders `<div data-workspace data-theme={light|dark}>` —
  `--ds-*` re-resolve per `data-theme` on that same element, so ONE scoped
  alias block is automatically mode-correct. The dark-mode workspace
  overrides (workspace.css:105) are deleted **for §1 names only** in the
  same commit; §3 names keep both their light and dark literals.
- **Name-collision hazard**: `--border`, `--background`, `--accent`,
  `--ring` also exist at `:root` as shadcn HSL fragments (index.css). The
  bridge must stay strictly inside `[data-workspace]`; never hoist old
  names to `:root`.

## 6 · Migration order (each step lands green, independently revertable)

1. **Tokens**: add `--ds-border-strong` + `--ds-dash-strong` to tokens.json
   (+ gen, + Controller registry). No consumers yet — zero risk.
2. **Bridge commit** (§1 aliases only): alias block in, dark duplicates of
   §1 names out, §3 tokens untouched. Screenshot Studio home / setup /
   brand-kit in both modes before/after; verify every delta appears in
   the §1 expected-delta column; anything else → revert. Full test run.
3. **Shell + navigation rename**: `var(--x)` → `var(--ds-x)` for §1 names
   in workspace.css class rules and shell TSX. Zero-visual by construction
   (aliases already equalized values). Where the shell uses a §3 token,
   migrate that component's token + behavior together or leave it for its
   feature pass — never blind-rename a §3 name.
4. **Pilot page — `/b/:slug/setup`**: §1 renames mechanically; §3 usages
   individually (token + replacement behavior together). Chosen because it
   exercises shell, sidebar rail, and forms while avoiding brand-kit
   (owner-sensitive, actively iterated).
5. **Sweep** remaining Studio surfaces one at a time: tools hub,
   design-alt, editor shell, guideline (frozen surface — §1 rename-only;
   defer its §3 usages to the planned rebuild), brand-kit LAST and with
   owner review.
6. **Delete** per §7 + remove the dead tailwind `cosmos.*` color mapping
   in the same commit.

## 7 · Deletion criteria — exact

**Category A (the bridge):** delete the bridge block the day this returns
zero matches outside the bridge block itself:

```bash
grep -rEn "var\(--(background|surface(-hover)?|border(-strong)?|dash(-strong)?|text-(primary|secondary|muted|subtle)|accent(-contrast|-ring)?|critical(-soft)?|ok(-bg)?|shadow-(xs|sm|md|lg)|ease)\)" \
  src --include='*.tsx' --include='*.ts' --include='*.css' \
  | grep -v "TEMPORARY BRIDGE"
```

**Category B (per token):** each of `--surface-elevated`,
`--surface-sunken`, `--accent-muted`, `--accent-hover`, `--accent-active`,
`--link` is deleted individually (its light **and** dark definitions) the
day `grep -rn "var(--<name>)" src` hits zero. No bridge involvement.

`--rule` and the other §4 local variables are **excluded** from both
criteria — they are re-based or inlined when their components migrate.

**CI guard (after full deletion):** a unit test asserting workspace.css
**defines** none of the legacy design-token names above (the explicit §1 +
§3 list — definitions, not `var()` references). Local component custom
properties remain legitimate and unguarded.

Note: the Guideline rebuild (owner decision, CLAUDE.md) will delete a
block of old-name consumers wholesale — if it lands mid-plan, re-run the
greps before doing manual sweep work there.
