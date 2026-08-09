# BrandingOS — Execution Control Center

_Quick status page. Updated after every stage. Detailed docs live in
`docs/codebase-intelligence/` (audit), `docs/target-architecture/` (design),
`docs/phase-2/` (execution)._

## Current Position

- [x] Phase 0 — Audit
- [x] Phase 1 — Target Architecture + Owner Decisions
- [~] Stage 1 — Safety (7/8 gates PASS; **S1 = deploy 011/012 to prod BLOCKED on owner access**)
- [x] Stage 2A — Canonical Brand foundation
- [x] Stage 2B — Canonical Brand persistence / repository (schema 013 deploy-pending)
- [x] Stage 2C — Asset / Logo / Font foundation
- [ ] Stage 2D — First feature migration (candidate: Color System in Brand Kit)

## Current Architecture (as-is)

```mermaid
flowchart TD
  UI[Feature UIs] --> STORE[brandStore + 34 zustand stores]
  STORE --> SVC[services / DI]
  SVC --> LOCAL[LocalBrandsService → localStorage]
  SVC -. authed .-> SUPA[SupabaseBrandsService → brands row + guidelines JSONB]
  UI -. reads .-> MIG[migrateBrandToCurrent re-derives v3 each load]
  MIG -. stale-mirror .-> UI
  NEW[src/domain/brand — canonical model] -. not yet wired .-> UI
```

## Target Architecture (to-be)

```mermaid
flowchart TD
  UI[Feature] --> APP[application use-case]
  APP --> DOM[canonical Brand domain\nsrc/domain/brand]
  APP --> PORT[BrandRepository port]
  PORT --> ADP[Supabase adapter]
  ADP --> DB[(Postgres — one authoritative identity)]
  DOM -. fromLegacy/toLegacy .- LEG[legacy Brand shape\nboundary only]
```

## Current Source of Truth

| Concept | Today (legacy) | Canonical (new, `src/domain/brand`) |
|---|---|---|
| Brand identity | scattered: v3 fields + scalars + `guidelines` JSONB mirror (drifts) | `CanonicalBrand.identity` (one typed aggregate) |
| Color | `primaryColor` / `colorSystem` / `guidelines.colorPalette` | `identity.colors` (ColorSystem, roles) |
| Logo | `logo` / `logoAssets` / `logoSystem` / `guidelines.logoSystem` | `identity.logos` (LogoSystemRefs → asset ids) |
| Typography | `fonts` / `typography` / `guidelines.typography` (string weights!) | `identity.typography` (numeric weights) |
| Strategy/Voice | `strategy` / `tone` / `guidelines.strategy` / `voiceAndTone` | `identity.strategy` / `identity.voice` (unified) |

> Stage 2A builds the canonical column; it is **not yet wired** into read/write paths
> (that's 2B/2D). Legacy remains the live source of truth until then.

## Current Blockers

- **S1 (production security deploy of migrations 011/012)** — BLOCKED: no production
  DB/management access in the execution environment. Fully prepared + pre-prod-verified;
  runbook at `docs/phase-2/security-deploy/03-PRODUCTION-RUNBOOK.md`. Owner action.
- **GitHub token** — removed from local config; **owner must revoke/rotate** it.

## Current Technical Debt Baseline (frozen, ratcheted)

- TypeScript errors: **324** (frozen `.typecheck-baseline.txt`; CI blocks *new* errors).
- Circular deps: **10** (frozen `.madge-cycles-baseline.txt`).
- Unit tests: **1164 pass / 1 pre-existing fail** (`recolorLogo.test.ts`).
- Browser E2E: environmental block (Playwright headless-shell version mismatch).
- Lint: 0 errors / 228 warnings.

## What Changed This Run

- Committed the accepted Phase-0/1 + Stage-1 baseline (docs + security migrations + CI gate).
- **Stage 2A:** `src/domain/brand/` canonical model — `CanonicalBrand`/`BrandIdentity` aggregate
  reusing the v3 value objects; zod boundary validation; `fromLegacyBrand` (fixes stale-mirror) +
  `toLegacyBrandPatch`; 16 tests. Adversarially reviewed.
- **Stage 2B:** `BrandRepository` port + pure row mappers + In-memory & Supabase adapters +
  additive migration 013 (`brands.identity` JSONB). Reads prefer stored identity (no
  re-derivation); writes are validated + server-backed; guidelines mirror untouched. Round-trip
  proven by unit tests + a real-PostgreSQL (PGlite) integration harness. Zero regressions; type
  baseline unchanged.

- **Stage 2C:** `src/domain/asset/` — canonical `Asset` (adds owner + lifecycle to the v3
  BrandAsset shape); ONE `classifyAsset` boundary (manual > file-type > AI/context hint >
  default) so "is this a logo?" is decided in one place; `LogoRef→Asset` / `FontToken→Asset`
  resolvers; `legacy-url:` ref minting. 13 tests. Existing classification sites recorded for
  later migration (backlog B9–B11). Zero regressions.

## Next Stage

**2D — First feature migration (Color System).** Wire ONE narrow, high-value slice end-to-end
through the canonical stack: Brand Kit color edit → application op → canonical Brand → repository
→ (reload) → same value, no legacy mirror resurrection. Verify other consumers don't regress;
remove only the compat logic this exact slice makes unnecessary; add integration coverage.
