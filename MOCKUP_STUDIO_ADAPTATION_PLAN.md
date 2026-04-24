# Mockup Studio — Adaptation Plan (Phase 0 output)

Spec source: `docs/BRANDINGOS_MOCKUP_STUDIO_V2.md`. This document maps the
generic spec onto BrandOS's actual conventions so the feature code is
idiomatic, not copy-paste.

## 1. Stack summary

| Concern | Spec default | BrandOS actual | Resolution |
|---|---|---|---|
| Framework | any | Vite 5 + React 18.3.1 | Vite, SPA only |
| Router | any | React Router v6.30.1, central `src/App.tsx` | Register routes in App.tsx lazy-load block |
| TypeScript | any | 5.8.3, `strictNullChecks: false`, `noImplicitAny: false` | Match — tolerant types, nullable fields don't error |
| State | "whatever exists" | Zustand v5 w/ `devtools` (+ `persist` for UI prefs) | Local feature Zustand store; `persist` for standalone anonymous projects |
| Data fetching | TanStack Query suggested | **DI/service pattern** via `src/core` (`useService(SERVICE_KEYS.X)`) | Match — add `MOCKUP_TEMPLATES` service key, DI-registered at boot |
| Styling | Tailwind | Tailwind 3.4.17 + shadcn/ui + Radix | Match |
| Dialogs / popovers | any | Radix via shadcn wrappers in `src/components/ui/*` | Match |
| Renderer | PixiJS v8 | no PixiJS installed; Fabric.js 6 used for design editor | Install `pixi.js@^8`; **do NOT use `@pixi/react` — React 18 + beta bindings are risky**; roll a custom `useMockupRenderer` hook |
| Storage | R2 | Supabase Storage + `localStorage` fallback via `src/shared/services/storage.supabase.ts` | Use Supabase Storage bucket `mockup-assets` (template images) + existing `brand-assets` (uploaded designs); localStorage for anonymous standalone projects |
| Database | Postgres/etc | Supabase Postgres | Phase 7 only — project persistence rides on existing services for V1, new `mockup_templates` / `user_mockup_projects` tables deferred until admin uploader lands |
| Auth | any | `useAuth()` + `useSessionStore()`; `<ProtectedRoute>`; `sessionStore.platformRole` incl. `isAdmin` | Match — gate `/admin/mockup-templates` on `isAdmin` |
| File naming | any | **PascalCase components, named exports**, `@/*` → `src/*` alias | Match |
| Node tooling / edge fns | any | No Node backend; Supabase-only | Skip server-side bulk-export for V1 (per §14 "no console errors on Chrome/Safari/Firefox" still holds; bulk export comes back in a later pass once Edge Functions are added) |

## 2. Key adaptation decisions

### 2.1 Engine layer: vanilla PixiJS, custom React hook

**Decision:** Install `pixi.js@^8`. Do not install `@pixi/react`. Mount the
PixiJS `Application` in `useMockupRenderer(canvasRef, templateMeta, state)`
that handles lifecycle (mount/update/unmount) and returns a `renderer`
handle. This sidesteps the `@pixi/react` v8 + React 18 compatibility risk
flagged in §5.1 of the spec.

### 2.2 Data layer: DI service, not TanStack Query

Existing pattern (audit finding): stores call `getXService()` which
resolves through `src/core/di`. Follow it:

- Add `SERVICE_KEYS.MOCKUP_TEMPLATES` in `src/core/types/services.ts`.
- Contract: `IMockupTemplatesService { list(): TemplateMeta[]; getById(id): TemplateMeta | null }`.
- Implementation: **Local implementation** in `src/core/adapters/LocalMockupTemplatesService.ts` that reads from bundled JSON under `src/features/mockup-studio/data/templates/*/template.json`. No network roundtrip for V1 — templates ship with the app.
- Registered in `src/core/boot.ts`.

Matches existing `LocalBrandsService`/`LocalUploadService` pattern.

### 2.3 Routing: mirror the existing `/tools/*` convention

BrandOS already has public + in-app tool routes (audit lines 122–128 in
App.tsx). Follow that:

- `/tools/mockup-studio` — public standalone (Mode A).
- `/dashboard/brand/:slug/tools/mockup-studio` + short alias `/b/:slug/tools/mockup-studio` — brand-aware (Mode B, auto-fills from brand).

Brand sidebar entry stays off the AppRail (per CLAUDE.md: "fullscreen
tools are reached from the section they belong to and via direct URL —
no rail entry"). We'll surface the tool from the Templates page.

Workspace entry: add **Mockup Studio** to the public `/tools` directory
page and to `/dashboard/features` (feature inventory), not to the main
rail — again matching existing tool-placement convention.

### 2.4 Brand Kit mapping

Spec's `BrandKit` interface is generic; BrandOS has a richer `Brand` type
(`src/shared/types/brand.ts`). Adapter function:

```ts
// src/features/mockup-studio/modes/brand-aware/applyBrandKit.ts
export function applyBrandKit(template: TemplateMeta, brand: Brand): MockupState
```

Mapping (from audit of `Brand` + `LogoSystemRefs` + `ColorSystem` + `TypographySystem`):

| Template hint | Spec field | BrandOS resolution |
|---|---|---|
| `logo_primary` | `brandKit.logos.primary.url` | `resolveLogoUrl(brand, 'primary')` — looks up `brand.logoSystem.primary.assetId` in `brand.brandAssets[]`, falls back to `brand.logo` / `brand.logoAssets.full` (legacy) |
| `logo_icon` | `brandKit.logos.icon.url` | `resolveLogoUrl(brand, 'iconmark')` with legacy fallback `brand.logoAssets.icon` |
| `logo_wordmark` | `brandKit.logos.wordmark.url` | `resolveLogoUrl(brand, 'wordmark')` w/ `brand.logoAssets.wordmark` fallback |
| `color primary` | `brandKit.colors.primary` | `brand.colorSystem?.primary?.hex ?? brand.primaryColor` |
| `color secondary` | `brandKit.colors.secondary` | `brand.colorSystem?.secondary?.hex ?? brand.secondaryColor` |
| `color accent` | `brandKit.colors.accent` | `brand.accentColor ?? brand.colorSystem?.accent?.hex` |
| `color neutral_light` | `brandKit.colors.neutral_light` | `brand.neutrals?.[0] ?? '#FFFFFF'` |
| `color neutral_dark` | `brandKit.colors.neutral_dark` | `brand.neutrals?.[brand.neutrals.length-1] ?? '#111111'` |
| `font heading` | `brandKit.typography.heading.family` | `brand.typography?.primary?.family ?? brand.fonts.primary` |
| `font body` | `brandKit.typography.body.family` | `brand.typography?.secondary?.family ?? brand.fonts.primary` |
| `brand_name` | `brandKit.brandName` | `brand.name` |
| `tagline` | `brandKit.tagline` | *(BrandOS has no first-class tagline field; fall back to `brand.strategy` first sentence or empty)* |
| `imagery` | `brandKit.imagery[]` | `brand.brandAssets?.filter(a => a.kind === 'image')` |

Put the resolver helpers in
`src/features/mockup-studio/modes/brand-aware/brandResolvers.ts`
so the applyBrandKit function stays readable.

### 2.5 State persistence

- **Anonymous standalone users:** Zustand `persist` middleware scoped to
  a single "draft" project in `localStorage` key `mockup-studio:draft`.
  (Matches `featureIndicatorStore` / `onboardingStore` pattern.)
- **Logged-in users:** Deferred in V1. Persist to a new `mockup_projects`
  Supabase table once the admin-uploader lands. Until then, even
  logged-in users get localStorage — a CTA can still say "sign in to
  save" but functionally we don't crash without a table.

### 2.6 Template schema: bundled assets, no backend

For V1, templates ship **inside the app** under
`src/features/mockup-studio/data/templates/<templateId>/`:

```
src/features/mockup-studio/data/templates/white-tshirt-front/
  template.json         # metadata (schema per §3 of spec)
  base.webp
  displacement.webp
  lighting.webp
  mask.webp
  shirt_tint_mask.webp
```

Vite handles the imports. `LocalMockupTemplatesService` maintains an
index registering each template, and assets are referenced by module
URL so they are fingerprinted and cached by the build.

**Pragmatic note:** the real Photoshop workflow in §8 of the spec needs
product photos and a designer. V1 ships with **procedurally-generated
placeholder assets** (synthesized base/displacement/lighting/mask
images) so we can prove the full pipeline end-to-end without blocking
on photo production. Real templates land in a follow-up asset pass.

### 2.7 What's explicitly DEFERRED from the spec

To keep V1 shippable in this session, we implement the spec at the
"shows displacement+lighting+brand-kit auto-fill on a real template"
fidelity bar. The following spec items are OUT of this V1 and live in
a `V2_ROADMAP_MOCKUP_STUDIO.md` follow-up:

- Phase 4 multi-zone with > 1 design per template (architecture supports
  it, only need more templates authored).
- Phase 5d/5e bulk preview generation + bulk export (needs server-side
  job queue / Edge Functions).
- Phase 6 high-res 4x print export (client-side 1x/2x ships; 4x off-screen
  app to follow once text baking is implemented).
- Phase 7 admin template uploader (depends on new DB tables and admin
  area schema).
- Text layers (§3d), element layers (§3e), prop toggles (§3f), layers
  panel (§3h) — stubbed in the `MockupState` schema but UI deferred.
- Watermark on free tier (no monetization scaffold yet).

What V1 SHIPS:
- PixiJS engine mounted, mode-agnostic, renders `MockupState`.
- One seed template with base/displacement/lighting/mask composite working.
- Standalone editor at `/tools/mockup-studio`: upload design → composite.
- Transform controls (position, scale, rotation).
- Product tinting (shirt color swatches, updates `tints` in state).
- Background panel (template / solid / upload).
- Brand-aware editor at `/b/:slug/tools/mockup-studio` + alias — uses
  `applyBrandKit(template, brand)` to prefill logo + colors on mount.
- Export PNG at 1x/2x.
- AppRail / features-inventory / `/tools` surface.

## 3. Folder structure (matching BrandOS conventions)

```
src/features/mockup-studio/
  engine/                             # MODE-AGNOSTIC. PixiJS only.
    MockupRenderer.ts                 # Class. Takes MockupState → paints PixiJS stage.
    useMockupRenderer.ts              # React hook: mount/update/unmount lifecycle.
    compositor/
      displacement.ts                 # DisplacementFilter helpers
      tint.ts                         # tint-mask multiply overlay
      background.ts                   # background sprite swap
    export.ts                         # off-screen render for PNG export
    types.ts                          # MockupState + TemplateMeta types
  data/
    templates/
      <templateId>/                   # per-template bundle
        template.json
        base.webp, displacement.webp, lighting.webp, mask.webp, (+tint_mask)
    templateIndex.ts                  # registers all bundled templates
  state/
    mockupStore.ts                    # Zustand — MockupState + actions
  modes/
    standalone/
      StandaloneMockupStudioPage.tsx  # /tools/mockup-studio
    brand-aware/
      BrandMockupStudioPage.tsx       # /b/:slug/tools/mockup-studio
      applyBrandKit.ts                # pure (template, brand) → MockupState
      applyBrandKit.test.ts
      brandResolvers.ts               # logo/color/font resolvers
  components/
    MockupCanvas.tsx                  # PixiJS canvas wrapper + hover/select
    TemplateGallery.tsx               # browse / pick
    DesignDropzone.tsx                # file upload
    TransformControls.tsx             # drag handles overlay
    PropertiesSidebar.tsx             # contextual right sidebar
    TintSwatches.tsx                  # product color swatches
    BackgroundPanel.tsx               # template / solid / upload
    ExportButton.tsx                  # PNG 1x/2x export
  hooks/
    useDesignUpload.ts                # file → object URL (+ cap size)

src/core/types/services.ts            # + SERVICE_KEYS.MOCKUP_TEMPLATES + IMockupTemplatesService
src/core/adapters/LocalMockupTemplatesService.ts
src/core/boot.ts                      # register LocalMockupTemplatesService
```

## 4. Database migration plan

**V1: no migrations.** Everything is bundled assets + localStorage for
draft state. The `mockup_templates` and `user_mockup_projects` tables
described in §10 of the spec belong to Phase 7 and get their own
`supabase/migrations/*.sql` when the admin uploader is built.

## 5. Conflict report

| Spec says | BrandOS convention | Resolution |
|---|---|---|
| Use `@pixi/react` | React 18; bindings risky | Custom `useMockupRenderer` hook (spec §5.1 explicitly allows this) |
| Store in R2, direct upload via presigned URLs | No R2; Supabase Storage with service-wrapped upload | Use `SERVICE_KEYS.UPLOAD` service path for design uploads; localStorage object URLs for anonymous users |
| `BrandKit` interface | BrandOS `Brand` type with logoSystem/colorSystem/typography | adapter layer in `brandResolvers.ts` |
| Bulk export server-side job | No job queue today | deferred |
| Admin `/admin/mockup-templates` page | Admin area exists under `/admin` in App.tsx | deferred to Phase 7; placeholder route wired now |

## 6. Risks discovered

1. **Asset pipeline is the real bottleneck.** 30–45 min of Photoshop per
   template is correct per spec. V1 ships procedural placeholder assets
   so we prove the engine; real template production is a follow-up
   operations workstream, not an engineering one.
2. **Brand has no `tagline` field.** The spec assumes one. We fall back
   to extracting the first sentence of `brand.strategy` or leaving the
   slot empty. A `brand.tagline` field should be added next time Brand
   schema is bumped.
3. **`brand.logoSystem` can point at assets that don't render well as
   "printed" designs** (e.g. an SVG wordmark on a mug looks small). The
   applyBrandKit function chooses `iconmark` when the template's
   `aspect_ratio` is square, and `wordmark`/`primary` for wider zones
   — this heuristic is in `brandResolvers.ts`.
4. **`strictNullChecks: false` means a mis-typed nullable will crash at
   runtime without a compile error.** We gate every brand-kit read with
   defensive `?.` + explicit fallbacks to avoid this.
5. **PixiJS v8's `Filter` API changed from v7.** We pin `pixi.js@^8.6.0`
   and all filter usage against v8 docs.

## 7. Next steps (execution plan)

After this document is written:

1. Install `pixi.js@^8`.
2. Phase 1 — scaffold engine, register DI service, seed one placeholder
   template, wire `/tools/mockup-studio` route.
3. Phase 2 — upload design → renders with displacement+lighting+mask.
4. Phase 3a/3b/3c — transform controls, tint swatches, background panel.
5. Phase 5b/5c — `applyBrandKit` + brand-aware route.
6. Phase 6 (scope-reduced) — PNG 1x/2x export.
7. AppRail / tools-directory surfacing.
8. Commit to `dev`, push.

Deferred items (Phase 3d/3e/3f/3g/3h, Phase 4 multi-zone UX, Phase 5d/5e
bulk, Phase 6 4x + text baking, Phase 7 admin uploader, Supabase
persistence tables) are explicitly out of this pass and tracked
separately.
