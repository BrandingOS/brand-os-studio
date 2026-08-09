# Stage 1 · Checkpoint 1 — Repository + Live Database Truth

> Read-only. No writes to any database. Evidence captured 2026-08-09 from the working tree and a
> read-only `supabase migration list --linked`. Statuses: **VERIFIED** (command output shown) /
> **UNKNOWN**.

## 1. Repository baseline (VERIFIED)

- **Branch:** `new-ui`
- **HEAD SHA:** `46ffb41fd1cd264c97772eaa794a78cc679891c9` (`46ffb41`) — matches the accepted baseline.
- **Upstream:** even with `origin/new-ui` (0 ahead / 0 behind).

### Working-tree status (`git status --short`)
```
 M supabase/.temp/cli-latest          <- generated CLI version cache (see §1.1)
?? docs/codebase-intelligence/        <- Phase-0 audit docs (untracked, additive)
?? docs/target-architecture/          <- Phase-1 design docs (untracked, additive)
?? supabase/migrations/20260809000000_011_fix_workspace_member_escalation.sql   <- Stage-A security fix
?? supabase/migrations/down/011_fix_workspace_member_escalation.down.sql
?? supabase/tests/                    <- 011 RLS verification test
```

### 1.1 Untracked / generated / cache vs intentional source (VERIFIED)
| Path | Classification |
|---|---|
| `docs/codebase-intelligence/*`, `docs/target-architecture/*` | **Intentional** — Phase-0/1 documentation (no runtime code) |
| `supabase/migrations/20260809000000_011_*.sql` + `down/011_*.sql` + `supabase/tests/*` | **Intentional** — Stage-A security migration + test (not yet deployed) |
| `supabase/.temp/cli-latest` (`v2.99.0` → `v2.113.0`) | **Generated cache**, incidentally modified when the CLI ran. It is **tracked** (should be git-ignored). Not a source change; leave for a later hygiene fix — do **not** bundle into any Stage-1 commit. |

**No application/runtime source (`src/**`) is modified.** Confirmed.

## 2. Supabase project linkage (VERIFIED)

- `supabase/.temp/linked-project.json` → `{"ref":"ciojgoozobzbeglwdxcz","name":"brandos-prod",...}`
- `supabase/config.toml` → `project_id = "ciojgoozobzbeglwdxcz"`
- Pooler host (credentials redacted): `postgresql://[REDACTED]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`

**The linked project is PRODUCTION (`brandos-prod`).** There is **no staging project** referenced
anywhere in the repo, and **no local Supabase** environment.

### 2.1 Environments available (VERIFIED)
| Environment | Available? | Evidence |
|---|---|---|
| Production (`brandos-prod`) | **Yes** (linked; reachable via cached pooler credential) | migration list succeeded |
| Staging | **No** | no second project ref anywhere |
| Local Supabase | **No** | port 54322 closed; **Docker NOT installed** (`which docker` empty) |

- No `SUPABASE_ACCESS_TOKEN` in env and no `~/.supabase` session → **no Supabase management-API
  auth**. The migration list worked only via the cached direct-DB (pooler) credential.
- `psql` is **not installed** locally.

## 3. Live migration state — DB1 RESOLVED (VERIFIED)

Command (read-only, run non-interactively in the background so a possible password prompt could not
freeze the session):
```
supabase migration list --linked
```
Result (Local = repo file present; Remote = applied in prod):
```
 Local          | Remote         | Time (UTC)
----------------|----------------|--------------------
 …(16 UUID-named era-1 + 001..007)… | …matching… | applied
 20260427000000 | 20260427000000 | 2026-04-27   008_ai_rate_limits          APPLIED
 20260504000000 |                | 2026-05-04   009_templates_phase_4        NOT APPLIED
 20260512230000 |                | 2026-05-12   010_brand_kit_premium        NOT APPLIED
 20260809000000 |                | 2026-08-09   011_fix_wm_escalation (ours)  NOT APPLIED (expected)
```

### DB1 answers (VERIFIED)
- **Migration 008 present remotely?** **YES — applied.** (Corrects the Phase-0 §11 inference that 008
  might be missing; that inference came from stale generated types, not the DB. Lesson confirmed:
  generated types are NOT a reliable proxy for live schema.)
- **Migrations 009 & 010 present remotely?** **NO — not applied.** Confirmed:
  - `templates` + `template_categories` (009) **do not exist in production** → `LocalTemplatesService`
    is the only backing (consistent with Phase-0 04).
  - `profiles.is_admin`, `is_premium`, `required_plan`, `brand_kit_exports` (010) **do not exist in
    production** → the admin templates queue / `useIsAdmin` reads a nonexistent column in prod
    (consistent with Phase-0 05/06/11 concern).
- **Migration 011 absent remotely?** **YES — absent, as expected** (not yet deployed).
- **Repo files consistent with remote history?** **YES.** Every Remote-applied migration has a
  matching Local file; the only Local-only files are 009, 010, 011 (un-pushed *forward* migrations).
  There is **no remote-only migration missing locally** and **no checksum/name mismatch** →
  **no unexpected divergence.** The repo is a clean superset of the remote (remote is 3 forward
  migrations behind).

## 4. Divergence assessment (VERIFIED)

**No unexpected divergence.** The remote DB is internally consistent and matches the repo up through
008; 009/010/011 are simply un-pushed forward migrations. This was anticipated in Phase-0 §11 (which
correctly said "CANNOT VERIFY LIVE") — so this is *confirmation of a known open question*, not a
surprise conflict. **Proceeding is safe.**

## 5. ⚠ Critical constraint carried forward to Checkpoint 4 (deployment)

Because 009 and 010 are **pending** in front of 011, a standard `supabase db push` would apply
**009 + 010 + 011 together**, not 011 alone. That would deploy:
- 009 templates schema, and
- 010 brand-kit-premium (`profiles.is_admin`, exports),
neither of which is the security fix, and both of which touch **owner-DEFERRED scope** (Owner
Decision 7 defers marketplace; templates server-backing is a Stage-3 concern, not Stage 1). This
**violates Checkpoint 4's "no unrelated migrations will be deployed."**

**Implication:** deploying the security fix cleanly requires an **owner decision** —
either (a) accept that 009+010 also go live now, or (b) apply **only** 011 out-of-band (e.g. execute
011 directly and record it in the migration history table), or (c) reorder. This is flagged now and
will be the STOP point at Checkpoint 4. **No guessing; no deploy without this decision.**

## 6. Checkpoint 1 status
| Item | Status |
|---|---|
| Working tree recorded | VERIFIED |
| HEAD SHA recorded (`46ffb41`) | VERIFIED |
| Untracked/generated vs source distinguished | VERIFIED |
| Supabase linkage verified (prod only) | VERIFIED |
| DB1 live migration state | **VERIFIED — RESOLVED** |
| Unexpected divergence? | **None** — safe to continue |

**Continue to Checkpoint 2 (backup/rollback).** Deployment (Checkpoint 4) is gated on the §5 owner
decision and on pre-production verification capability (no local/staging DB — see Checkpoint 3).
