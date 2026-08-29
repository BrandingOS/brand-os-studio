# Access Architecture — 09 · Test Plan

## 1. Layers and how they run
| layer | where | runner | CI |
|---|---|---|---|
| SQL policy/invariant tests | `supabase/tests/*.test.sql` (existing convention, self-asserting, `BEGIN…ROLLBACK`) | `npm run test:db` → `scripts/db-test.mjs` runs each file through `docker exec <db> psql -v ON_ERROR_STOP=1` after `supabase db reset` | new job `db` using `supabase/setup-cli` action |
| Access resolver parity | `src/shared/access/resolve.test.ts` + `supabase/tests/038_access_resolver.test.sql` both consume `supabase/tests/fixtures/access-cases.json` | vitest `unit` / `test:db` | ✅ |
| Integration (PostgREST as real users) | `supabase/tests/integration/*.test.ts` — vitest project `db`, runs only when `SUPABASE_LOCAL_URL` is set; creates users via the admin API, signs in as each, hits REST/RPC/storage/realtime | `npm run test:db` | ✅ |
| Concurrency | same project, `credits.concurrency.test.ts` | | ✅ |
| Edge Function unit | `supabase/functions/**/*.test.ts` (existing `unit` project) — `_shared/authz.test.ts`, per-function gate tests with a mocked client | vitest unit | ✅ |
| Frontend unit | hooks, store, reasons, catalog parity | vitest unit | ✅ |
| Browser E2E | `*.browser.test.tsx` — members page, invite modal, brand access tab, workspace switcher, read-only surfaces, conflict notice | vitest browser | ✅ |

## 2. Fixture (shared by SQL and TS)
```
Workspace A "Kaafex"   plan agency
  Alice  owner
  Adam   admin
  Emma   member · all · default editor
  Dana   member · selected {A1: designer, A2: designer} · overrides deny ai.generate on A2
  Victor member · all · default viewer
  Grace  guest  · selected {A1: viewer} · grant designs.export
  Sam    member · suspended
Brands A1, A2, A3 (A3 archived)
Workspace B "Bob Co"   plan free
  Bob owner · Brand B1
Pending invite: carol@… → A, member, selected {A2: editor}
Removed member: Rita (had A1 editor; row deleted)
```
`access-cases.json` lists ~140 `(actor, capability, workspace, brand?) → expected` cells,
generated from the matrix in 03 §2 + the resolution rules in 03 §3, and hand-augmented with
the edge cases (archived, suspended, removed, cross-tenant, override ceilings).

## 3. Data-driven authorization tests
For every fixture actor × every tenant table × SELECT/INSERT/UPDATE/DELETE the SQL suite
asserts allowed/denied by attempting the statement as that user (`set_config('request.jwt.claims', …)`)
and comparing to the expectation derived from the capability the policy names. The
expectation table is generated, not typed — a policy that names the wrong capability fails
the generated cell.

## 4. Named security tests (07 §2 ids)
All 30 attack ids exist as tests; the test file names carry the id so the threat model and
the suite can be diffed (`scripts/threat-model-coverage.mjs` fails if an id has no test).

## 5. Credit concurrency tests (integration project, service-role client against local)
- 100-credit wallet, two simultaneous 70-credit reservations → exactly one `ok`, balance 30/reserved 70.
- 20 parallel reservations of 10 on a 100 wallet → exactly 10 succeed.
- Same idempotency key twice → one ledger row, second returns `duplicate`.
- Settle twice with the same key → one charge.
- Release twice → one release.
- Settle after release / release after settle → no-op, balances unchanged.
- Reservation with ttl 1s, wait, reaper → released, ledger `release … expired`, late settle returns `reservation_expired`, nothing charged.
- `grant_credits` while a hold is open → balance rises, hold unaffected, reconcile passes.
- After every scenario: `reconcile_credit_account` returns ok.
- Edge Function replay: same job idempotency key → original job, no second reservation (unit test with mocked provider).

## 6. Browser E2E scenarios
1. Owner invites a designer with selected brands → invite row → accept as new user → lands in the brand → Setup is read-only, Designs editable.
2. Guest opens `/settings/members` → 404-shaped; nav has no Members item.
3. Viewer opens Brand Kit → `ReadOnlyNotice`, no export button; after grant `designs.export` (member detail sheet) → export button appears without reload (realtime).
4. Workspace switcher: A → B without reload → dashboard shows only B's brands; `brandStore` scope reset; deep link to an A brand while in B → switch prompt.
5. Remove a member → their tab (second browser context) loses the brand on next navigation.
6. Two editors on one design → conflict notice with Reload / Save a copy.
7. Members page renders "Sarah Ahmed · Editor · 3 brands", detail sheet shows inherited vs direct.
8. Brand → Access tab: lists Alice (Owner, inherited), Dana (Designer, direct), Grace (Guest).

## 7. Gates
`npm run lint`, `npm run typecheck:ci`, `npm run test` (unit + browser), `npm run test:db`,
`npm run build`. Pre-existing failures are recorded in the final report separately from this
initiative's results.

## 8. Environment notes (local Supabase, 2026-08-29)
- The local image `public.ecr.aws/supabase/postgres:17.6.1.104` (CLI 2.84–2.116 on this
  machine, aarch64) **segfaults the backend on any "permission denied for function" raised
  for the `authenticated` role** — reproduced with a trivial revoked SQL function outside any
  test. `supabase/tests/025_image_generation_isolation.test.sql` provokes exactly that
  (`C4`) and so crashes the server here; it is a pre-existing environment failure, not a
  policy failure, and `scripts/db-test.mjs` labels crashes distinctly and waits for recovery
  before the next suite. Rule for new tests until the image is fixed: assert EXECUTE
  privileges with `has_function_privilege(role, fn, 'EXECUTE')` instead of calling the
  function as `authenticated`. Retry a newer image when ECR stops rate-limiting pulls.
