# Layer 2 — Symbol Library Specification

The symbol library is the second pillar of the logo system. Where the font library handles type, this handles every visual mark, glyph, frame, and abstract form that can be paired with type to make a logo.

**All symbols are vector (SVG). No raster. No exceptions.**

---

## Library Composition Target

| Category | Target Count | Source Strategy |
|---|---|---|
| Geometric primitives | 60 | Built in-house |
| Abstract marks | 80 | Built + AI-vectorized |
| Frames & badges | 50 | Built in-house |
| Letterform constructions | 40 | Generated from font library |
| Pictorial — universal | 80 | Curated + commissioned |
| Pictorial — Arabic/regional motifs | 40 | Commissioned |
| Decorative dingbats | 30 | Curated |
| **Total baseline** | **~380** | |

This is the launch library. Every quarter, add 50 new symbols based on usage data — what's getting picked, what's getting skipped.

---

## Categories (in detail)

### A. Geometric Primitives
The foundation. Pure shapes in many states.
- Circle, square, triangle, hexagon, pentagon, octagon
- Each with variants: outline, filled, half, quarter, with stroke weights
- Combinations: overlapping circles, stacked rectangles, divided shapes
- Negative space variants (donut, ring, frame versions)

**Use case:** Bauhaus, Swiss Minimal, Tech, Brutalist style families

### B. Abstract Marks
Non-representational forms with personality.
- Dynamic strokes, swooshes, gestural marks
- Infinite-loop variants (handle with care — cliché territory)
- Folded/origami forms
- Particle-cluster forms
- Gradient mesh forms (for Y2K/Chrome only)
- Modular grid systems (MIT Media Lab energy)

**Use case:** Tech, Creative agencies, Modern brands

### C. Frames & Badges
Containers for wordmarks/lettermarks. The skeleton of every emblem logo.
- Circle badge, oval badge, shield, banner, ribbon, crest
- Modern frames: thin-line rectangle, bracket pairs, corner ticks
- Vintage frames: laurel wreaths, scrolls, art-deco fan
- Stamp frames: irregular circle, hexagonal stamp, postal stamp
- Editorial frames: rule lines, dividers, page-corner marks

**Use case:** Emblems, vintage workwear, editorial, badges, stamps

### D. Letterform Constructions
Auto-generated from the font library — initial-letter compositions.
- Single letter on shape (A in circle, B in square)
- Stacked initials (two letters vertically)
- Overlapping initials (A overlapping B)
- Mirrored initials (A reflected)
- Letter-as-pictorial (the letter forms a shape, e.g., the A becomes a mountain)

**Use case:** Lettermarks, monograms

### E. Pictorial — Universal
Real objects, abstracted to their essence.
- Nature: mountain, tree, leaf, sun, moon, wave, flame, cloud
- Animals: bird (multiple silhouettes), fish, lion, horse, wolf, eagle
- Objects: cup, key, anchor, arrow, eye, hand, star
- Architecture: arch, column, pyramid, dome, gate

**Quality bar:** Each object should exist in at least 5 stylistic variants (linear, geometric, organic, bauhaus, vintage). Same icon, different aesthetic.

### F. Pictorial — Arabic/Regional Motifs
The differentiator. Brandmark and competitors completely lack this.
- Geometric Islamic patterns: 8-point star, hexagonal tessellation, mashrabiya grid
- Arches: Mamluk, Andalusian, Ottoman
- Calligraphic flourishes (non-letter, decorative)
- Crescent variations
- Palm trees, dates, regional flora
- Tea glass, dallah (coffee pot), mosaic tiles

**Sourcing:** Commission Arab designers — Wael Morcos, Khajag Apelian network. Don't generate these with AI. The cultural specificity matters.

### G. Decorative Dingbats
Small accent marks used in lockups.
- Asterisks (multi-pointed)
- Dots, bullets, diamonds
- Horizontal rules (thin, thick, dashed)
- Brackets, parentheses, slash
- Plus, minus, multiplication
- Arrows (multiple weights and angles)

**Use case:** Lockup details, tagline separators, system marks

---

## Tagging Schema

Every symbol gets the same metadata structure as fonts so the orchestration layer can query them uniformly.

```json
{
  "id": "circle_outline_thin",
  "name": "Circle Outline — Thin",
  "category": "geometric_primitive",
  "subcategory": "circle",
  "svg_path": "/symbols/geometric/circle_outline_thin.svg",
  "viewBox": "0 0 100 100",
  "style_families": ["swiss_minimal", "bauhaus_geometric", "luxury_quiet"],
  "mood": ["minimal", "neutral", "calm"],
  "weight": "thin",
  "complexity": "low",
  "cultural_context": "universal",
  "compatible_archetypes": ["lettermark", "emblem", "combination"],
  "license": "in-house",
  "designer": "internal"
}
```

**Tag glossary:**

- `category` — A through G above
- `style_families` — must match font library values (`swiss_minimal`, `editorial_serif`, etc.)
- `mood` — descriptive emotional tags (e.g., `warm`, `clinical`, `playful`, `dramatic`)
- `weight` — `hairline` / `thin` / `regular` / `bold` / `heavy`
- `complexity` — `low` (1–2 elements) / `medium` (3–6) / `high` (7+)
- `cultural_context` — `universal` / `arabic` / `east_asian` / `nordic` / `latin_american` / etc.
- `compatible_archetypes` — which logo types this can sit inside

---

## Sourcing Strategy

**Build in-house (60% of library):**
- All geometric primitives, frames, dingbats
- Letterform constructions (procedurally generated from fonts)
- Faster to iterate, full control

**Commission custom (25%):**
- All Arabic/regional motifs
- Signature pictorial marks (the ones that show up in the marketing demos)
- Hire Wael Morcos, Khajag Apelian, or via Working Not Working / Domestika network

**AI-generated then human-vectorized (15%):**
- Long-tail pictorial requests (specific industries: dentistry, lawyer, etc.)
- Use **Recraft** or **SVG.io** for vector-native output
- Always pass through a human cleanup pass — no raw AI vectors ship

**Never:**
- Ship raster
- Ship raw AI output without cleanup
- Use stock icon sets (Noun Project, Flaticon) — they look like stock

---

## SVG Quality Standards

Every symbol that enters the library must pass these checks:

1. **viewBox normalized** to `0 0 100 100` (or proportional)
2. **No external dependencies** — fonts, images, filters all inline or absent
3. **Optimized** via SVGO — no editor cruft, no inkscape namespaces
4. **Single color by default** — color applied at composition time via `currentColor`
5. **Paths only** — no rect/circle elements that aren't intentional
6. **Visually balanced at 16px** (icon size) AND 512px (hero size)
7. **Snapped to pixel grid** at 16px to prevent blur

---

## Hard No's

- No 3D rendered icons (unless category G — sticker style, deliberately)
- No drop shadows baked into the SVG
- No gradients except in the Y2K/Chrome category
- No emoji or emoji-style faces
- No stock clichés: handshake, lightbulb, gear, globe-with-arrow, leaf-as-eco, abstract people forming a circle
- No symbols that require color to read (must work in single black/white)

---

## Library File Structure

```
/symbols
  /geometric
    /circles
    /squares
    /triangles
    /polygons
    /combinations
  /abstract
  /frames
  /letterform
  /pictorial
    /nature
    /animals
    /objects
    /architecture
  /pictorial-arabic
    /patterns
    /arches
    /calligraphic
    /regional
  /dingbats
  /index.json   ← the queryable manifest (matches schema above)
```

Every directory has its own `index.json`. A root manifest aggregates them.

---

## What good looks like

Drop any single symbol on a clean cream background, place a wordmark beside it in a font from the same `style_families`, and it should pass for the work of a real studio. If it looks like an icon from a free pack, it failed.
