# BrandOS — Session Progress Log

Newest entries at the top. One entry per working session. Keep entries concrete
(files touched, decisions made, blockers), not vague ("made progress on X").

---

## 2026-05-04 — Phase 4 Content Universe + Phase 4.5 route polish + Phase 5 begin

**Accomplished** (8 commits on `dev`, `af8fb46` → `de5fe61`):

End-to-end Phase 4 ship + Phase 4.5 route polish + autonomous slice of
Phase 5 done in one autonomous run, after the user gave a one-shot
greenlight. Stop-discipline triggers caught three architectural blockers
up front (Supabase deploy authority, IDesignsService spec-vs-reality,
AI image vendor) and routed around them with documented debt.

**Phase 4.1 (Templates Foundation, `af8fb46`).** SQL migration
`20260504000000_009_templates_phase_4.sql` defining `template_categories`
+ `templates` (idempotent, RLS); `LocalTemplatesService` mirroring the
schema as the dev default; 11 categories + 94 brand-bound seed
templates via `builders.ts` (mood × layout matrix); Templates panel UI
with search / category chips / source+mood filters / lazy thumbnail
grid / load-more pagination; open-template flow
(applyBrandToDocument → IDesignStorage → navigate to
`/b/:slug/design/:newSlug`); 4 new content-type configs (letterhead,
brochure, poster, email-signature) bringing total to 11; IDesignStorage
extended with `DesignSummary[]` listDesigns return + thumbnail meta
(BREAKING — only test stubs needed updates).

**Phase 4.2 (My Designs + Save as template, `018dcbe`).**
`convertToTemplate(doc, kit)` walks the doc and replaces literal
hex/font that match kit values back into SlotRefs (so user-saved
templates stay brand-agnostic when opened by a different brand);
top-chrome `EditorSaveAsTemplateButton` with name/category/mood/
visibility popover; My Designs tab in TemplatesPanel reading
`IDesignStorage.listDesigns(brandId)`.

**Phase 4.3 (AI Generation Layer, `fabd585`).** Mode 1 zero-state
generate forward-pulled from Phase 3.5 spec via `generateFromPrompt`
(blank scaffold + applyCommand handles delta/replace/rejected);
GenerateWithAi section in TemplatesPanel with prompt + content-type
+ "Editable design / Image only" radio; `ai-generate-image` Edge
Function (mock-only — vendor swap is a 1-function-body change once
`AI_IMAGE_VENDOR` env is set); 25 AI prompt presets distributed
across categories (clicking a preset card prefills the generator);
total seed inventory now 119.

**Phase 4.4 (Community Templates, `ff63bcd`).** Admin approval queue
at `/admin/templates/queue` with Approve / Reject (with required
reason); `useIsAdmin()` hook reads `profiles.is_admin` (added in 4.1
migration); save-as-template visibility:'public' → uploadStatus:
'pending' for community submission; community filter in Templates
panel uses existing source filter; premium foundations (`is_premium`,
`required_plan`) ship as schema fields with no UI yet.

**Phase 4.5 (Editor URL Routing polish, `13ddc1f`).** Inline
`NotFoundPanel` replaces redirect+toast on the production
`/b/:slug/design/:designSlug` route (URL stays stable for typo
correction + share); brand-picker URL nav navigates to
`/b/:newSlug/design`; Share button on editor topbar copies the
canonical URL (using URL param `designSlug`, not internal `doc.id`
— bug fix surfaced by the test).

**Phase 5 begin (`80b8130`, `4e052c2`, `f86e264`, `de5fe61`).**
SERVICE_KEYS.AI_AGENT + `useAiAgent(brandKit)` hook (DI override
> brandKit construction); un-skipped Phase 4.3 happy-path E2E
(was deferred for needing this hook); AI image place-on-canvas
flow (place button after a successful image gen adds an
ImageLayer via `adapter.batch`); `TemplatePreviewModal` deleted
(was half-mounted via a render-race fallback — replaced with
toast); lazy + Suspense for the production editor route (heavy
Editor bundle off the 404/spinner branches).

**Test count:** 922 passing (was 876 at Phase 3 end), 0 skipped.
+46 tests across 8 commits. Three-layer rule maintained throughout.

**Carve-out list:** still at 2 (`logo-maker/flow`,
`editor/components`). No reductions in this session.

**Decisions blocked, awaiting user input:**
- AI image-gen vendor selection (billing/legal/quality)
- AI quality pass on Mode 1 (user previously said defer)
- Skill chips re-introduction (user said wait for usage data)
- Real RBAC review (single is_admin boolean today)
- Real Supabase migration deploy (needs user CLI auth + 1-line DI swap)
- `brand-guides` legacy migration — audited as 52 files / 10,469 LOC
  with its own editor + slide navigator + AI content generator +
  multiple templates. Multi-week refactor; not autonomously deliverable.

---

## 2026-04-25 — Mockup Studio cosmos retrofit + dashboard auth race + nav-pill bug

**Accomplished** (5 commits on `dev`, `d86dfae` → `5a9ca09`):

Continuation of the Mockup Studio session. Two visible-bug fixes plus a
service-swap race that was making `/dashboard` look broken on first sign-in.

- **`d86dfae` Standalone mockup studio → cosmos shell.** Wrapped
  `StandaloneMockupStudioPage` in `<CosmosWorkspaceShell>` so it inherits
  the centred segmented nav, B-mark, and theme toggle from `/setup`,
  `/tools/typescale`, `/tools/ui-color-system`. Inner layout switched to
  custom 3-column `.ms-shell` grid (templates · canvas · properties).
  Side panels rebuilt on cosmos `.panel` / `.panel-top` / `.panel-heading-*`
  primitives. `TemplateGallery` now renders `.panel-item` rows grouped by
  category (Apparel · Packaging · Print · Device · Signage). New
  `src/features/mockup-studio/modes/standalone/mockup-studio.css` holds
  the tool-local `.ms-*` rules, all scoped under `[data-cosmos="workspace"]`.
- **`a23be0c` Brand-aware mockup studio → cosmos shell.** Same retrofit
  for `BrandMockupStudioPage` (route: `/b/:slug/tools/mockup-studio` and
  legacy `/dashboard/brand/:slug/tools/mockup-studio`). Brand context
  comes for free: `CosmosWorkspaceShell` auto-detects `/b/:slug/*` and
  swaps the top-left B-mark for the `BrandSwitcher`. The "Reapply brand"
  action moves into the shell's `rightActions` slot as a `.ms-pill-btn`.
  Bumped `.ms-board-toolbar` padding to `16px 16px 12px` to match
  `.panel-top` so the eyebrow + serif title align horizontally with the
  side-panel headings.
- **`968d0f7` (then reverted in `b1d8d35`) — `hasLoaded` gate on
  workspace home.** First attempt at fixing "first dashboard open shows
  No brands yet". Added a local gate that hid the empty/grid branch
  until `loadAll()` resolved. Wrong fix — the symptom was a service-swap
  race, not a render flash, and the gate left users stuck on
  "Loading your brands…".
- **`b1d8d35` (correct fix) — re-fetch brands after sign-in service swap.**
  Brands service is registered as `LocalBrandsService` at boot and only
  swapped to `SupabaseBrandsService` inside `reconfigureForAuth(true)`.
  `AuthModal` flips `isAuthenticated` and navigates to `/dashboard`
  synchronously, before Supabase's `SIGNED_IN` event fires the swap, so
  Home's `loadAll()` ran against the empty Local service and the empty
  result stuck. Now `useAuth.ts` calls
  `useBrandStore.getState().loadAll()` immediately after each
  `reconfigureForAuth(true)` (initial-session and SIGNED_IN paths), and
  once on SIGNED_OUT to drop the previous user's list. `Home.tsx`'s
  effect also re-runs when `isAuthenticated` flips, as belt-and-braces.
- **`5a9ca09` Cosmos segmented-nav pill mispositioned on first paint.**
  `measurePill` in `CosmosWorkspaceShell` was reading
  `getBoundingClientRect()` while the open keyframe was applying
  `translateY(-6px) scale(0.96)` to the nav. Empirically the pill ended
  up at exactly 0.96× the correct values (`translateX 298 / width 57`
  vs the correct `310 / 60`). Since `measurePill` only re-runs on route
  change, the wrong values stuck — most visible on the rightmost tab
  (Tools), where the pill clipped against the container's rounded right
  corner. Switched to `offsetLeft` / `offsetWidth`, which are layout-based
  and immune to ancestor transforms. Verified in DevTools — pill now
  aligns to within sub-pixel rounding on first load regardless of which
  tab is active.

**Decisions / why this matters.**

- "Sign-in then navigate" is a real ordering bug across the app, not just
  Mockup Studio or Workspace Home. Any consumer that calls a service-DI
  method during the post-sign-in render is at risk of binding to the
  Local registration. The brand-store re-fetch in `useAuth` is a
  quick-fix; a more durable fix is to subscribe stores to
  `reconfigureForAuth` events.
- `getBoundingClientRect` is unsafe when an ancestor has an active CSS
  `transform`. Layout offsets (`offsetLeft` / `offsetWidth`) are the
  right primitive for animated-shell measurement.

**Open / next session.**

- The `useDataSync` hook (`src/shared/hooks/useDataSync.ts`) is dead code
  — nothing imports it. Either wire it up (it would have caught the
  service-swap race) or delete it.
- Mockup Studio still has unstyled portions inside Radix popovers
  (image picker etc.) — same gotcha as the FontPicker fix from the
  Typescale session. Audit the right-panel modals if any are unscoped.
- `Brands/white-tshirt/*.png` are user-supplied raw inputs that have
  been duplicated into `public/mockup-templates/billboard-tilted/`.
  The `Brands/` originals are still untracked. Decide whether to commit
  them, gitignore them, or move them under `docs/`.
- Confirm the user is no longer seeing the "no brands yet on first nav"
  symptom after `b1d8d35`. If still reproducing, the next layer is to
  have `reconfigureForAuth` itself fan out to subscriber stores instead
  of relying on `useAuth` to remember every store.

**No blockers.**

---

## 2026-04-24 — Adaptive Case Study Deck (Behance-style) — shipped end-to-end

**Accomplished** (one commit on `dev` — `034413a`):

User asked for a Behance-style presentation generator per brand. Built
`src/features/case-study-deck/` as a full new feature, 25 files.

- **Anti-stamp architecture:** 10 slide archetypes × 3–4 variants each = 29
  distinct compositions. A pure `director(brand) → DeckPlan` picks variants
  from:
    - `guidelines.strategy.personality` → DeckMode (bold / editorial /
      technical / elegant / playful), with a palette-luminance fallback for
      brands with no personality tags.
    - Palette shape (luminance, chroma) → light/dark rhythm per slide.
    - Asset inventory (portraits, scenes, any image) → routes to
      photo-dominant variants when assets exist, type-dominant fallbacks
      when not.
- **Slide archetypes** (all at native 1920×1080):
    - `cover` (4: color-flood+silhouette · photo-hero+wash · typographic · split)
    - `manifesto` (3: quote · oversize · serif editorial)
    - `moodboard` (3: dark floating cards like ref slide 02 · light masonry · asymmetric grid)
    - `palette` (3: bands+full HEX/RGB/CMYK/HSV/HSL specs like ref slide 03 · squares · overlapping circles)
    - `typography` (3: specimen · ladder · huge-headline-with-inline-logo like ref slide 05)
    - `signature` (1: SVG generative tessellation seeded by `djb2(brandId + updatedAt + palette)`)
    - `environmental` (3: booth like ref slide 04 · lobby signage · activation)
    - `digital` (3: laptop-on-desk with inline website mock · phone stack · dashboard)
    - `stationery` (3: flatlay like ref slide 07 · isometric · hero-shots)
    - `outdoor` (3: mesh banner on fence like ref slide 08 · highway billboard · metro poster)
- **Viewer** (`viewer/CaseStudyViewer.tsx`): scroll-snap full-viewport
  slides; left thumbnail rail with live CSS-transform-scaled mini slides
  (not PNG captures — stays crisp); right inspector for per-slide variant
  swap + headline/credit/image URL overrides + hide toggle; topbar with
  Regenerate / Canvas edit / PNG / Export PDF.
- **Export** (`export.ts`): `html2canvas → jsPDF` for multi-page 1920×1080
  landscape PDF, `html2canvas → jszip` for PNG bundle. Reused existing
  project deps. Exporter strips `style.transform` during capture so scaled
  preview copies still export at natural pixel grid.
- **Storage** (`storage.ts`): `localStorage['brandos:case-study-deck:v1']`
  keyed by brandId → `{ plan, overrides, variantOverrides, hidden }`.
  `regenerate()` wipes overrides; `reset()` keeps the plan, drops overrides.
- **Fonts**: `buildProfile` emits Google Fonts URLs in
  `BrandProfile.typography.fontUrls`; viewer appends `<link>`s on mount
  and cleans up on unmount.
- **Entry points** (wired in the same commit):
    - Routes `/b/:slug/case-study` + `/dashboard/brand/:slug/case-study`
      (flat fullscreen — no brand shell, the deck is the chrome).
    - Templates page: new "Case Study" category + featured tile.
    - Share → Exports tab: featured "NEW" card above the existing
      Logo-deck and Guidelines-export cards.
- **Spec**: `docs/superpowers/specs/2026-04-24-case-study-deck-design.md`.
- **Verification**: `npm run typecheck` = 0 errors; `npm run lint` = 0 errors
  on new files (one `let→const` auto-fixed in `director.ts`);
  `npm run build` = clean, `CaseStudyPage` lazy chunk **95.7 KB / 21.2 KB
  gzip**.

**Process note.** User said "do not ask me" partway through brainstorming
and told me to just build. Per the brainstorming skill's own priority rule
("User's explicit instructions — highest priority"), I treated that as
design approval and executed. Still wrote a spec doc as an artifact before
the commit.

**Next step (start here next session):**
- **Mockup Studio v2 Phase 0** remains the multi-session-pending next step.
  Fill `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §5.1 checklists, write
  `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root, sweep
  `src/features/brandkit/` + `EditorWorkspace` (Fabric.js) to confirm no
  pre-existing mockup work already covers part of this ground.
- Or, if iterating on the case-study deck, three known follow-ups:
  (1) dedicated public `/case-study/:slug` share route (viewer is auth-only
  today), (2) AI-generated imagery source wired into the inspector's image
  URL field (stub today — infra exists in `brand-consistency`),
  (3) real photo-mockup templates for environmental/digital/stationery/
  outdoor slots (current CSS/SVG composited versions look good but are
  stylized, not photorealistic — naturally pairs with Mockup Studio v2).

**Open questions / blockers:**
- Export uses `html2canvas` with `useCORS: true` + `allowTaint: true`.
  Override-image URLs from arbitrary domains may strand capture. Likely
  fine for Supabase storage URLs (CORS headers served) — worth spot-check
  after first real use.
- "Canvas edit" escape hatch navigates to `/b/:slug/guidelines/canvas?source=case-study`
  but the canvas doesn't read the deck plan; it opens empty. Acceptable
  because it's an escape hatch, but a real hand-off (prime canvas with
  current slide's composition) is a reasonable follow-up.

**Decisions made + why:**
- **Archetype × variant × director, not one fixed 8-slide template.** The
  reference Fexilc deck's 8 slides look great together, but stamping them
  per-brand would make every BrandOS user's deck look identical. Director
  pattern lets the same slide idea render differently based on who it's
  for. Cost: 25 files vs 10. Worth it — the user explicitly asked for
  variety.
- **Each archetype lives in one file containing its variants** (not one
  file per variant). 10 archetype files + 1 renderer + 1 shared primitives
  = easier to navigate than 29 files. Variants share naming prefixes
  (`CoverA`, `CoverB`, …) and imports.
- **Generative signature slide seeded by `djb2(brandId + updatedAt + palette)`.**
  Deterministic: same brand always gets the same artwork (important for
  screenshots and social-proof links); changes when the palette is edited.
- **CSS/SVG composited mockups, not photorealistic.** The reference leans
  on 3D renders. Building a real render engine this session would have
  blown scope. CSS/SVG versions (booth with track-light dots, laptop with
  3D-rotated screen rendering an inline website mock, mesh banner on
  chain-link fence, metro tile wall) look intentionally stylized. Upgrade
  path = per-slot image override field already exists; Mockup Studio v2
  slot-ins later.
- **Feature in `src/features/case-study-deck/`, not nested in
  `src/features/guidelines/`.** Guidelines is load-bearing and tagged
  `stable/editable-export-v1` elsewhere. Case study is marketing collateral
  with different rules. Keeping them separate avoids conditional branches.

**What I did NOT do** (flagged for the next session to decide):
- No unit tests on the director. Logic is ~60 lines, deterministic — easy
  to test. Skipped for speed; add if it starts drifting.
- No Playwright/screenshot regression test for each variant.
- No integration with the Mockup Studio v2 `template.json` / `brand_kit_hints`
  concept. Upgrading case-study slides to data-driven templates would let
  third parties install deck themes. Large scope — out of this session.

---

## 2026-04-24 — New-user QA walkthrough, onboarding-v4 fix, Typescale UX polish, tri-branch sync

**Accomplished:**

QA-as-user walkthrough of the app as a brand-new signup (`alex.test.2026@brandos-qa.dev`), then a cascade of UX fixes driven by findings. All work on `dev`.

- **Root-cause fix — onboarding-v4 never created brands** (`744271a`). `CreateScreen.handleNext` at step 2 was a TODO stub: 600ms timeout → navigate back to upload screen, brand never persisted. Wired real creation via `useBrandStore.create` with palette-derived colors, style-card-derived fonts (picks distinct heading/body families from the font pool), and a guidelines payload (strategy / colorPalette / voiceAndTone) so Voice and Strategy tabs have content. Same stub fixed in `SetUpScreen.tsx` for the upload path. Updated `brands.supabase.create` to accept `guidelines` + `strategy` in the insert payload (was silently dropped — `update` already handled them). Switched `useAuth` `user_roles` / `profiles` lookups to `.maybeSingle()` so freshly signed-up accounts don't emit 406 errors.
- **Brand switcher preserves subpath** (`48163b8`). `BrandSwitcher` (legacy pill on `/setup`, `/brand-kit`, `/guideline`, `/design`, `/tools`) was hard-coded to `/b/:slug/setup`; `AppRail` already preserved subpath via inline logic. Extracted `src/shared/brand/brandPathRewrite.ts` helper and routed both switchers through it. `/b/a/tools/typescale` → pick brand B → `/b/b/tools/typescale`. Short and legacy `/dashboard/brand/:slug` prefixes both supported; query string preserved.
- **Typescale tool — preview-only model + UX simplification** (`d09d1d3` → `9c7d0a0`, many commits). User's clarification: font selection saves to the brand (`brand.fonts.primary/secondary`); scale, ratio, leading, tracking, semantic map, and activeSurface are draft-only and thrown away on reload. Chrome vs preview font separation — `ts-board` / `ts-board-title` / `ts-ratio-card-preview` dropped `--brand-font-display` / `--brand-font-body` cascade so only the white preview area renders in brand fonts (chrome uses BrandOS Instrument Serif). Layout restructured: Font Pair (heading + body + single "Upload custom font" button) always visible; Surface tabs, Scale ratio cards, Scale knobs, and Roles table all collapsed under one Advanced trigger. `SurfaceTabs` ported from `editor-cats` (scoped to color-system CSS, wasn't loading) to `ts-surface-tabs` segmented control with real styles in `typescale.css`. Upload flow collapsed from two cramped 2-column chips to one full-width button; slot choice moves into the dropzone as "Use as Heading" / "Use as Body" buttons after staging. Font picker popover redesigned: each row is a bordered Aa swatch + font name, both rendered in that font (Figma-style). The `[data-cosmos="workspace"]` prefix dropped from `.ts-fontpicker-*` selectors — Radix Popover portals to `document.body`, outside the cosmos scope, so the scoped rules never applied.
- **Tri-branch sync** (`e7b1b25`). Merged `origin/ui`'s 2 brand-kit-v2-cosmos commits into `dev` (clean auto-merge, no real conflicts — only new files under `src/features/brand-kit-v2-cosmos/` + `public/brand-kit/`). Verified `origin/x` and `origin/ui` were both ancestors of the new dev tip, so fast-forwarded all three to `e7b1b25`: `git push origin dev dev:x dev:ui`. Typecheck clean. `/b/:slug/brand-kit` renders all 8 sections post-merge.

**Bugs found but not fixed (out of immediate scope):**
- Supabase `SELECT * FROM workspaces` returns 500 for fresh users — server-side RLS/trigger issue, not client-fixable.
- Fresh-signup dashboard shows other users' brands (Untitled Brand, VECTOR, SKAM) alongside seed brands. Either RLS on `brands` is too permissive, or the list isn't filtered by `user_id`. Worth a separate security pass.
- Typography module labels "Primary" as body font / "Secondary" as headlines — inverted from `useBrandCreator` / `CreateScreen` which treat primary = heading. Pre-existing inconsistency; not touched this session.

**Next step (start here next session):**
- **Execute Phase 0 of Mockup Studio v2** (this has carried from the two prior sessions now). Fill `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` §5.1 checklists, write `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root. Specifically sweep `src/features/brandkit/` + `EditorWorkspace` (Fabric.js) to confirm no pre-existing mockup work already covers part of this ground.
- If continuing on Typescale: the `compact` variant in `EmbeddedTypescaleDialog` still uses native `<select>` + bare Tailwind from before the cosmos redesign. Bring it in line with the new FontPicker / segmented tabs if it matters.
- If taking on the Supabase security issues: verify RLS policies on `brands` and `workspaces` tables; the brands list endpoint should filter by `user_id` or workspace membership.

**Decisions made + why:**
- **Typescale is preview-only except for fonts** (late pivot, `d09d1d3`). The earlier session shipped it with full `typescale` + `typography` dual-write. User: the tool has ratios, leading, steps — a non-expert user who opens it to "see fonts" can easily destroy the brand's type system with one drag. Solution: `setTypescale` now only writes `brand.fonts.primary` / `brand.fonts.secondary` when families change. Scale stays ephemeral. Simpler mental model; same power user flow via direct brand edits if needed.
- **Shared URL-rewrite helper** (`rewriteBrandPath`). Two switchers had independent path logic — extracted so any third switcher (future editor topbars etc.) routes through one function. Handles both `/b/:slug` and legacy `/dashboard/brand/:slug` prefixes; caller decides what to do when there's no current brand.
- **Single Advanced collapsible instead of nested.** `ScaleControls` had its own inner Advanced collapsible around basePx/leading/tracking. When we moved everything non-font-pair under one outer Advanced, the inner one became double-nested noise. Flattened: outer Advanced now directly exposes ratio cards + knobs + Roles.
- **CSS scope for portaled content** (important lesson). Radix Popover/Dialog renders content into a Portal under `document.body`, outside any workspace-scoped ancestor. Rules written as `[data-cosmos="workspace"] .x` don't apply there. When redesigning a popover's interior, use unscoped selectors + theme tokens (`hsl(var(--muted))` etc.). Added to `CLAUDE.md`.

---

## 2026-04-24 — Typescale tool — full build + cosmos redesign + creative previews

**Accomplished (this was a long session — ~30 commits on `dev`):**

Brainstorm → spec → plan → execution via `superpowers:subagent-driven-development` (fresh subagent per phase + two-stage review), then a long tail of user-driven UX polish.

- **Spec**: `docs/superpowers/specs/2026-04-23-typescale-tool-design.md` (8 locked decisions: unified editor, both modes, numeric ladder + semantic overlay, Google + system + upload font sources, Editorial/UI/Ladder preview tabs, nine export formats, dual-write brand.typescale + brand.typography, four surfaces per brand).
- **Plan**: `docs/superpowers/plans/2026-04-23-typescale-tool.md` (46 tasks, 9 phases, full TDD).
- **Phase 1–9 shipped** with 309 passing tests: types, font catalog + loader, engine (ratios/leading/tracking/ladder/fluid/surfaces — math bug in plan caught during TDD), 9 export serializers (CSS / Tailwind v3 / v4 / SCSS / JS / JSON / W3C / Figma Tokens / font snippet), brand-store `setTypescale` with dual-write to `brand.typography` (mirror preserves `usage` + `fontAssetId` per role — bug caught in code review), editor components, tool registration, routes, public landing, `ToolGate` on export, anon-session persistence + claim materializer, `EmbeddedTypescaleDialog` wired into Identity → Typography, Brand Board → TypographyPanel, and Brand Setup.
- **Cosmos redesign** (`514bb1f`): wrapped pages in `CosmosWorkspaceShell`, two-column `.shell` grid (left `.panel` sidebar + right `.ts-board`), cosmos tokens throughout, new `typescale.css` under `[data-cosmos="workspace"]` scope. Identical visual language to `ui-color-system`.
- **5 UX fixes** (`83cd4bb`): BrandSyncBar gains Pull-from-brand + Reset-scale actions, new `FontPicker` popover with 100+ Google Fonts + system + uploads and per-item live previews (replaces native `<select>`), per-slot font upload chips, visual 2×4 ratio card grid with mini baseline previews, Advanced collapsible for base/steps/leading/tracking/fluid.
- **Upload bugs fixed** (`fda8d4e`): CSS `format("ttf")` → `format("truetype")` in `fontLoader.injectUpload` (ttf/otf were silently rejected), `ensureLoaded` always re-injects for upload refs (previous cache-poisoning prevented second upload of same-named family), dropzone UI with staged "The quick brown fox" preview before commit.
- **Creative previews** (`2e99860`): `Plain · Creative` toggle on the preview header. Creative mode adds three designed mockups — `EditorialCreative` (two-col magazine spread with accent-gradient hero + SVG art, drop-cap, accent-rule pull quote), `UICreative` (full product dashboard: sidebar with active-pill nav, topbar, 4 stat cards, accent-tinted area chart, activity list, button row), `LadderCreative` (typographic poster with cascading one-word steps on accent-tinted canvas + meta swatch). Accent color pulled from `brand.primaryColor`.
- **Post-ship refinements** (mostly user-directed iteration on the look): `d09d1d3` / `7d4c1fe` made the tool preview-only (persists fonts only, not the scale — user wanted a lightweight tool), `027039e` split chrome font from preview font (chrome uses BrandOS UI font, preview uses brand font), `0cb13e9` collapsed everything except Font Pair under Advanced, `5c0a5f7` kept the custom-font upload visible in the basic panel, `7b93307` / `8331fc5` / `e277c56` / `9c7d0a0` polished picker + upload button.

**Quality catches during review (would have shipped as bugs otherwise):**
- Phase 2 math: plan's `leading.ts` constants (`a=1.0, b=4.5`) didn't satisfy the plan's own test bounds → retuned to `a=1.05, b=7`.
- Phase 3 hardening: Figma Tokens fontSize was missing `px` suffix; letterSpacing had float-precision ugly decimals (`1.7000000000000002%`); CSS font-family was unescaped (XSS-prone once uploads ship).
- Phase 4 data-loss: `mirrorTypographyFromTypescale` was full-replacing `primary`/`secondary`/`accent` — would have clobbered production seed brands' `usage`/`fontAssetId` on every save. Fixed to per-role shallow merge.

**Next step (start here next session):**
- Execute Phase 0 of the **Mockup Studio v2** spec (this was the previous session's next-step and it's still the next step — this session focused on a different tool). Fill §5.1 checklists and write `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root before Phase 1.
- If you're iterating on the typescale tool instead, open questions: (1) should the `EmbeddedTypescaleDialog` compact variant adopt the new cosmos look + FontPicker? currently still uses native `<select>`. (2) the compact variant still uses bare Tailwind classes from before the cosmos redesign.

**Open questions / blockers:**
- User's most recent feedback was positive on the creative previews; no outstanding typescale complaints in the session transcript.
- Compact variant (used in `EmbeddedTypescaleDialog`) is a known follow-up — it looks inconsistent with the standalone tool.

**Decisions made + why:**
- **One plan, nine phases, subagent-per-phase (not per-task).** The plan had 46 tasks at fine TDD granularity but each phase was a cohesive commit unit. Running 46× `implementer + spec reviewer + code reviewer` would have been ~138 subagent calls and multi-day. Per-phase dispatch is the right batching for committable work.
- **Preview-only tool** (late-session pivot, `d09d1d3`). Originally the tool persisted the full structured `Typescale` to the brand via `setTypescale` + dual-write. User decided that was too heavy — typescale is an exploration tool, not a source of truth. Fonts still persist to `brand.typography` (they're brand-level choices), but the scale/surfaces/semantic map stay ephemeral. Simplified the mental model significantly.
- **Accent color is a prop, not global state.** `PreviewTabs` takes `accentColor?: string` and each creative preview falls back to `#0f172a` when missing. Keeps the previews pure and testable; the editor plumbs `brand?.primaryColor` in one place.

---

## 2026-04-24 — Mockup Studio v2 spec + `/wrap-up` command

**Accomplished:**
- Wrote `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md` (886 lines). Full implementation
  spec for a Placeit/Smartmockups-style Mockup Studio, organized in 8 phases
  with explicit acceptance criteria per phase.
- Locked the product shape as **three modes sharing one engine**: Standalone
  (anon-usable), Brand-aware (auto-fill every template from Brand Kit —
  "the killer feature / the moat"), and Fully Custom (nothing locked).
- Locked the `MockupState` schema in §2.5 as the single contract between the
  UI layer, the state layer, and the PixiJS engine layer. Any mode produces
  a `MockupState`; the engine consumes it and knows nothing about modes.
- Locked the `template.json` schema (§3) with `brand_kit_hints` on every zone,
  tintable region, and text slot — this is what makes Mode B non-guesswork.
- Added Phase 0 as a **mandatory codebase audit** that must output
  `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at repo root before any feature code is
  written. Goal: stop paste-from-spec divergence (§5).
- Registered the `/wrap-up` slash command at `.claude/commands/wrap-up.md`.

**Next step (start here next session):**
- Execute Phase 0 of the Mockup Studio spec. Fill in the §5.1 checklists for
  BrandingOS (stack, patterns, pre-existing canvas/pixi code) and produce
  `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at the repo root. Do NOT start Phase 1
  before that plan is written and reviewed.
- When doing the "pre-existing implementations" sweep, specifically check
  `src/features/brandkit/` and `EditorWorkspace` (Fabric.js) — the spec
  claims "no 3D in V1, PixiJS only" and we need to confirm Fabric isn't
  already covering half of this ground.

**Open questions / blockers:**
- React + `@pixi/react` v8 compatibility on React 18 is unresolved (spec
  flags this in §2.3). Phase 0 must decide: use `@pixi/react` or roll a
  custom `useMockupRenderer` hook around vanilla PixiJS.
- Bulk export (Mode B, "Export all 30 mockups") is spec'd as server-side.
  We don't yet have a mockup-render worker — needs a Cloudflare Worker or
  Supabase Edge Function. Phase 0 output should note where this lands.
- Where `brand_kit_version` is tracked for cache-busting (§4.4) — add as
  an incrementing integer on the brand record; not yet in schema.

**Decisions made + why:**
- **PixiJS v8** over Three.js / Konva / Fabric / raw WebGL for the render
  engine. Reason: we need GPU-accelerated `DisplacementFilter` + masks +
  blend modes out of the box; Konva/Fabric can't shader; Three.js is
  overkill for 2D; raw WebGL reinvents Pixi. (§2.3)
- **No 3D models in V1.** Every template is a stack of pre-baked image
  layers (`base.jpg`, `displacement.png`, `lighting.png`, `mask.png`,
  optional tint/prop masks) + a `template.json`. 3D is reserved for a
  possible V2. (§2.1)
- **Phase 0 is mandatory and non-negotiable** — it produces a written
  adaptation plan before feature code. Reason: the three places a
  paste-from-spec build goes wrong (state mgmt pattern, data-fetching
  pattern, folder convention) are all BrandingOS-specific and not
  knowable from the spec alone.
- **Brand Kit version tracking** via incrementing integer on the brand
  record. Reason: cache keys for bulk-rendered thumbnails and exports need
  to auto-invalidate when the brand changes. (§4.4)
