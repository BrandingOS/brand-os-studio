# AI services for the Logo Maker flow

One file per AI service. Services never import from each other (spec §4.3 —
isolation for parallel Claude pipelines and to avoid merge conflicts).

## Phase 0 scaffold

Placeholders only. Real implementations arrive in the phase listed.

| Service | Phase | Purpose |
|---|---|---|
| `logo-generator.service.ts` | 3 | 36-concept generation (Claude → Gemini) |
| `name-suggester.service.ts` | 3 | 10 brand-name suggestions |
| `palette-suggester.service.ts` | 3 | 6 color palettes |
| `tagline-writer.service.ts` | 3 | 5 tagline options |
| `style-transfer.service.ts` | 5 | Apply visual style from another logo |
| `vectorizer.service.ts` | 7 | Raster → SVG (VTracer + Recraft fallback) |
| `competitor-analyzer.service.ts` | 3 | URL → "what to avoid" report |

Shared clients (`claude-client.ts`, `gemini-client.ts`, `prompt-templates.ts`,
`types.ts`) live in `./shared/` and are the ONLY files services are allowed to
import from — nothing cross-service.

## Why this folder and not `src/services/ai/`

Repo convention: shared services live in `src/shared/services/*` (see
`brands.supabase.ts`, `aiService.ts`). The spec's `/src/services/ai/` path is
adapted accordingly. See `docs/logo-maker/ADR-0001-scaffold.md` §6.
