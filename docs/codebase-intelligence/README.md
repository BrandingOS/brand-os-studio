# Codebase Intelligence — Phase 0 Audit

Read/trace/map/verify only. No refactors, no deletions, no redesign. Produced 2026-08-08
against baseline `new-ui` @ `46ffb41` (== `dev` == `main`; see 00).

Every claim in these documents is tagged **VERIFIED** (seen in code, cited), **INFERRED**
(with evidence), **UNKNOWN**, or **CONFLICTING EVIDENCE**. Where documentation contradicts
implementation, implementation wins for describing current behavior and the contradiction
is recorded.

## Audit index & status

- [x] [00 — Repository Truth](00-REPOSITORY-TRUTH.md) — baseline branch, merged/unmerged work, packages, timeline
- [x] [01 — Product Surface](01-PRODUCT-SURFACE.md) — user-reachable surfaces + currency classification
- [x] [02 — Routes](02-ROUTES.md) — full route map, aliases, redirects, generations (coordinator-corrected §1.2: onboarding is 1 live impl + 4 redirect shims)
- [x] [03 — Feature Inventory](03-FEATURE-INVENTORY.md) — functionality-first inventory with generation trees
- [x] [04 — Data Flows](04-DATA-FLOWS.md) — end-to-end traces of key user actions
- [x] [05 — Source of Truth](05-SOURCE-OF-TRUTH.md) — canonical vs persisted vs derived, divergence risk
- [x] [06 — Database & Auth](06-DATABASE-AUTH.md) — schema, RLS, auth lifecycle, ER diagram
- [x] [07 — Duplication](07-DUPLICATION.md) — semantic duplicate families
- [x] [08 — Legacy & Dead Code](08-LEGACY-DEAD-CODE.md) — multi-signal dead-code classification (corrections to 03 applied: single EditorWorkspace; blocks/analytics/approvals/portal are nav-reachable)
- [x] [09 — Architecture Risks](09-ARCHITECTURE-RISKS.md) — ranked P0–P3 findings (25 findings: 7×P0, 8×P1, 7×P2, 3×P3)
- [x] [10 — Current System Map](10-CURRENT-SYSTEM-MAP.md) — consolidated real-architecture diagrams

## Decisions Needed

(unresolved questions requiring product/technical decisions — appended as audits run)

1. **Branch strategy**: `dev` == `main` == `new-ui`; CLAUDE.md's dev/main/x conventions are
   no longer operative. Which single branch is the go-forward trunk? (00 §7)
2. **GitHub token in git remote URL** should be rotated and removed from the remote config. (00 §8)
3. **`/dashboard/admin/brands` + `/dashboard/admin/analytics`**: auth-only, no role gate found, link-dead — superseded by role-gated `/admin/*`. Keep or remove? (01, 02 §6.1)
4. **`?dev=1` enables `/_dev/features` in production builds**; `/_dev/editor` and `/_dev/chronicle` appear un-gated. Intentional? (02 §6.5)
5. **`/setup` (mockBrand prototype) is linked from the live `WorkspaceShell` tab nav** but operates on mock data; `FirstBrandRedirect` looks like the intended replacement but was never mounted. Product intent UNKNOWN. (02 §6.3)
6. **Which deck engine wins?** 4 overlapping deck/presentation engines identified (01 — pitch-deck, case-study-deck, logo-presentation, brand-guides deck). Requires product decision before any consolidation. (01)
7. **In-app links still point at redirect shims** (`/onboarding`, `/onboarding-brand`) instead of `/onboard-brand`; worst legacy chain is 3 client redirects. Update links or keep shims? (02 §1.2, §2)
8. **Dev-bypass Supabase login** (`10218f1`, 2026-07-31) — shipping risk if enabled in prod builds. Verify gating. (01, → Audit 6)
9. **Anonymous-onboarding data loss (coordinator-verified)**: `useAuth.ts:296` wipes `brandos:brands` before `migrateLocalStorageToSupabase()` (useAuth.ts:307) reads that key — brands created before sign-in are destroyed. Fix ordering, or decide anonymous onboarding isn't supported. (04)
10. **Supabase brands whitelist silently drops `assets`/`neutrals`/`typography`/`typescale` on update** — authenticated persistence is narrower than guest localStorage; decide: widen schema/adapter or restrict the Brand model. (04, 05)
11. **Designs, templates, uploads, decks, comments, approvals persist to localStorage even when authenticated** (boot.ts:98,102); `/d/` and bento share links only work in the creator's browser. Was local-when-authed deliberate? (03, 04, 05)
12. **Browser-side Anthropic API key exposure is widening**, now including the newest code (`onboarding-v4/services/parseDescription.ts:12,45`), despite the "proxy migration MUST complete before launch" note. (03, 04)
13. **`npm run typecheck` verifies nothing** (solution tsconfig, `files: []`, exits 0); real app project has **324 type errors** (coordinator-reproduced 2026-08-08). Decide: fix the script + burn down errors, or accept. (05)
14. **Two independent admin-rights truths**: `user_roles.role` gates `/admin` vs `profiles.is_admin` gates the templates queue — no sync. Which one survives? (05)
15. **brand-vision (Python, localhost:8300) is a dev-machine dependency** of live onboarding with silent fallback; no production deployment story found. (03, 04)
16. **5 orphaned Supabase adapter registrations + 4 orphaned edge functions + one-way migration black hole** (migration writes tables nothing reads). Delete or wire up? (03, 04, 05)
17. **RLS privilege escalation (coordinator-verified)**: `wm_insert_admin` allows any authenticated user to insert themselves as **owner** of any workspace (`20260412000000_001_workspaces_and_rls.sql:548-555`); `profiles_select_by_member` is `USING (true)` (:29-32) exposing all emails; era-1 demo brand remains UPDATE-able by all users. Must fix before launch. (06)
18. **`finalize-onboarding-assets` Edge Function**: service-role key, open CORS, zero auth/ownership checks (coordinator-verified) — but also an orphan (live onboarding never calls it). Delete or lock down; verify whether it is deployed in prod. (06, 08)
19. **Generated DB types suggest migrations 008–010 were never pushed to live** (templates, `profiles.is_admin`, exports missing from types) — if so, the admin templates queue is broken for everyone, and `adminService`'s `early_access.status` writes would fail. Live state UNVERIFIABLE from repo — needs a prod check. (06)
20. **Write-only tables**: `localStorage-migration.ts` INSERTs into `comments`/`approvals`/`notifications` on every guest→user sign-in, but no runtime code reads them back. Keep-or-kill decision. (06, 08)
21. **Which color engine survives**: `shared/color` (13 importers, doc-blessed) vs `lib/color-engine` (19 importers, APCA, undocumented) + ~15 hand-rolled contrast/luminance implementations using 3 different formulas (some numerically wrong). (07)
22. **Two slug dialects**: brand slugs underscore-style vs everything else hyphen-style, 9 implementations; `isValidSlug` rejects half the repo's own output. Is the underscore dialect load-bearing in Supabase/URLs? (07)
23. **`useBrandBySlug` (30 consumers, older) vs `useBrandFromSlug` (8, newer)** — latent stale-render divergence; whether the older hook's `setCurrent` side effect is depended on is UNKNOWN. (07)
24. **CLAUDE.md is materially stale** (~2026-05-11 snapshot): wrong redirect targets, nonexistent "migrated set", missing onboarding-v4/brand-vision/setup, "mock-only AI generation" is actually wired to real vendors (pollinations/OpenAI/Fal, 2026-05-18). Needs a rewrite after Phase 0. (00 §7, 01, 02)

## PHASE-0-SUMMARY

### Top 10 verified problems

1. **No type gate exists anywhere** — `npm run typecheck` AND the CI "Type check" step run
   `tsc --noEmit` against a solution tsconfig with `files: []` (checks nothing, exits 0);
   the app project has **324 real type errors**; `strictNullChecks`/`noImplicitAny` off.
   This is the enabler of most drift below. (05, 09 R-07; coordinator-reproduced)
2. **Authenticated persistence silently loses data**: `SupabaseBrandsService.update`
   whitelists 13 columns and drops `assets`/`neutrals`/`typography`/`typescale`;
   `mapFromDatabase` hardcodes `assets: []`. The de-facto rich brand is the
   `brands.guidelines` JSONB, re-derived into "canonical" v3 shape on every load, with
   verified stale-mirror loops (e.g. Setup's `primary_color` edit resurrects old colors).
   (04, 05, 09 R-01)
3. **Anonymous-onboarding wipe bug**: `useAuth.ts:296` deletes `brandos:brands` before
   `migrateLocalStorageToSupabase()` (`:307`) reads that exact key — brands created before
   sign-in are destroyed. (04, 06, 09 R-03; coordinator-verified)
4. **Designs/templates/uploads/decks/comments/approvals are localStorage-only even when
   authenticated** (`boot.ts:98,102`); `/d/…` and bento public share links only work in
   the creator's browser; community-template submission writes to a queue that may not
   exist in prod. (03, 04, 05, 09 R-02)
5. **Anthropic API keys ship in the client bundle from 6 call sites**, including the
   newest code (`onboarding-v4/services/parseDescription.ts`) — the "proxy migration MUST
   complete before launch" note is being actively regressed. (03, 04, 07, 09 R-04)
6. **RLS holes**: any authenticated user can insert themselves as **owner** of any
   workspace (`wm_insert_admin`); all profiles/emails readable by any authed user
   (`USING (true)`); era-1 demo brand writable by all; `onboarding-scratch` policies have
   no ownership predicate; plus a service-role Edge Function (`finalize-onboarding-assets`)
   with zero auth. (06, 09 R-05/R-06; coordinator-verified)
7. **The layer architecture is fiction**: 168 cross-feature import statements (41 edges),
   21 shared/→features inversions, core service contracts importing feature types, zero
   boundary tooling. `shared/` is a 46.9k-LOC dumping ground containing whole features.
   (09 R-08+)
8. **Migrations are not a faithful history**: era-1 files target a *previous* Supabase
   project (2 contain invalid SQL); generated types indicate migrations 008–010
   (templates, `profiles.is_admin`, exports) were **never pushed to live** — meaning the
   admin templates queue is likely broken for everyone and `adminService`'s
   `early_access.status` writes would fail. (06)
9. **Two disjoint admin-permission systems**: `user_roles.role` (gates `/admin`, ~18 RLS
   policies) vs `profiles.is_admin` (gates templates queue; **no writer anywhere**). Old
   `/dashboard/admin/*` pages (untouched since 2025-08) are reachable by any authed user.
   (05, 06, 08)
10. **Massive semantic duplication with divergent behavior**: 9 slug implementations in 2
    incompatible dialects; ~15 contrast/luminance implementations across 3 formulas (some
    numerically wrong); 3 color engines; 3+ "canonical" upload pickers; 2 brand-read hooks
    (30 vs 8 consumers) with different staleness semantics; 264 hard-coded `/b/${…}` URL
    templates. (07)

### Top 10 unknowns requiring product/technical decisions

1. **Live production DB state** — unverifiable from repo. Are migrations 008–010 applied?
   Are the 4 orphan Edge Functions deployed? (06) *Needs one `supabase db diff`/dashboard
   check.*
2. **Go-forward trunk branch** — `dev` == `main` == `new-ui`; documented conventions are
   inoperative. (00)
3. **Which deck engine wins** — 4 engines, all frozen, no winner in code; blocks every
   deck/`shared/editor`-adjacent consolidation. (03, 07, 08)
4. **brand-vision production story** — live onboarding depends on a local Python service
   at `localhost:8300` with silent fallback. Deploy it, or cut it? (03, 04)
5. **Was localStorage-when-authenticated deliberate** (a staged rollout paused mid-flight)
   or an oversight? Determines whether the fix is "flip the DI switch + migrate" or a
   larger persistence project. (04, 05)
6. **Which admin truth survives** — `user_roles` vs `profiles.is_admin`. (05, 06)
7. **Which color engine survives** — `shared/color` (13 importers, doc-blessed) vs
   `lib/color-engine` (19 importers, APCA, undocumented). (07)
8. **Is the underscore brand-slug dialect load-bearing** in existing Supabase rows/URLs?
   Determines slug consolidation strategy. (07)
9. **Fate of routed-but-frozen features** — marketplace, blocks, brand-portal, analytics,
   approvals, mockup-studio, brand-board: keep, finish, or retire? UNKNOWN — requires
   product decision. (03, 08)
10. **Anonymous onboarding intent** — it exits into a login wall and its output is wiped
    on sign-in; `/claim` covers only tool sessions. Support it end-to-end or gate it?
    (04)

### Likely deletion opportunities (evidence in 08; DO NOT delete yet)

- CONFIRMED DEAD: `src/domains/dashboard` (contains only `.DS_Store`), `src/core/modules/`
  (zero importers), `FirstBrandRedirect`, `useRealtimeComments`, `useDataSync`, the 4 dead
  App.tsx lazy imports + their exclusive chains (incl. the entire `features/dashboard/v5/`
  — but NOT `DashboardLayout`/`DashboardNavbar`, which are live for `/settings` etc.).
- HIGH-CONFIDENCE: `/onboarding-v3/*` shims + scratch backend (migration 007, 2 edge fns);
  `generate-description` + `fetch-url-preview` edge fns; `features/templates/v5/` (one
  never-mounted file); stale `/dashboard/admin/*` pages (superseded by `/admin`).
- Hygiene: ~30 root-level QA screenshots; git-ignore-or-archive decisions for `Brands/`,
  `remotion/`; one-off root docs.
- NOT deletable despite appearances: `src/domains/landing` (renders the live `/` page),
  `brand-kit-alt` (load-bearing in Studio settings), `shared/editor` (23 importers incl.
  Chronicle), all 4 deck engines (pending product decision).

### Areas too risky to touch yet

1. **`brands.guidelines` JSONB + `migrateBrandToCurrent`** — the de-facto data spine;
   changing it without a schema-versioning plan risks every existing brand. (05)
2. **`shared/editor` (frozen deck engine) + `shared/services/export/vectorize/*`** —
   23 importers, tagged stable, load-bearing for 4 surfaces incl. current Chronicle. (03, 08)
3. **`features/brandkit` domain layer** — 45 importers across both UI generations, with
   upward imports into `brand-kit-alt`; untangling needs the dependency work in 09 first.
4. **Auth/sessionStore ordering** — the documented race conditions are real (04 verified
   the atomicity/ordering invariants); touch only with the wipe-bug fix and tests.
5. **RLS policy rewrites** — must be fixed, but against the *live* schema (which the repo
   provably does not fully describe); fix after unknown #1 is resolved.

### Recommended order for the next phase

1. **Verify live prod state** (unknown #1) — one session with Supabase dashboard/CLI
   read-only: applied migrations, deployed functions, row counts. Everything else
   sequences off this.
2. **Stop-the-bleeding P0s, no architecture required**: rotate the leaked GitHub token;
   fix the `:296` wipe ordering; RLS policy patch set; delete/lock the no-auth edge fn;
   real `typecheck` script + CI gate (report-only first).
3. **Decide the 6 product forks** (deck engine, admin truth, color engine, frozen-feature
   fates, anonymous onboarding, brand-vision deploy) — each is a small decision doc, not
   code.
4. **Persistence unification design** (fix #2/#4 together): one write path for Brand
   (kill the whitelist or the v3 fields), designs→Supabase, migration for existing
   localStorage users. This is the largest design effort and depends on steps 1–3.
5. **Boundary + duplication burn-down** (09/07 lists) — only after 4 is designed, so
   consolidation targets the surviving generation of each family.
6. **Dead-code removal** (08 CONFIRMED/HIGH-CONFIDENCE tiers) — cheap, do alongside 5.
7. **Rewrite CLAUDE.md** from these audits once 3–4 are decided.

**Phase 0 is complete. No code was refactored, deleted, moved, or fixed. Awaiting review.**
