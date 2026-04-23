# Adaptive Case Study Deck — Design

**Date:** 2026-04-24
**Feature:** `src/features/case-study-deck`
**Routes:** `/b/:slug/case-study`, `/dashboard/brand/:slug/case-study`
**Entry points:** Templates (new "Case Study" category) · Share → Exports → Case Study Deck

## Goal

Every brand in BrandOS produces a Behance-style case-study deck — 10 slides
of identity presentation — automatically from its own logo, palette,
typography, strategy, and assets. The deck must not feel stamped: two
brands should yield decks that read as distinct identities.

## Non-goals

- A from-scratch slide editor (escape hatch to existing Fabric canvas).
- Photo-realistic mockups via external render services.
- PPTX-specific export tuning (PDF + PNG zip cover the Behance upload path).

## Anti-stamp approach

Instead of 10 fixed layouts, the system defines **10 slide archetypes ×
3–4 variants each (29 total compositions)**, plus a **director** that
picks variants by reading:

- Personality (`brand.guidelines.strategy.personality`) → *bold / editorial
  / technical / elegant / playful*.
- Palette shape (luminance, chroma) — decides light/dark rhythm.
- Asset inventory (portraits, scenes, image count) — routes to
  photo-dominant variants when assets exist, type-dominant when not.
- Signature-slide seed = `djb2(brandId + updatedAt + palette)` — deterministic
  generative artwork unique to each brand.

Result: same vocabulary, bespoke output.

## Slide archetypes

| # | Archetype | Variants | Notes |
|---|---|---|---|
| 01 | Cover | A color-flood+silhouette · B photo-hero+wash · C typographic · D split | Matches ref slide 01 |
| 02 | Manifesto | A quote · B oversize headline · C editorial | Mission, tagline |
| 03 | Moodboard | A dark floating cards · B light stacked · C asymmetric grid | Matches ref slide 02 |
| 04 | Palette | A bands+specs · B squares · C circles | Full spec list per swatch — ref slide 03 |
| 05 | Typography | A specimen · B ladder · C headline+product | Matches ref slide 05 |
| 06 | Signature | A generative tessellation (seeded) | Unique per brand |
| 07 | Environmental | A booth · B lobby signage · C activation | Ref slide 04 |
| 08 | Digital | A laptop · B phone stack · C dashboard | Ref slide 06 |
| 09 | Stationery | A flatlay · B isometric · C hero-shots | Ref slide 07 |
| 10 | Outdoor | A mesh banner · B billboard · C transit poster | Ref slide 08 |

## Architecture

```
src/features/case-study-deck/
├── types.ts                 # DeckPlan, DeckMode, SlidePick, BrandProfile
├── constants.ts             # 1920×1080, storage keys
├── utils.ts                 # color math, seeded RNG, Google Fonts URL
├── director.ts              # brand → DeckPlan (pure)
├── storage.ts               # localStorage per-brand persistence
├── SlideFrame.tsx           # canonical 1920×1080 frame
├── slides/
│   ├── shared.tsx           # LogoMark, Display, Body, LabelRule, Silhouette
│   ├── CoverSlides.tsx          (A,B,C,D)
│   ├── ManifestoSlides.tsx      (A,B,C)
│   ├── MoodboardSlides.tsx      (A,B,C)
│   ├── PaletteSlides.tsx        (A,B,C)
│   ├── TypographySlides.tsx     (A,B,C)
│   ├── SignatureSlide.tsx       (A — generative)
│   ├── EnvironmentalSlides.tsx  (A,B,C)
│   ├── DigitalSlides.tsx        (A,B,C — with inline website mock)
│   ├── StationerySlides.tsx     (A,B,C)
│   ├── OutdoorSlides.tsx        (A,B,C)
│   └── renderer.tsx         # archetype+variant → component
├── viewer/CaseStudyViewer.tsx  # scroll-snap, thumb rail, inspector
├── hooks/useDeckPlan.ts
├── export.ts                # html2canvas → jsPDF / zip of PNGs
├── pages/CaseStudyPage.tsx  # /b/:slug/case-study
└── index.ts
```

Each slide component reads `BrandProfile` + optional `SlideOverrides` and
renders into a `SlideFrame` at native 1920×1080. Viewer scales with CSS
transform for preview; exporter strips the transform and captures the
natural pixel grid.

## Editability

1. **Auto-generate** — deck exists on first visit, under 1s, zero input.
2. **Per-slot overrides** — inspector panel swaps headline, subhead, credit,
   image URL per slide.
3. **Variant swaps** — one click changes cover from A → B etc.
4. **Hide slides** — toggle off; hidden slides skip in export.
5. **Canvas escape hatch** — "Canvas edit" button opens existing Fabric
   guidelines editor at `/b/:slug/guidelines/canvas` with deck context.

## Storage

`localStorage['brandos:case-study-deck:v1']` — `{ [brandId]: StoredDeck }`.
`StoredDeck` = `{ plan, overrides, variantOverrides, hidden }`.
Regenerate wipes user overrides; `reset()` drops overrides only.

## Export

Reuses `html2canvas` + `jsPDF` + `jszip` (already in deps). PDF is
multi-page landscape 1920×1080; PNG zip names files `01.png`…`10.png`.

## Mockup imagery strategy

Each image-bearing slide has a slot. Four sources (v1 ships first two;
last two are stubs for follow-up):

1. **Upload / Asset picker** — uses brand's existing `brandAssets[]`.
   Image URL override in inspector accepts any URL.
2. **CSS/SVG composited mockups** (fallback default) — booth, billboard,
   laptop, flatlay, mesh banner, metro poster are all CSS+SVG compositions.
3. AI-generate (future) — hook to existing brand-consistency pipeline.
4. Stock scene library (future) — curated stock + brand overlay.

## Out of scope for v1

- PPTX-specific slide conversion (jsPDF output is enough for Behance upload).
- Public share link tailored to this deck (Share → Showcase still points at
  existing Brand Portal; a dedicated `/case-study/:slug` public route is a
  follow-up).
- Drag-drop editing on the slide itself (use canvas editor escape hatch).

## Verification

- `npm run typecheck` → 0 errors.
- `npm run lint` → 0 new errors; 1 auto-fixed warning in `director.ts`.
- `npm run build` → `CaseStudyPage` chunks as `~95 KB / 21 KB gzip`.
