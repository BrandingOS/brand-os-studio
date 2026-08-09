# Phase 2 · Stage 1 — Completion Report

> Stage 1 = **Security + Database Truth + Engineering Safety Nets** only. Executed checkpoint by
> checkpoint. **No production database writes. No `src/**` runtime code changed. No Stage 2 work.**
> Baseline `new-ui @ 46ffb41`. Completed 2026-08-09.

## Gate table (PASS / FAIL / BLOCKED — no PARTIAL)

| Gate | Status | Basis |
|---|---|---|
| **S1** migration 011 applied | **BLOCKED** | Not deployed to prod (needs prod DB/management access this session lacks). Clean security-only deploy path prepared (009/010 relocated out of push path) — `docs/phase-2/security-deploy/`. |
| **S2** RLS tests executed | **PASS** *(updated 2026-08-09)* | Executed against real PostgreSQL 18.3 (PGlite, RLS enforced) in pre-prod: negative controls reproduced both vulns; **011 + 012 suites ✓ ALL PASSED**. See `docs/phase-2/security-deploy/02-PREPROD-VERIFICATION.md`. Prod-shadow re-run is a runbook step. |
| **S3** adjacent security dispositioned | **PASS** | A profiles/email → **FIX NOW** (migration 012 written + **verified**); B finalize-onboarding IDOR → **FIX NOW** (orphan; owner: undeploy — command in runbook); C bm_update → **FIX LATER w/ justification** (re-analyzed: not cross-tenant, unused, deferred). |
| **DB1** live migration state verified | **PASS** | `supabase migration list --linked` (read-only): 008 **applied**; 009, 010 **not applied**; 011, 012 absent (expected). Repo consistent with remote (no divergence). |
| **DB3** backup/rollback established | **PASS** *(updated 2026-08-09)* | Runbook exercised in pre-prod: pre-change capture → apply 011/012 → verify → **down-migrations applied and restored the exact pre-patch state** (vuln returns post-rollback). Down-migrations now **verified**. Prod pre-deploy capture is a runbook step. See `02-PREPROD-VERIFICATION.md` §backup-dry-run. |
| **E1** baseline recorded | **PASS** | Build/lint/typecheck/unit recorded with exact numbers (below); browser E2E classified ENVIRONMENTAL. |
| **E2** real typecheck gate | **PASS** | Script now checks the real app (`tsconfig.app.json`, all of `src/`); ratchet blocks new errors while tolerating 324 baseline; proven to catch an injected error; wired into CI. |
| **E3** migration/security test strategy | **PASS** | Self-asserting RLS SQL tests (011, 012) + run commands; type-regression ratchet; cycle baseline; documented CI execution. (Full round-trip persistence harness is a Stage-3 build.) |

**7 PASS · 1 BLOCKED · 0 FAIL** *(updated 2026-08-09 after the security-deploy handoff — S2 and DB3
moved BLOCKED→PASS via real-Postgres pre-prod verification; see `docs/phase-2/security-deploy/`).*
Only **S1** (actual production application of 011/012) remains BLOCKED — it needs the owner-run
deploy window (prod DB/management access), not any further engineering.

## Baseline numbers (E1, exact)
| Signal | Result |
|---|---|
| Production build | PASS, exit 0, ~19.6s |
| Lint | PASS, 0 errors, **228 warnings** |
| Real typecheck | **324 errors / 82 files** (frozen baseline) |
| Unit tests (jsdom) | **1151 passed, 1 failed / 1152** (1 PRE-EXISTING failure: `recolorLogo.test.ts`) |
| Browser E2E (chromium) | Could not run — ENVIRONMENTAL (Playwright headless-shell 1217 vs 1228) |
| Circular dependencies | **10** (frozen baseline) |
| Failures INTRODUCED by Stage 1 | **0** |

## Files changed (config / tooling / migrations / docs — no `src/**`)
- `package.json` — `typecheck` (real), `typecheck:ci`, `typecheck:baseline`, `deps:cycles`.
- `scripts/typecheck-ratchet.mjs` (new); `.typecheck-baseline.txt` (324); `.madge-cycles-baseline.txt` (10).
- `.github/workflows/ci.yml` — Type-check step → `npm run typecheck:ci` (was no-op `npx tsc --noEmit`).
- `supabase/migrations/…011…` + `…012…` (+ `down/…`) + `supabase/tests/011…`, `012…` — **written, staged, NOT deployed**.
- `docs/phase-2/stage-1/*` (this folder), plus prior `docs/codebase-intelligence/*`, `docs/target-architecture/*`.
- Local `.git/config` — GitHub token removed from the `origin` URL (not a tracked file).
- `supabase/.temp/cli-latest` — generated CLI cache (tracked; should be git-ignored later; not a source change).

## Migrations applied to any database
**None.** 011 and 012 remain local/undeployed.

## Production actions performed
**None against the database.** The only mutating action was **local**: removing the embedded GitHub
token from `.git/config` (Checkpoint 8). No prod schema, data, or Edge Function was changed.

## CI changes
`.github/workflows/ci.yml`: the "Type check" step now runs the real ratchet (`npm run typecheck:ci`).
Everything else unchanged. (Not run here — GitHub Actions can't be executed locally; the ratchet
itself is verified locally.)

## Remaining risks (open)
1. **The two security vulnerabilities are STILL LIVE in production** — 011 (cross-tenant workspace
   takeover) and 012 (all-tenant profiles/email exposure) are written but **undeployed**. Highest
   priority to close.
2. **`finalize-onboarding-assets`** (service-role IDOR, orphan) may still be **deployed** — owner to
   `supabase functions list` and undeploy/guard.
3. **The removed GitHub token must be ROTATED** by the owner (revoke in GitHub) — treat as compromised
   until then. Removal from local config does not revoke it.
4. **Browser AI keys still exposed** (`VITE_ANTHROPIC_API_KEY`, 6 sites) — deferred to Stage 2 (needs
   the server AI gateway first; no AI code changed).
5. **009/010 not in prod** → `templates`/`template_categories` and `profiles.is_admin` absent; the
   admin templates queue is broken in prod (known; owner-deferred scope).
6. **Browser E2E cannot run** (Playwright headless-shell mismatch) → that test layer is currently
   unverified. Fix: `npx playwright install chromium-headless-shell`.
7. **1 pre-existing unit failure** (`recolorLogo`) — untouched by Stage 1; fix out of scope.

## Is Stage 2 safe to begin?
**No.** Stage 2 must not begin until **S1, S2, and DB3 are PASS** — i.e. the security migrations are
deployed to production and verified, the RLS tests have actually run green against a database, and
the backup/rollback path has been exercised. All three need the owner-run deploy window:

**Owner action queue (unblocks Stage 2):**
1. Decide the 009/010 ride-along (CP1 §5 / CP4 Step 0).
2. Stand up a pre-prod DB (local Docker or a staging project); run `supabase/tests/011…` and `012…` → green.
3. Capture the pre-deploy backup (CP2 §1).
4. Deploy 011 + 012 (security-only path preferred); run post-deploy verification → mark S1, S2, DB3 PASS.
5. `supabase functions list` → undeploy/guard `finalize-onboarding-assets` (S3-B).
6. Revoke + reissue the GitHub token (CP8).

Once those are green, Stage 2 (canonical Brand/persistence foundation per `docs/target-architecture`)
may begin. **Nothing beyond Stage 1 was started.**
