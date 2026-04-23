# Feature Map — Old UI → v2 Tabs

Every existing feature in BrandOS, mapped to its new home in the 5-tab v2 model. The goal: nothing gets dropped in the rebuild. If a feature isn't listed here, surface it — it may be missed.

Status legend: **Active** = live today · **Dead** = in codebase but unused · **Planned** = designed, not built.

---

## 1. Setup — `/b/:slug/setup` ✅ reference

| Feature | Old location | Status | Notes |
| --- | --- | --- | --- |
| Logo upload + variants (primary · alt · mark) | Brand → Identity → Logo | Active | Checklist item |
| Color palette (core · accent · grey) | Brand → Identity → Colors | Active | 15-swatch max |
| Typography pair (display + body) | Brand → Identity → Typography | Active | Google Fonts picker |
| Iconography (12-icon set) | Brand → Identity → Icons | Active | |
| Photography references | Brand → Identity (new) | Active | 6-reference pack |
| Website URL | Brand → Identity (new) | Active | Display link |
| About / company blurb | Brand → Identity → Voice | Active | 5 sections |
| Live preview panel | — | Active | Right-side floating panel |
| Publish action | Brand → Share | Active | Top-right button |
| Completion progress bar | — | Active | Sidebar header |

---

## 2. Brand Kit — `/b/:slug/brand-kit`

| Feature | Old location | Status | Notes |
| --- | --- | --- | --- |
| Brand Board (interactive poster editor) | Brand → Templates → Brand Board | Active | See `docs/brand-board/` |
| Logo Maker | Brand → Identity → Logo Maker | Active | Save-to-brand flow exists |
| Logo variant gallery + safety validation | `features/brandkit/engine/brandRules.ts` | Active | WCAG contrast check |
| Color palette display (swatches + codes) | Brand → Identity → Colors (read mode) | Active | Hex / RGB / HSL tabs |
| Color harmony generator | `features/brandkit/engine/colorEngine.ts` | Active | Complementary / triadic / analogous |
| Shade / tint generator | `features/brandkit/engine/colorEngine.ts` | Active | |
| Typography system preview (display / body / UI scales) | Brand → Identity → Typography | Active | |
| Icon system viewer | Brand → Identity → Icons | Active | |
| Photography mood board | Brand → Identity (new) | Active | |
| Logo deck (export-ready sheet) | Brand → Share → Exports | Active | |
| Brand validation score | `features/brandkit/engine/brandRules.ts` | Active | Surface as badge in sidebar |
| Download-all assets (zip) | Brand → Share → Exports | Active | |

---

## 3. Guideline — `/b/:slug/guideline`

| Feature | Old location | Status | Notes |
| --- | --- | --- | --- |
| Slide-based guidelines editor | `src/features/guidelines` | Active | Core of this tab |
| Strategy section | Brand → Identity → Strategy | Active | One slide |
| Voice & tone section | Brand → Identity → Voice | Active | One slide |
| Logo usage rules (do / don't) | — | Planned | New slide |
| Color usage rules | — | Planned | New slide |
| Typography rules | — | Planned | New slide |
| Guidelines public share link | Brand → Share → Guidelines | Active | "Share" button in top bar |
| Guidelines PDF export | Brand → Share → Exports | Active | |
| Guidelines showcase (public vanity page) | Brand → Share → Showcase | Active | Could also live in Tools |

---

## 4. Design — `/b/:slug/design`

| Feature | Old location | Status | Notes |
| --- | --- | --- | --- |
| Blank Canvas launcher | Brand → Design → Blank Canvas | Active | |
| AI Design generator | Brand → Design → AI Design | Active | |
| Recent designs list | Brand → Design → Recent | Active | |
| Fabric.js canvas editor | `src/features/brandkit` + editor core | Active | Off-limits per CLAUDE.md (stable tag) |
| `EditorChrome` topbar | `src/features/editor/core` | Active | Keep as-is |
| `useAutoSave` hook | `src/features/editor/core` | Active | Keep as-is |
| Template picker — Bento | Brand → Templates → Bento | Active | |
| Template picker — Social | Brand → Templates → Social | Active | Maps to social-media editor |
| Template picker — Print | Brand → Templates → Print | Active | |
| Template picker — Screen | Brand → Templates → Screen | Active | |
| Template picker — Utility | Brand → Templates → Utility | Active | |
| Social media editor | `/b/:slug/social-media?platform=X&format=Y` | Active | Direct-open flow, no modal picker |
| Content Calendar | Brand → Content → Calendar | Active | Sub-tool in Design |
| Posts list | Brand → Content → Posts | Active | |
| Drafts list | Brand → Content → Drafts | Active | |
| Saved Designs library | Brand → Folders → Designs | Active | Filter of all saved canvas output |

---

## 5. Tools — `/b/:slug/tools`

| Feature | Old location | Status | Notes |
| --- | --- | --- | --- |
| DAM / Asset library | Brand → Folders → Assets | Active | Uses `AssetSourcePopover` |
| Batch export | Brand → Share → Exports | Active | |
| Public share link | Brand → Share → Guidelines (share URL) | Active | |
| Brand showcase page (public) | Brand → Share → Showcase | Active | |
| Brand validation audit | `features/brandkit/engine/brandRules.ts` | Active | Standalone panel here |
| Contrast checker | Color engine | Active | |
| Logo Maker (standalone — not brand-saving mode) | Brand → Identity → Logo Maker | Active | Redirects to Brand Kit flow when user wants to save |
| Integrations / API keys | — | Planned | |
| Team members | `/settings` workspace | Active | Link out to workspace settings |

---

## Workspace level — outside the 5 tabs

| Feature | Old location | New location |
| --- | --- | --- |
| Brand cards grid | `/dashboard` | `/` or `/dashboard` (workspace shell) |
| Brand chooser (template-driven) | `BrandChooserDialog` | Reused from workspace `/templates` |
| Settings | `/dashboard/settings` | `/settings` |
| Learn | `/dashboard/learn` | `/learn` |
| Templates library | `/dashboard/templates` | `/templates` |
| Auth (login / sign-up) | `AuthModal` | Unchanged |

---

## Features to verify against code

The list above is drawn from `CLAUDE.md` and memory. Before the Claude Design handoff is final, walk the routes in `src/App.tsx` and the feature folders under `src/features/*` to confirm nothing is missing. Anything new gets added to the right tab's table above.
