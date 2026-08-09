# Target Architecture (Phase 1 — Design/Analysis ONLY)

> **No production code is changed by anything in this folder.** These documents design the
> *future* BrandingOS from the intended product, grounded in the Phase-0 evidence
> (`docs/codebase-intelligence/`). Nothing here is implemented yet.
>
> Evidence tags used throughout: **VERIFIED** (seen in code, cited), **INFERRED** (reasoned
> from evidence), **PROPOSAL** (a target-design choice — never stated as current reality),
> **UNKNOWN**, **PRODUCT DECISION REQUIRED**.

## Documents

- [x] [00 — Product Truth](00-PRODUCT-TRUTH.md) — what BrandingOS *should* be; capability classification (Batch 1)
- [x] [01 — Domain Model](01-DOMAIN-MODEL.md) — canonical business model, one source of truth per concept (Batch 2)
- [x] [02 — Target Architecture](02-TARGET-ARCHITECTURE.md) — layers, boundaries, editor platform, enforcement, CodeMap (Batches 3, 4, + CodeMap)
- [x] [03 — Target Database](03-TARGET-DATABASE.md) — schema from the domain, authz from first principles (Batch 5)
- [x] [04 — Migration Strategy](04-MIGRATION-STRATEGY.md) — incremental path from current → target (Batch 6)
- [x] [05 — Owner Decisions & Phase-1 Challenge](05-OWNER-DECISIONS.md) — 8 owner decisions + adversarial challenge (4 revisions) + engineering decisions
- [x] [06 — Phase-2 Entry Gates](06-PHASE-2-ENTRY-GATES.md) — objective control checklist; every gate must PASS before implementation

## Status

Stage A (security containment) complete — `docs/codebase-intelligence/12-RLS-CONTAINMENT.md`.
Stage B (this folder) complete — design/analysis only, no production code changed.
Decision-review package complete (05 + 06).

**PHASE 2 STATUS: BLOCKED UNTIL ENTRY GATES PASS** — see [06-PHASE-2-ENTRY-GATES.md](06-PHASE-2-ENTRY-GATES.md).
All 8 owner decisions **RESOLVED** 2026-08-09 ([05](05-OWNER-DECISIONS.md) → "Owner Answers — RESOLVED"),
and the modifications are folded into 01/03 — so the **Product + Domain gates now PASS**. Remaining
blockers are **Security · Database-state · Engineering** only: migration 011 not applied, RLS test not
run, adjacent P0/P1 dispositions incomplete, live prod migration state unverified, no backup/rollback
plan, typecheck gate still a no-op.

---

## Target product summary

BrandingOS is a **brand-centric operating system**: create a brand (AI-assisted onboarding derives
a full identity), maintain that one canonical identity (logo system, colors, typography, voice,
strategy), and produce on-brand deliverables (brand kit, guidelines, social/print/web/decks/mockups)
in a single Canva/Figma-style editor whose controls change contextually by selected element, then
share/export. Five scopes: **Workspace · Brand · Editor · Public · Admin** (00 §2). Capabilities are
classified KEEP / MERGE / RETHINK / REMOVE / NEEDS-PRODUCT-DECISION by *capability*, not by files
(00 §3).

## Core architecture principles

1. **One writable source of truth per concept; derive everything else, never mirror** (01 §0) —
   the direct fix for the `guidelines`-JSONB drift (05/11).
2. **Downward-only dependencies:** `app → features/editor-platform → application → domain`, with
   `platform` implementing ports; `domain` and `design-system` never import `features` (02 §1).
3. **One data path:** use-case → repository → infra; only `platform/` touches Supabase/localStorage
   (kills the persistence-in-components bypass — 04).
4. **Three state kinds kept apart:** async server state (query cache), ephemeral editor state,
   local UI state (02 §4).
5. **Editor is a platform + artifact adapters**, not 14 editors and not one mega-component (02 §6).
6. **Authorization lives in the database** (RLS + SECURITY DEFINER helpers), never only the client.
7. **Enforced boundaries:** real type gate, import-boundary lint, cycle checks, RLS CI, and a
   generated **CodeMap** control plane that keeps the architecture honest (02 §7/§8).

## Canonical domain decisions

- Brand identity is **one typed value object** (`Brand.identity`); LogoSystem/ColorSystem/
  TypographySystem/Voice/Strategy are value objects owned by the Brand (01 §2).
- Guideline is a **derived read-model, not a stored table** (01 §7 / 03 §0).
- Assets are first-class, **record+bytes atomic**, referenced by identity/documents (01 / 03).
- Documents (designs/decks/social/mockups/guideline-instances) are **server-persisted, cross-device**
  scene-graphs selected by `artifact_type` → editor adapter (01 / 02 §6 / 03).
- One color engine, one contrast module, one logo resolver, numeric font weights (01 §8).

## Target DB summary

Deliberate JSONB-vs-normalized split: **JSONB** for cohesive value objects read/written whole
(`brands.identity` versioned, `documents.scene_graph`); **normalized tables** for anything queried/
joined/permission-checked/deduped (workspaces, members, assets, templates, publications). Public
read only via purpose-built `publications` rows (no brand-row leakage — closes the 12 escalation
input). One admin system (`platform_roles`). RLS helpers carried forward in their **fixed** 011/012
form (03).

## Migration stages (headline)

1 gates+RLS deploy → 2 domain contracts → 3 persistence foundation (dual-write) → 4 brand SoT
migration (kill the mirror) → 5 asset model → 6 route/product cleanup → 7 feature-by-feature →
8 editor-platform → 9 legacy deletion → 10 strict enforcement. Delete-first and migrate-first sets
are separated; every stage keeps the app shippable with a bridge + rollback + completion criteria
(04).

## Unresolved product decisions (owner)

1. **Deck engine** — one editor adapter vs a chosen engine (blocks Stage 8).
2. **Anonymous onboarding** — support end-to-end (fix wipe + claim) vs gate behind auth (Stage 6).
3. **Collaboration** (comments/approvals) — finish real-time backend vs remove (Stage 3/9).
4. **Analytics** — build an events pipeline vs defer.
5. **Marketplace** — keep as roadmap vs remove.
6. **Legacy guideline-presentations data** — must it survive the Chronicle migration? (Stage 9).

## Architecture decisions requiring owner approval

1. **Color engine winner** — `shared/color` (doc-blessed) vs `lib/color-engine` (APCA, 19 importers)
   (blocks Stage 2).
2. **Admin system winner** — `user_roles` vs `profiles.is_admin` → single `platform_roles` (Stage 3).
3. **AI model-ID / proxy policy** — move all model calls server-side (AiGateway); pick default model
   (Stage 2). Non-negotiable that browser keys are removed.
4. **Confirm live prod migration state** (008–010) before Stages 3–4 — run
   `supabase migration list --linked` (11 §11).
5. **Adopt the layered boundary + CodeMap enforcement** as the standing architecture rule (02).

**Phase 1 is design/analysis only. No implementation has begun. Awaiting review before any Phase 2
work.**
