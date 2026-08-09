# 04 — Migration Strategy

> Batch 6. An **incremental** path from the current verified system to the target. Not a big-bang
> rewrite — the evidence (a live product with real users, one Supabase project, 1176 commits of
> accreted behavior) makes staged migration safer. **PROPOSAL** throughout. No stage is executed
> by this document; each is scoped so a future session can pick it up with clear entry/exit.

## 0. The five things being reconciled

| Axis | Source of truth for this plan |
|---|---|
| CURRENT verified system | `docs/codebase-intelligence/00–11` |
| TARGET product | `00-PRODUCT-TRUTH.md` |
| TARGET domain | `01-DOMAIN-MODEL.md` |
| TARGET architecture | `02-TARGET-ARCHITECTURE.md` |
| TARGET database | `03-TARGET-DATABASE.md` |

**Guiding constraint:** every stage keeps the app shippable. Bridges (adapters, dual-write, feature
flags) are temporary and explicitly retired.

## 1. Delete-first vs migrate-first (do this triage before sequencing)

**DELETE-FIRST** (safe removals that shrink the surface before real work; multi-signal-confirmed in
08, re-verified where noted):
- `remotion/` (wired to nothing — 00/08), Remotion capability (00 §23).
- `src/domains/dashboard` (only `.DS_Store`), `src/core/modules/` (zero importers),
  `FirstBrandRedirect`, `useRealtimeComments`, `useDataSync`, the 4 dead App.tsx lazy imports +
  their exclusive chains incl. `features/dashboard/v5/` — but **keep** `DashboardLayout/Navbar`
  (live for `/settings`) (08).
- `/onboarding-v3/*` shim routes (link-dead — 02/08); `features/templates/v5/` orphan page.
- Orphan edge functions `generate-description`, `fetch-url-preview` (08) — after confirming not
  deployed (11 §11).
- Root-level QA screenshots + one-off docs; decide archive vs git-ignore for `Brands/`.

**MIGRATE-FIRST** (must be carefully moved, never deleted until the replacement is proven):
- Brand identity data (the `guidelines` JSONB → typed `identity`) — highest-risk (05/11).
- Designs/templates/uploads → server persistence (04).
- The 3 legacy guideline stacks → Chronicle (00 §C), pending the legacy-presentations-data decision.
- Legacy editors' **export pipeline** (`vectorize/*`) — reusable domain under a dead UI; keep behind
  an adapter (08).
- `brand-kit-alt` (load-bearing in Studio settings — 03) — cannot delete until Brand-Kit/Identity
  merge (00 §B) lands.

> Do the delete-first set early (it's cheap and de-noises the CodeMap), but **gate each deletion on
> a `codemap:check` confirming zero live references** (02 §8) — never on a single signal.

## 2. Stage sequence

Order adapted from the suggested one; rationale noted where changed.

### Stage 1 — Safety + engineering gates (do first; unblocks everything)
- **Changes:** fix `typecheck` to check the real project + add to CI (report-only first); add
  import-boundary lint, cycle check, and the RLS-assertion CI job seeded by `supabase/tests/011…`;
  build `codemap:scan`/`check` (02 §8); **deploy migration 011/012 RLS fix** (already written).
  Rotate the leaked GitHub token (00 §8).
- **Untouched:** all product code/behavior.
- **Legacy removed:** none. **Bridge:** gates run in report-only mode so the 324 errors don't block.
- **Tests:** the gates *are* the tests; RLS test must pass against a shadow DB.
- **Rollback:** gates are additive/CI-only; revert config.
- **Done when:** CI runs a real type check (annotating), boundary/cycle/RLS/codemap checks exist,
  011 deployed and verified in prod.

### Stage 2 — Canonical domain contracts (no persistence change yet)
- **Changes:** introduce `domain/` + `application/` with the entities/value objects and use-cases
  from 01/02 as the **new write path**, initially backed by adapters over the *existing* stores/DB
  (strangler pattern). One typed `BrandIdentity` with numeric weights, one Voice field, one color
  engine (**resolve the color-engine PRODUCT DECISION here**).
- **Untouched:** DB schema; existing UIs keep working via compatibility mappers.
- **Bridge:** repository implementations map current rows ↔ domain objects (absorbing the
  `guidelines`-JSONB reality read-side).
- **Tests:** unit tests on domain invariants; use-case tests; the stale-mirror scenario (11 §4)
  becomes a regression test that must pass.
- **Rollback:** new layer is additive; features still call old paths until Stage 4.
- **Done when:** every brand mutation *can* go through a use-case; contracts are frozen.

### Stage 3 — Persistence foundation (schema, dual-write capable)
- **Changes:** create target tables (03) alongside current ones; add `identity` jsonb +
  `identity_schema_version` to `brands`; stand up `documents`, `assets`, `templates`,
  `publications`, one `platform_roles`. Repositories learn to **dual-write** (old + new) behind a
  flag.
- **Untouched:** current columns remain (read path still works).
- **Legacy removed:** none yet. **Bridge:** dual-write + backfill scripts.
- **Tests:** round-trip tests proving the target schema persists every domain field (directly
  attacks the whitelist data-loss — 04/11); RLS assertions on new tables.
- **Rollback:** flag off → old path only; new tables inert.
- **Done when:** new schema round-trips the full domain in staging; **PRODUCT DECISION**: confirm
  migrations 008–010 live state (11 §11) before layering 011+.

### Stage 4 — Brand source-of-truth migration (the crux)
- **Changes:** flip brand reads/writes to the typed `identity` as the single source; **remove the
  `guidelines`-mirror derivation**; backfill existing brands (`guidelines` JSONB + scalar columns →
  one `identity`), stamping `identity_schema_version`. Kill per-load `migrateBrandToCurrent`.
- **Untouched:** documents/assets (later stages) still on their current path.
- **Legacy removed:** the mirror + the stale-derivation loop (05/11).
- **Bridge:** a one-time, idempotent, reversible data migration + a read-compat shim for one release.
- **Tests:** the 05/11 stale-mirror and string-weight cases as regression tests; snapshot a sample
  of prod brands before/after (in staging) for parity.
- **Rollback:** keep `guidelines` column read-only for one release; shim can fall back.
- **Done when:** no code reads a `guidelines.*` mirror of identity; edits persist and never revert.

### Stage 5 — Asset model
- **Changes:** move to atomic `assets` rows (record+bytes), one upload pipeline (merge the 3 pickers
  — 07); logo/font files become `Asset` refs inside identity; migrate embedded data-URLs (03/04) →
  assets; orphan-sweep existing bucket files.
- **Legacy removed:** data-URL-in-brand-JSON; the DAM whitelist drop (fixes the disappearing authed
  upload — 11 §5).
- **Tests:** upload→reference→reload cross-device; dedup by hash; no orphaned bytes.
- **Rollback:** dual-read (asset row or legacy embedded) for one release.
- **Done when:** all new assets atomic + referenced; DAM authed uploads persist and display.

### Stage 6 — Route & product cleanup
- **Changes:** repoint in-app links off the onboarding shims → `/onboard-brand`, then remove shim
  routes (02/08); resolve the tools duplication to one impl, two entry contexts (00 §F); collapse
  brand-entry link helpers to one `getBrandHomeUrl`/`buildBrandUrl` (07); fix the anonymous-
  onboarding wipe per the **PRODUCT DECISION** (support end-to-end vs gate — 00 §Public/04 §R-03).
- **Untouched:** editors/decks (Stage 8).
- **Legacy removed:** onboarding shims, duplicate URL builders, one tools mount.
- **Tests:** route redirect map; no 3-hop chains; anonymous-onboarding path per decision.
- **Done when:** one live onboarding with no shims; single tool implementation; link helpers unified.

### Stage 7 — Feature-by-feature migration onto the target architecture
- **Changes:** port features one at a time into vertical slices with public APIs (02 §2/§7):
  brand-identity+brand-kit **merge** (00 §A/§B) first (retires `brand-kit-alt`'s load-bearing role),
  then assets, templates, content. Each port: consume use-cases, remove direct persistence, add
  boundary compliance.
- **Untouched:** un-ported features keep working behind the compat mappers.
- **Legacy removed:** per feature, as its replacement proves out (incl. session-only overlays — 03).
- **Tests:** per-feature E2E (the 3-layer doctrine, now on a real type gate).
- **Done when:** each capability in 00 §3 lives in one slice with a public API and no cross-feature
  deep imports (`codemap:check` green).

### Stage 8 — Editor-platform consolidation
- **Changes:** extract the shared editor runtime (02 §6) from `EditorChrome`/`useAutoSave`/command
  bus; move `shared/editor` + `shared/presentation` into `editor-platform/`; implement artifact
  adapters (Design, Guideline, Presentation, Social, Mockup) behind the contract; **resolve the
  deck-engine PRODUCT DECISION** (00 §H) — one adapter or a chosen engine. Keep `vectorize` export
  behind an adapter (do not delete — 08).
- **Legacy removed:** duplicate editor shells/deck engines *after* their artifact type is covered.
- **Tests:** per-adapter serialize/deserialize round-trip; contextual-property rendering; export parity.
- **Done when:** one platform + adapters; the ~14-editor sprawl (00 §I) is gone; documents are
  server-persisted and cross-device shareable (closes 04's `/d/` breakage end-to-end).

### Stage 9 — Legacy deletion
- **Changes:** remove now-unreferenced legacy (3 guideline stacks after Chronicle migration,
  legacy editors' UI, dead adapters/edge functions, compat shims/columns) — each gated on
  `codemap:check` proving zero references and the multi-signal method of 08.
- **Tests:** full suite + codemap zero-reference proof per deletion.
- **Done when:** legacy-candidates manifest is empty of confirmed-dead items; compat bridges retired.

### Stage 10 — Final strictness enforcement
- **Changes:** flip the type gate + boundary/cycle/RLS/codemap checks from report-only to
  **blocking**; enable `strictNullChecks`/`noImplicitAny` (per-folder, domain-first) to zero errors;
  make CI trigger on PRs (not just main — 09).
- **Done when:** a boundary violation, a new cycle, a type error, an RLS regression, or a codemap
  violation fails CI.

## 3. Dependency-ordering rationale (why this order)
- Gates (1) before anything, so every later stage is verifiable and RLS is safe immediately.
- Domain contracts (2) before persistence (3) so the schema serves the model, not vice-versa (the
  inversion 05/06 punished).
- Brand SoT (4) before assets (5) because assets are referenced *from* identity.
- Route/product cleanup (6) is cheap and de-risks feature ports (7) by removing shims/dupes first.
- Editor platform (8) after features (7) because it needs the document/asset/token model settled.
- Deletion (9) and strict-enforcement (10) last, when nothing legacy is load-bearing.

## 4. Cross-cutting requirements per stage
- **Every stage:** ships behind a flag or as additive; keeps the app running; updates the CodeMap
  manifests + migration-progress.json (02 §8) as the single source of "where are we."
- **Rollback default:** dual-write/dual-read for one release around any data move; no destructive
  step without a proven, reversible backfill.
- **Live-state gate:** Stages 3–4 must not proceed until prod migration state is confirmed (11 §11
  — run `supabase migration list --linked`).

## 5. Open decisions that block specific stages (from 00, consolidated)
| Decision | Blocks |
|---|---|
| Confirm prod migration state (008–010) | Stage 3/4 |
| Deck engine (one adapter vs chosen engine) | Stage 8 |
| Color engine (`shared/color` vs `lib/color-engine`) | Stage 2 |
| Admin system (`user_roles` vs `profiles.is_admin`) | Stage 3 (platform_roles) |
| Anonymous onboarding (support vs gate) | Stage 6 |
| Collaboration/analytics/marketplace (keep vs remove) | Stage 3 tables / Stage 9 |
| Legacy guideline-presentations data (preserve?) | Stage 9 (Chronicle migration) |
| Model-ID / AI proxy policy | Stage 2 (AiGateway) |

## 6. Cross-check against Phase 0 & target docs
Each stage cites the audit finding it resolves and the target doc it implements. No big-bang; delete
and migrate are separated; every risky move has a bridge + rollback + completion criteria. The
"delete-first" list is exactly the 08 confirmed-dead tier gated on codemap; the "migrate-first" list
is the 05/04/08 load-bearing set. Nothing here is presented as done — this is the plan, awaiting the
product decisions in §5.
