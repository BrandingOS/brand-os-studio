# Implementation Plan: Brand System Foundation MVP

**Branch**: `v3-brand-system` (spec dir `001-brand-system-foundation`) | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-brand-system-foundation/spec.md`

**Companion artifacts**: [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/services.md](./contracts/services.md) · [contracts/persistence.md](./contracts/persistence.md) · [quickstart.md](./quickstart.md)

---

## Summary

Converge the existing BrandingOS codebase onto one shared brand system with six
distinct concepts, by **extending the canonical model that already exists** rather than
building a V3 architecture beside it.

The whole plan rests on one observation from the scoped inspection: **the canonical
brand record already exists** — `CanonicalBrand`/`BrandIdentity` in `src/domain/brand/`,
with zod validation, a repository port, application-layer write ops, a legacy
resolution boundary, and a persisted home (`brands.identity`, migration 013). It covers
5 of the 7 Core subsystems. It is under-adopted, not missing. So this feature adds what
it lacks (visual style, rules, positioning, and an authority/provenance layer),
narrows every competing write path onto it, and unifies three asset stores into one
Library — all additively.

Six concepts, six homes, zero new stores where an existing one fits:

| Concept | Home | Verdict |
|---|---|---|
| Brand Core DNA | `brands.identity` (extended) + new `identity_meta` sidecar | **Extend existing** |
| Business Info | new `brands.business_info` column | Additive column |
| Brand Library | `public.assets` (extended) + new `brand_folders` | **Extend existing** |
| Official Brand Kit | new `brand_kit_adoptions` (references only) | New, minimal |
| Brand Context v1 | new `brand_context_signals` | New, minimal |
| Work/Outputs | `public.designs` (unchanged) + Library items with provenance | **Reuse existing** |

Two additive migrations (016, 017). No table dropped, no column retyped, no rewrite.

---

## Technical Context

**Language/Version**: TypeScript 5.8, React 18, Vite 5 (SPA)

**Primary Dependencies**: Zustand 5 (state), Supabase JS 2 (Postgres + Storage + Edge
Functions), zod 3 (validation), react-dropzone 14 (upload), Fabric 6 / editor document
schema (constructive outputs). **No new runtime dependency is introduced by this
feature** (see research §BA1–BA4).

**Storage**: Supabase Postgres with RLS + `brand-assets` private Storage bucket
(authenticated mode); localStorage (local/dev-bypass mode). Both modes satisfy the same
service interfaces.

**Testing**: Vitest with two projects — `unit` (jsdom) and `browser` (Playwright
Chromium); plus the repo's separate psql RLS test track (`supabase/tests/*.test.sql`).

**Target Platform**: Modern browsers; Cloudflare Pages deploy.

**Project Type**: Web SPA + BaaS. Layers: `pages → features → core/shared → adapters`.

**Performance Goals**: Core read is in-memory after brand load (no added round-trips on
the render path). Library list ≤ 1 query + 1 folders query per brand. Context capture is
fire-and-forget and never on a blocking path.

**Constraints**: `strictNullChecks`/`noImplicitAny` are OFF and 321 type errors are
baselined — the gate is `typecheck:ci` (add no new errors). Generated Supabase types are
stale; new adapters use the established payload-bag/`any`-mapper workarounds plus
missing-table/missing-column tolerance so the app degrades gracefully when a migration
is not yet deployed. localStorage quota has already caused production failures (font
uploads) — local-mode context signals must be capped.

**Scale/Scope**: ~15–20 source areas touched; 2 migrations; 5 consuming surfaces; the
foundation itself is data + services + contracts, with UI changes held to the minimum
that exposes new capability (§UI).

---

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design. Both passes below.*

| # | Principle | Verdict | Evidence |
|---|---|---|---|
| I | MVP-first, architecture-aware | **PASS** | Every element has a named current consumer. Two capabilities are deliberately *deferred with triggers*, not built: virtualization (BA3) and react-query adoption (BA4). Business Info is a column, not an entity platform; adoption targets are 3 enumerated kinds, not a graph. |
| II | One canonical source of truth | **PASS** | Core → `BrandRepository` only; Library → `IAssetsService` only; Kit adoptions are references (INV-6/7); generative media live in the Library, not a third store; `brandStore.update` is narrowed away from Core. This principle is the feature's purpose. |
| III | Structured Brand Core DNA | **PASS** | `visualStyle`, `rules`, `positioning` are closed enumerations and typed structures, not prose. `CoreFieldPath` is a closed registry validated by test. Free text remains only where narrative (mission, story, voice examples). |
| IV | Six concepts stay distinct | **PASS** | Six homes, six write authorities, no shared table. Cross-concept moves (adopt, save-to-library, promote) are explicit ops, never side effects. |
| V | AI proposes, human disposes | **PASS** | Authority and provenance are **separate dimensions** (data-model §1.2). System actors are type-level barred from `promoteCoreValue`; a system write attempting `confirmed`/`official` throws (INV-3). Promotion never rewrites provenance (INV-2). Context has no import path to `BrandRepository` (INV-13, dependency test). |
| VI | Deep model, calm surface | **PASS** | The sidecar/registry complexity is entirely internal. UI scope is deliberately minimal; status is available to consumers and surfaced *when relevant*, with no persistent labels or clutter (FR-003). |
| VII | User never trapped | **PASS** | `coreCompleteness` exists for progress display but **nothing gates on it**; `buildCreationContext` defaults to including provisional values, so creation works on a name-only brand (SC-002). |
| VIII | Outputs match their nature | **PASS** | Constructive outputs stay `BrandOSDocument`/`designs`; generative media are Library items with immutable provenance. Explicitly *not* unified (research D9). |
| IX | Evolve, don't rewrite — and don't be ruled by legacy | **PASS** | Extends the existing canonical model, assets table, storage bucket, DI container, kit repository seam. Every legacy path in §Legacy retirement has a named replacement **and** a deletion criterion. |
| X | Design System first, responsive by default | **PASS** | Full pre-flight ran (§UI). Three DS extensions proposed (icon slot on `DsBadge`, drag events on `DsDropZone`, promoting the save-state indicator); the authority chip is explicitly a **product** component, not a DS primitive. Full DAM→DS port deferred with a trigger. |
| XI | Brand isolation non-negotiable | **PASS** | Every new table uses the proven `is_brand_member()` policy set; adoptions additionally self-attribute (`adopted_by = auth.uid()`); storage keeps the `{brand_id}/…` key rule. Verified by psql RLS tests, **not** UI checks (SC-006). |

**Post-Phase-1 re-evaluation**: no new violations. One item warrants an explicit
statement rather than a violation entry: `public.designs` remains owner-scoped rather
than membership-aware (research D10). This *satisfies* Principle XI (isolation is
enforced at the data layer); widening it to brand membership has no MVP consumer and
would be speculative under Principle I. Recorded as a follow-on, not deferred silently.

**Complexity Tracking**: not required — no unjustified violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-brand-system-foundation/
├── plan.md                    # this file
├── spec.md                    # approved specification
├── research.md                # Phase 0 — decisions + build-vs-adopt
├── data-model.md              # Phase 1 — entities, invariants, transitions
├── contracts/
│   ├── services.md            # service + op interfaces
│   └── persistence.md         # migrations, RLS, local-mode parity
├── quickstart.md              # 10 validation scenarios
└── checklists/requirements.md # spec quality checklist
```

### Source code (existing directories — no new top-level layers)

```text
src/
├── domain/brand/                    # EXTEND — Core DNA + authority/provenance
│   ├── identity.ts                  #   + visualStyle, rules, positioning
│   ├── coreFieldPaths.ts            #   NEW — closed CoreFieldPath registry
│   ├── coreMeta.ts                  #   NEW — authority/provenance types + helpers
│   ├── invariants.ts                #   EXTEND — zod for new subsystems + meta
│   ├── fromLegacy.ts / toLegacy.ts  #   EXTEND — carry meta + businessInfo
│   └── repository.ts                #   unchanged port (the write authority)
│
├── application/brand/               # EXTEND — write ops now take an Actor
│   ├── changeBrandVisualStyle.ts    #   NEW
│   ├── changeBrandRules.ts          #   NEW
│   ├── changeBrandPositioning.ts    #   NEW
│   ├── changeBusinessInfo.ts        #   NEW
│   ├── promoteCoreValue.ts          #   NEW — the ONLY path to confirmed/official
│   └── buildCreationContext.ts      #   NEW — pure AI context assembly (no new folder)
│
├── core/
│   ├── types/services.ts            # EXTEND — IAssetsService + 2 new keys
│   ├── boot.ts                      # EXTEND — register new services in BOTH modes
│   ├── services/
│   │   ├── IKitAdoptionService.ts   #   NEW
│   │   └── IBrandContextService.ts  #   NEW
│   └── adapters/
│       ├── database/                #   EXTEND Local/SupabaseAssetsService (Library)
│       ├── kit-adoptions/           #   NEW — local + supabase pair
│       └── brand-context/           #   NEW — local + supabase pair
│
├── features/
│   ├── brand-kit/kit/repository.ts  # EVOLVE — sync → async; + Supabase impl
│   └── <surfaces>                   # migrate call sites onto the shared authority
│
├── shared/
│   ├── store/brandStore.ts          # NARROW — Core patches routed to the canonical op
│   ├── upload/                      # CONVERGE — all uploads → Library
│   ├── assets/                      # CONVERGE — retire brandAssets write path
│   └── ds/Feedback.tsx              # EXTEND — optional icon slot on DsBadge (only DS change)
│
└── supabase/
    ├── migrations/20260813000000_016_*.sql + down/
    ├── migrations/20260813010000_017_*.sql + down/
    └── tests/016_*.test.sql, 017_*.test.sql
```

**Structure Decision**: no new top-level layer, no new feature folder for "brand-system".
The foundation lives in the layers that already own these responsibilities — domain
(model + invariants), application (write ops), core (contracts + adapters), shared
(stores + DS). Creating a `features/brand-system/` module would itself be a parallel
architecture.

---

## Proposed architecture

```
      Onboarding    Setup    Brand Kit    Library    Create
           │          │          │           │         │
           └──────────┴────┬─────┴───────────┴─────────┘
                           │  (all five read/write through the same contracts)
        ┌──────────────────┼───────────────────────────────────┐
        ▼                  ▼                                   ▼
  BrandRepository    IAssetsService              IKitAdoptionService
  (Core + Business)    (Library)                 IBrandContextService
        │                  │                     IDesignStorage (constructive)
        │                  │                                   │
   application/brand ops   │                                   │
   (+ Actor, + promotion)  │                                   │
        │                  │                                   │
        ▼                  ▼                                   ▼
   ┌────────────────── ServiceContainer (DI) ───────────────────┐
   │  local impls (default)          supabase impls (authed)    │
   └────────────────────────────────────────────────────────────┘
                           │
              brands · assets · brand_folders ·
              brand_kit_adoptions · brand_context_signals · designs
                    (RLS: is_brand_member on every brand-scoped table)
```

Three rules make it hold:

1. **One write authority per concept**, enforced by narrowing — not by convention.
   `brandStore.update()` rejects Core-touching patches in development and routes them
   to the canonical op.
2. **Read-side projections stay read-only.** `MockBrand` (Setup), the editor's
   `BrandKit` ACL, kit previews, and `brandResolution` snapshots remain — but as
   derived views over the canonical record, never as persisted shapes.
3. **Authority ≠ provenance.** Two independent dimensions on a sidecar map keyed by a
   closed path registry, so adding status to Core breaks no existing reader.

---

## Existing-system reuse/migration map

| Subsystem | Verdict | What happens |
|---|---|---|
| `src/domain/brand/` canonical model + zod + repository port | **REUSE + EXTEND** | Add `visualStyle`, `rules`, `positioning`, `identityMeta`, `businessInfo` |
| `src/application/brand/change*` ops | **REUSE + EXTEND** | Add `Actor` param; add 4 new ops + `promoteCoreValue` |
| `BrandServiceRepository` (canonical facade) | **REUSE as-is** | Already the seam all surfaces converge onto |
| `public.brands` + `identity` column | **REUSE + EXTEND** | 2 additive columns (016) |
| `public.assets` + `IAssetsService` + `brand-assets` bucket | **REUSE + EXTEND** | 9 additive columns + Library methods (017) |
| `public.designs` + `IDesignStorage` + `BrandOSDocument` | **REUSE as-is** | Constructive outputs unchanged |
| `ServiceContainer` + `boot.ts` two-mode wiring | **REUSE as-is** | 2 new keys registered in both branches |
| `is_brand_member()` / `is_workspace_member()` RLS helpers | **REUSE as-is** | Every new table uses the proven policy set |
| DS primitives (`DsBadge`, `DsEmptyState`, `DsSkeleton`, …) | **REUSE** | 3 targeted extensions (§UI) |
| `react-dropzone`, `zod`, `zustand`, Supabase CLI | **REUSE** | No new runtime dependency |
| Brand Kit `KitStateRepository` seam | **EVOLVE** | sync → async (2 call sites); add Supabase impl |
| `brandStore.update()` | **EVOLVE (narrow)** | Core patches routed to canonical ops |
| Setup `MockBrand` adapters | **EVOLVE** | Persisted-shape translator → read-side view; multi-round-trip save collapses to one authority; photos/icons gain a real home (Library) |
| `LocalBrandMemoryService` | **EVOLVE** | Ranked colors/fonts become a derived read over context signals + designs |
| `brand.assets[]` (legacy inline array) | **MIGRATE → DELETE** | Into Library; array retired |
| `brand.brandAssets[]` + `useAssetUpload`/`assetOperations` write path | **MIGRATE → DELETE** | Into Library with `legacy_ref_id`; `logoSystem` refs rewritten |
| `useUpload` writing uploads into the brand record | **REPLACE** | Uploads go to the Library service |
| Kit `approved` status in localStorage | **MIGRATE** | Becomes Official Kit adoption rows |
| Legacy scalars (`primaryColor`, `fonts`, `tone`, `logo`, `logoAssets`, string `strategy`) | **LEGACY → DELETE** | Read-compat only, then removed |
| `brand.guidelines.*` as writable truth | **LEGACY → DELETE (as truth)** | Becomes a generated artifact/read projection |
| `brand.uiStyle` | **MIGRATE → DELETE** | Into `visualStyle.cornerStyle`/`density` |
| `brandos:seed-brand-overrides` hidden write layer | **REPLACE** | Proper per-user demo-brand handling |
| `services.brands` registry singleton, module `brandsService`, direct `setState` persistence bypasses | **DELETE** | Call sites migrated to the single authority |
| Unused `SavedDesign` type, old flat `Asset` where superseded | **DELETE** | With their last consumer |
| DAM page (shadcn) | **DEFER** | Port to DS in the Library surface feature (§UI) |
| `public.designs` owner-scoped RLS | **KEEP** | Membership sharing is a recorded follow-on (research D10) |

---

## Canonical data & write paths

| Datum | Read path | **Single write authority** |
|---|---|---|
| Core DNA values | `BrandRepository.getById/getBySlug` → `CanonicalBrand` | `application/brand/change*` → `BrandRepository.save` |
| Core authority/provenance | `coreValueMeta(brand, path)` | same ops (system) + `promoteCoreValue` (human only) |
| Business Info | `CanonicalBrand.businessInfo` | `changeBusinessInfo` |
| Library items & flags | `IAssetsService.listLibrary/getById` | `IAssetsService` (create/update/setFlags/archive/softDelete) |
| Folders | `IAssetsService.listFolders` | `IAssetsService` folder methods |
| Official Kit (library/deliverable) | `IKitAdoptionService.list` | `IKitAdoptionService.adopt/unadopt` (human actor only) |
| Official Kit (core value) | `IKitAdoptionService.list` | `promoteCoreValue(…,'official')` — delegates the row to the adoption service; direct `adopt(core_value)` is rejected |
| Context signals | `IBrandContextService.list/summarize` | `IBrandContextService.record/remove` (append + delete only) |
| Constructive outputs | `IDesignStorage.listDesigns/loadDesign` | `IDesignStorage.saveDesign` |
| Generative media | Library (`origin='generated'`) | `IAssetsService.create` + immutable provenance |
| Kit deliverable state | `kitStore` | `KitStateRepository` (async) |

**Derived, read-only (never written back)**: Setup's `MockBrand` view, the editor's
`BrandKit` ACL, kit previews and customization renders, `document.brandResolution`
snapshots, `coreCompleteness`, `ContextSummary`, brand-memory rankings.

---

## Persistence / database changes

Two additive, idempotent migrations, each with a `down/` file and the repo's header
convention. Full SQL surface in [contracts/persistence.md](./contracts/persistence.md).

- **016 — `20260813000000_016_brand_core_and_business_info.sql`**
  `brands.identity_meta JSONB`, `brands.business_info JSONB`. No RLS change (existing
  `brands` policies cover new columns). No SQL backfill — backfill runs in the
  application layer so local and server modes apply identical rules.

- **017 — `20260813010000_017_brand_library_kit_context.sql`**
  9 additive columns on `assets` (+ 2 `NOT VALID` CHECKs, 3 partial/plain indexes);
  new `brand_folders`, `brand_kit_adoptions`, `brand_context_signals`; RLS on all three
  using `is_brand_member()`, with adoption INSERT additionally requiring
  `adopted_by = auth.uid()`.

Constraints ship `NOT VALID` and are validated in a follow-up step, so the push cannot
fail on unexpected legacy rows — consistent with the repo's "if `db push` errors, do NOT
force" rule.

**Local-mode parity**: three new localStorage keys
(`brandos:library-folders:{brandId}`, `brandos:kit-adoptions:{brandId}`,
`brandos:brand-context:{brandId}`), with context signals **capped as a ring buffer**
(quota safety). Authority/promotion rules live in the **domain layer**, so both modes
inherit them without duplicated enforcement.

---

## Migration sequence

Each step is independently shippable, additive, and reversible. No step requires a
user-facing "upgrade your brand" action.

1. **Schema first, code second.** Deploy 016 + 017 (runbook: `migration list` →
   `db push` → `migration list`, confirm both columns). Nothing reads the new columns
   yet.
2. **Read-through defaults.** `fromLegacyBrand` returns `identityMeta` defaulted per
   INV-4 (`provisional`/`imported`) for every existing value. Zero behavior change.
3. **Backfill on write (lazy) + a one-shot pass.** When a brand is next saved, its meta
   is normalized: values that exist today → authority `confirmed`, provenance
   `user-entered`/`imported`; migration-derived values → `provisional`/`inferred`.
   Never `official`. A dry-run report precedes the one-shot pass.
4. **Library ingest.** For each brand, copy `brand.assets[]` and `brand.brandAssets[]`
   into the Library with `legacy_ref_id` preserved, then rewrite `logoSystem` refs to
   the new ids. Idempotent (keyed on `legacy_ref_id`), re-runnable, with read-through
   fallback for any ref not yet rewritten. When ingest completes, run
   `VALIDATE CONSTRAINT` on the `NOT VALID` checks from 017 — a separate, re-runnable
   statement, deliberately not part of the deploy.
5. **Upload path convergence.** `useUpload`, `useAssetUpload`/`assetOperations`, and
   Setup slots all write through `IAssetsService`. Legacy arrays become read-only.
6. **Kit approvals → adoptions.** Existing `approved` kit items become adoption rows,
   attributed to the brand owner at their original approval time where known.
   Kit repository goes async and gains its Supabase implementation.
7. **Write-path narrowing.** `brandStore.update()` starts rejecting Core patches in dev;
   remaining call sites migrate; the duplicate service singletons are removed.
8. **Sign-in reconciliation.** An explicit step (not an implicit merge) reconciles
   local-mode work into the server record on first authenticated load, so truth cannot
   fork (FR-033).
9. **Retirement.** Legacy fields and paths are deleted only as their criteria are met
   (§next).

---

## Legacy retirement strategy

Nothing is deleted on a schedule; each item is deleted when its **criterion** is met,
and until then it remains read-compatible input — never fallback *truth*.

| Legacy item | Replacement | Deletion criterion |
|---|---|---|
| `primaryColor`, `secondaryColor`, `accentColor`, `neutrals`, `fonts`, `tone`, `audience`, `logo`, `logoAssets`, string `strategy` | Core DNA in `identity` | No reader resolves them ahead of the canonical record (grep + test asserting `fromLegacy` priority is never exercised on a migrated brand) |
| `brand.guidelines.*` as writable truth | Core DNA + generated artifact | All voice/strategy/logo/color readers use Core; `guidelines` becomes render-only |
| `brand.assets[]` | Library | Zero brands have a non-empty array after ingest, and no writer touches it |
| `brand.brandAssets[]` + `assetOperations` write path | Library | Same, plus all `logoSystem` refs resolve to Library ids |
| `assets.legacy_ref_id` | — | Zero rows populated and no reader uses the fallback |
| `brand.uiStyle` | `visualStyle` | Brand Board writes `visualStyle`; no reader of `uiStyle` remains |
| `brandos:seed-brand-overrides` | Per-user demo-brand handling | Seed brands no longer need a parallel write store |
| `services.brands` singleton, module `brandsService`, `useBrandStore.setState` persistence bypasses | `BrandRepository` / narrowed store | Zero call sites (enforced by a lint rule or import test) |
| Kit-local `approved` status | Adoption rows | Kit state hydrates adoptions from the service |
| `SavedDesign` (unused), superseded flat `Asset` | — | Last consumer removed |
| DAM page on shadcn | DS Library surface | Parity reached in the Library surface feature |

Per Constitution IX, each retirement is a **planned step with a criterion**, not an
indefinite freeze. Criteria that remain unmet at feature completion are recorded, not
quietly dropped (quickstart Definition of Done).

---

## Testing strategy

Three layers, per the repo's standing requirement. Exemplars to model on were
identified during inspection.

**Unit (jsdom)** — model `src/domain/brand/__tests__/canonicalBrand.test.ts`:
- `CoreFieldPath` registry completeness (every path resolves against the identity schema).
- Authority state machine: all legal/illegal transitions; INV-2 (promotion preserves
  provenance); INV-4 default; INV-5 ordering.
- INV-3: a system actor writing `confirmed`/`official` throws; `promoteCoreValue` rejects
  non-human actors (type-level + runtime).
- `fromLegacy`/`toLegacy` round-trip carrying meta + businessInfo, including all four
  legacy shapes.
- `buildCreationContext` includes provisional values by default (FR-006).
- Dependency test: no import path from the context service to `BrandRepository` (INV-13).

**Adapter integration (jsdom)** — model
`src/core/adapters/database/__tests__/LocalAssetsService.test.ts` (real localStorage) and
`SupabaseDesignStorage.test.ts` (the Proxy-based chainable Supabase mock):
- Library CRUD + flags + folders + archive/unarchive round-trip, per brand.
- `softDelete` tombstone: item leaves views, work still resolves, `ok:false` returned
  when adopted/referenced (INV-11).
- Adoption: reference-only payload (INV-6); unadopt leaves the item (INV-7); no
  automatic insert path (INV-9); **direct `adopt({targetKind:'core_value'})` is
  rejected** and `promoteCoreValue(…,'official')` is the only route (INV-8).
- Context: append/list/remove; capture never throws (INV-15); local ring-buffer cap.
- Kit repository async swap; both implementations satisfy the same suite.
- `boot.test.ts` extension: both new keys resolve in **both** auth modes.

**Browser E2E (Chromium)** — model
`src/features/brandkit/components/TemplateGallery.browser.test.tsx`:
- Cross-surface truth: edit in Setup → Brand Kit, editor, and Library all reflect it
  (SC-001), and the reverse direction.
- Name-only brand reaches a saved output with zero blocking prompts (SC-002).
- Upload from three surfaces → all appear in the Library with correct origin (SC-004).
- Promote → appears in Official Kit; unadopt → material remains.

**RLS (psql, separate track)** — model
`supabase/tests/011_workspace_member_escalation.test.sql`: `BEGIN … ROLLBACK`,
`pg_temp.act_as(uid)`, `RAISE EXCEPTION` on wrong outcome, final
`ALL … ASSERTIONS PASSED`. Two new scripts (016, 017) assert non-member denial on every
new table and column, adoption self-attribution, and storage-path scoping.

**Migration harness**: a before/after fixture per legacy shape (legacy scalars, v3
fields, identity blob, guidelines mirror, seed brand) asserting zero data loss and
correct backfill authorities.

---

## Security & isolation checks

Principle XI is verified at the data layer, never through the UI.

1. **Every new brand-scoped table** uses the proven `is_brand_member()` policy set
   (viewer/editor/editor/admin) — the same predicates as `public.assets`.
2. **Adoption self-attribution**: INSERT requires `adopted_by = (SELECT auth.uid())`, so
   an adoption cannot be credited to another user.
3. **Storage key rule (binding)**: every object written to `brand-assets` uses
   `{brand_id}/…`; a non-UUID first segment raises a cast error in the policy, so the
   key format is validated before upload.
4. **Service-layer scoping**: `listLibrary`/`listFolders`/`list` take `brandId`
   explicitly; id-only lookups rely on RLS exactly as the existing services do
   (documented house assumption, not defense-in-depth — noted so it is a decision, not
   an accident).
5. **No new anon exposure**: none of the new tables gets an anon policy. The existing
   `brands_select_public` anon path is untouched by this feature.
6. **Context privacy**: signals are brand-scoped, never cross-brand (RLS forbids it),
   inspectable and deletable by the user (FR-013).
7. **AI context assembly** is a pure function over already-authorized data — it performs
   no reads of its own, so it cannot widen access.
8. **Local mode** carries no security claim: it is single-user by construction; the
   sign-in reconciliation step is where data crosses into the authorized world.

---

## UI & Design System plan

**Scope boundary first**: the spec's non-goals exclude new UI surfaces and redesigns.
This feature therefore lands data + services + contracts, and changes UI only where a
new capability would otherwise be unreachable (Library flags/folders, authority display
where relevant, save states). The full Library redesign and the DAM→DS port are the
*next* feature, with prepared groundwork here.

### COMPONENT / DS PRE-FLIGHT

- **Existing components searched**: `src/shared/ds` (full export surface),
  `src/shared/ui` (PageHeader, AssetCard, AssetPicker, SegmentedNav),
  `src/shared/components`, `src/shared/upload` (AssetSourcePopover), `src/shared/layouts`
  (WorkspaceShell + shells), `src/features/dam` (DamPage + AssetGrid/Filters/Lightbox/
  UploadZone), `src/features/setup`, `src/features/brand-kit`, `src/features/editor/core`
  (EditorChrome, `useAutoSave`, SaveStateIndicator).
- **DS primitives inspected**: DsButton, DsInput/TextArea/DropZone, DsSelect,
  DsSwitch/Checkbox/Radio/Segmented, DsToast/Banner/Badge/StatusDot, DsMenu,
  DsModal/ConfirmDialog, DsSkeleton/Progress, DsTabBar, DsRail, DsAssetRow, DsSwatchRow,
  DsLogoTile, BrandMark/LoadingPill, DsEyebrow/Kbd/Chip/Tooltip/EmptyState; plus
  `tokens.json` token groups.
- **Canonical components reused**: `DsBadge`, `DsStatusDot`, `DsChip`, `DsEmptyState`,
  `DsSkeleton`, `DsProgress`, `DsModal`/`DsConfirmDialog`, `DsToast`/`DsBanner`,
  `DsAssetRow`, `BrandMark`/`LoadingPill`, `PageHeader`, `AssetSourcePopover`,
  `WorkspaceShell`, `useAutoSave`.
- **Components composed**: authority/provenance chip (composes `DsBadge`); Library flag
  controls (compose `DsChip` + `DsMenu`); delete-blocked dialog (composes
  `DsConfirmDialog` with the adoption/reference list).
- **Components extended** (exactly 1 — trimmed from 3 during final review):
  1. `DsBadge` gains an optional **icon slot** — needed by the authority/provenance chip
     in P1; generic, ~10 lines, useful to every consumer.

  **Deferred to the Library surface feature** (they failed this feature's own scope
  test — the surfaces that need them are not built here, so building them now would be
  the unnecessary DS refactor the review guards against):
  - `DsDropZone` drag events — `features/dam/AssetUploadZone` already handles drag for
    the existing surface; nothing in this feature needs a DS drop zone.
  - `DsSaveState` promotion + moving `useAutoSave` to `shared/hooks` — real duplication,
    but with the Library UI deferred the honest consumer count is 1 (the editor, which
    already has it). Churning `features/editor/core` for a future consumer is
    speculative; promote when the second consumer actually lands.
- **New feature-local components**: Library folder rail, bulk-action bar, generating-tile
  overlay. **Why local**: product-specific semantics and one consumer each; promote later
  only if real reuse appears.
- **New shared product components**: **none in this feature.** The authority chip is the
  likely first candidate but stays feature-local until a second surface needs it.
- **New DS primitives**: none beyond the single extension above. A `DsCard`/`DsSection`
  container is a real, observed duplication (Setup's `Section`, Brand Kit's `KitSection`)
  — **flagged, deliberately not added here**; it belongs to the surface work that
  follows.
- **Why the authority chip is NOT a DS primitive**: "authority/provenance" is a product
  concept. Constitution §3/§7 keeps product semantics out of the DS; the DS supplies the
  generic badge, the product supplies the meaning.
- **Legacy/duplicate components encountered**: the DAM page and its sub-components are on
  shadcn (`src/components/ui`); `src/shared/ui` is a third Tailwind-`cn()` layer. No new
  imports from frozen layers are introduced. Deletion criterion for the shadcn DAM is
  recorded in §Legacy retirement.
- **Hardcoded visual values introduced**: none — all new UI consumes `--ds-*` tokens.
- **Legacy generic UI imports introduced**: none.

### Experience states (purposeful, no decorative motion)

Loading (`DsSkeleton` for lists, `LoadingPill` for indeterminate work), generating
(per-item overlay + cancel, feature-local), autosaving (the existing
`features/editor/core` save indicator where the editor already provides it; Setup keeps
its current save feedback until the promotion lands), success/failure
(`DsToast`/`DsBanner` + retry), empty (`DsEmptyState` with a real next action), resume
(Setup/onboarding return-to-where-you-left-off, reusing the existing `ContinueSurface`
pattern rather than inventing a second one). Responsive behavior is required on every
touched surface, not a follow-up pass.

---

## Phased implementation order

Each phase is independently shippable, independently testable, and reversible.

| Phase | Deliverable | Why this order |
|---|---|---|
| **P0 — Schema + contracts** | Migrations 016/017 + down files; new service interfaces and DI keys registered in both modes; RLS test scripts. No behavior change. | Schema-first means every later phase is code-only and revertible without a DB change. |
| **P1 — Core DNA + authority/provenance** | Extend identity model, `CoreFieldPath` registry, `identityMeta`, Actor-aware ops, `promoteCoreValue`, read-through defaults. | The heart of the feature; everything else references Core status. |
| **P2 — Single write authority** | Narrow `brandStore.update`; migrate Setup's multi-round-trip save; retire duplicate service channels. | Locks in Principle II before more consumers arrive. |
| **P3 — Brand Library unification** | Library columns/methods/folders; ingest `assets[]` + `brandAssets[]`; rewrite `logoSystem` refs; converge all upload paths. | Largest data migration; isolated from Core so failures don't touch brand truth. |
| **P4 — Official Kit adoption** | Adoption service + kit repository async + Supabase impl; migrate `approved` → adoptions. | Depends on the Library (adoption targets) and Core (core_value targets). |
| **P5 — Business Info + Context v1** | `businessInfo` op + consumers; context signals service; brand-memory becomes derived. | Smallest surface area; safe to land last among the concepts. |
| **P6 — Generative-media provenance** | `origin='generated'` + provenance payload + relationship accrual. | Needs the Library (P3) in place. |
| **P7 — Legacy retirement** | Delete each legacy path whose criterion is met; record the rest. | By definition last; criteria can only be met after consumers migrate. |

The single DS extension (`DsBadge` icon slot) lands in P1, alongside the first surface
that displays a value's authority.

---

## Risks & rollback

| # | Risk | Likelihood / Impact | Mitigation | Rollback |
|---|---|---|---|---|
| R1 | **Library ingest loses or mis-maps assets** (three source shapes, id mismatch) | Med / High | Idempotent, keyed on `legacy_ref_id`; dry-run report first; legacy arrays kept read-only until criteria met; read-through ref fallback | Stop ingest; legacy arrays are still intact and still readable — no data was moved, only copied |
| R2 | **`logoSystem` refs break** after id rewrite | Med / High | Rewrite is per-brand and idempotent; fallback resolves via `legacy_ref_id`; browser test asserts logo slots resolve post-migration | Revert the ref rewrite; fallback keeps logos resolving meanwhile |
| R3 | **Migration deploy fails** on unexpected legacy rows | Med / Med | All DDL idempotent; CHECKs added `NOT VALID`; repo rule "if `db push` errors, do NOT force" | Run the `down/` file; adapters' missing-column tolerance (`42703`) keeps the app working |
| R4 | **Kit repository sync→async** breaks kit hydration | Med / Med | Only 2 call sites; local impl keeps behavior behind resolved promises; adapter tests cover both impls | Revert the interface change (self-contained commit) |
| R5 | **localStorage quota** in local mode (already bit us with fonts) | Med / Med | Context signals capped as a ring buffer; no document payloads in `value`; the existing `safeStorage` evictor still applies | Cap size reduced; context is non-essential and degrades silently (INV-15) |
| R6 | **Narrowing `brandStore.update` breaks an unmigrated call site** | High / Med | Dev-only rejection first (loud in dev, permissive in prod) for one release; inventory of call sites from the inspection; lint/import test to catch new ones | Flip the guard off — it is a single switch |
| R7 | **Stale generated Supabase types** hide a column mismatch | High / Low | Established payload-bag + `any`-mapper pattern; missing-table/column tolerance; regenerate types as a follow-up chore | None needed; app degrades to local behavior |
| R8 | **Sidecar drifts from the value tree** | Low / Med | Closed `CoreFieldPath` registry + completeness test; unknown keys dropped on read (self-healing) | None needed; drift is inert by construction |
| R9 | **Backfill assigns wrong authority** (over-confirming AI-derived values) | Med / High | Explicit rules: existing values → `confirmed`; migration-derived → `provisional`/`inferred`; **never `official`**; dry-run report reviewed before the one-shot pass | Meta is a separate column — reset `identity_meta` and re-run; values themselves are untouched |
| R10 | **Scope creep into the Library redesign** | Med / Med | Explicit UI scope boundary (§UI); DAM port deferred with a recorded trigger | N/A — a planning control |

**Global rollback posture**: every migration is additive with a `down/` file; no
existing column is dropped or retyped in this feature; every legacy store remains
readable until its deletion criterion is met. At any point before P7, reverting the
application code restores previous behavior with the data intact.

---

## Ready for `/speckit-tasks`

Design artifacts complete: research (decisions + build-vs-adopt), data model
(entities, invariants, transitions), contracts (services + persistence), quickstart
(10 validation scenarios). Constitution Check passes on both evaluations with no
unjustified violations and an empty Complexity Tracking table.
