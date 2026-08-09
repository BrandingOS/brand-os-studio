# Stage 2B — Canonical Brand Persistence

Goal: make persistence round-trip the canonical Brand identity without stale mirrors, without
field dropping, and without localStorage being the source of truth for authenticated brands.
Deployment of the schema change is **prepared + verified, deploy-pending** (prod access is the
only blocker — same gate as S1).

## What shipped

| Piece | File | Role |
|---|---|---|
| Repository port | `src/domain/brand/repository.ts` | `BrandRepository` = the one read/write contract for the canonical brand |
| Row mappers (pure) | `src/platform/brand/brandRow.ts` | `canonicalToRow` / `rowToCanonical` — single (de)serialization point |
| In-memory adapter | `src/platform/brand/InMemoryBrandRepository.ts` | round-trips through the real mappers (test double / offline) |
| Supabase adapter | `src/platform/brand/SupabaseBrandRepository.ts` | authenticated, server-backed write path → `brands.identity` |
| Migration 013 (+down) | `supabase/migrations/20260810000000_013_brand_identity_column.sql` | **additive** `identity JSONB` + `identity_schema_version INT` |

## How the source-of-truth problems are structurally removed

- **One authoritative store:** the canonical identity lives in the dedicated `brands.identity`
  JSONB (a bounded value object — Owner Decision 3), NOT in the `guidelines` mirror. 2B code
  never reads or writes `guidelines`.
- **No re-derivation overwrite:** `rowToCanonical` returns the **stored** identity verbatim when
  present; it only derives from legacy columns (via `fromLegacyBrand`) for pre-013 rows that have
  no stored identity. Because `identity_schema_version` is stored, there is no per-load migration
  that could overwrite a fresh value (the 05/11 mechanism).
- **No field dropping:** `canonicalToRow` writes the entire identity as JSONB (authoritative) and
  additionally mirrors the legacy scalar columns for un-migrated readers — the Supabase whitelist
  drop no longer loses colorSystem/logoSystem/typography because they ride inside `identity`.
- **Server-backed for authenticated brands:** `SupabaseBrandRepository.save` validates
  (`assertCanonicalBrand`) then writes the DB row — no localStorage source of truth.

## Verification (all green)

- **Unit — semantic round-trip:** `brandRow.test.ts` + `InMemoryBrandRepository.test.ts` prove
  WRITE→PERSIST→READ preserves MEANING across colors, logos, typography (numeric weights),
  strategy, voice; that a saved primary color does not revert; and that stored identity beats a
  divergent legacy scalar column.
- **Real PostgreSQL (PGlite) integration:** applying the actual migration 013 to a representative
  `brands` table: columns created as `jsonb` + `integer`, idempotent re-run OK, identity JSONB
  round-trips (`#111111`, weights `[400,700]`, tone), and an edit persists (`#111111`→`#ff0000`).
  Harness: `scratchpad/pgverify/verify_2b.mjs` (kept out of the project to avoid a test-only
  devDependency, mirroring the security-migration verification approach).
- Ratchet green (324/324); full unit suite 1176 pass / 1 pre-existing fail; zero regressions.

## Deploy status

Migration 013 is in the push path and additive/safe. Activating the Supabase repository path in
production requires 013 to be deployed — it can go with the security release (`supabase db push`
applies 011+012+013) or separately. See `docs/phase-2/security-deploy/03-PRODUCTION-RUNBOOK.md`.
**Not deployed here** (no prod access).

## Scope held

2B built the persistence foundation only. Consumers are **not** migrated yet — the legacy
`brandStore` / `IBrandsService` path remains live. Stage 2D wires ONE consumer (Color System)
through this repository end-to-end.
