# FINAL OWNER DEPLOY / SECURITY CLOSURE — consolidated sequence

All CODE-side prerequisites are done, tested (typecheck/build/unit green), and pushed to
`dev`. What remains are owner-only deploy actions, in the order below. Nothing here breaks
production before it's ready — the frontend degrades gracefully (mock/heuristic) until the
proxy is live, and production frontend only changes on your manual `main` release.

Status legend: **READY TO DEPLOY** (code done, owner runs the command) · **OWNER ACTION** ·
**ALREADY LIVE**.

---

## Item status

| # | Item | Status |
|---|---|---|
| 1 | Migration 015 (`designs`) | **READY TO DEPLOY** — verified NOT remote (migration list shows local-only). |
| 2 | Browser AI key P0 | **READY TO DEPLOY** — proxy written; all 5 browser clients rewired; `VITE_ANTHROPIC_API_KEY` removed from `src/` (no longer inlined). |
| 3 | `finalize-onboarding-assets` tenant auth | **READY TO DEPLOY** — JWT + brand-ownership check added in the function. |
| 4 | GitHub `gho_` token | **OWNER ACTION** — rotate/revoke (see #4). |

---

## Deploy order (do in sequence)

### Step 1 — Database
```bash
supabase db push --linked          # applies migration 015 (designs)
supabase migration list --linked   # confirm 20260812000000 now shows in BOTH columns
```
Verify: an authenticated user saves a design → reload/other device loads it from the server.
Rollback if needed: `supabase/migrations/down/015_designs.down.sql` (drops the table; designs
fall back to localStorage — no data-critical loss).

### Step 2 — Edge Functions + server secret (BEFORE the frontend release)
```bash
# server-side Anthropic key (never in the browser again)
supabase secrets set ANTHROPIC_API_KEY=<your-key>
# deploy the new + updated functions
supabase functions deploy anthropic-proxy
supabase functions deploy finalize-onboarding-assets
```
Also confirm per-function JWT gating in the dashboard (`supabase/config.toml` has none):
`anthropic-proxy` = verify_jwt OFF (uses in-code `requireSession`, needed pre-signup);
`finalize-onboarding-assets` = it now verifies the JWT in code, keep default.

Verify: `curl` the proxy with a session body → 200 with an Anthropic response; call
finalize with someone else's `brandId` → **403** (cross-tenant blocked).

### Step 3 — Frontend release (AFTER Step 2)
Promote `dev` → `main` (your manual release) so the rewired frontend goes to production, and
**unset `VITE_ANTHROPIC_API_KEY`** from the production build env (it is no longer referenced
in code, so the bundle no longer needs it).
Verify each AI feature end-to-end against the deployed proxy: Brand Assistant, Brand
Consistency Studio, AI logo suggestions, onboarding description parse, (deck generation).

Failure note: if the proxy isn't reachable, Brand Assistant / Brand Consistency / logo
suggestions / onboarding-parse degrade to mock/heuristic (no crash); only deck generation
(an unlinked route) surfaces an error. So a mis-ordered deploy degrades, it does not break.

### Step 4 — GitHub token (independent)
Revoke the exposed GitHub `gho_` personal-access token in **GitHub → Settings → Developer
settings → Personal access tokens**, delete it from any local git remote/credential store,
and issue a fresh scoped token. (Value intentionally not reproduced here.)

---

## After all steps → COMPLETE
- Migration 015 remote → authed designs server-backed.
- No AI secret in the browser bundle; all AI runs through the server proxy.
- No cross-tenant onboarding-asset finalization (JWT + ownership enforced).
- GitHub token rotated.

## Confirmed already in place (no action)
Migrations 011/012 (workspace escalation, profiles visibility); RLS on every app-written
table (`brands`, `assets`, `designs`, `guideline_presentations`).

## Non-blocking follow-ons (tracked, not deploy-gated)
- `cleanup-onboarding-scratch` service-role delete — confirm cron-only.
- `AdminPanel.tsx` direct `brands.delete()` — move into an admin service (admin+RLS-gated).
