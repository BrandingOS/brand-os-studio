# 00 — Product Truth

> Batch 1. Defines what BrandingOS **should be** as a product, derived from Phase-0 evidence
> plus the current implementation's *intent* — not from its file structure. Classification is
> about **product capability**, never about files. Cross-checked against Phase-0 (01, 03, 05,
> 07, 08) at the end.

## 0. Method — three separate lenses

For every capability the audit conflated three things; the redesign must keep them apart:

1. **Product capability** — the user-facing job to be done (durable; survives redesign).
2. **Current UI implementation** — the screens/routes that render it today (often legacy,
   duplicated, or frozen — see 02-ROUTES, 08-LEGACY).
3. **Reusable backend/domain logic** — services, engines, schemas that can be carried forward
   even when the UI is thrown away (e.g. `features/brandkit` domain layer, 45 importers — 03).

> Rule: **a legacy UI never condemns its domain logic, and a live route never sanctifies a
> duplicated capability.** Every classification below states which lens it applies to.

## 1. What BrandingOS is (INFERRED from the active frontier + product signals)

**A brand operating system**: a user creates a brand (from a logo/description via AI-assisted
onboarding), the system derives a full brand identity (logo system, colors, typography, voice,
strategy), and the user then *produces on-brand deliverables* — brand kit, guidelines,
social/print/web/deck artifacts — in a Canva/Figma-style editor where brand tokens are always
one click away, and shares/exports them.

Evidence for this framing (VERIFIED): the active-development frontier is onboarding-v4 +
brand-vision (AI classification) + the unified editor + setup (00-REPOSITORY-TRUTH §6); the
domain spine is a rich Brand with a logo/color/typography/guidelines model
(05-SOURCE-OF-TRUTH); the mandatory shared helpers are brand-palette and logo-on-background
resolvers (CLAUDE.md canonical pickers, VERIFIED present). The product is **brand-centric**, not
document-centric: documents exist to serve a brand.

## 2. The five target scopes and their intended capabilities (PROPOSAL)

The current app already gravitates to three scopes (Workspace · Brand · Editor per
`docs/ux-redesign`); the target formalizes **five** by splitting Public and Admin out cleanly.

### Workspace (the account/tenant home)
- Auth (sign in/up, OAuth, reset) — VERIFIED live.
- Workspace = tenant boundary + billing unit (Stripe keys off workspaces — 06). Membership +
  roles.
- Brand list / create / switch. Templates browse (workspace-level gallery). Learn. Settings
  (account, billing, interface prefs, members).
- **Intended capability:** "manage my account, my team, and my brands."

### Brand (the heart — everything scoped to one brand)
- **Onboarding/Setup** → produce the brand identity.
- **Brand Kit** → the canonical brand-asset showcase + export (logos, colors, fonts, icons,
  photos, about).
- **Identity editing** → change logo/colors/typography/voice/strategy (the *edit* surface for
  what Brand Kit *shows*).
- **Guidelines** → the brand-guideline document (Chronicle).
- **Design/Editor launchpad** → create deliverables (blank, from template, from AI).
- **Content** → social/calendar deliverables.
- **Assets/DAM** → the brand's uploaded + generated asset library.
- **Tools** → brand-scoped utilities (validation/consistency, color system, logo-to-SVG, mockups).
- **Share** → public brand page, guideline export, logo deck.

### Editor (one editing environment, many artifact types)
- A single Canva/Figma-style editor whose chrome, selection, history, autosave, asset picker,
  brand-token panel, commands, and export are **shared**, and whose artifact type (design,
  guideline, presentation, social, mockup) is an **adapter**. (Designed in detail in 02, Batch 4.)
- Contextual property panels that change with the selected element.

### Public (unauthenticated consumption)
- Public brand portal / brand page; shared guideline; shared design/deck view; logo deck.
- Anonymous onboarding funnel (marketing-driven) — **PRODUCT DECISION REQUIRED** whether this is
  supported end-to-end (currently broken: 04 wipe bug + login wall).
- The separate marketing `landingpage/` (its own Vite app) stays as-is.

### Admin (platform operations)
- Template moderation queue, early-access approvals, user/role management, platform analytics.
- One coherent role system (today there are two — see §4).

## 3. Capability inventory & classification

Legend: **KEEP** (carry the capability forward, likely re-home the UI) · **MERGE** (fold into
another capability) · **RETHINK** (capability is right but the model is wrong) · **REMOVE**
(drop the capability) · **NEEDS PRODUCT DECISION**.

| # | Capability | Scope | Current implementation (lens 2) | Reusable logic (lens 3) | Classification |
|---|---|---|---|---|---|
| 1 | Auth / session | Workspace | `features/auth`, sessionStore — VERIFIED live | keep | **KEEP** |
| 2 | Workspace + membership + billing | Workspace | Supabase workspaces/members, Stripe — VERIFIED | keep (fix RLS per 12) | **KEEP** |
| 3 | Brand create via AI onboarding | Brand | onboarding-v4 @ `/onboard-brand` (1 live + 4 shims — 02) | onboarding engines, brand-vision | **KEEP** (UI is current) |
| 4 | Logo system / variants / contrast | Brand | logo-maker, `logoOnBackground`, `recolorLogo`, IdentityEngine | **high reuse** | **KEEP capability, RETHINK model** (4 slot vocabularies — 05) |
| 5 | Brand identity editing (color/type/voice/strategy) | Brand | Setup page + Identity tabs (Classic) | brandkit engines, brandPalette | **MERGE** with Brand Kit (see §4 overlap A/B) |
| 6 | Brand Kit (asset showcase + export) | Brand | `features/brand-kit` (Studio) + `brand-kit-alt` (load-bearing in Studio settings — 03) | brandkit domain (45 importers) | **KEEP + MERGE** (unify the two forks + Identity) |
| 7 | Guidelines document | Brand/Editor | Chronicle (`features/guideline`, CURRENT) + legacy `guidelines` hub + brand-guides deck + blocks (quad-stack — 03) | Chronicle | **KEEP Chronicle, REMOVE the other 3** (pending decision on migration cost) |
| 8 | Design editor (deliverables) | Editor | unified `features/editor` (CURRENT) + legacy OptimizedDesignEditor + design-alt | unified editor | **KEEP unified, REMOVE legacy** |
| 9 | Templates library + save-as-template | Brand/Workspace | `features/templates` (Local svc) + v5 marketplace orphan | templates service/schema | **KEEP, RETHINK persistence** (localStorage-when-authed — 04) |
| 10 | Deliverable generation (AI text/image) | Editor | `ai-generate-image` (real vendors), apply-command, brand-vision | edge functions + prompt builders | **KEEP, RETHINK key handling** (browser keys — 10/11) |
| 11 | Content / social / calendar | Brand | `social-media`, calendar, bento — frozen 2026-04 | buildSocialSlides | **KEEP capability, RETHINK** (rides frozen deck engine — 03) |
| 12 | Assets / DAM | Brand | `features/dam` + `AssetSourcePopover` (+ 2 more pickers — 07) | storage service | **KEEP, RETHINK model** (records dropped on authed save — 04/11) |
| 13 | Decks / presentations | Editor | 4 engines: case-study-deck, pitch-deck, logo-presentation, brand-guides — all frozen (03) | one to be chosen | **NEEDS PRODUCT DECISION** (which engine) → then MERGE |
| 14 | Mockups | Brand/Editor | `mockup-studio` (Local catalogue) | mockup templates | **KEEP** (own artifact type) |
| 15 | Brand consistency / validation | Brand/Tools | `brand-consistency`, `computeMetrics` | brandRules engine | **KEEP** |
| 16 | Brand analytics | Brand | `analytics` (local compute, frozen) | metrics | **NEEDS PRODUCT DECISION** (real analytics needs events pipeline — none exists) |
| 17 | Approvals / comments / collaboration | Brand | localStorage stores; Supabase adapters unconsumed (03/04) | schemas exist | **NEEDS PRODUCT DECISION** (finish real-time backend, or REMOVE) |
| 18 | Brand portal / public brand page | Public | `brand-portal` `/p/:slug` (frozen) | — | **KEEP capability, RETHINK** (share safety — designs are device-local, 04) |
| 19 | Standalone tools (`/tools/*`) vs brand tools (`/b/:slug/tools/*`) | Public/Brand | `features/tools` (13 importers) mounted in both | tool logic reusable | **MERGE** (one tool set, two entry contexts — §4 overlap G) |
| 20 | Marketplace (templates) | Workspace/Public | `features/marketplace` + v5 page (orphan/unlinked — 08) | — | **NEEDS PRODUCT DECISION** (keep roadmap or REMOVE) |
| 21 | Brand memory (AI context cache) | Editor/AI | `brand-memory` (in-memory over designs) | reusable | **KEEP** (support layer) |
| 22 | Logo maker wizard | Brand/Public | `logo-maker/flow` 6-screen (carve-out) | IdentityEngine | **KEEP capability, RETHINK** (fold into onboarding/identity over time) |
| 23 | Remotion video | — | `remotion/` single-day experiment, wired to nothing (00/08) | — | **REMOVE** (or archive out of repo) |
| 24 | Landing marketing site | Public | `landingpage/` separate app | — | **KEEP** (as separate deploy) |
| 25 | `src/domains/landing` in-app landing | Public | renders SPA `/` (VERIFIED live, 08) | — | **KEEP** (do not delete — audit corrected the "dead" label) |

## 4. Overlaps — resolved or explicitly flagged (the core of Batch 1)

**A. Setup vs Brand Kit** — RESOLVE as one capability with two modes. *Setup* = guided
first-run identity creation; *Brand Kit* = the ongoing identity home (view + edit + export).
They operate on the **same canonical Brand identity** (01). Today Setup writes via
`brandToMockBrand`/`mockBrandToPatch` and Brand Kit is read-only session-overlay — this split is
an artifact of implementation, not product. → **MERGE** onto one identity source of truth.

**B. Brand Kit vs Identity** — RESOLVE. "Identity" (Classic tabs: Logo/Colors/Typography/Voice/
Strategy) is the *edit* face; "Brand Kit" (Studio) is the *showcase+export* face. Same data. →
**MERGE** into one Brand-scoped identity surface (view/edit toggle), backed by one model. The
canonical vs alternate fork split (`brand-kit` vs `brand-kit-alt`, with `alt` load-bearing in
Studio settings — 03) is a **must-resolve** structural overlap.

**C. Guidelines vs Guideline Editor** — RESOLVE toward Chronicle. There are four guideline
stacks (03): Chronicle (`features/guideline`, CURRENT), legacy `guidelines` hub/canvas
(Supabase-backed `guideline_presentations`), brand-guides deck, and `blocks`. → **KEEP Chronicle
as the guideline document + editor; REMOVE the other three** after migrating any unique content
capability. Cost is high (legacy guidelines is Supabase-backed and multi-page) → sequencing in 04;
flag **PRODUCT DECISION REQUIRED** on whether legacy guideline *presentations* data must be preserved.

**D. Assets vs Folders vs DAM** — RESOLVE as one Asset model with views. "Assets" (brand-asset
cards), "Folders" (`/folders` DAM tab), and DAM are the same capability over one `Asset` entity
(01). Today: 3+ upload pickers (07) and asset records dropped on authed save (04/11). → **MERGE**
to one Asset domain + one upload pipeline + one library UI with folder/tag views.

**E. Templates vs generated deliverables** — RESOLVE by lifecycle, not storage. A *Template* is a
brand-agnostic starting point; a *Design/Document* is a brand-bound instance; "save as template"
converts an instance back to brand-agnostic (`convertToTemplate` — CLAUDE.md 4.2). These are two
entities with a conversion, not a duplication. → **KEEP both**, model explicitly in 01; the
overlap to remove is the *persistence* (both localStorage-when-authed).

**F. Standalone tools vs brand-scoped tools** — RESOLVE. `features/tools` renders at both
`/tools/*` (public/anonymous) and `/b/:slug/tools/*` (brand context). Same logic, two entry
contexts. → **MERGE** to one tool implementation parameterized by "has-brand-context?"; keep both
entry points. (Note: CLAUDE.md's `tools-cosmos` folder does **not exist** — 03; ignore that label.)

**G. Multiple onboarding generations** — ALREADY RESOLVED in code, confirm in target. One live
implementation (`features/onboarding-v4` @ `/onboard-brand`); the 4 older URL families are
`<Navigate>` shims (02, 11 §12). → **KEEP the one**, **REMOVE the shim routes** once in-app links
are repointed (04). No product ambiguity remains; only cleanup.

**H. Multiple deck/presentation systems** — FLAG. Four deck engines coexist, all frozen since
2026-05-19, no winner in code (03). This is the single biggest unresolved product/engineering
fork. → **PRODUCT DECISION REQUIRED**: pick the go-forward deck engine (or fold decks into the
unified editor as an artifact adapter — recommended in 02 Batch 4). Blocks consolidation of
social-media + logo-presentation which ride the frozen `shared/editor` deck engine.

**I. Multiple editors (~14)** — RESOLVE via the editor platform. The ~14 editors are evidence of
a missing platform abstraction (02 Batch 4), not 14 real products. → **MERGE** onto one Editor
Platform + artifact adapters; **KEEP** the genuinely-separate rendering needs (e.g. the
off-limits vectorize export, `stable/editable-export-v1`) behind adapter boundaries.

## 5. Capabilities to REMOVE (product-level, not just files)

- **Remotion video** (#23) — no product presence, wired to nothing. REMOVE/archive.
- **The 4 onboarding shim routes** (#G) — capability already unified; remove the redirects after
  link repoint.
- **3 of 4 guideline stacks** (#C) — after Chronicle migration.
- **Legacy editors** (OptimizedDesignEditor, design-alt) once the unified editor covers their
  artifact types (#8) — but their **export pipeline** (`vectorize/*`) is reusable and must be
  preserved behind an adapter, not deleted (08 — "live domain under legacy UI").

## 6. Capabilities that NEED A PRODUCT DECISION before design can finalize

1. **Deck engine** (#13/#H) — choose one, or adopt "decks as an editor artifact adapter."
2. **Approvals/comments/collaboration** (#17) — finish the real-time backend or remove the
   capability. Determines whether the DB models in 03 are built.
3. **Analytics** (#16) — real analytics requires an events pipeline that does not exist; decide
   scope or defer.
4. **Marketplace** (#20) — keep as roadmap or remove.
5. **Anonymous onboarding end-to-end** (§2 Public) — support it (fix wipe + claim path) or gate it
   behind auth. Affects auth + persistence design.
6. **Legacy guideline-presentations data** (#C) — must it survive the Chronicle migration?

## 7. Cross-check against Phase 0 (internal consistency)

- Active frontier (onboarding-v4 + brand-vision + editor + setup) drives the "KEEP" set — matches
  00-REPOSITORY-TRUTH §6. ✓
- "1 live onboarding + shims" matches 02/11 §12. ✓
- brand-kit-alt load-bearing in Studio → the Brand-Kit/Identity MERGE (B) is a *structural*
  must-resolve, matches 03. ✓
- Deck-engine indecision, guideline quad-stack, asset persistence gaps, tools duplication,
  browser AI keys — all trace to 03/04/05/07/10/11. ✓
- No capability here is justified solely by a route existing or by code age — the §0 rule held. ✓

**Nothing in this document asserts a PROPOSAL as current reality.** Current-state claims cite the
Phase-0 audit; target choices are marked PROPOSAL or PRODUCT DECISION REQUIRED.
