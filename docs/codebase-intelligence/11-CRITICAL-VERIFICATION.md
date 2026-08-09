# 11 — Critical Verification (Adversarial Pass)

> Goal: **disprove** the highest-risk Phase-0 findings, not extend them. Every item below was
> independently re-reproduced from the current repository (`new-ui` @ `46ffb41`, verified
> 2026-08-09) — prior audit citations were treated as claims, not evidence.
> Status vocabulary: **CONFIRMED / DISPROVED / PARTIALLY CONFIRMED / CANNOT VERIFY**.
> Method: coordinator ran items 1, 2, 3, 11 directly; items 4–6, 7–9, 10+12 were each
> re-derived by an independent adversarial verifier instructed to refute, then the
> load-bearing corrections were re-checked by the coordinator in code.

---

## 1. Repository baseline — **PARTIALLY CONFIRMED (Phase-0 framing was imprecise)**

**Commands:** `git ls-remote origin`, `git for-each-ref`, `git merge-base --is-ancestor`,
`git rev-list --count`, `git rev-parse <b>^{tree}`.

**True SHAs (local ref = remote ref unless noted):**

| Branch | SHA | vs baseline `46ffb41` |
|---|---|---|
| `main` | `46ffb41fd1cd264c97772eaa794a78cc679891c9` | **identical** |
| `dev` | `46ffb41…` | **identical** |
| `new-ui` | `46ffb41…` | **identical (== baseline)** |
| `ui` | remote `origin/ui` = `3eee00e…`; **local `ui` = `ec9f548…`** (behind remote) | 0 ahead / 11 behind (remote), 0/42 (local) |
| `guideline` | `3eee00e27d1885c43e8c3b46dd733518c24dc38f` | 0 ahead / 11 behind |
| `phase-a-ui-migration` | `484e4490d674e942c22de99c4cec9341e40e3ba4` | 0 ahead / 94 behind |
| `x` | `origin/x` = `8dfce27…` | 0 ahead / 44 behind |

**Observed:**
- `main`, `dev`, `new-ui` are the **same tree** (`git rev-parse main^{tree} dev^{tree}
  new-ui^{tree} | sort -u` → 1 unique tree). VERIFIED.
- `ui`, `guideline`, `phase-a-ui-migration`, `x` point at **different, older SHAs** — so the
  branches are *not* all equal (this is the "divergence" a prior inspection saw) — **but every
  one is an ancestor of `46ffb41`** (`git merge-base --is-ancestor <sha> 46ffb41` → true for
  all; each is 0 commits ahead). They are fully-merged history, not divergent unmerged work.
- **Local/remote disagreement (new):** local `ui` (`ec9f548`) is *behind* `origin/ui`
  (`3eee00e`); `ec9f548` is an ancestor of `3eee00e`. No data risk, but the local `ui` ref is
  stale.

**Why the conclusion follows:** "0 ahead" (ancestor) means no branch carries a commit missing
from the baseline; "different SHA" means the Phase-0 sentence *"byte-identical to dev and main"*
is true **only for `new-ui`/`dev`/`main`**, and must not be read as "all six branches equal."

**Correction:** Phase-0 (00 §1–3) is right that the baseline is unambiguous and nothing is
unmerged, but should say **three branches are identical; `ui`/`guideline`/`phase-a`/`x` are
older ancestors, not peers.** No divergence in the "unmerged work" sense. **Could invalidate:**
a push to `origin` after this snapshot — re-run `git ls-remote origin`.

---

## 2. TypeScript gate — **CONFIRMED**

**Commands & observed:**
- `npm run typecheck` → runs `tsc --noEmit`, **exit 0**, zero output.
- Mechanism: the script uses the **root `tsconfig.json`**, which is a *solution* file —
  `"files": []` + `"references": [tsconfig.app.json, tsconfig.node.json]` (`tsconfig.json:2-6`).
  Bare `tsc --noEmit` does **not** build referenced projects (that requires `tsc -b`/`--build`);
  with `files: []` it therefore type-checks **zero files** and trivially passes.
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` → **324**.
- Error distribution: TS2769 ×132, TS2339 ×50, TS2345 ×30, TS2493 ×24, TS2353 ×23, TS2322 ×19,
  TS2741 ×13, TS2352 ×10, … (overload/assignability/missing-property — real type breaks, not
  just strictness noise). `tsconfig.json` also sets `strictNullChecks:false`, `noImplicitAny:false`.

**Why:** the passing script and the failing project use **different tsconfigs**; the shipped
gate checks nothing. Audit 09's "CI runs the same no-op" is a separate claim (CI config) folded
in from 09 — not re-run here, but the *local* no-op is CONFIRMED. **Could invalidate:** nothing
in-repo; this is deterministic.

---

## 3. Anonymous-onboarding data loss — **CONFIRMED**

**Traced actual functions (not filenames/comments):**
1. **Guest brand persistence:** `LocalBrandsService` (the DI-registered `BRANDS` service in guest
   mode, boot.ts guest path) writes to `private readonly storageKey = 'brandos:brands'`
   (`src/core/adapters/brands.local.ts:29`; "User-authored brands persist as full snapshots in
   `brandos:brands`" :100). A guest brand created via `brandStore.create` lands under this key.
2. **Sign-in handler ordering** (`src/features/auth/hooks/useAuth.ts`, `SIGNED_IN` branch):
   - `:292` `reconfigureForAuth(true)` (swaps BRANDS→Supabase)
   - `:293` `signIn(user)`
   - **`:296` `localStorage.removeItem('brandos:brands')`** ← synchronous wipe
   - `:305` `useBrandStore…loadAll()` (now reads Supabase — empty for a new user)
   - `:306` `syncToSupabase().catch(...)`
   - **`:307` `migrateLocalStorageToSupabase().catch(...)`**
3. **What the migration reads:** `migrateBrands` does `localStorage.getItem(LEGACY_KEYS.brands)`
   where `LEGACY_KEYS.brands = 'brandos:brands'` (`src/shared/utils/localStorage-migration.ts:13,46`).

**Why the conclusion follows:** JavaScript is single-threaded; the synchronous `removeItem` at
`:296` completes **before** `migrateLocalStorageToSupabase()` is even invoked at `:307`. By the
time `migrateBrands` reads `brandos:brands`, the key is gone → `if (!raw) return;` → the guest
brand is never uploaded. Order was confirmed from the executed statements, not comments.

**Scope / could invalidate:** the wipe lives **only** in the `SIGNED_IN` event branch. A returning
user whose session restores via `INITIAL_SESSION` does not hit it. The loss is specific to the
live anonymous→authenticated transition — which is exactly the at-risk moment. Also gated by the
one-time `MIGRATION_FLAG`: if already set, migration early-returns regardless (the brand is still
wiped). **Verdict stands: CONFIRMED, high-impact, on the anonymous-onboarding→first-login path.**

---

## 4. Brand persistence per field — **PARTIALLY CONFIRMED (Phase-0 over-broad)**

The blanket "v3 canonical fields are not persisted" is **too strong**: `colorSystem` and
`logoSystem` **do** round-trip for onboarding-created brands, because `mapFromDatabase`
(`brands.supabase.ts:166-187`) omits them, forcing `migrateBrandToCurrent` to re-derive them on
**every** read (gate `migrateSchema.ts:375`) from the `guidelines` JSONB + scalar columns. The
loss is real only where a writer sets a canonical field **without** updating its JSONB mirror.

| Field | Authed round-trip | Classification |
|---|---|---|
| name, primaryColor, logo/logo_assets, guidelines, strategy | YES (column and/or JSONB) | persisted |
| colorSystem, logoSystem | YES — reconstructed from `logo_assets` + `guidelines` | persisted-elsewhere (JSONB) |
| typography (weights, **uploaded font files**, scale) | **NO** — no whitelist branch, no `guidelines.typography` writer anywhere; only family names survive via `fonts` column | **actually-lost** |
| brandAssets | logo entries reconstructed; **non-logo entries lost** (`assets: []` read-back) | partial |
| neutrals / accentColor | onboarding mirrors into `guidelines.colorPalette`; **Setup does not** → Setup edits lost | persisted-elsewhere (onboarding) / lost (Setup) |

**Stale-mirror scenario — CONFIRMED, reproduced from code (coordinator re-verified):**
`buildColorSystem` reads **`brand.guidelines?.colorPalette` first**, falling back to
`brand.primaryColor` only when the mirror is absent (`migrateSchema.ts:112-125`). So: a brand
created by onboarding has `guidelines.colorPalette.primary` set (`SetUpScreen.tsx:205`); the user
changes primary color at `/b/:slug/setup` → `mockBrandToPatch.ts:51,57` sets `primaryColor` +
`colorSystem`, dispatched via `setup.tsx:39-42` → `brandStore.update`. Supabase writes the
`primary_color` column (`brands.supabase.ts:131`) but drops `colorSystem` and **Setup never
updates the `guidelines.colorPalette` mirror.** On read-back, `buildColorSystem` prefers the
**old** mirror hex, and consumers prefer `colorSystem` over `primaryColor`
(`mockBrandToPatch.ts:11-19`) → **the edit reverts immediately after save, no reload needed.**

Guest asymmetry: `LocalBrandsService.update` stores the full patch and migration preserves stored
canonical fields via `??` (`brands.local.ts:90-110`, `migrateSchema.ts:386-389`) — guests
round-trip everything. **Could invalidate:** a DB trigger rewriting `guidelines` (none in repo).

---

## 5. Guest vs authenticated persistence matrix — **CONFIRMED (+ new loss finding)**

`boot.ts:98/99/102` verbatim: DESIGN_STORAGE→Local, UPLOAD→Local, TEMPLATES→Local **even when
authed**. The "5 registered-but-unconsumed Supabase adapters" (ASSETS, COMMENTS, APPROVALS,
NOTIFICATIONS, ACTIVITY) is CONFIRMED at the DI level (zero `SERVICE_KEYS.<X>` consumers outside
`boot.ts`; only WORKSPACES has a consumer, `workspaceStore.ts:14`).

| Feature | Guest persist | Authed persist | DB-backed? | localStorage? | Cross-device? | Public-share-safe? |
|---|---|---|---|---|---|---|
| Brands | YES | YES (whitelist fields only; seed edits stay local) | YES (non-seed) | YES (guest + authed seed edits) | Partial | columns exist |
| Assets | YES (data-URL) | **records NO** (`assets:[]`), **bytes YES** (Storage, orphaned) | bytes only | YES | NO | NO |
| Designs | YES | YES but **localStorage only** | NO | YES | NO | **NO** (`/d/…` reads viewer's own localStorage) |
| Templates | YES | localStorage only | NO | YES | NO | NO |
| Uploads | YES | bytes→Storage; records dropped | Partial | YES | NO | NO |
| Decks | YES | **NO for DB brands** (`decks` not whitelisted → silently dropped) | NO | YES | NO | NO |
| Comments | localStorage store | localStorage store (adapter unconsumed) | NO | YES | NO | NO |
| Approvals | localStorage store | localStorage store (adapter unconsumed) | NO | YES | NO | NO |

**Two nuances Phase-0 missed:** (1) **activity IS DB-attempted** via a *non-DI* module
`shared/services/activityService.ts:55-70` (Supabase `activity_log` insert + localStorage
fallback) used by 8 features — "adapter unconsumed" ≠ "activity not DB-backed"; (2) asset **bytes**
reach Supabase Storage (`DamPage.tsx:20,192`) while the asset **record** is dropped by the brands
whitelist → the uploaded asset **disappears from the UI on the next state set** and the bucket
file is orphaned. **New loss finding:** authed **deck** edits on a DB-backed brand never persist
(`deckStore.ts:206-214` → whitelist drop). **Could invalidate:** server columns/triggers outside
`supabase/migrations/`.

---

## 6. Supabase brand field-loss — **PARTIALLY CONFIRMED (two Phase-0 "losses" DISPROVED)**

Inspected `SupabaseBrandsService` create/update/read (`brands.supabase.ts:118-187`) vs the Brand
model (`shared/types/brand.ts`). Classification after checking the **full** path incl. JSONB:

| Field/group | Verdict | Classification |
|---|---|---|
| `assets` (non-logo) | CONFIRMED dropped (`assets:[]` :183; live consumer DamPage) | **actually-lost** (bytes orphaned) |
| `typography` (files/weights/scale) | CONFIRMED dropped; no `guidelines.typography` writer | **actually-lost** |
| `decks`, `presentationThemes` | dropped, no mirror | **actually-lost (new, not in Phase-0)** |
| `neutrals`/`accentColor` | onboarding mirrors to `guidelines`; Setup edits lost | persisted-elsewhere / lost-on-Setup |
| `colorSystem`, `logoSystem` | reconstructed each read from JSONB + `logo_assets` | **persisted-elsewhere (Phase-0 "lost" DISPROVED)** |
| `typescale` | **no writer ever sends `patch.typescale`** (`setTypescale` persists fonts only, documented preview-only, `brandStore.ts:161-180`; absent from adapter + `mockBrandToPatch`) | **intentionally-ephemeral (Phase-0 "silently dropped = data loss" DISPROVED)** |
| `schemaVersion` | never stored; migration re-runs per read by design | intentionally-ephemeral |
| `brand_kit_designs` column (migration 010) | zero `src/` consumers | legacy-only/unused |

**`.update({})` PostgREST behavior (empty/whitelisted-out payload): CANNOT VERIFY** — needs
runtime (400 vs no-op). Bounded either way: errors are caught and toasted (`setup.tsx:41-44`) or
warned-and-continue (`SetUpScreen.tsx:530-537`); in neither branch do dropped fields persist.

---

## 7. RLS privilege escalation (self-insert as workspace owner) — **CONFIRMED, CRITICAL (Phase-0 if anything understated it)**

**Exact policy** (`supabase/migrations/20260412000000_001_workspaces_and_rls.sql:548-555`):
```sql
CREATE POLICY "wm_insert_admin" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK ( public.is_workspace_member(workspace_id, 'admin')
               OR (user_id = auth.uid() AND role = 'owner') );
```
Malicious `INSERT (workspace_id=VICTIM, user_id=SELF, role='owner')` — disjunct 2 is
`auth.uid()=self` **AND** `role='owner'`, both attacker-controlled → **WITH CHECK passes.**

Adversarial checks (all answered against the migration):
- **Unique/trigger block?** `UNIQUE(workspace_id, user_id)` (:276) only blocks a duplicate pair;
  the attacker isn't yet a member → no conflict. No validating BEFORE-INSERT trigger exists.
- **Need SELECT on the workspace?** No — INSERT doesn't require SELECT. The victim `workspace_id`
  UUID is even **leakable to `anon`**: `brands_select_public` (:590-593) exposes public brand rows
  whose `workspace_id` column carries the UUID.
- **Does the planted row become authoritative?** Yes. `is_workspace_member` (:346-362) is
  **SECURITY DEFINER**, reads `workspace_members` bypassing RLS, and uses `role <= _min_role` over
  enum `workspace_role {owner<admin<editor<exporter<viewer}` (:237-243) → `owner <= admin` = TRUE.
  Cascades to `workspaces_update_admin`, member add/modify, `assets_*`/`brands_*` via
  `is_brand_member` workspace fallback (:397-404), and subscription/invoice reads (003:77-92).
- **Superseded later?** No — `wm_insert_admin` appears only in migration 001; migration 004 only
  ORs in a permissive super-admin policy (can't close a hole). `wm_delete_admin` (:562-568) even
  **forbids deleting `role='owner'` rows**, so the planted owner row is sticky.

Coordinator re-check: `config.toml` carries only `project_id`; no later migration touches this
policy (grep). **SQL test (do NOT run):** as authed user B with harvested `W` →
`INSERT INTO workspace_members(workspace_id,user_id,role) VALUES('W',auth.uid(),'owner');` then
`SELECT is_workspace_member('W','admin');` → `true`. **Severity: CRITICAL cross-tenant takeover.**
**Could invalidate:** a BEFORE-INSERT trigger/CHECK not in `supabase/migrations/` (none found).

---

## 8. Profile / email exposure — **CONFIRMED, but MEDIUM–HIGH (authenticated-only, NOT anonymous)**

- `profiles.email` is a real column: `email TEXT NOT NULL`
  (`20260412000000_001_workspaces_and_rls.sql:15`; populated by the signup trigger :47-50).
- Policies on `profiles`: `profiles_select_own` (id=auth.uid()), **`profiles_select_by_member
  USING (true)` TO `authenticated` (:29-32)**, `profiles_update_own`; migration 004 adds only an
  additive admin policy. Permissive policies OR together → `USING(true)` dominates.
- **Therefore:** any **authenticated** user can `SELECT email,full_name,avatar_url` for the entire
  `profiles` table — a whole-user-base email harvest. **But** the policy is `TO authenticated`;
  **anon cannot read it**, and `auth.users.email` keeps its own protection.

**Correction to Phase-0:** the finding is real, but it is **authenticated-only PII exposure**, not
a public/anonymous leak. Severity **MEDIUM–HIGH**, not CRITICAL. **Could invalidate:** a later
migration dropping `profiles_select_by_member` (none does).

---

## 9. Service-role Edge Functions — **PARTIALLY CONFIRMED (Phase-0 "anonymous, no-auth" framing likely FALSE)**

Full inventory (`supabase/functions/*`):

| Function | Service role? | In-code caller auth | Verdict |
|---|---|---|---|
| `finalize-onboarding-assets` | Yes | **None** (trusts client `brandId`/`sessionId`) | gap (IDOR) |
| `cleanup-onboarding-scratch` | Yes | None, but no user input (cron purge >24h) | low (Phase-0 missed it) |
| `admin-invite` | Yes | getUser + admin check | OK |
| `upload-ai-reference` | Yes | getUser | OK |
| `check-plan-limit` | Yes | getUser | OK |
| `stripe-webhook` | Yes | Stripe signature | OK |
| `ai-generate-image`, `ai-apply-command`, `fetch-url-preview`, `generate-description` | No service role | gateway JWT | n/a |

**Key correction:** the audit's "service-role function reachable by an *anonymous* caller" is
**not established and most likely false.** `supabase/config.toml` contains **only `project_id`**
— no `[functions]` block, no `verify_jwt=false` anywhere in the repo (grep, coordinator-verified).
Supabase's deploy default is `verify_jwt=true`, so the **gateway rejects a JWT-less request before
it reaches the function body.** The accurate characterization of `finalize-onboarding-assets` is
an **authenticated cross-tenant storage IDOR** (any valid JWT passes the gateway; the function
then does a service-role storage move with no ownership check on the supplied `brandId`/
`sessionId`, bypassing the `brand_assets_*` storage policies) — **severity MEDIUM**, not the
implied CRITICAL. The audit did **not** over-generalize to all functions (it singled out
`finalize`, which is correct). **CANNOT VERIFY** the deployed `verify_jwt` flag from the repo; if
it was deployed `--no-verify-jwt`, the anonymous claim would upgrade to CONFIRMED/HIGH.

---

## 10. Client-side secret exposure — **PARTIALLY CONFIRMED (mechanism real; deployed exposure CANNOT VERIFY; OpenAI + service_role DISPROVED)**

**Vite mechanism (checked, not assumed):** `vite.config.ts` has no `envPrefix`, `define`, or
`loadEnv` → Vite default: only `VITE_`-prefixed vars are inlined into `import.meta.env.*`.

- **`VITE_ANTHROPIC_API_KEY` — mechanism CONFIRMED.** Six browser modules read it and call
  `api.anthropic.com` directly, all reachable from mounted routes:
  `onboarding-v4/services/parseDescription.ts:45` (the live `/onboard-brand`),
  `shared/services/aiService.ts:25`, `brand-consistency/providers/anthropicProvider.ts:17`,
  `features/ai/v5/providers/claudeProvider.ts:48` (app-global `BrandAssistantProvider`, uses
  `new Anthropic({apiKey, dangerouslyAllowBrowser:true})`),
  `shared/presentation/v2/ai/generateDeckFromScript.ts:459`,
  `logo-maker/components/AILogoSuggestions.tsx:23`. None are tests/edge-fns/dead code.
- **Adversarial caveat (important):** the key is **not present in this working copy** — `.env`
  (gitignored) defines only `VITE_UNSPLASH_ACCESS_KEY` + `VITE_DEV_BYPASS_AUTH`; `.env.example:7`
  documents `VITE_ANTHROPIC_API_KEY` with a "server-side in prod" comment. So a production bundle
  contains the raw key **iff the deploy pipeline (e.g. Cloudflare Pages env) defines that var at
  build time** — **CANNOT VERIFY** from the repo.
- **OpenAI — DISPROVED:** no `VITE_OPENAI*` anywhere; "openai" in `src/` is only a UI badge icon.
- **Supabase `service_role` — DISPROVED for client:** never in `src/`/`.env`/`.env.example`;
  `integrations/supabase/client.ts` embeds the **anon** JWT (`"role":"anon"`), expected + RLS-bound.
- Other `VITE_` vendor keys (Unsplash/Pexels/Pixabay/Giphy/Gemini) are client-access-tier or dead;
  quota risk only.

**Correction:** Phase-0's "keys ship in the client bundle" is a correct *mechanism + live
consumers* claim, but must be stated conditionally: **exposed only if the build env sets
`VITE_ANTHROPIC_API_KEY`** — which the repo cannot confirm. The `dangerouslyAllowBrowser: true`
flag makes the intent explicit and is worth calling out.

---

## 11. Production migration state — **CANNOT VERIFY LIVE (Phase-0 inference must be softened)**

**Separated states (repo-side, VERIFIED):**
- **Repository migration files:** 001–010 all present, incl. `008_ai_rate_limits`,
  `009_templates_phase_4` (defines `templates`, `template_categories`), `010_brand_kit_premium`
  (`profiles.is_admin`, `is_premium`, `required_plan`, `brand_kit_exports`).
- **Generated types (`src/integrations/supabase/types.ts`):** contain **none** of
  `ai_rate_limits`, `templates`, `template_categories`, `brand_kit_exports`; the only `is_admin`
  hit (line 986) is the **function** `is_admin_or_above`, not the `profiles.is_admin` column. So
  008–010's objects are absent from the generated types.
- **Known deployment history (repo testimony):** migration 009's own header says it ships a
  `LocalTemplatesService` dev default and "the production Supabase-backed adapter will swap … once
  the user runs `npx supabase db push` interactively." That is a *comment*, not proof.
- **Live production state: CANNOT VERIFY.** No live query was run (the supabase CLI 2.84.2 is
  installed and the project is linked, but a `migration list`/`db diff` may prompt for a DB
  password; GNU `timeout` is unavailable on this macOS shell to bound a possible hang, and per the
  audit's cost/READ-ONLY discipline the coordinator did not risk an interactive stall).

**Correction:** Phase-0 said 008–010 "were likely never pushed." Stale generated types are
**consistent with** that, but equally consistent with **types simply never being regenerated after
a push.** The honest verdict is **CANNOT VERIFY LIVE** — the two hypotheses are not distinguishable
from the repo.

**Exact commands the owner should run** (any one is decisive):
```bash
supabase migration list --linked          # compares local vs remote migration history
# or, direct SQL against prod (read-only):
select to_regclass('public.templates'), to_regclass('public.template_categories'),
       to_regclass('public.ai_rate_limits'), to_regclass('public.brand_kit_exports');
select column_name from information_schema.columns
 where table_schema='public' and table_name='profiles' and column_name='is_admin';
```
A null/empty result set for any object = that migration is unapplied in production.

---

## 12. Current live product vs stale code — **CONFIRMED**

- **Onboarding:** `/onboard-brand` (`pages/onboard-brand/index.tsx` → `onboarding-v4` screens) is
  the **single live flow**; all nine legacy files (`pages/onboarding/*`, `onboarding-brand`,
  `onboarding-v3/*`, `onboarding-v4/*`) are `<Navigate replace>` shims (re-read, VERIFIED). Naming
  trap survived: URL `/onboarding-v4` is a shim, but the **folder** `features/onboarding-v4/` is
  the live implementation.
- **Post-login:** `AuthModal` → `/dashboard`; brand entry via `getBrandHomeUrl` with default pref
  `'studio'` → `/b/:slug/setup`. VERIFIED.
- **Recency vs labels:** `git log --since=2026-07-01` concentrates in `onboarding-v4`, `editor`,
  `setup`, `auth`, `guideline`, `brand-vision/`; surfaces labeled LEGACY (`brand-kit-alt`,
  `domains/landing`, classic `guidelines`, `logo-maker`) got ≤1-file touches. No misclassification.
- **Classic `/a/:slug`:** live **fallback**, not dead — `StudioToClassicFallback` (App.tsx:235-241)
  rewrites unmigrated `/b` paths to `/a`; Classic routes stay mounted with real components. VERIFIED.

Addendum: `brand-vision/` (Python classifier, commit `0c06a23`) is a CURRENT surface; already
catalogued in 00/01, so no correction needed.

---

## Audit Corrections

**RETAIN (survived unchanged):**
- Baseline is unambiguous, nothing unmerged (00) — with the §1 precision note.
- No-op `typecheck` + 324 real errors (05/09) — CONFIRMED verbatim.
- Anonymous-onboarding wipe ordering, `useAuth.ts:296` before `:307` (04/06) — CONFIRMED.
- Stale-mirror color revert on Setup edit (05) — CONFIRMED, reproduced.
- localStorage-when-authed for designs/templates/uploads; 5 unconsumed Supabase adapters (03/04/05).
- RLS self-insert-owner escalation (06/09 R-05) — CONFIRMED **CRITICAL**, understated if anything.
- Surface classifications & onboarding "1 live + shims" (01/02) — CONFIRMED.

**SOFTEN:**
- **Baseline "byte-identical to dev and main"** → applies to `new-ui`/`dev`/`main` only;
  `ui`/`guideline`/`phase-a`/`x` are older ancestors, not equal peers; local `ui` ref is stale.
- **"Migrations 008–010 were never pushed to prod"** → **CANNOT VERIFY LIVE**; stale types are
  equally explained by types-not-regenerated. Give the owner the decisive query (§11).
- **Email exposure "all emails readable"** → true but **authenticated-only**, MEDIUM–HIGH not
  CRITICAL; anon cannot read `profiles`.
- **Anthropic keys "ship in the client bundle"** → mechanism + 6 live consumers CONFIRMED, but
  **conditional on the deploy build-env setting `VITE_ANTHROPIC_API_KEY`**; not in the repo's
  `.env`. State it conditionally.

**CORRECT:**
- **`finalize-onboarding-assets` "no-auth service-role reachable anonymously"** → **authenticated
  cross-tenant IDOR** (default `verify_jwt=true` blocks anon); severity **MEDIUM**, not CRITICAL.
  Deployed `verify_jwt` flag CANNOT VERIFY.
- **`typescale` listed among silently-dropped/data-loss fields** → **intentionally-ephemeral**
  (no writer sends it; preview-only). Remove from the data-loss list.
- **`colorSystem`/`logoSystem` implied lost** → **persisted-elsewhere** via `guidelines` JSONB
  reconstruction for onboarding-created brands. The loss is writer-specific (Setup), not blanket.

**REMOVE / DEMOTE:**
- Drop the implication that OpenAI or Supabase `service_role` keys reach the browser — **DISPROVED**
  (never client-side).
- Demote the generalization from `finalize` to "service-role edge functions" as a class — the
  other five validate the caller; only `finalize` (auth gap) + `cleanup-scratch` (low, no input).

**ADD (found during verification, not in Phase-0):**
- Authed **deck** edits on a DB-backed brand never persist (`decks` not whitelisted).
- Authed **asset** upload disappears from the UI on the next state set (record dropped, bucket byte
  orphaned) — a concrete UX symptom of the whitelist drop.
- Public-brand rows leak their `workspace_id` UUID to `anon`, supplying the input the §7 escalation
  needs.

---

## Verified P0/P1 Baseline

Only findings that survived adversarial verification. (No solutions — Phase 1 not started.)

**P0 — correctness / security / data (CONFIRMED):**
1. **RLS cross-tenant takeover** — any authenticated user can self-insert as `owner` of any
   workspace; workspace UUID is anon-leakable via public brands; planted owner row is
   undeletable. `…_001_workspaces_and_rls.sql:548-555`. **CRITICAL.**
2. **No type gate anywhere** — `npm run typecheck` checks zero files; 324 real errors; strict flags
   off. The enabler of the silent-drift class below.
3. **Anonymous-onboarding data loss** — `useAuth.ts:296` wipes `brandos:brands` before the
   migration reads it (`localStorage-migration.ts:46`). Guest brand destroyed at first sign-in.
4. **Authenticated persistence silently narrower than guest** — brands `update` whitelist drops
   `typography` (incl. uploaded font files), non-logo `assets`, and `decks`; DAM records read back
   as `[]` (byte orphaned). `brands.supabase.ts:126-187`. **Data-loss, VERIFIED.**
5. **Stale-mirror revert** — Setup color edits revert on read because `buildColorSystem` prefers
   the un-updated `guidelines.colorPalette` mirror. `migrateSchema.ts:112-125`.
6. **Designs/templates/uploads/decks localStorage-only when authed** → `/d/…` + bento public
   shares resolve only in the creator's browser. `boot.ts:98,102`.

**P1 — major debt / security-sensitive (CONFIRMED, calibrated severity):**
7. **Authenticated whole-table email harvest** — `profiles_select_by_member USING(true)` exposes
   `profiles.email` to any logged-in user (MEDIUM–HIGH; not anonymous). `…_001…:29-32`.
8. **`finalize-onboarding-assets` authenticated storage IDOR** — service-role, no ownership check
   (MEDIUM; anon blocked by default gateway JWT). Orphan (live onboarding never calls it).
9. **Anthropic key client-exposure risk** — 6 live browser consumers + `dangerouslyAllowBrowser`;
   realized **iff** the deploy sets `VITE_ANTHROPIC_API_KEY` (CANNOT VERIFY deployed state).
10. **Layer architecture unenforced** (from 09, not re-run here) — 168 cross-feature imports, 21
    shared→features inversions, no boundary tooling. Retained pending its own verification.

**Explicitly NOT in the verified baseline (verification changed the status):**
- "Migrations 008–010 missing from prod" → CANNOT VERIFY LIVE (owner must run §11 query).
- "OpenAI / service_role keys in browser" → DISPROVED.
- "`typescale` data loss" → DISPROVED (ephemeral).
- "`colorSystem`/`logoSystem` not persisted" → DISPROVED (JSONB round-trip; loss is Setter-specific).
- "Service-role edge functions (as a class) lack auth" → DISPROVED (only `finalize` + low-impact
  `cleanup-scratch`).

---

*Adversarial pass complete. No application code was modified, refactored, or fixed. Phase 1 not
started.*
