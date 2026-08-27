# BrandingOS Identity Engine / Logo System Studio
## Strategic brief — 10 deliverables

**Owner:** Hamza  ·  **Drafted:** 2026-04-17  ·  **Status:** Strategy locked, MVP in build
**Relationship to `LOGO_MAKER_SPEC.md`:** the Spec is the first-pass product description. This brief is the deeper architecture that Phases 2-10 build against. Where they disagree, this brief wins.

---

## TL;DR — the thesis in one paragraph

Every logo maker on the market treats a logo as a *file*. BrandingOS treats a logo as the *seed of a brand*. The Identity Engine is the one system that creates, owns, and evolves a logo across its full lifecycle — from a first-time founder who has nothing, to a design team refining an existing brand's mark. Same engine, two entry points, one source of truth. Output isn't a PNG — it's an `IdentitySystem`: 16 variants, a typography system, a color system, a live quality report, and a lineage trail, all persisted into the brand and read by every downstream BrandingOS feature (social, landing pages, video ads, guidelines).

Three advantages nobody else combines:
1. **System output** — 16 variants, not 1 file.
2. **External↔internal duality** — the same engine runs as a standalone tool *and* inside an existing brand's Identity tab.
3. **Continuity** — the logo isn't the end of the journey; it auto-seeds color, type, guidelines, assets, and templates.

---

## 1. Market analysis

### 1.1 The competitors and what they actually ship

| Product | Model | Editor | Output | Post-logo continuation | Connects to a brand OS? |
|---|---|---|---|---|---|
| **Looka** | Subscription, $20-96/month | Wizard only — no free editing | PNG + "logo package" | No — they sell you a website and business card *product*, not a brand system | No |
| **Brandmark** | $25-175 flat | 9 logo presets, toy editor | PNG + some vector if you pay | Basic "brand guidelines PDF" | No |
| **LogoAI** | $60-120 flat | **3 edits post-purchase maximum** | PNG/SVG | Mockup pack, no system | No |
| **Hatchful** (Shopify) | Free | Template-only, no edits | PNG | No | Tied to Shopify store, not a brand OS |
| **Tailor Brands** | Subscription trap, $10-50/mo | Wizard only, aggressive upsells | PNG locked behind tier | Upsold add-ons | No |
| **Canva Logo Maker** | Freemium within Canva | Generic template edits | Part of Canva Pro | No brand system | No (Canva Brands is separate, shallow) |
| **Namecheap Logo Maker** | Free | Minimal | PNG | No | No |
| **Wix Logo Maker** | $20-50 flat | Minimal edits | PNG/SVG | Sells a Wix site | No |
| **Figma / Illustrator** | $15-60/mo | World-class editor | Any format | Manual — designer's job | No |
| **Midjourney / DALL·E** | $10-120/mo | None (image gen) | Raster | No | No |

### 1.2 The six gaps nobody fills

1. **The "system gap"** — every competitor ships *one* logo. A real brand needs horizontal, stacked, icon, wordmark, monogram, mono black, mono white, inverse, favicon, social avatar, watermark, print-safe, transparent. Making those yourself kills a non-designer. Competitors leave it as homework.
2. **The "continuation gap"** — the logo is delivered as a ZIP and the tool is done. Nobody automatically seeds a color system, typography, guidelines, mockups, templates, and asset folders from the approved logo.
3. **The "mode gap"** — wizard tools lock out designers. Pro tools lock out founders. Nobody offers Quick ↔ Hybrid ↔ Craft that the *same user* can switch between as they learn.
4. **The "quality evaluation gap"** — every tool lets you ship a 1px-detail logo that dies at favicon size, or a low-contrast mark that fails on dark backgrounds. No live feedback during editing.
5. **The "dual-entry gap"** — every tool is either "start from scratch as a new user" or "you already have a design app." Nobody has one engine that serves both "I have nothing" and "I'm updating my existing brand's logo inside my brand portal."
6. **The "source-of-truth gap"** — even BrandingOS itself (today) has a config-driven `/dashboard/logo-maker` and the new 6-screen flow; they don't share state or models. Downstream tools have no canonical logo record to read from.

The Identity Engine closes all six.

### 1.3 What winning looks like

- A founder uses the external tool in under 10 minutes, gets 16 variants + a color system + a guidelines PDF, and signs in to find the brand already in their workspace.
- A design-led team uses the same engine inside their existing brand, bumps a variant, and the landing-page generator and social kit picks it up on next load without any re-export step.
- A pro designer opens Craft Mode, spends 90 minutes, and exports a logo system that survives an art director's review.

---

## 2. Product strategy — how BrandingOS wins

### 2.1 The positioning

> **"Your logo isn't a file. It's the first asset in a system that's already live in your workspace."**

### 2.2 Four strategic bets

1. **System over asset.** The unit we deliver is an `IdentitySystem`, not a logo. This reframes the whole product — pricing, marketing, output, even the file names in the ZIP.
2. **One engine, two entry points.** The same `IdentityEngine` module runs the external funnel and the internal brand's Identity tab. This is a *technical* strategy that becomes a *product* advantage: the minute a user signs up after the external flow, their brand is already populated with the logo system they just built.
3. **Live craft feedback.** Every other tool evaluates after the fact ("download and see"). BrandingOS evaluates during editing: contrast vs. common backgrounds, scalability at 16px, balance, readability, optical centering. Failing checks are inline, not a blocked export.
4. **Continuation by default.** Approving a logo doesn't end the session — it starts the brand build. Color palette, typography pairing, mini brand board, starter guidelines, starter templates, asset folder structure all auto-seed and are immediately editable. Competitors don't do this because they don't have a brand OS.

### 2.3 Pricing implications

- **Free** → 3 logo generations/day, up to 8 variants, PNG + SVG primary only. Enough to prove value.
- **Premium** → unlimited generations, all 16 variants, PDF guidelines, all mockups, brand continuation (color/typography/templates), team sharing, custom domain for share link.
- (Matches Hamza's Q2 answer: "Free: 3/day, unlimited for premium.")

### 2.4 What we explicitly don't try to be

- We're not a full vector illustration tool. Figma wins there. We deliberately constrain the surface area — if you want bezier-level polygon editing, use a pro tool and import.
- We're not a photography tool. No raster editing, no photo compositing.
- We're not a generic Canva competitor. We're narrower and deeper.

---

## 3. Information Architecture

### 3.1 Two entry points, one engine

```
              ┌────────────────────────────────────┐
              │   brandingos.ai/logo-maker         │
              │   (external — anonymous or signed) │
              └──────────────┬─────────────────────┘
                             │
                             ▼
              ┌────────────────────────────────────┐
              │     ⚙  Identity Engine (core)       │
              │  - IdentitySystem model             │
              │  - Variant generator                │
              │  - Preview + quality evaluator      │
              │  - Export service                   │
              │  - Persistence adapter (Brand)      │
              └──────────────▲─────────────────────┘
                             │
              ┌──────────────┴─────────────────────┐
              │   /dashboard/brand/:slug/identity   │
              │   (internal — scoped to a brand)    │
              └─────────────────────────────────────┘
```

### 3.2 External route tree

```
/logo-maker                                 Mode select (Quick/Craft/Hybrid/Upload)
/logo-maker/brief?mode=...                  Smart intake
/logo-maker/directions                      Direction Builder (curated creative directions)
/logo-maker/concepts                        Concepts wall (browse + compare + remix)
/logo-maker/editor/:logoId                  Refinement Studio (Craft editor)
/logo-maker/variants/:logoId                Variant Studio (16 variants)
/logo-maker/preview/:logoId                 Real-world preview + quality evaluation
/logo-maker/brand-kit/:logoId               Full brand kit
/logo-maker/continuation/:brandId           Post-logo brand continuation
/logo-maker/complete/:brandId               Brand registered success
```

Phase 0-7 shipped a subset: `/logo-maker`, `/brief`, `/generate` (placeholder), `/editor`, `/upload`, `/brand-kit`, `/complete`. The Identity Engine adds `/directions`, `/concepts`, `/variants`, `/preview`, `/continuation`.

### 3.3 Internal route tree

Already wired inside `BrandRouteLayout`:

```
/dashboard/brand/:slug/identity                 Overview (logo, colors, type, voice, strategy tabs)
/dashboard/brand/:slug/identity/logo            ← NEW: mounts IdentityEngine in "internal" context
/dashboard/brand/:slug/identity/logo/edit       Refinement Studio (same editor as external)
/dashboard/brand/:slug/identity/logo/variants   Variant Studio
/dashboard/brand/:slug/identity/logo/preview    Preview + quality
```

### 3.4 The crucial IA rule

**Every screen above `/logo-maker/editor/:logoId` is mode-aware but IdentitySystem-agnostic.** The Brief, Direction Builder, and Concepts Wall all produce an `IdentitySystem.draft`. The Editor, Variant Studio, Preview, and Brand Kit all operate on an `IdentitySystem`. This means the external and internal entry points share every screen from the Editor onward — only the intake differs.

---

## 4. End-to-end user flows

### 4.1 External — "I have nothing"

```
Landing page CTA
  → /logo-maker (Mode select)
  → /logo-maker/brief (Smart intake — 11 fields, progressive disclosure, auto-save)
  → [AI or Quick]  /logo-maker/directions (4-7 curated creative directions, not 36 random logos)
  → /logo-maker/concepts (6-12 logos per direction, compare / remix / favorite)
  → /logo-maker/editor/:logoId (Refinement Studio)
  → /logo-maker/variants/:logoId (Auto-generated 16 variants, one-click edit any)
  → /logo-maker/preview/:logoId (Real-world contexts + live quality report)
  → [sign-in wall if anonymous]
  → /logo-maker/brand-kit/:logoId (Full kit)
  → [Register Brand: IdentitySystem → Brand persisted]
  → /logo-maker/continuation/:brandId (Post-logo continuation: palette → type → guidelines → templates)
  → /logo-maker/complete/:brandId (Success + next steps)
```

Key behaviors:
- **Anonymous until Brand Kit.** We let someone build and edit freely; we only ask for auth when they want to persist. Draft survives via `localStorage`.
- **Backgrounded registration.** When the user hits "Save & register", we kick off `POST /brands` and navigate to the success screen optimistically. If the save fails, we surface a retry banner — we don't block the celebration.
- **Continuation is one click but fully editable.** "Generate full brand" spawns palette + type + guidelines in the background; user lands on the continuation screen and each is already filled in, each is editable, none is final until the user signs off.

### 4.2 Internal — "I'm updating an existing brand"

```
/dashboard/brand/:slug/identity/logo
  → Overview of current logo system (variants grid, quality report, last edited)
  → Either:
     [Replace logo]       → Mode select (quick/craft/hybrid) → brief pre-filled from brand → same flow as external
     [Edit current logo]  → /dashboard/brand/:slug/identity/logo/edit (Refinement Studio on existing primary)
     [Regenerate variants] → /dashboard/brand/:slug/identity/logo/variants (rerun algorithmic generator)
  → Changes update the same Brand.logoSystem live
  → Downstream pages (social-media, landing-page-gen, guidelines) pick up the new variants on next read
```

Key behaviors:
- **No modal form of engine.** Internal mode uses the same full-screen shell so the pro surface doesn't feel like a dumbed-down version. `EditorChrome` is shared.
- **Versioning.** Every approved edit creates a new `IdentitySystem.version`. The brand has a `history` list. The current version is the "published" one — editing creates a draft until approved.

### 4.3 Handoff points (external → internal)

If an external user signs in during the flow (say at Brand Kit), we *reparent* the anonymous draft to their workspace. The `localStorage` draft becomes a Supabase row. The route swaps `/logo-maker/...` → `/dashboard/brand/:slug/identity/logo/...` transparently. The URL changes; the state doesn't.

---

## 5. Core screens + UX breakdown

### 5.1 Mode Select (`/logo-maker`)

Current (Phase 1 shipped): 4 cards — AI, Wizard, Canvas, Upload.
Identity Engine evolution: **3 modes, not 4.** Upload becomes an *entry point* on every mode, not its own mode. Because once you have an SVG, the question "do I want AI help, hybrid help, or no help" is the same as without an upload. Result: less cognitive load, same capability.

| Mode | Calls | Audience |
|---|---|---|
| **Quick Launch** | Brief → Directions → Concepts → Approve | Founders, non-designers |
| **Hybrid** | Brief → Directions → Concepts → Refinement Studio → Approve | Marketers, agencies |
| **Craft** | Brief (optional) → Blank or uploaded → Refinement Studio → Approve | Designers |

Entry point "I have a logo" is surfaced on each mode card as a secondary "Upload yours instead →" link.

### 5.2 Smart Intake (`/logo-maker/brief`)

Current fields: name, tagline, description, industry, vibes, competitor URL.
Identity Engine expansion: add **audience**, **positioning** (one sentence), **keywords** (tags, 3-10), **emotional target** (one of: calm/confident/playful/urgent/…), **adjectives** (3-5 tags), **reference brands** (up to 3 URLs or names), **taboo list** (multiline, "avoid these things"), **name story** (optional textarea).

UI: progressive disclosure. Four fields visible on load (name, industry, vibes, describe). Everything else under "Add more detail ↓" accordions, labeled by payoff: "*Adjectives → sharper direction*", "*Taboo list → avoid wasted concepts*".

Rationale: shallow briefs produce shallow logos. But forcing 11 fields up-front scares non-designers. Progressive disclosure lets non-designers ship with four fields; pros can invest in a richer brief.

### 5.3 Direction Builder (`/logo-maker/directions`) — NEW

Replaces the "dump 36 logos" pattern. We generate **4-7 curated creative directions** based on the brief. Each direction is a *concept territory*, not a logo:

- **Typographic** — wordmark-led, letterform focus
- **Monogram** — initials-based mark
- **Symbolic** — abstract mark + wordmark
- **Geometric** — constructed from primitives
- **Editorial** — serif-forward, publication-like
- **Luxury** — high-contrast typography, gold/black
- **Institutional** — heritage, crest-like
- **Tech** — monospace wordmark, pixel-grid mark
- **Playful** — rounded, colorful, mascot-adjacent

Each direction card shows:
- Title (e.g. "Monogram")
- 2-sentence rationale tying it to the brief ("Because you're Finance + Luxury + Bold, a monogram keeps you serious while leaving room to grow")
- A **visual DNA card** — 4 example marks in that territory, NOT your logo yet
- A **why it fits** section (1 sentence)
- **Flexibility score** (how well this direction scales to different contexts, 1-5)
- **Memorability score** (how distinctive at 16px, 1-5)

User picks 1-3 directions to proceed into Concepts.

Why it matters: nobody else does this. Looka and friends dump 30+ logos and the user picks by "I like that one" — decision paralysis. Directions let the user pick a *philosophy* first, narrowing to ~12 logos from a curated pool.

### 5.4 Concepts Wall (`/logo-maker/concepts`) — NEW

Shows 6-12 logos per selected direction. Each concept card has:

- **Main logo** preview (primary background)
- **Black/white row** (strip of: on-black, on-white, mono black, mono white)
- **Tiny-size preview** (16px favicon-sized)
- **App icon preview**
- **Navbar preview** (on a fake website header)
- **Mockup preview** (business card corner)
- **"Why this works"** — 1 sentence rationale specific to THIS concept

Actions on each card:
- ⭐ **Favorite** (moves to a "shortlist" strip at the bottom)
- ⚖ **Compare** (select up to 4, opens a side-by-side view)
- 🔄 **Remix** ("give me 6 more like this one" — AI regenerates from same seed)
- ✏ **Refine** (opens Refinement Studio with this as base)
- 🎁 **Siblings** ("generate 6 alternates holding this layout constant")
- ✅ **Approve** (commits to this concept — proceeds to Variant Studio)

Why it matters: the Concepts Wall is the *decision* moment. Every pixel of the card helps the user evaluate this concept in the contexts they care about (favicon, mobile, dark background) before they invest in refinement. Competitors show one preview; we show eight.

### 5.5 Refinement Studio (`/logo-maker/editor/:logoId`)

Current (Phase 4 shipped): Fabric.js editor with Tools/Canvas/Properties, 5 tools, quality checks.
Identity Engine evolution — **treat the logo as a system, not a single image**:

Top-level groups now represent *logical parts*, not just objects. A logo has at least one of:
- **Wordmark group** — the brand name (and optionally tagline as a child)
- **Symbol group** — the iconic mark
- **Layout frame** — the spatial relationship

The Properties panel becomes group-aware:

**Typography controls** (when wordmark selected):
- Font family · weight · case · kerning/tracking · line spacing · word spacing
- Hierarchy slider: brand name ↔ tagline size ratio

**Symbol controls** (when symbol selected):
- Stroke vs. fill logic toggle
- Global corner-radius language (applies to all shapes in the group)
- Geometric simplification slider (smooths paths)
- Shape balance (optical centering)
- Auto-center in bounds

**Layout controls** (logo-wide):
- Horizontal / Stacked / Icon-only / Wordmark-only / Monogram / Badge toggle
- Spacing between symbol and wordmark (slider, % of symbol width)
- Tagline placement (below wordmark, to the right, tucked under)

**Tone controls** (affect everything):
- Premium / Friendly / Serious / Bold / Elegant / Modern / Expressive
- Each is a preset that nudges font weight, color saturation, spacing, etc. — *suggestions*, not hard swaps. User can preview and accept per-change.

Quality panel (already built, extended):
- Contrast vs. white/black (AA/AAA)
- Scalability at 16px (render-and-diff)
- Readability (OCR pass — can we read the wordmark? If no wordmark, skip)
- Balance (optical center distance from geometric center)
- Detail density (path complexity → 16px survivability)

### 5.6 Variant Studio (`/logo-maker/variants/:logoId`) — NEW

Once a logo is approved, **automatically generate 16 variants**. All algorithmic — no AI needed:

| # | Variant | Derivation |
|---|---|---|
| 1 | Primary | User's approved logo |
| 2 | Horizontal | Reflow: symbol left, wordmark right |
| 3 | Stacked | Reflow: symbol top, wordmark bottom |
| 4 | Icon-only | Symbol group alone |
| 5 | Wordmark-only | Wordmark group alone |
| 6 | Monogram | First 1-2 letters of brand name in symbol's position |
| 7 | Monochrome black | All fills/strokes → `#111` |
| 8 | Monochrome white | All fills/strokes → `#FFF` |
| 9 | Inverse | Swap primary ↔ secondary colors |
| 10 | Dark-bg | Logo on `#0A0A0A` |
| 11 | Light-bg | Logo on `#FFF` |
| 12 | Transparent | Checkerboard-backed |
| 13 | Favicon-safe | Simplified at 32×32 — hide elements below threshold |
| 14 | Social-avatar-safe | Centered in a safe circle, 80 % of bounds |
| 15 | Watermark | Semi-transparent (opacity 0.25), for photo overlays |
| 16 | Print-safe | CMYK-mapped colors, minimum stroke 0.5pt |

Each variant lives in the `IdentitySystem.variants` map. Each is editable: clicking "edit" opens the Refinement Studio on that specific variant, writing back only to that slot. The primary stays the source of truth for *shared* edits (e.g., changing brand name).

### 5.7 Real-world preview + quality evaluator (`/logo-maker/preview/:logoId`) — NEW

Renders the variants across 12 real contexts (reuse the 12 mockups I already built) + a dedicated quality report:

- Render each variant in 3 automatic contexts: favicon · app icon · business card
- Plus user-selectable mockups from the 12
- Live quality report (same as Refinement Studio, at system level)
- Evaluates variant-specific concerns: "*favicon-safe has detail loss above threshold*", "*social-avatar-safe bleeds past the circle at 80% inset*"

Failing checks are actionable: each shows a "Fix in editor →" link that jumps to the Refinement Studio scoped to that variant.

### 5.8 Post-logo brand continuation (`/logo-maker/continuation/:brandId`) — NEW

Once the logo is approved and the Brand is persisted:

**Auto-seeded (editable) sections:**
- **Color system** — 5 colors (primary, secondary, 2 accents, 5-step neutral ramp). First pass uses the logo's dominant colors + complementary harmony; AI palette suggestions replace this when keys land.
- **Typography pairing** — heading + body + mono, pulled from 5 curated font-mood sets (see spec §3.4).
- **Mini brand board** — one-pager with logo, colors, type, 3 "do / don't" examples.
- **Starter guidelines** — 4-page PDF (logo usage, color, type, voice cues).
- **Starter assets** — the 16 variants already in R2 as SVG + PNG + PDF.
- **Starter templates** — 5 templates pre-filled with the brand (business card, Instagram post, IG story, letterhead, email signature). These become editable files in `/dashboard/brand/:slug/assets`.
- **Asset folder structure** — `Logos/`, `Colors/`, `Typography/`, `Mockups/`, `Templates/`, `Guidelines/`.

UI: each section is a card with "Looks good" (accepts), "Edit" (opens inline editor), "Regenerate" (fresh AI pass). User can skip sections — the brand still persists.

---

## 6. Data model — the `IdentitySystem` entity

### 6.1 The core type

```typescript
// src/features/logo-maker/identity-engine/types.ts

export interface IdentitySystem {
  // ── Identity
  id: string;                              // "idn_<nanoid>"
  brand_id: string | null;                 // null until registered externally
  version: number;                         // 1, 2, 3 — each approved edit bumps
  status: 'draft' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;

  // ── Source of truth
  primary: LogoDocument;                   // the editable one

  // ── Derived variants (16 slots)
  variants: Partial<Record<VariantId, LogoDocument>>;

  // ── Systems the logo seeds
  colors: ColorSystem;
  typography: TypographySystem;

  // ── Evaluation
  quality: QualityReport;

  // ── Lineage
  brief: Brief;                            // the intake
  direction: DirectionId | null;           // the chosen creative direction
  concept_id: string | null;               // the concept it was built from
  parent_id: string | null;                // for remixes / siblings
  generation_metadata: GenerationMetadata;
}

export interface LogoDocument {
  svg: string;                             // canonical serialized SVG
  groups: {
    wordmark?: GroupRef;
    symbol?: GroupRef;
    tagline?: GroupRef;
  };
  bounds: { width: number; height: number };
  // rendered cache — regenerated on save
  png_url?: string;
  png_2x_url?: string;
  thumbnail_url?: string;
}

export type VariantId =
  | 'primary' | 'horizontal' | 'stacked' | 'icon_only' | 'wordmark_only'
  | 'monogram' | 'mono_black' | 'mono_white' | 'inverse'
  | 'dark_bg' | 'light_bg' | 'transparent'
  | 'favicon' | 'social_avatar' | 'watermark' | 'print_safe';

export type DirectionId =
  | 'typographic' | 'monogram' | 'symbolic' | 'geometric' | 'editorial'
  | 'luxury' | 'institutional' | 'tech' | 'playful';

export interface ColorSystem {
  primary: HexColor;
  secondary: HexColor;
  accents: HexColor[];
  neutrals: { darkest: HexColor; dark: HexColor; mid: HexColor; light: HexColor; lightest: HexColor };
}

export interface TypographySystem {
  heading: FontSpec;
  body: FontSpec;
  mono?: FontSpec;
}

export interface QualityReport {
  contrast: { score: Score; detail: string };
  scalability: { score: Score; detail: string };
  readability: { score: Score; detail: string };
  balance: { score: Score; detail: string };
  detailDensity: { score: Score; detail: string };
  perVariant: Partial<Record<VariantId, VariantQuality>>;
  overall: Score;
  generated_at: string;
}

type Score = 'excellent' | 'good' | 'poor';

export interface GenerationMetadata {
  mode: 'quick' | 'hybrid' | 'craft' | 'upload';
  ai_prompts: string[];
  iteration_count: number;
  time_spent_seconds: number;
  direction_ids_explored: DirectionId[];
  concepts_generated: number;
  remixes_count: number;
}
```

### 6.2 Mapping to the existing `Brand` schema

The existing `Brand` (at `src/shared/types/brand.ts`) already has `logoSystem`, `colorSystem`, `typography`, `brandAssets[]`. The Identity Engine writes into these:

| IdentitySystem | Brand field | Notes |
|---|---|---|
| `primary.svg` + rendered assets | `brandAssets[]` entries, referenced by `logoSystem.primary` | Existing pattern preserved |
| `variants.{id}` | `brandAssets[]` entries, referenced by `logoSystem.{iconOnly,wordmarkOnly,...}` | v3 schema already supports this via `LogoSystemRefs` |
| `colors` | `Brand.colorSystem` | Direct map |
| `typography` | `Brand.typography` | Direct map |
| `brief` | Stored on `Brand.generation_metadata` JSONB | New column — one migration in Phase 2 |
| `version` + `status` | Stored on `Brand.generation_metadata` | Same migration |

**No new `brands_v2` table. No parallel schema.** The Identity Engine is an *application layer* that produces and consumes the existing Brand type. This is the single-source-of-truth promise — it's not just in the Identity Engine, it's threaded into the product.

### 6.3 Versioning

Every approved edit creates a new `IdentitySystem` row in a new `identity_systems` table (Phase 2 migration). The brand's "current" system is pointed at via `brands.identity_system_id`. Historic versions remain queryable for "revert" and for the audit trail the brand-consistency engine wants.

---

## 7. MVP / V2 / V3 feature split

### MVP (Phases 1-7, mostly shipped)

- ✅ Mode Select (3 modes + Upload entry points)
- ✅ Brief intake (basic fields)
- ✅ Refinement Studio (Fabric-based editor)
- ✅ Quality checks (contrast + scalability)
- ✅ Brand Kit screen with 12 mockups
- ✅ Brand registration success shell
- ✅ Client-side vectorize upload
- 🟡 Variant Studio (being added now)
- 🟡 IdentitySystem type layer (being added now)

### V2 (next sprint, blocked on AI keys)

- **Direction Builder** — Claude-generated curated directions
- **Concepts Wall** with favorite/compare/remix/siblings
- **AI-assisted Refinement** — color suggestions, style transfer, variant generation
- **Post-logo continuation** — auto-palette, auto-typography, guidelines PDF with AI copy
- **Internal mode wiring** — `/dashboard/brand/:slug/identity/logo`
- **Versioning** — approved-vs-draft state, `identity_systems` table
- **Live readability + balance + detail density** quality checks

### V3 (longer horizon)

- **Remix graph visualization** — see lineage of variants and concepts
- **Team approvals** — design review flow on identity edits
- **Multi-brand migration** — rebrand an existing brand's identity while keeping downstream assets consistent
- **AI guidelines writer** — full 24-page brand guidelines PDF with tone samples, Do/Don't examples, writing voice
- **Dynamic logos** — responsive logos that change by context (time, device, page)
- **Logo animation system** — generate Lottie/video variants

Explicitly *not* in V3: custom font upload, 3D logos, multi-user live editing. Out of scope for the engine.

---

## 8. Technical architecture

### 8.1 Module layout

```
src/features/logo-maker/
  flow/                          ← the external 6-screen flow (shipped)
    screens/, components/, state/, utils/
  identity-engine/               ← NEW: the unified engine
    types.ts                     ← IdentitySystem, LogoDocument, all core types
    engine.ts                    ← IdentityEngine facade (create, load, save, approve, derive)
    variants/
      generator.ts               ← 16-variant algorithmic generator
      transforms.ts              ← pure SVG transforms (reflow, monochrome, inverse, etc.)
    quality/
      evaluate.ts                ← full quality report builder
      checks/
        contrast.ts
        scalability.ts
        readability.ts
        balance.ts
        detail-density.ts
    export/
      svg.ts                     ← canonical SVG serializer
      raster.ts                  ← PNG @1x/@2x via html2canvas or OffscreenCanvas
      pdf.ts                     ← per-variant PDF
      zip.ts                     ← full kit zip
    persistence/
      local.ts                   ← anonymous draft to localStorage
      supabase.ts                ← auth'd persistence (Phase 9)
      migration.ts               ← localStorage → Supabase on sign-in
    preview/
      contexts.ts                ← 12 mockup contexts + evaluators
  components/                    ← the existing /dashboard/logo-maker editor (untouched)
```

### 8.2 The `IdentityEngine` facade

```typescript
// src/features/logo-maker/identity-engine/engine.ts

export interface IdentityEngineContext {
  mode: 'external' | 'internal';
  workspaceId?: string;           // required for internal
  brandId?: string;               // required for internal
  userId?: string;                // present on authenticated sessions
}

export interface IdentityEngine {
  create(brief: Brief, ctx: IdentityEngineContext): Promise<IdentitySystem>;
  load(id: string): Promise<IdentitySystem | null>;
  updatePrimary(id: string, svg: string): Promise<IdentitySystem>;
  regenerateVariants(id: string): Promise<IdentitySystem>;
  editVariant(id: string, variantId: VariantId, svg: string): Promise<IdentitySystem>;
  approve(id: string): Promise<IdentitySystem>;       // snapshots current → approved state
  evaluate(id: string): Promise<QualityReport>;
  persistToBrand(id: string): Promise<{ brandId: string }>; // external → creates Brand
}
```

One implementation, two callers. External code paths use `context.mode = 'external'`; internal paths pass `mode: 'internal' + brandId`. `persistToBrand` handles the anonymous-to-authenticated handoff.

### 8.3 Variant generation — pure functions, no API

Each variant is a pure SVG transform on the primary. Examples:

- **Monochrome black** — walk the DOM, replace every `fill=` and `stroke=` with `#111111`
- **Inverse** — swap the two most-common colors
- **Icon-only** — return the symbol group, bounding box normalized
- **Horizontal** ↔ **Stacked** — requires the primary to be tagged (groups.symbol, groups.wordmark). Reflows by rewriting transforms.
- **Favicon** — render at 32 × 32, hide paths whose bounding box < 3 × 3 px at that scale

All live in `identity-engine/variants/transforms.ts` as pure functions `(svg, ctx) → svg`. The generator composes them.

### 8.4 Persistence

- **Anonymous drafts** live in `localStorage` under `identity:<clientId>:<idnId>`.
- **Authenticated drafts** live in Supabase table `identity_systems` with RLS policies (only workspace members read/write).
- On sign-in during an anonymous session, the migration adapter moves localStorage → Supabase and rewrites IDs.
- Binary assets (SVG, PNG, PDF) live in Supabase Storage bucket `brand-assets`, path `brandId/identitySystemId/variantId.{ext}`.

### 8.5 Security + API surface

- No `VITE_ANTHROPIC_API_KEY` in the bundle ever — all AI calls go via Supabase Edge Functions (Phase 2). The current `/src/features/logo-maker/components/AILogoSuggestions.tsx` calling Anthropic directly is a security debt to pay down before public launch.
- Rate limits on AI endpoints per spec §5.3 (3/day free, unlimited premium, checked via `check-plan-limit` Edge Function that already exists).
- Share link: `brandingos.ai/b/<slug>` with a short signed token to prevent enumeration. This is already hinted at in the existing `publicUrl` field.

### 8.6 Observability

- Analytics events per spec §8 — wire to GA + Clarity in Phase 10 once scripts are loaded (they aren't today, despite Hamza's Q7 answer).
- Error boundaries at screen level, not feature level — a busted Preview screen shouldn't take down the Editor.
- Quality evaluator failure → warning, not error. If readability OCR fails, the UI shows "Readability not evaluated" rather than blocking the export.

---

## 9. Build plan

### Phase 11 (this iteration) — Identity Engine core

1. Ship `identity-engine/types.ts` + `engine.ts` facade — the architectural spine. No UI yet.
2. Ship `identity-engine/variants/` with the 16 variant transforms — pure functions + a small unit test.
3. Ship a new `/logo-maker/variants/:logoId` screen that calls `regenerateVariants` and renders all 16. Wire from the existing Editor's "Build brand kit →" button: now it goes to Variant Studio first, then Brand Kit.
4. Migrate the existing Brand Kit screen to *consume* the IdentitySystem's variants instead of inventing its own.

### Phase 12 — Real-world preview engine

5. Ship `identity-engine/preview/` and `/logo-maker/preview/:logoId`. Reuses the 12 existing mockups + adds per-variant quality evaluation.
6. Extend quality checks with readability (OCR via a WASM tesseract) + balance (optical centroid diff) + detail density.

### Phase 13 — Internal mode wiring

7. Add routes under `/dashboard/brand/:slug/identity/logo/*` that mount the same engine screens with `context.mode = 'internal'`.
8. Supabase migration: create `identity_systems` table; add `brands.identity_system_id FK`.
9. Implement `persistence/supabase.ts` and the anonymous → authenticated migration adapter.

### Phase 14 — Direction Builder + Concepts Wall (needs AI)

10. Implement Supabase Edge Function `logo-directions` calling Claude.
11. Ship `/logo-maker/directions` with curated direction cards + selection.
12. Ship `/logo-maker/concepts` with the 8-sided concept cards + favorite/compare/remix/siblings.

### Phase 15 — Brand continuation (needs AI)

13. Edge Functions `palette-suggester`, `typography-pairer`, `guidelines-writer`.
14. `/logo-maker/continuation/:brandId` screen with 6 auto-seeded sections.
15. Template generator: 5 templates pre-filled with brand context.

### Phase 16 — Premium polish + V3 seeds

16. Remix graph visualization.
17. Versioning UI (identity history, revert).
18. Team approvals workflow.

---

## 10. Risks, edge cases, scalability

### 10.1 Product risks

- **The "wizard vs. craft" tension.** If Quick Launch is too good, designers default to it and we never get pro adoption. If Craft is too intimidating, founders bail. Mitigation: Quick Launch always offers "Open in Craft" at every step; no one-way doors.
- **The "continuation creep" risk.** Auto-seeding 6 sections can feel like work we did *for* the user, not work they own. Mitigation: every section's first card is *their* input (name, intended tone), not our output, so it feels co-created.
- **Favorite AI output fatigue.** If Concepts Wall always regenerates, users can't anchor. Mitigation: favorites persist across regenerate; locked favorites don't get replaced.

### 10.2 Technical risks

- **Fabric v6 stability.** Built-in history removed; our custom history works but has quirks under large object trees. Mitigation: cap snapshot depth at 50 and offer a Cmd+Shift+Z alternative via snapshot diff (later).
- **SVG transform fidelity.** Monochrome works cleanly on paths but fails on gradients and patterns. Mitigation: when we detect gradients, we flatten them to the dominant color before monochrome.
- **Variant generation correctness.** Horizontal/Stacked reflow requires tagged groups (symbol vs. wordmark). If a logo is one ungrouped path, we can't reflow. Mitigation: during approval, require tagging (a guided step: "Which part is the symbol?"), or fall back to "this variant unavailable — group your primary first".
- **OCR readability check cost.** Tesseract WASM adds ~1MB to the bundle. Mitigation: lazy-load only on the Preview screen.

### 10.3 Scalability

- **Storage.** Every approved identity is up to 16 SVG + 32 PNG + 16 PDF in R2/Storage. ~3-5 MB/identity. 10k identities = ~50 GB, trivially cheap on Supabase Storage. Variant regeneration is idempotent — we can drop caches and regenerate any time.
- **AI cost.** At 3/day free, 100/day premium, avg 36 concepts/generation, each concept = 1 Claude call + 1 Gemini image call. Per-user worst case ~7000 calls/day. We gate by workspace plan at the Edge Function, not at the Edge Function request level, because we want the UI to degrade gracefully, not 429.
- **Edge Function latency.** Claude + Gemini in series = 5-12s. Mitigation: kick off generation as a background job with polling (spec already plans this), show skeletons in Concepts Wall, let the user refine the brief while generation runs.
- **Migration risk.** When an anonymous draft migrates to Supabase after sign-in, two tabs could race. Mitigation: lock-on-migration flag in localStorage + server-side dedupe by client UUID + brief hash.

### 10.4 Abuse + compliance

- **Competitor IP risk.** Reference brands field invites infringement requests. Mitigation: brief's "reference brands" are used only as *anti-patterns* — the prompt explicitly says "what to avoid resembling", not "mimic this". Add a small legal line to Brief under that field.
- **Font licensing.** Only Google Fonts + open-licensed faces. No Adobe Fonts, no custom uploads. If we ever add Adobe, per-user licensing becomes a legal project.
- **User-uploaded logos.** For Upload mode, we only vectorize — we never claim rights. `generation_metadata.mode = 'upload'` flags these for downstream tools.

---

## 11. What I'm delivering now alongside this doc

A concrete code commit that puts the first *architectural* piece in place — the one that cashes the "single source of truth" promise:

- `src/features/logo-maker/identity-engine/types.ts` — the `IdentitySystem` model above
- `src/features/logo-maker/identity-engine/variants/` — the 16-variant algorithmic generator, pure functions
- `/logo-maker/variants/:logoId` — a new screen that consumes the engine and renders all 16 variants with edit-per-variant links
- Brand Kit screen wired to consume engine variants instead of inventing its own

Direction Builder, Concepts Wall, internal-mode routes, and brand continuation stay deferred until API keys land. They're fully specified here so those phases can be picked up without re-litigating.

— End brief.
