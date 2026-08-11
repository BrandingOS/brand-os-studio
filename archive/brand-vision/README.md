# Brand Vision — Brand-Asset Image Classifier

Standalone Python/FastAPI service that looks at an uploaded image and decides
**what it is** — full logo lockup, logotype (wordmark), logo icon (mark), plain
photo, color palette, font specimen, illustration, pattern, document, mockup —
so the BrandOS onboarding flow can auto-place every upload into the right
section (Logos / Images / Colors / Fonts / Files) and even the right logo slot.

Completely independent of the main app (same precedent as `landingpage/`).
Integration with onboarding happens later over the frozen JSON contract in
`src/brand_vision/schema.py`.

## Engines (selectable at test time)

| Engine | What it is | Needs |
|---|---|---|
| `heuristic` | Deterministic decision tree over measured signals (transparency, colors, SVG structure, text bands, tiling…). Instant, free, golden-tested. | nothing |
| `local` | Zero-shot CLIP (open_clip ViT-B-32). No external API. | `uv sync --extra local` (~2 GB torch download) |
| `claude` | Claude Vision (`claude-opus-5`) with structured outputs; the measured signals are sent as evidence alongside the image. | `ANTHROPIC_API_KEY` |
| `hybrid` | **Default & most accurate.** Claude verdict cross-checked against the deterministic signals with ordered fusion rules; never hard-fails (falls back to heuristic). | `ANTHROPIC_API_KEY` |

## Quick start

```bash
cd brand-vision
uv sync                                  # install deps (fast)
cp .env.example .env                     # then put your ANTHROPIC_API_KEY in .env or export it
uv run python -m brand_vision serve      # → http://localhost:8300
```

Open **http://localhost:8300** — drop an image, pick an engine (or **⚡ compare
all**) and see category, confidence, placement, logo slot, reasoning, and the
raw measured signals side-by-side per engine.

### CLI

```bash
uv run python -m brand_vision classify path/to/*.png --engine hybrid
uv run python -m brand_vision classify logo.svg --engine all --json
uv run python -m brand_vision report --engine all          # accuracy + confusion matrix
```

### Tests

```bash
uv run pytest                            # offline: synthetic fixtures + mocked Claude
uv run python scripts/gen_synthetic_fixtures.py   # regenerate fixtures if needed
BRAND_VISION_LIVE_TESTS=1 uv run pytest -m live   # real Claude calls (needs API key)
```

### Measuring accuracy on YOUR brand assets

1. Drop real images into `fixtures/real/` (gitignored).
2. Add entries to `fixtures/labels.json`:
   ```json
   { "real/acme-logo.png": { "category": "logo_lockup", "logo_slot": "horizontal" } }
   ```
3. `uv run python -m brand_vision report --engine all` → per-engine accuracy,
   per-class recall, slot accuracy, and a confusion matrix. Use this to compare
   the engines and decide which one ships.

## API

| Route | Description |
|---|---|
| `GET /` | Built-in test bench UI |
| `POST /classify` | multipart `file` + form `engine` (`heuristic\|local\|claude\|hybrid\|all`) → `ClassificationResult` (or `{engine: result}` for `all`) |
| `POST /classify/batch` | multipart `files[]` + `engine` |
| `GET /engines` | Engine availability + hints |
| `GET /health` | Status + engine availability |

CORS defaults allow `http://localhost:8080` (main app dev server) and `:5173`.

### Response contract (frozen)

```jsonc
{
  "category": "logo_lockup",       // 11 categories — see schema.py
  "confidence": 0.93,
  "placement": "logos",            // logos | images | colors | fonts | files
  "is_logo": true,
  "logo_slot": "horizontal",       // onboarding-v4 LogoSlot union, or null
  "reasoning": "…",
  "signals": { "transparency_ratio": 0.78, "dominant_colors": ["#249c84"], … },
  "engine": "hybrid",
  "model": "claude-opus-5",
  "latency_ms": 2100,
  "needs_review": false,
  "review_reasons": []
}
```

`logo_slot` maps 1:1 onto `OnboardingAsset.logoSlot`
(`src/features/onboarding-v4/types.ts`); `mapping.to_logo_role()` converts to
the v3 `LogoRole` vocabulary (`src/shared/types/brandAssets.ts`). Slot color
convention follows the onboarding inversion: the **dark** slot holds the
*light/white* artwork (meant FOR dark backgrounds) and vice versa.

## Integration (later phase)

`enqueueFile()` in `src/features/onboarding-v4/utils/assetUpload.ts` is the
single choke point for every onboarding upload — call `POST /classify` from
there and map the result onto `kind` / `isLogo` / `logoSlot`. For production
either keep this service deployed (required if the `local` CLIP engine
matters), or port the claude+fusion path to a Supabase Edge Function following
`supabase/functions/_shared/ai.ts` — the frozen schema makes either a drop-in.

## Native dependency note

SVG rasterization uses `cairosvg`, which needs the cairo system library
(`brew install cairo` on macOS). If cairo is unavailable, raster formats still
work; only `.svg` classification is affected.
