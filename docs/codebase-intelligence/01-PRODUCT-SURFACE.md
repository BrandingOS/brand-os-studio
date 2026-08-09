# 01 — Product Surface Map

Agent: B1-surface · Date: 2026-08-08 · Branch: `new-ui` · Method: route-map trace from
`src/App.tsx` + nav-shell inspection + `git log` recency. Tags: **VERIFIED** (path:line),
**INFERRED**, **UNKNOWN**, **CONFLICTING**.

The entire SPA route table lives in one file: `src/App.tsx:325-757` (VERIFIED). There is no
file-based routing; `src/pages/**` is convention only. Secondary route fragment:
`src/features/logo-maker/flow/routes.tsx:18-29` (public `/logo-maker/*` wizard).

**What is actively being built right now (branch `new-ui`, Jul–Aug 2026 commits):**
onboarding-v4 (`/onboard-brand`), the unified editor's brand parsing, and the `brand-vision`
image-classifier integration into onboarding (VERIFIED: `git log` — 46ffb41 2026-08-08 editor,
742f408/84eb488/15645d7/1354684 2026-08-04/05 onboarding-v4, 0c06a23 2026-08-02 brand-vision
onboarding auto-placement). Everything else was last touched 2026-05-19 or earlier.

---

## 1. Auth & guards (applies to all tables below)

- **ProtectedRoute** (`src/features/auth/components/ProtectedRoute.tsx`) — the only session
  guard; wraps most app routes inline in `App.tsx`. VERIFIED.
- **AdminLayout** self-gates on `useAuth().isModerator` and redirects to `/dashboard`
  otherwise; per-item `minRole` on a 4-tier `PlatformRole` (moderator/admin/super_admin) —
  `src/features/admin/components/AdminLayout.tsx:35-58`. VERIFIED.
- Auth surfaces: `/login` + `/signup` (both → same `LoginPage`, `App.tsx:730-731`),
  `/auth/reset-password` (`App.tsx:732`), and `AuthModal` opened from `/` via `?auth=required`
  (`src/pages/Index.tsx:24-31`). OAuth via `signInWithOAuth` in `AuthModal.tsx` + `useAuth.ts`
  (VERIFIED grep). A **dev-only Supabase-bypass login** exists (commit 10218f1 2026-07-31;
  `bypass` hits in `AuthModal.tsx`, `useAuth.ts`). INFERRED: dev convenience, needs audit that
  it is compile-time gated.
- `/` redirects authenticated users to `/dashboard` (`Index.tsx:29-31`). VERIFIED.

## 2. Workspace scope (outside a brand)

| Route | Entry file | Shell | Guard | Classification | Evidence |
|---|---|---|---|---|---|
| `/dashboard` | `pages/workspace/Home.tsx` | `WorkspaceShellAlt` (imported *as* `WorkspaceShell`, `Home.tsx:3`) | Protected | **CURRENT** — default post-login landing (`Index.tsx:30`); "New brand" → `/onboard-brand` (`Home.tsx:108,171`) | App.tsx:360 |
| `/dashboard/brands` | `pages/dashboard/brands/index.tsx` | (own) | Protected | **LEGACY-CANDIDATE** — duplicate brands grid; its CTA still points at superseded `/onboarding` (index.tsx:49,70) | App.tsx:365 |
| `/dashboard/activity` | `pages/dashboard/activity` | — | Protected | **UNKNOWN** — routed, no nav link found | App.tsx:370 |
| `/dashboard/templates` | `pages/dashboard/templates` | — | Protected | **LEGACY-CANDIDATE** — superseded by `/templates` (WorkspaceTemplatesPageV2, App.tsx:612) | App.tsx:380 |
| `/dashboard/features` | `pages/dashboard/features` | — | Protected | **DEV-EXPERIMENT / inventory** (INFERRED from name + `_dev/features` sibling) | App.tsx:385 |
| `/dashboard/logo-maker` | `pages/dashboard/logo-maker` | — | Protected | **CONFLICTING** — CLAUDE.md says Logo Maker must not be a workspace entry, yet this route is live; coexists with public `/logo-maker/*` "until Phase 4 merges them" (App.tsx:116-117) | App.tsx:375 |
| `/learn` | `pages/workspace/Learn.tsx` | WorkspaceShell(Alt) | Protected | **CURRENT-ish**, TRANSITIONAL — no nav links to it (see §9) | App.tsx:391 |
| `/templates` | `pages/workspace/Templates.tsx` | WorkspaceShell(Alt) | Protected | **CURRENT** (v2 marketplace home) | App.tsx:612 |
| `/templates/builder(/:templateId)` | `features/templates/builder/TemplateBuilderPage` | own | Protected | **UNKNOWN** — routed, linkage unverified | App.tsx:617-626 |
| `/marketplace` | `features/marketplace/MarketplacePage` | own | Protected | **UNKNOWN** | App.tsx:627 |
| `/settings/{account,workspace,members,plans}` | `pages/settings/*` | `SettingsLayout` | Protected | **CURRENT** — AppRail links to `/settings` (AppRail.tsx:477); hosts the Studio/Classic preference toggle | App.tsx:715-725 |
| `/dashboard/admin/{brands,analytics}` | `pages/dashboard/admin/*` | — | Protected only (no role gate at route level) | **LEGACY-CANDIDATE** — pre-dates `/admin` subtree; role-gating UNKNOWN | App.tsx:396-405 |

**Brand-less cosmos tabs** `/setup`, `/brand-kit`, `/guideline`, `/design-workspace`,
`/tools-workspace` (App.tsx:353-357) — the flat-tab fallback of `WorkspaceShell`
(`WorkspaceShell.tsx:36-40`). **NOT wrapped in ProtectedRoute** (VERIFIED App.tsx:353-357).
Classification: **TRANSITIONAL** — still touched 2026-08-02 (0c06a23 hit `src/pages/setup`),
but the brand-scoped `/b/:slug/*` versions are the product path. INFERRED: these operate on
mock/scratch brand data (`features/setup/SetupPage`).

## 3. Onboarding / brand creation

| Route | Status | Evidence |
|---|---|---|
| `/onboard-brand` (+ `/onboard-brand/create`) | **CURRENT — the canonical onboarding.** Renders `features/onboarding-v4` screens (`pages/onboard-brand/index.tsx:1-17`). Hottest surface in the repo (4 of the last 6 commits). **Not auth-guarded** (App.tsx:351-352). | VERIFIED |
| `/onboarding`, `/onboarding-v3(/create,/preview)`, `/onboarding-v4(/create)`, `/onboarding-brand` | **LEGACY — pure redirects** to `/onboard-brand` (each page file is a `<Navigate>`; e.g. `pages/onboarding/index.tsx:5-7`, `pages/onboarding-v4/index.tsx`, `pages/onboarding-brand/index.tsx` preserves `?then=`) | VERIFIED |
| `/onboarding/preview` | `pages/onboarding/preview` still mounted (App.tsx:332) | UNKNOWN whether reachable from the live flow |
| `/logo-maker/*` (public, unguarded) | 6-screen wizard: index → brief → generate → upload → editor/:logoId → variants/:logoId → brand-kit/:logoId → complete/:brandId (`features/logo-maker/flow/routes.tsx:19-28`). **TRANSITIONAL carve-out** — last real work 2026-04-17 (8584869), documented "keep" | VERIFIED |

Three different create-brand links coexist in live UI: `/onboard-brand` (workspace Home),
`/onboarding` (dashboard/brands CTA), `/onboarding-brand` (`BrandChooserDialog.tsx:225`
fallback). All funnel to `/onboard-brand` via redirects, so behavior is consistent but the
call sites are stale. VERIFIED.

## 4. Brand scope — Studio namespace `/b/:slug/*` (canonical)

Shell: `WorkspaceShell` top-segmented nav with 5 tabs → `/b/:slug/{setup,brand-kit,guideline,design,tools}`
(`shared/layouts/WorkspaceShell.tsx:49-53`). All Protected. Post-login brand entry defaults to
Studio: `useUiPreference` default `'studio'` → `getBrandHomeUrl` = `/b/:slug/setup`
(`shared/hooks/useUiPreference.ts:29,69`). VERIFIED.

| Route | Entry file | Renders | Classification |
|---|---|---|---|
| `/b/:slug/setup` | `pages/b/[slug]/setup.tsx` | `features/setup/SetupPage` on real brand (brandToMockBrand adapter) | **CURRENT** (nav tab) |
| `/b/:slug/brand-kit` | `pages/b/[slug]/brand-kit.tsx` | `features/brand-kit/BrandKitCosmosPage` | **CURRENT** (nav tab; last work 2026-05-19 6e0aa55) |
| `/b/:slug/guideline` | `pages/b/[slug]/guideline.tsx` | **ChronicleShell** multi-page GuidelineDocument (rewritten Phase B 2026-05-19 — file header) | **CURRENT** (nav tab) |
| `/b/:slug/design` | `pages/b/[slug]/design.tsx` | `features/design-alt/DesignCosmosPage` launchpad | **CURRENT** (nav tab) |
| `/b/:slug/tools` | `pages/b/[slug]/tools.tsx` | tools hub | **CURRENT** (nav tab) |
| `/b/:slug/templates` | `pages/b/[slug]/templates.tsx` | TemplatesPanel browser in WorkspaceShell | **CURRENT** (Phase B port, App.tsx:462) |
| `/b/:slug/{identity,content,folders,share,settings}` | `pages/b/[slug]/*.tsx` | Thin `StudioBrandShell` wrappers around the **same Classic components** (e.g. `identity.tsx` re-exports `pages/dashboard/brand/[slug]/identity`) | **TRANSITIONAL** (Phase B ports) |
| `/b/:slug` (bare) | — | `StudioToClassicFallback` → `/a/:slug` (App.tsx:436) | redirect |
| `/b/:slug/*` (anything else) | — | `StudioToClassicFallback` → `/a/:slug/<same>` (App.tsx:563) | redirect |

**Studio fullscreen surfaces** (no shell, App.tsx:495-557, all Protected): `editor`
(launcher), `design/:designSlug` (unified editor), `social-media`, `presentations`,
`case-study(+/edit/:idx)`, `pitch-deck`, `deck-v2`, `brand-guides`, `logo-presentation`,
`guidelines/canvas`, `guidelines/blocks`, `brand-board`, `bento`, `analytics`, `approvals`,
`tools/{variant-studio,ui-color-system,typescale,mockup-studio}`. Classification mixed — see §6.

## 5. Brand scope — Classic namespace `/a/:slug/*` (alternate, bug-fix only)

Shell: `BrandRouteLayout` (= `AppRail` 88px icon rail + `InnerNavRail`), sections Overview ·
Identity · Templates · Content · Folders · Share (`AppRail.tsx:151-204`). All Protected.
Last substantive work on the Classic page folder: 2026-05-08 (4cb2894). Classification:
**CURRENT-alternate** — reachable by preference toggle and as the fallback target for every
unported Studio path, so it cannot be deleted yet; feature-frozen per CLAUDE.md and confirmed
by commit recency. VERIFIED.

Routes (App.tsx:647-698): `setup` (BrandHomePage), `edit`, `identity`, `content`, `design`
(launchpad), `share`, `templates`, `brand-kit` (`features/brand-kit-alt/BrandKitPage`),
`brandkit/:moduleId` (Fabric canvas module editor), `folders` (DamPage), `studio`
(ConsistencyStudio), `guideline` (legacy GuidelinesHubPage = `features/guidelines`, last
touched 2026-04-16), `settings` (BrandSettingsV2Page, flat route). Plus redirects: index→setup,
`kit`→brand-kit, `guidelines`→guideline, `dam`→folders, `assets`→templates, `brandkit`→brand-kit.

**Legacy URL space** `/dashboard/brand/:slug/*` → catch-all 302 to `/b/:slug/*`
(App.tsx:705-707), second hop to `/a` for unported sections. VERIFIED.

## 6. Editors inventory (all of them)

| Editor | Route(s) | Feature module | Classification / evidence |
|---|---|---|---|
| **Unified editor** | `/b/:slug/design/:designSlug` (App.tsx:501), launcher `/editor` + `/b/:slug/editor` (573, 498) | `features/editor` | **CURRENT** — latest commit on repo (46ffb41 2026-08-08); launcher auto-creates "Untitled design" (`pages/editor-launcher.tsx:1-14`) |
| Legacy OptimizedDesignEditor | `/editor/design/:slug` (578) | `features/editor/components` | **LEGACY carve-out (kept)** — coupled to `stable/editable-export-v1` (App.tsx:566-572 comment) |
| Chronicle guideline editor | `/b/:slug/guideline` | ChronicleShell + GuidelineDocument | **CURRENT** — rewrite 2026-05-19 (`pages/b/[slug]/guideline.tsx` header) |
| Legacy guidelines hub/editor | `/a/:slug/guideline`, canvas at `/b/:slug/guidelines/canvas` | `features/guidelines` (52 files / ~10k LOC per CLAUDE.md debt #10) | **LEGACY-CANDIDATE** — last touched 2026-04-16 (dd4d2ed); still the Classic guideline surface |
| Blocks guidelines | `/b/:slug/guidelines/blocks` (531) | `features/blocks` | **UNKNOWN** — routed; linkage unverified |
| Brand Board poster editor | `/b/:slug/brand-board` (534) | `features/brand-board` | **CURRENT** (2026-05-09 b8ac4b3) |
| Decks: case-study, pitch-deck, deck-v2, presentations hub, logo-presentation | App.tsx:507-527 | `features/case-study-deck`, `features/pitch-deck`, `shared/presentation/v2` | **CURRENT-ish** — case-study fixed 2026-05-19 (2f2adbb); deck-v2 vs pitch-deck duplication UNKNOWN |
| Social media editor | `/b/:slug/social-media` (504) | — | **CURRENT** (Content tabs deep-link into it per CLAUDE.md; unverified) |
| Bento editor | `/b/:slug/bento` (537), standalone `/tools/bento` (633), public view `/brand/:slug/bento/:bentoId` (639) | — | INFERRED current |
| Mockup studio | `/tools/mockup-studio` (public), `/b/:slug/tools/mockup-studio` | `features/mockup-studio` | **CURRENT** (2026-04-25) |
| Template builder | `/templates/builder` (617) | `features/templates/builder` | UNKNOWN |
| Brandkit module canvas (Fabric) | `/a/:slug/brandkit/:moduleId` | `features/brandkit` (shared domain layer) | **LEGACY-CANDIDATE UI**, domain layer live for both UIs |
| BrandKitCardEditor overlay | inside `/b/:slug/brand-kit` | `features/brand-kit` | CURRENT; save is toast-only (persistence gap per CLAUDE.md, unverified here) |
| Dev editor fixture | `/_dev/editor` (712) | — | DEV-EXPERIMENT, **ungated** (see §8) |

## 7. Tools platform (public + in-app) & public pages

Public, unguarded (App.tsx:598-604): `/tools` directory, `/tools/logo-variant-generator`,
`/tools/logo-to-svg`, `/tools/ui-color-system`, `/tools/typescale`, `/tools/mockup-studio`,
`/claim` (anonymous-session → brand materializer). In-app twins under `/b/:slug/tools/*`
(App.tsx:546-557). **CURRENT** (SEO funnel per App.tsx:584-597 comment).

Other public pages: `/` marketing index (legacy `src/domains/landing` components —
`Index.tsx:5-13` — a *third* landing implementation distinct from `landingpage/`),
`/privacy`, `/account-deletion`, `/brand/:slug` + `/brand/:slug/showcase`, `/p/:slug`
(Brand Portal v2), `/d/:brandSlug/:designSlug` (public design), `/brand/:slug/bento/:bentoId`.
All VERIFIED at App.tsx:326-328, 639, 726-729.

## 8. Admin & dev surfaces

- `/admin` subtree (App.tsx:735-754): Overview, Early Access, Users(+detail), Brands,
  Workspaces, Subscriptions, Reports, Announcements, Feature Flags, Activity, Settings,
  `templates/queue` (community-template approval). Role-gated (§1). Reached via UserMenu →
  navigate('/admin') (`UserMenu.tsx:82`). **CURRENT** but stale (feature work 2026-04-16).
- `/_dev/features` — self-gated on `import.meta.env.DEV` or `?dev=1`
  (`pages/_dev/features.tsx:46,117`). VERIFIED.
- `/_dev/editor` and `/_dev/chronicle` — **NO DEV gate and NO ProtectedRoute**
  (App.tsx:712-714; grep for `import.meta.env.DEV` hits only features.tsx). VERIFIED —
  publicly reachable dev surfaces in a production build.

## 9. Primary-nav linkage (currency signal)

- **`/dashboard` has almost no chrome navigation.** `WorkspaceShellAlt` renders wordmark +
  theme toggle + a profile pill that is explicitly a **no-op placeholder** ("Hook up to a real
  profile menu in Phase 6", `WorkspaceShellAlt.tsx:~127`); center nav "intentionally empty"
  (`:85`). The only outbound links on the workspace home are brand cards → brand home and
  "New brand" → `/onboard-brand`. `/learn`, `/templates`, `/settings` have no visible link
  from the new workspace shell — reachable via Classic AppRail (settings gear,
  `AppRail.tsx:477`), command palette (`CommandPaletteProvider`, App.tsx:320 — destinations
  not enumerated), or direct URL. VERIFIED / partially INFERRED.
- Studio nav = the 5 WorkspaceShell tabs (§4). Classic nav = AppRail 7 sections (§5).
- **CONFLICTING with CLAUDE.md**, which claims a workspace sidebar "Home · Brands ·
  Templates · Learn · Settings".

## 10. Non-SPA surfaces

| Surface | What it is | Wired to app? | Classification |
|---|---|---|---|
| `landingpage/` | Separate Vite project `brand-os-landing`; marketing site + early-access form writing to Supabase `early_access` (INSERT-only RLS, `landingpage/src/lib/supabase.ts:6-10,30`) | Shares only the Supabase project | **CURRENT** (deployed marketing site per CLAUDE.md) |
| `supabase/functions/` | 12 Edge Functions: `admin-invite`, `ai-apply-command`, `ai-generate-image`, `check-plan-limit`, `cleanup-onboarding-scratch`, `fetch-url-preview`, `finalize-onboarding-assets`, `generate-description`, `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `upload-ai-reference` (+`_shared`) | Backend for app (AI, onboarding assets, Stripe billing, plan limits) | **CURRENT** — `ai-generate-image` is multi-vendor real: pollinations default, OpenAI gpt-image-1, Fal.ai Flux, mock only as explicit option (`index.ts:3-24`) |
| `remotion/` | `brandingos-reel` — Remotion video project rendering a marketing reel/GIF (`remotion/package.json` scripts; comps `BrandingOSReel`, `BrandingOSBurst`, `DesignAI`) | **Not wired** — zero references in `src/` or `supabase/` (VERIFIED grep) | Standalone marketing asset generator |
| `brand-vision/` | Python/FastAPI brand-asset image classifier (logo/logotype/icon/photo/palette/font-specimen…), engines heuristic/CLIP/Claude/hybrid, serves :8300 (`brand-vision/README.md`, `pyproject.toml`) | Standalone by design; onboarding integrates "over the frozen JSON contract" — main-app side landed in 0c06a23 (2026-08-02) | **CURRENT** (active integration target) |
| `product-os/` | git-ignored (`.gitignore`: "Local-only Product OS / internal control center — never commit") | — | existence noted only |
| `new-version/` | git-ignored ("Local research / reference assets — not part of the product"); the HTML designs that `/onboard-brand` mirrors (`pages/onboard-brand/index.tsx:6`) | design reference | existence noted only |
| Root `Brands/` folder + ~40 loose `*.png` screenshots | designer deliverables / ad-hoc captures; root `*.png` ignored, `Brands/` **not** git-ignored (check-ignore exit 1) | — | housekeeping noted |

## 11. Contradictions with docs/CLAUDE.md

1. **AI image generation is not "MOCK ONLY".** CLAUDE.md (Phase 4.3) says mock-only pending
   vendor. Reality: pollinations default + OpenAI gpt-image-1 + Fal.ai shipped 2026-05-18
   (b9647cd, af893a3; `supabase/functions/ai-generate-image/index.ts:3-24`). CLAUDE.md is stale.
2. **Workspace sidebar does not exist as documented.** CLAUDE.md: "Home · Brands · Templates ·
   Learn · Settings". Reality: `/dashboard` uses `WorkspaceShellAlt` with no tabs and a no-op
   profile pill (§9).
3. **CLAUDE.md doesn't know about ChronicleShell.** `/b/:slug/guideline` was rewritten onto a
   Chronicle-style document editor 2026-05-19 (`pages/b/[slug]/guideline.tsx` header); CLAUDE.md
   still describes the guideline tab generically and calls `_dev/chronicle` only a "preview".
4. **CLAUDE.md describes none of the Jul–Aug 2026 work** (onboarding-v4 overhaul, brand-vision
   integration, dev-bypass login, Supabase keep-alive). Its freshest sections date 2026-05-11.
5. **Logo Maker as workspace entry**: CLAUDE.md forbids re-adding it, yet `/dashboard/logo-maker`
   is a live protected route (App.tsx:375) alongside the public `/logo-maker/*` flow, with an
   in-code note "coexists … until Phase 4 merges them" (App.tsx:116-117).
6. **Dead lazy imports in App.tsx**: `DashboardRoute` (line 70, acknowledged "unused; Phase 6
   removes it" at 358-359) and `StandaloneEditorPage` (line 140 — imported, never routed).
7. **Naming trap**: `WorkspaceShellAlt.tsx` exports a component *named* `WorkspaceShell`
   (`WorkspaceShellAlt.tsx:47`), and `Home.tsx` imports it under that name — grep for
   `WorkspaceShell` usage will conflate the two shells.
8. **Three landing pages** exist: live `landingpage/`, legacy `src/domains/landing` (still
   rendered at `/` — not dead code as CLAUDE.md implies; it IS the SPA's `/` page,
   `Index.tsx:5-13`), and `src/features/landing-v2` (removed per App.tsx:158-159 comment —
   folder existence not re-verified).

## 12. Open questions / needs product decision

1. `/_dev/editor` and `/_dev/chronicle` are unauthenticated and un-gated in prod builds —
   intentional? (§8)
2. `/onboard-brand` and the brand-less cosmos tabs (`/setup` … `/tools-workspace`) have no
   ProtectedRoute — is anonymous onboarding a deliberate funnel (pairs with `/claim`) or a gap?
3. Fate of `/dashboard/brands`, `/dashboard/templates`, `/dashboard/activity`,
   `/dashboard/features`, `/dashboard/admin/*` — all routed, none linked from the new
   workspace shell; delete or port?
4. Deck stack duplication: `pitch-deck` vs `deck-v2` vs `presentations` vs `case-study` —
   which is the go-forward presentation engine?
5. Guidelines triple-stack: Chronicle (`/b/.../guideline`) vs legacy `features/guidelines`
   (`/a/.../guideline` + canvas) vs `features/blocks` (`/guidelines/blocks`) — migration debt
   #10 still unscheduled.
6. Workspace shell endgame: profile pill is a placeholder "Phase 6" — how do users reach
   Settings/Learn/Templates from `/dashboard` today (command palette only)?
7. Dev-bypass login (10218f1): confirm it cannot ship enabled.
8. `Brands/` root folder is not git-ignored — raw designer assets may end up committed.
