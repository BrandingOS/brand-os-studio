# ADR-0001 — Logo Maker scaffold alignment

**Date:** 2026-04-17
**Status:** Accepted — Phase 0
**Context:** `LOGO_MAKER_SPEC.md` vs. the real state of the BrandingOS repo.

---

## Why this doc exists

The spec was written as if the repo were greenfield. The repo isn't. This ADR records where the spec's assumptions were wrong, what we're doing instead, and the trade-offs behind each decision so Phases 1–10 don't re-litigate them.

All decisions here flow from Hamza's answers in `QUESTIONS_FOR_HAMZA.md` and what the audit found in the codebase.

---

## 1. Location — main app, not `landingpage/`

**Spec says:** `landingpage/src/app/logo-maker/…`
**Decision:** `src/features/logo-maker/…` in the main app.

**Why:** `landingpage/` is an isolated Vite project (no React Router, no Zustand, no Fabric.js, no shared deps) that serves the public marketing site only. The Logo Maker is a core product feature that needs routing, state, the existing Brand schema, and Supabase integration. Putting it in `landingpage/` would either duplicate all of that or orphan the feature from the rest of the product.

---

## 2. There is already a Logo Maker — we extend, we don't replace

**What exists today:**
- Folder: `src/features/logo-maker/` with `LogoMaker.tsx`, `LogoCanvas.tsx`, `AILogoSuggestions.tsx`, `LogoExportPanel.tsx`, `IconSelector`, `TextEditor`, `LayoutSelector`, `StylePanel`
- Route: `/dashboard/logo-maker` (lazy-loaded `src/pages/dashboard/logo-maker/index.tsx`)
- Approach: config-driven (not Fabric.js) — renders logo from `LogoConfig` via React, rasterizes with html2canvas
- Auto-save: uses canonical `useAutoSave` + `EditorChrome` from `@/features/editor/core`
- Save-to-Brand: `LogoExportPanel` already persists into a Brand via `useBrandStore` (per the UX redesign rule in the project CLAUDE.md)

**Spec describes:** a 6-screen flow (Mode Select → Brief → Generate → Editor → Brand Kit → Complete) with a Fabric.js editor, mandatory AI generation of 36 concepts, and auto-registration of a new Brand.

**Decision:** The two are not in conflict — they're at different layers.
- Existing editor stays at `/dashboard/logo-maker`. It's the *edit an existing logo* surface.
- New 6-screen flow lives under `/logo-maker/*` (public) for *creating a new brand from scratch*.
- In Phase 4, the Editor screen (Screen 4) will be built on Fabric.js and will, over time, absorb or replace the existing `LogoMaker.tsx`. For now they coexist so Phase 0 doesn't touch working code.

**Tension flagged:** The project CLAUDE.md says *"Logo Maker is brand-scoped — saved into a brand via the LogoExportPanel 'Save to Brand' flow. Don't re-add it as a workspace entry."* The spec makes it a workspace-level + public entry. We're going with the spec because Hamza handed it to us and told us to start Phase 0. If we're meant to keep the current rule, stop before Phase 1.

---

## 3. Backend — Supabase, not Cloudflare Workers/D1/R2

**Spec says:** Cloudflare Workers + D1 + R2.
**Repo reality:** None of those exist. There is no `wrangler.toml`, no `workers/`, no D1, no R2. The repo is Supabase-first: Supabase Postgres (`ciojgoozobzbeglwdxcz`), Supabase Auth with Google + Facebook, 5 Supabase Edge Functions (`admin-invite`, `check-plan-limit`, `stripe-*`), and static hosting on Cloudflare Pages.

**Decision:**
- Persistence → Supabase Postgres. Align with the existing `brands` table (see §4).
- Asset storage → Supabase Storage. We create a bucket (e.g. `brand-assets`) for logo SVG/PNG/PDF variants.
- AI orchestration → Supabase Edge Functions. One function per AI service (`logo-generator`, `name-suggester`, `palette-suggester`, etc.) to match the spec's "one service per module" isolation rule and to move `VITE_ANTHROPIC_API_KEY` off the client (CLAUDE.md flags this as a pre-launch must-fix).
- R2 / D1 / Workers → not introduced. If we ever need edge compute for images, we revisit.

Phase 2 becomes *"Supabase Edge Function skeleton + Storage bucket"* instead of *"Cloudflare Worker scaffold"*.

---

## 4. Brand schema — align to existing, do not fork

**Existing canonical:** `src/shared/types/brand.ts` — the v3 unified `Brand` interface (`logoSystem`, `colorSystem`, `typography`, `brandAssets[]`) plus legacy fields (`primaryColor`, `logoAssets`, `fonts`). Backed by the Supabase `brands` table.

**Spec's proposed Brand shape:** flatter, with `logo.variants.{icon_only,wordmark_only,horizontal,vertical,dark_bg,…}`, `colors.{primary,secondary,accent[],neutral.*}`, `brand_kit.{guidelines_pdf_url, social_profiles, mockups[]}`.

**Decision:** Use the existing `Brand` type. Map the spec's concepts onto it:
| Spec | Existing |
|---|---|
| `logo.variants.*` | `brandAssets[]` entries, referenced by `logoSystem.{primary,icon,wordmark,dark,light,…}` |
| `colors.primary/secondary/accents/neutral` | `colorSystem` (v3) with `primaryColor`/`secondaryColor` legacy fallback |
| `typography.heading/body/mono` | `typography` (v3) with `fonts.{primary,secondary}` legacy fallback |
| `brand_kit.*` | new `brand_kit` JSON column OR derived on-demand from `brandAssets[]` (prefer derived) |
| `share_link` | existing `publicUrl` + `isPublic` |
| `status` | add only if needed; probably inferable from existing fields |
| `generation_metadata` | new optional column `generation_metadata JSONB` (small, low-risk) |

A migration for `generation_metadata` (and maybe a `brand_kit` JSONB cache column) gets written in Phase 2. No new `brands_v2` table. No parallel type.

---

## 5. Dependencies — verify, don't blindly install

**Spec step 2:** `npm install fabric@^6 zustand @tanstack/react-query react-router-dom`.
**Audit:** `fabric@^6` is already used in `src/features/brandkit/components/editor/CanvasEditor.tsx`. Zustand is the project's canonical state lib. React Router v6 is already wired. TanStack Query — to be verified in Phase 0 task #3; add only if missing.

---

## 6. AI services — shared, not `/src/services/ai/`

**Spec path:** `/src/services/ai/`.
**Repo convention:** shared services live at `src/shared/services/*` (e.g. `brands.supabase.ts`, `aiService.ts`).

**Decision:**
- Shared AI services: `src/shared/services/ai/` (new folder).
- One file per service as §4.3 of the spec mandates. No cross-imports between services; shared pieces go under `src/shared/services/ai/shared/`.
- Feature-specific glue (adapters that turn service output into `LogoConfig` or Brand mutations) stays in `src/features/logo-maker/`.

---

## 7. Gemini — stub, don't call live

Hamza has no paid Gemini key yet. We build `gemini-client.ts` with the real interface but route it through the existing `nanobanana` skill for development, and flag any live call for explicit approval. No live Gemini billing until Hamza says go.

---

## 8. Analytics — deferred to Phase 10

User answer said GA + Clarity are already wired. They aren't — no `gtag`, no Clarity script, no env var references. We add both in Phase 10 (Polish) rather than pretending they exist during Phases 1–9.

---

## 9. Screen 6 next-step CTAs — map to reality

| CTA | Reality | Phase 9 behavior |
|---|---|---|
| Generate landing page | No brand-scoped generator exists (`landingpage/` is the marketing site) | Stub — "Coming soon" |
| Create social posts | Exists: `src/features/social-media/` + `/dashboard/brand/:slug/social-media` | Deep-link to brand's social page |
| Brand video ad | Does not exist | Stub — "Coming soon" |
| Invite team | Partial (approvals table, no UI) | Deep-link to `/dashboard/settings/team` if present, else stub |

---

## 10. Routes — coexist

| Route | Status | Purpose |
|---|---|---|
| `/dashboard/logo-maker` | Existing, untouched | Edit existing config-driven logo |
| `/logo-maker` | New (Phase 0 placeholder → Phase 1 Mode Select) | Public entry to 6-screen flow |
| `/logo-maker/brief` | New (Phase 1) | Screen 2 |
| `/logo-maker/generate` | New (Phase 3) | Screen 3 |
| `/logo-maker/editor/:logoId` | New (Phase 4) | Screen 4 (Fabric.js) |
| `/logo-maker/brand-kit/:logoId` | New (Phase 6) | Screen 5 |
| `/logo-maker/complete/:brandId` | New (Phase 9) | Screen 6 |

The spec's `/app/brands/new` entry is remapped to `/dashboard/brands/new` to match existing URL conventions (no `/app/` prefix in this repo). Phase 1 wires that alias.

---

## 11. Phase 0 checkpoint (revised)

Per spec: *"`npm run dev` works, navigating to `/logo-maker` shows a placeholder page."*

Revised to:
1. `npm run dev` starts on port 8080 as today.
2. Visiting `/logo-maker` renders a placeholder that shows the 6-screen flow is coming.
3. Visiting `/dashboard/logo-maker` still renders the existing editor (regression check).
4. No changes to the existing `src/features/logo-maker/components/*.tsx` files.
5. Folder scaffold for §6 of the spec is in place with empty files.

---

## Things we are explicitly NOT doing in Phase 0
- No Cloudflare Workers / D1 / R2 setup.
- No new `Brand` type. No migration.
- No AI calls. No Gemini. No Claude proxy yet.
- No Supabase Edge Functions yet.
- No changes to the existing logo maker UI, the brandkit editor, or any other feature.
- No install of deps that already exist.
