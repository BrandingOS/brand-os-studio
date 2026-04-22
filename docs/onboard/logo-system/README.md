# Logo Generation System — Master Spec

A 5-layer architecture for generating editorial-grade logo systems. Designed to outclass template-based tools (Brandmark, Looka) by combining curated typography + symbol systems + an LLM orchestrator + curated mockup scenes.

---

## The 5 Layers

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 4 — ORCHESTRATION LLM (the brain)                │
│  Reads brand brief → outputs JSON spec                  │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │ queries
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  LAYER 1      │  │  LAYER 2      │  │  LAYER 3      │
│  FONT LIBRARY │  │  SYMBOL LIB   │  │  LAYOUT SCHEMA│
│  ~70 fonts    │  │  ~380 SVGs    │  │  ~17 layouts  │
└───────────────┘  └───────────────┘  └───────────────┘
                             │
                             ▼
                  ┌───────────────────┐
                  │  RENDERING ENGINE  │
                  │  (combines specs   │
                  │   into SVG logos)  │
                  └───────────────────┘
                             │
                             ▼
                  ┌───────────────────┐
                  │  LAYER 5          │
                  │  MOCKUP SCENES    │
                  │  ~30 scenes       │
                  └───────────────────┘
                             │
                             ▼
                       Final output
                  (Pinterest-grade board)
```

---

## File Index

| File | Purpose |
|---|---|
| `01-font-library.json` | 70+ curated typefaces, tagged and queryable |
| `02-symbol-library-spec.md` | Symbol categories, sourcing, tagging schema |
| `03-layout-schema.json` | 17 composition templates (wordmark, lettermark, emblem, etc.) |
| `04-mockup-scenes.md` | 30 curated presentation contexts |
| `05-orchestration-prompt.md` | The LLM system prompt that ties it all together |

---

## Build Sequence (recommended)

**Phase 1 — Data foundation (2 weeks)**
1. License the commercial fonts in `01-font-library.json` (Klim, Dinamo, Pangram Pangram, 29LT priority)
2. Build the symbol library directory structure per `02-symbol-library-spec.md`
3. Commission the Arabic motif set (~40 SVGs) from a regional designer

**Phase 2 — Engine (3 weeks)**
4. Implement the layout renderer that consumes `03-layout-schema.json` + libraries → SVG output
5. Wire up the orchestration LLM with the prompt from `05-orchestration-prompt.md`
6. Build a queryable index for fonts/symbols/layouts (lightweight — JSON-in-memory is fine)

**Phase 3 — Presentation (2 weeks)**
7. Photoshoot the 30 mockup base plates per `04-mockup-scenes.md`
8. Build the mockup compositor (logo SVG → projected onto scene with lighting/shadow)

**Phase 4 — UI integration (1 week)**
9. Connect to your existing Define / Feel screens
10. Implement Shuffle / Lock / Finish flows per the orchestration prompt's flow spec

**Total to launch: ~8 weeks** with a small team (1 designer, 1 backend, 1 frontend, 1 PM).

---

## What This Beats

| Competitor | Their advantage | Where we win |
|---|---|---|
| **Brandmark** | Instant, cheap, brand kit | Style range, editorial polish, Arabic-native |
| **Looka** | Fast onboarding | Quality, mockup variety, type curation |
| **Wix Logo Maker** | Mass distribution | Everything design-related |
| **Tailor Brands** | AI-driven | Real curation vs algorithmic templates |
| **Hatchful** | Free | Premium positioning, real usability |

---

## Open Questions to Resolve Before Building

1. **Licensing strategy** — buy commercial font licenses up-front or build an OFL-only baseline first?
2. **Custom symbol commissioning budget** — $5k–$15k for the launch Arabic motif set
3. **Mockup photography budget** — $8k–$20k for the 30-scene shoot
4. **Orchestrator model** — Claude Sonnet 4 (premium output, ~$3/Mtok) vs Haiku (faster, cheaper, less nuanced reasoning)
5. **Caching strategy** — common brand briefs (e.g., "modern coffee shop") should hit a warm spec cache

---

## North Star

The user generates a logo. Screenshots one of the mockup scenes. Posts it to Pinterest with no caption. Other people save it.

That's the bar. Everything in this system serves that bar.
