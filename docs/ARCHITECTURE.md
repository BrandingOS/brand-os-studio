# BrandOS — Architecture Decision Log

Append-only record of tech-stack, pattern, and approach decisions. Newest at
the top. Each entry: **decision → reasoning → alternatives considered**.

For the live architecture overview (layers, services, stack), see
`CLAUDE.md`. This file is the *history of decisions*, not a duplicate of
that overview.

---

## 2026-04-25 — Role-based brand palette (Elementor-style global colors)

**Decision.** Every surface that draws "a brand" — card thumbnails,
brand kit previews, logo variations, presentation slides, guideline
exports, AI-generated layouts — reads its colors through
`@/shared/brand/brandPalette.ts` by **surface kind**
(`'page' | 'card' | 'elevated' | 'subtle' | 'brand' | 'brand-secondary' |
'inverted'`), not by reaching into `brand.colorSystem.primary.hex`.
The palette builder maps the brand's `colorSystem` (or legacy
`primaryColor`/`secondaryColor`) into a fixed set of role-named tokens
covering bg / text / border / accent / state, with hue-tinted neutrals
derived from the primary so the page reads "on-brand" even where the
brand color itself doesn't appear.

**Reasoning.**
- The user's recurring complaint: "الوان الجايد لاين كلها لازقه في
  بعض" — without semantic roles, every surface gets hand-painted and
  the resulting brand-guideline / variation / presentation looks either
  monotone or clashing. Elementor / Tailwind / shadcn all solve this
  the same way: name the surfaces, let the system pair colors.
- Centralisation is the point. The next time we ship a new surface
  type (auto-generated case-study deck, AI design output, brand portal
  v2), the consumer doesn't think about colors at all — it asks for
  `surfacePalette(brand, 'subtle')` and gets back a guaranteed-readable
  bundle.
- `pickSurfaceTokens` is the placement decider, not the data. Adding a
  new surface kind is a one-line switch case + a doc row, never a
  refactor of consumers.

**Alternatives considered.**
- **Per-feature palette helpers** (one in brand-kit, one in case-study
  deck, etc.). Rejected — that's how we got into the "hand-painted"
  hole. Adding another sibling repeats the same mistake.
- **Pure CSS custom-prop tokens** without a TS API. Rejected — slides
  and PNG exports run server-side / outside the DOM, where reading
  `getComputedStyle` is unreliable. The TS palette is the source of
  truth; `applyPaletteToRoot` is the bridge to plain-CSS surfaces.
- **Generate the palette on the fly inside each consumer.** Rejected —
  same neutral derivation logic in three places drifts. One pure
  builder, one cache point if needed.

**Tested with.** `brandPalette.test.ts` runs all 7 surface kinds × 3
seed brands × 2 modes = 42 contrast assertions, all clearing 4.5:1
body-text minimum. Plus a fallback test for brands with only
`primaryColor` (no `colorSystem`).

**Concrete follow-up.** Sweep the existing consumers and route them
through the palette:
- `src/features/brand/components/*` — brand pages, kit cards
- `src/features/brandkit/*` — brand kit module renderers
- `src/features/brand-board/preview/BrandBoardCanvas.tsx` — brand board
- `src/features/case-study-deck/slides/*` — already reads `BrandProfile`,
  but `BrandProfile` should be backed by the palette so future archetypes
  inherit safe colors automatically.
- `src/shared/design-system/PresentationStyleAdapter.ts` — currently
  sets some `--brand-*` props on root; should compose with
  `applyPaletteToRoot` rather than duplicating the logic.

---

## 2026-04-25 — Tools mount on `CosmosWorkspaceShell` by default

**Decision.** Any new tool page (anything routed under `/tools/*` or
`/b/:slug/tools/*`) wraps in `<CosmosWorkspaceShell>` and uses cosmos
design tokens (`var(--surface)`, `var(--border)`, `var(--text-primary)`,
etc.) inside `[data-cosmos="workspace"]`. The shell is canonical for
`/setup`, `/tools/typescale`, `/tools/ui-color-system`, and now both
modes of Mockup Studio. Tool-local CSS goes in a single stylesheet next
to the tool, all selectors prefixed and scoped under
`[data-cosmos="workspace"]`.

**Reasoning.**
- The user's recurring feedback this quarter has been "make it look like
  /setup and /tools/ui-color-system". Centralising on one shell is the
  cheapest way to honour that without re-litigating each page.
- The shell auto-detects `/b/:slug/*` and swaps the top-left B-mark for
  `BrandSwitcher`, so brand-aware tools get brand context for free —
  zero per-page wiring.
- Cosmos tokens already cover light + dark, so theme handling lands
  through the shell's toggle without per-tool overrides.

**Alternatives considered.**
- **Per-tool custom shells** (what mockup-studio originally did with old
  shadcn chrome). Rejected — visual drift was the bug we kept shipping.
- **Roll cosmos primitives into `BrandRouteLayout`** so brand pages
  inherit them directly. Out of scope; brand-scope sections still need
  the InnerNavRail. Tools don't, so the cosmos shell stays a peer.

**Gotchas baked in from this session.**
- Anything inside a Radix `Portal` (Popover/Dialog/Dropdown content) renders
  outside `[data-cosmos="workspace"]`. Styles for that content must be
  unscoped and reach tokens via `hsl(var(--muted))` etc. The trigger is
  fine to scope.
- The shell's segmented-nav active pill measures via `offsetLeft` /
  `offsetWidth`, NOT `getBoundingClientRect`. The open keyframe applies a
  `scale(0.96)` for ~440ms; rect-based measurement during that window
  gives 96% wrong values that stick. If you add another animated chrome
  primitive to the shell, follow the same rule.

---

## 2026-04-25 — DI service swaps must fan out to data stores

**Decision.** When `reconfigureForAuth(true)` swaps `BRANDS` (and other
SERVICE_KEYS) from local to Supabase implementations, any data store
that has already populated against the old service must re-fetch.
Today this is wired by hand in `useAuth.ts` — it calls
`useBrandStore.getState().loadAll()` immediately after each
`reconfigureForAuth` call (initial-session, SIGNED_IN, SIGNED_OUT).

**Reasoning.**
- `AuthModal` flips `isAuthenticated` and navigates to `/dashboard`
  synchronously *before* Supabase's `SIGNED_IN` event runs the swap.
  `WorkspaceHome` mounts and calls `loadAll()` — but the BRANDS service
  is still `LocalBrandsService`, which returns whatever's in
  `localStorage['brandos:brands']` (empty for a fresh sign-in). The
  empty result then sticks until the user manually refreshes, because
  no consumer listens for the swap.
- Stores must be re-loaded on swap, otherwise the UI lies about state.
  Patching `WorkspaceHome` to gate on `isAuthenticated` masks the
  symptom but leaves every other consumer broken (logo-maker, social
  picker, anywhere a brand list is read post-sign-in).

**Alternatives considered.**
- **Move the re-fetch into `reconfigureForAuth`.** Reasonable, but
  pulls every store into the boot module. Useful next step, not done
  here.
- **Subscribe stores to an auth event.** Cleaner long-term. Would need
  an event bus or Zustand-store-of-stores pattern. Out of scope this
  session.
- **Render-flash gate (`hasLoaded` state in `WorkspaceHome`).** Tried
  in `968d0f7`, reverted in `b1d8d35` — fixed the wrong symptom and
  left users stuck on "Loading…". The lesson: a stale store from a
  service-swap race looks identical to a render flash; check which
  before adding a gate.

**Concrete follow-up.** `src/shared/hooks/useDataSync.ts` already exists
to re-fetch on auth-mode change but **nothing imports it**. Either
mount it under `AuthProvider` (one-line fix that would have caught
this) or delete it. Don't leave dead code that the next person assumes
is wired.

---

## 2026-04-24 — Case-study deck: archetype × variant × director pattern

**Decision.** Auto-generated brand decks (Behance-style case study at
`/b/:slug/case-study`) are built as **N archetypes × M variants, composed
by a pure director function**. For v1: 10 archetypes, 3–4 variants each, 29
compositions total. The director reads brand personality, palette shape,
and asset inventory, then emits a `DeckPlan` (`{ archetype, variant }[]`).
A `slides/renderer.tsx` registry maps `(archetype, variant)` → React
component. No slide reads the `Brand` type directly — they render against
`BrandProfile` (a pure derived view produced by `buildProfile(brand)`).

**Reasoning.**
- The user's core ask was "could be applied for any brand, and not just
  repetitive/stupid". One fixed template would stamp every brand. A
  template-selection system avoids that: same vocabulary, bespoke output.
- Separating the director (what to render) from the slides (how to render)
  makes each half independently testable. Director is pure TS and has no
  React; slides are presentational components with no knowledge of brand
  rules.
- `BrandProfile` gives slides a stable contract. If the `Brand` type
  changes, only `buildProfile` needs updating — 29 slide files don't
  touch `brand.colorSystem` / `brand.guidelines` / etc.
- Generative signature slide is seeded deterministically
  (`djb2(brandId + updatedAt + palette)`) — a brand always gets the same
  artwork until its palette changes, which matters for screenshots and
  social-proof links.

**Alternatives considered.**
- **One fixed 8-slide template.** Lowest code; would ship in a quarter the
  time. Rejected — would look identical across brands (exactly what the
  user said to avoid).
- **User picks a template style from a gallery.** Adds a choice the user
  doesn't want to make. The director does the "pick a style" job
  automatically. If we later want user choice, the director becomes a
  default that the user can override — same architecture.
- **Fabric.js canvas per slide** (like the existing guidelines editor).
  Would give pixel-perfect editing for free. Rejected — composition-heavy
  slides with cards / charts / website mocks are painful to author in
  Fabric. Also tied us to the guidelines pipeline, which is tagged
  `stable/editable-export-v1` and off-limits for refactoring.
- **Extend `src/features/guidelines/` with `kind: 'case-study'`.** Rejected
  — guidelines is a reference document, case study is marketing
  collateral. Different rules (no compliance checklists on a deck, no
  environmental mockups in guidelines). Co-housing would invite
  conditional branches in both.

**Source.** `docs/superpowers/specs/2026-04-24-case-study-deck-design.md`
· `src/features/case-study-deck/director.ts`.

---

## 2026-04-24 — Brand switcher URL rewriting via shared helper

**Decision.** All brand switchers (current: `AppRail` global rail top slot, legacy `BrandSwitcher` pill on the old workspace shell) call `rewriteBrandPath(pathname, oldSlug, newSlug, search)` from `src/shared/brand/brandPathRewrite.ts` when the user picks a different brand. Any future switcher (editor topbars, etc.) routes through the same helper — do not reinvent the path logic.

**Reasoning.** Picking a different brand should keep the user on the same tool or page in the new brand's namespace (`/b/a/tools/typescale` → `/b/b/tools/typescale`), not drop them on `/b/:slug/setup` or `/overview`. `AppRail` already had inline logic that did this; `BrandSwitcher` was hard-coded to `/setup`. Extracting one helper means a single source of truth for the suffix-preservation rule, short-form / legacy-prefix handling, and query-string preservation.

**Alternatives considered.**
- **Leave each switcher's logic inline.** Rejected: the file-diff revealed the same logic already existed in `AppRail.tsx`; we were duplicating ~15 LOC of edge-case handling (short prefix, legacy `/dashboard/brand/:slug` prefix, empty tail, query string).
- **Put the helper on `useBrandStore`.** Rejected: it's a pure URL transformation, not tied to brand store state.
- **Route all switchers through `AppRail`.** Rejected: the legacy `BrandSwitcher` is rendered by `CosmosWorkspaceShell` which is its own container; merging them is the right eventual move but out of scope for this session.

---

## 2026-04-24 — Typescale tool: preview-only with font-only persistence

**Decision.** The Typescale tool writes **only the font pair** (`brand.typography.primary/secondary/accent`) back to the brand. The structured `Typescale` object (surfaces, ratios, semantic map, steps) is **not persisted** — it's ephemeral editor state.

**Reasoning.** The tool started as "full dual-write brand.typescale + brand.typography" (spec decision #7 in `docs/superpowers/specs/2026-04-23-typescale-tool-design.md`). Mid-session the user pushed back: the typescale is an *exploration* surface — users tune a ratio to see what it looks like, not to commit a canonical scale. Fonts are the brand decision worth saving; the scale is not. Removing `brand.typescale` persistence simplified the mental model, eliminated "which is source of truth" confusion across Brand Board / presentation templates / exports, and removed the need for a schema migration path on a field no downstream reader consulted.

**Alternatives considered.**
- **Keep full dual-write** (original spec). Rejected: every downstream consumer reads the flat `brand.typography.scale` map, not the structured surfaces. The structured field was load-bearing for zero readers.
- **Persist scale but not surfaces.** Rejected: more complex, same confusion.
- **Persist nothing.** Rejected: users do pick a font pair and expect it to stick to the brand. That's the one piece worth writing.

---

## 2026-04-23 — Typescale tool architecture (tool-platform pattern)

**Decision.** The Typescale tool set the pattern for "tool features in BrandOS": pure-TS `engine/` + `export/` folders (no React, no DOM, no async); a composable root component with `variant: 'full' | 'compact'` so the same editor mounts in both a full page and an embedded dialog; a `materializer` registered via side-effect import to hook into the platform's claim-on-signup flow.

**Reasoning.** Codified the pattern by building against it. Pure-TS cores are unit-testable without a DOM harness and keep ratio / fluid-clamp / semantic-mapping math away from React re-render concerns. The `variant` prop collapses what would otherwise be two parallel component trees into one, avoiding drift. The side-effect-on-import materializer (copied from `variant-studio/materializer.ts`) makes adding a tool purely additive — `src/features/tools/core/claim.ts` knows nothing about specific slugs.

**Alternatives considered.**
- **Separate `full` and `compact` component trees.** Rejected: drift risk; the two views share 90% of behavior.
- **Explicit materializer registration at platform boot.** Rejected: couples the platform to the list of tools. Side-effect registration on tool import is the established repo pattern.
- **Zustand store for the draft.** Rejected: the draft is ephemeral per-editor; no other component reads it. Local `useState` + a debounced commit through `useTypescaleDraft` is the right scope.

---

## 2026-04-24 — Mockup Studio engine = PixiJS v8

**Decision.** The Mockup Studio render engine will be built on **PixiJS v8**,
not Three.js / Fabric / Konva / raw WebGL. No 3D models in V1 — every
template is a stack of pre-baked image layers
(`base.jpg` + `displacement.png` + `lighting.png` + `mask.png` +
optional tint/prop masks) driven by a `template.json` metadata file.

**Reasoning.**
- We need GPU-accelerated 2D compositing: displacement mapping, masks, blend
  modes, multiplied lighting. PixiJS v8 ships `DisplacementFilter` + masks +
  render textures out of the box.
- Strong React story (either `@pixi/react` or a thin vanilla-Pixi hook —
  Phase 0 of the Mockup Studio spec chooses which, based on our React
  version).
- MIT-licensed, active maintenance.

**Alternatives considered.**
- **Three.js** — overkill for V1 (no actual 3D geometry yet). Reserved for a
  possible V2.
- **Konva / Fabric** — no GPU shaders; displacement math in JS would be too
  slow at our canvas sizes.
- **Raw WebGL** — would amount to reinventing PixiJS, worse.

**Source.** `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §2.3.

---

## 2026-04-24 — Mockup Studio: one engine, three modes (adapter pattern)

**Decision.** The Mockup Studio will have three product modes — Standalone,
Brand-aware (auto-fill from Brand Kit), and Fully Custom — but **one render
engine** shared by all three. The differences live entirely in the data
layer and the UI layer. The engine consumes a single `MockupState` object
(see spec §2.5) and knows nothing about modes.

**Reasoning.**
- Brand-aware auto-fill is the competitive moat (no other tool does it
  because they don't own the brand). But if the engine knows about "modes"
  internally, half the code will need rewriting when we flip from Standalone
  MVP to Brand-aware.
- Treating Brand-aware as `applyBrandKit(template, brandKit) → MockupState`
  — a pure function in the data layer — keeps the renderer clean.

**Alternatives considered.**
- Three parallel editors sharing utility code — rejected; duplicated state
  management and drift over time.
- Mode-aware engine with conditional branches — rejected; couples
  rendering to product decisions.

**Source.** `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §0, §2.4, §4.2.

---

## 2026-04-24 — Mandatory Phase 0 audit before paste-from-spec builds

**Decision.** The Mockup Studio spec requires a written Phase 0 audit
(`MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root) before any feature code is
written. The audit fills in stack/pattern/pre-existing-code checklists and
resolves every code snippet in the spec to BrandingOS conventions. This
pattern should be followed for any future large spec doc imported from
outside the codebase.

**Reasoning.**
- Paste-from-spec builds diverge in three predictable places: state
  management pattern, data-fetching pattern, folder/naming convention.
- The spec cannot know which pattern we use. Forcing a written audit first
  keeps the build idiomatic.

**Alternatives considered.**
- "Just start building and adapt as you go" — rejected; leads to v1-style
  and v2-style files living side by side.
- Audit as a verbal check-in — rejected; nothing to reference later.

**Source.** `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §5.

---

## Pre-existing (baseline) decisions

These are already reflected in the codebase and `CLAUDE.md`. Listed here as
anchors so future entries have context to refer back to.

- **Vite + React + TypeScript** over Next.js for the main app SPA.
- **Zustand** (persist + devtools) over Redux / Context for global state.
- **Supabase** (Postgres + Auth + Storage) with a localStorage fallback.
- **Fabric.js 6** for the design editor canvas (`EditorWorkspace`, tagged
  `stable/editable-export-v1` — off-limits to refactor through).
- **`strictNullChecks` OFF, `noImplicitAny` OFF** in tsconfig. Historical;
  be aware when writing new code — nullable values don't crash at compile
  time but still crash at runtime.
- **One shell per scope** (Workspace · Brand · Editor). Do not add a new
  layout unless the existing ones can't express the page.
- **AppRail is the live brand rail**; `BrandSidebar.tsx` is dead code kept
  for reference.
- **`dev` is the default branch**, not `main`. Work lands on `dev`; merge
  to `main` is a manual release step.
