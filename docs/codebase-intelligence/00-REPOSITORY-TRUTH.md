# 00 — Repository Truth

> Phase 0 audit · written 2026-08-08 · all claims tagged VERIFIED / INFERRED / UNKNOWN / CONFLICTING EVIDENCE.
> Evidence commands were run against the working copy at `/Users/home/Projects/brandingOS`, branch `new-ui`.

## 1. Which branch represents the latest actual product work?

**`new-ui` @ `46ffb41` — and it is byte-identical to `dev` and `main`.** — VERIFIED

```
dev     46ffb41 [origin/dev]    fix(editor): coerce stringified typography weights before BrandKit parse
main    46ffb41 [origin/main]   (same commit)
new-ui  46ffb41 [origin/new-ui] (same commit)
origin/HEAD -> origin/main
```

All three local branches and their remote counterparts point at the same commit. There is
no divergence between "development" and "release" right now.

## 2. Which branches contain newer or divergent work?

**None.** — VERIFIED

`git branch --no-merged new-ui` returns empty. Every other branch is 0 commits ahead of
`new-ui`:

| Branch | Ahead / behind `new-ui` | What it was |
|---|---|---|
| `agent-canva-chrome`, `agent-cover-mani-palette`, `agent-digital-stat-outdoor`, `agent-mood-sig-env`, `agent-pitch-1/2/3`, `agent-refactor` | 0 / 335–369 | Parallel subagent work branches for case-study & pitch-deck variants, merged 2026-04-26 (merge commits `6c83a07`, `aa4786f`, etc.) |
| `backend-system` | 0 / 644 | Backend/auth/Stripe work, merged into `x` 2026-04-12 (`fffa9b4`), then `x` → `main` 2026-04-14 (`bbe5b90`) |
| `phase-5-resize-variants`, `phase-6-brand-memory`, `phase-a-ui-migration`, `phase-b-feature-ports`, `phase-b-templates-port` | 0 / 10–92 | Phase work branches, merged ~2026-05-05 → 2026-07-31 |
| `ui`, `origin/guideline` | 0 / 42 and 0 / 11 | Iterative UI branches; `guideline` merged `phase-6-brand-memory` 2026-07-31 (`41a2bc9`) |
| `v1-release`, `x`, `origin/x` | 0 / 44–503 | Old release/deploy lines, abandoned (local `x` and `origin/x` differ from each other but both are fully contained in `new-ui`) |

**All side branches are historical, fully-merged work branches. They are safe to treat as
archaeology, not as pending features.** — VERIFIED

## 3. Which branch should be the audit baseline?

**`new-ui` @ `46ffb41`** (== `dev` == `main`). This entire audit is conducted against it. — VERIFIED

## 4. Are there significant unmerged features on other branches?

**No.** (See §2 — zero unmerged commits anywhere.) — VERIFIED

## 5. Main applications / packages inside the repository

| Package | Path | Stack | Tracked? | First / last commit | Status assessment |
|---|---|---|---|---|---|
| **Main app (BrandOS SPA)** | `/` (src/) | Vite + React 18 + TS + Zustand + Supabase + Fabric.js | yes | 2025-08-10 → 2026-08-08 | The product. VERIFIED |
| **Landing page** | `landingpage/` | Separate Vite project (own package.json) | yes | 2026-04-07 → 2026-04-27 | Public marketing site; untouched ~3.5 months. VERIFIED |
| **Supabase backend** | `supabase/` | Migrations + Edge Functions | yes | 2025-08-19 → 2026-05-18 | Live backend definition (project `ciojgoozobzbeglwdxcz`); production state NOT verifiable from repo alone — UNKNOWN |
| **brand-vision** | `brand-vision/` | **Python** (uv/pyproject) | yes | 2026-08-02 → 2026-08-04 | Local AI image classifier feeding onboarding auto-placement (commit `0c06a23`). One of the two most active areas of the last 60 days. VERIFIED |
| **remotion** | `remotion/` | Remotion video renderer (own package.json) | yes | 2026-04-15 only (single day) | INFERRED: one-off experiment; integration with the SPA unverified → Audit 8 |
| **Brands/** | `Brands/` | Binary assets (PDFs, logo folders: Raqm, uniex, vector, white-tshirt) | yes | 2026-04-02 → 2026-04-27 | Test/demo brand source material committed into the repo. VERIFIED |
| **product-os/**, **new-version/** | root | misc HTML/JS + reference folders (behance, Frontify, relume…) | **git-ignored** | n/a | On disk only; reference/inspiration material, not part of the product. VERIFIED (git check-ignore) |
| Root clutter | `*.png` (~30 QA screenshots), one-off `.md`/`.html` docs | — | mixed | — | Repo-root hygiene issue, catalogued in Audit 8 |

## 6. Timeline of generations (git archaeology)

1176 commits, 2025-08-10 → 2026-08-08. Major eras, from merge commits and per-directory first/last touch:

- **2025-08-10** — scaffolded from a Lovable-style template (`8da50b1 "Use tech stack vite_react_shadcn_ts"`); early landing-page era. `src/domains/`, `src/features/onboarding` (since deleted), `src/features/editor` date from this era.
- **2025-08-19** — Supabase added.
- **2026-04 (very dense month)** — `Brands/` assets (04-02), logo-maker (04-04), `landingpage/` (04-07), `backend-system` → `x` (04-12, `fffa9b4`), `x` → `main` "editor upgrade, admin panel, auth, Stripe, logo-to-SVG" (04-14, `bbe5b90`), remotion (04-15), multi-agent case-study/pitch variant merges (04-26).
- **2026-05-05** — Phase A "Studio/Classic UI namespace split" (`9ccaef8`) + Phase B "Templates port into Studio" (`65a1442`); `brand-kit` / `brand-kit-alt` forks created the same day; `features/landing-v2` sunset (`3c42eac`).
- **2026-05-11 → 05-19** — `ui` → `dev` merges; AI image generation vendor work (Fal.ai Flux, OpenAI gpt-image-1: `af893a3`, `b9647cd`); brand-kit refinements. Then a **10-week commit gap**.
- **2026-07-31** — resumed: `guideline` branch merges `phase-6-brand-memory` (`41a2bc9`), dev-only Supabase-bypass login (`10218f1`), Supabase keep-alive workflow (`9f7073b`).
- **2026-08-02 → 08-08 (current era)** — `brand-vision/` Python classifier + **`src/features/onboarding-v4`** + `src/features/setup`. Last-60-days commit-touch counts: `brand-vision` 69 files, `onboarding-v4` 39, `editor` 11, `setup` 9, `auth` 5. — VERIFIED

**The active frontier of the product is onboarding-v4 + brand-vision + setup + editor — not brand-kit.**

## 7. Contradictions with existing documentation (CONFLICTING EVIDENCE)

| Doc claim (CLAUDE.md) | Reality | Evidence |
|---|---|---|
| "Default branch is `dev` (NOT `main`). Work lands on dev; merge to main is a release step." | `dev` == `main` == `new-ui` at the same commit; recent work flowed through `ui`/`guideline`/`new-ui` branches. `origin/HEAD` → `main`. The dev/main separation is currently not operative. | branch listing above |
| "Peer branch `x` is used for a separate deploy target." | `x` is 44–459 commits behind and abandoned since ~2026-04. Local `x` and `origin/x` even point at different commits. | branch listing |
| Legacy landing pages at `src/domains/landing` (v1) **and** `src/features/landing-v2` (v2) | `landing-v2` was deleted 2026-05-05 (`3c42eac`); only `src/domains/landing` remains on disk. | `ls src/features`, git log |
| Brand Kit described as "major feature under active iteration" | Last commit touching `src/features/brand-kit/` is 2026-05-19 (~3 months ago); active iteration is in `onboarding-v4`/`brand-vision`. | per-dir git log |
| CLAUDE.md does not mention `onboarding-v4`, `brand-vision/`, or the current role of `features/setup` at all | These are the most-touched areas of the last 60 days. | commit-area histogram |

**Implication for the rest of the audit:** CLAUDE.md is a snapshot of ~2026-05-11 and must
be treated as historical testimony, not current truth. Every "canonical/legacy" label in it
needs independent verification (done in Audits 1–8).

## 8. Security observation (do-not-fix-now, documented per audit rules)

- The `origin` remote URL embeds a GitHub OAuth token in plaintext (`git remote -v`).
  Token deliberately not reproduced here. Recommend rotating it and switching to a
  credential helper. — VERIFIED (observation only; no change made)
- CLAUDE.md itself flags `VITE_ANTHROPIC_API_KEY` inlined into the client bundle; verified
  status is assessed in Audit 9.
