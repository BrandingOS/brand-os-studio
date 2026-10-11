# Start From Logo — `/onboard-brand/logo`

The second way into BrandingOS. The owner brings **one logo** (a solid black
mark is the expected case) and a name; the product builds the whole identity
around it, step by step, and hands over a saved brand plus an organised,
downloadable package.

Entry points: "Only have a logo? Build the brand from it" on `/onboard-brand`
panel 1, and "Have a logo? Start from it" on `/onboard-brand/create`.

## The journey (`?step=` — the URL owns the step)

| step | who works | what happens |
|---|---|---|
| `logo` | owner | upload (SVG/PNG/JPG/WebP ≤ 5 MB) + name; the filename suggests the name |
| `read` | product | the mark is measured and described; each finding names the decision it drives. The one reading a machine can get wrong — symbol / name / both — is asked back |
| `context` | owner | industry · audience · positioning · personality (≤3) required; colour love/avoid optional. All controlled-vocabulary ids from `onboarding/vocabulary`, so Setup reads them back verbatim |
| `directions` | product → owner | three DISTINCT strategies, each a mini board of the owner's real logo, each argued from the read and the answers. "Show me three different" never repeats an archetype already seen |
| `system` | owner | live brand board + a panel per part (colour · type · shapes · pattern · logo · voice). Each part is approved on its own |
| `build` | product | creates the brand and writes everything (narrates only real work) |
| `package` | owner | the hub: the board, doors into Brand Kit / Guidelines / Design / Setup, every deliverable by folder with per-format downloads, and one zip |

A step that cannot render with the draft is clamped to the furthest one that
can (`model/steps.ts → furthestReachable`). Once built, the draft steps
redirect to the hub.

## Layers

```
model/      types · flowStore (zustand, sessionStorage — a draft, not a brand) · steps
engine/     logoRead      pixels → metrics (pure-testable) → traits → findings
            palette       five ROLES, contrast-safe; nudges; avoid/anchor hues
            archetypes    the direction library — one entry per direction
            directions    DirectionGenerator boundary + localDirectionGenerator
            graphics      pattern + shape SVG strings (preview = file bytes)
            logoArt       recolour (vector) / tint (raster), lockups, variations
persist/    commitBrand   the ONLY write path
export/     package       the catalog + builders + zip;  social  canvas posts
steps/ components/ styles/
```

## Rules that bind

- **The AI seam is `DirectionGenerator`** (`engine/directions.ts`). A model
  replaces `localDirectionGenerator` by returning `Direction[]`; nothing up- or
  downstream changes. It must keep two promises: three directions that differ
  by FEEL, and a rationale that names a reason from the logo or the answers.
- **Everything downstream reads `BrandSystem`, never a `Direction`.** A
  direction is a proposal; the system is the decision.
- **The brand is written through the onboarding seams, not a second path**:
  `createBrand` (brand-first, sentinels) → `storeMaterial` + `logoSystemPatch`
  (logo bytes in the Library; primary + `mono.white` refs) → `editAsUser` per
  Core path (confirmed — the owner approved it) → `saveBusinessFact`
  (industry) → `clearPlaceholders` → `finishOnboarding`. `coreWrites` is pinned
  by a test to real `CORE_FIELD_PATHS`.
- **The logo is drawn as a tinted `<img>`, never a CSS mask** — html2canvas
  cannot see masks, and the board on screen is the board that is exported.
  Give `LogoMark` a PIXEL height: a percentage height on the img does not
  resolve inside these grid tiles and the mark overflows.
- **Vector honesty.** An SVG upload yields real recoloured SVGs (paths
  rewritten, nested — `logoArt.recolorSvg`). A raster upload yields PNGs and
  the hub says an SVG would give vectors. Never wrap a bitmap and call it SVG.
- **Reuse, not copies:** guidelines PDF = `brand-kit/data/brandBook`, tokens +
  ASE = `brand-kit/data/tokensExport`, deck = `brand-kit/exporters/deckPptx`.
  The package and a later Brand Kit export describe the brand identically.
- **jsPDF images must be compressed** (`addImage(…, 'FAST')`) — uncompressed,
  a print logo PDF came out at 49 MB.
- **Leave before resetting.** The hub navigates first and resets the draft on
  the next tick; resetting while mounted trips the screen's own guard and
  bounces to step 1.
- CMYK is shown as approximate (`CMYK≈`) — a real print conversion needs the
  printer's profile.

## Not built, and known

- Logo creation itself (the brief skips it).
- No persisted per-direction history; "show different" is session-only.
- Lockup SVG sets the name as live text naming the family (the recipient needs
  the Google font installed); the PNG is rendered with it.
- Logo PDFs embed a high-res raster, not vector paths.

## Tests

`__tests__/engine.test.ts` (unit, 32) — ink isolation, measurement, trait
thresholds, palette contrast/avoid/anchor/nudges, direction ranking,
distinctness, rationale, "show different", step gating, Core paths.
`__tests__/logoFlow.browser.test.tsx` (Chromium, real local services) — the
whole flow from upload to hub, the saved brand read back through the
canonical repository, and real builds of the SVG, board PNG, brand-book PDF,
PPTX, social PNG and the full zip.
