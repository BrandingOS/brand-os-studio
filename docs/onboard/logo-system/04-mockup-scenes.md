# Layer 5 — Mockup Scenes (Curated)

The mockup engine takes a finished logo and projects it into a real-world context. This is the difference between "AI logo generator" output and "real studio" output. Brandmark's mockups feel templated because they reuse the same 5 scenes. Ours need to feel like a curated editorial board.

**Principle:** Every mockup is a *scene*, not a *template*. It has a mood, a story, and a single hero — the logo.

---

## Scene Architecture

Each mockup scene is a JSON definition + a base photographic plate. The logo gets composited via a defined surface mask with specified lighting/perspective.

```json
{
  "id": "cream_paper_emboss",
  "name": "Cream Paper — Soft Emboss",
  "category": "stationery",
  "mood": ["editorial", "luxury", "quiet"],
  "compatible_style_families": ["luxury_quiet", "editorial_serif", "swiss_minimal", "arabic_modern"],
  "base_plate": "/scenes/cream_paper_emboss.jpg",
  "surface_mask": {
    "perspective": "flat-top-down",
    "logo_position": { "x": "50%", "y": "50%" },
    "logo_size": "30%",
    "rotation": 0,
    "blend_mode": "multiply",
    "opacity": 0.85,
    "effect": "emboss-soft",
    "shadow": "drop-2px-blur-4px-opacity-15"
  },
  "color_palette_override": ["charcoal", "ink"],
  "lighting": "soft-directional-from-top-left"
}
```

---

## The 30 Launch Scenes

Organized by category. Each launch with at least 3 scenes per category to enable variation.

### 1. Stationery (5)

| Scene | Mood | Best For |
|---|---|---|
| **Cream Paper — Soft Emboss** | Editorial, luxury, quiet | Wordmarks, minimal logos |
| **Letterpress Card — Deep Impression** | Vintage, tactile, premium | Editorial serifs, emblems |
| **Black Ink Stamp on Kraft** | Workwear, raw, honest | Stamp/stencil, vintage |
| **Foil Stamp on Bone Card** | Luxury, fashion, premium | Wordmarks, monograms |
| **Letterhead Top Corner** | Editorial, professional | Lockups with descriptors |

### 2. Surfaces & Materials (6)

| Scene | Mood | Best For |
|---|---|---|
| **Engraved Stone — Slate Grey** | Heritage, permanent, ceremonial | Emblems, wordmarks |
| **Sandblasted Concrete Wall** | Brutalist, architectural | Brutalist, swiss minimal |
| **Brushed Steel Plate** | Industrial, modern, precise | Tech mono, brutalist |
| **Aged Brass — Patina** | Vintage, premium, warm | Vintage workwear, art deco |
| **White Ceramic Tile** | Editorial, clean, minimal | Swiss minimal, luxury quiet |
| **Burnt Wood — Branded** | Workwear, organic, warm | Vintage workwear, organic |

### 3. Signage (5)

| Scene | Mood | Best For |
|---|---|---|
| **Storefront Window Vinyl** | Modern, retail, clean | Wordmarks, lockups |
| **Hanging Wood Sign — Café** | Vintage, warm, hospitality | Vintage workwear, organic |
| **Building Facade — Pin Letters** | Architectural, premium | Luxury quiet, swiss minimal |
| **Neon — Late Night** | Y2K, nightlife, expressive | Y2K chrome, postmodern |
| **Wayfinding Pylon — Modernist** | Bauhaus, clean, public | Bauhaus, swiss minimal |

### 4. Apparel & Tags (4)

| Scene | Mood | Best For |
|---|---|---|
| **Woven Fabric Tag — Folded** | Fashion, premium, quiet | Luxury quiet, editorial serif |
| **Hangtag on Linen** | Editorial, fashion, organic | Editorial serif, organic |
| **T-Shirt Chest Print** | Streetwear, bold | Brutalist, playful bold |
| **Embroidered Patch — Black Cap** | Workwear, military, heritage | Stamp stencil, vintage workwear |

### 5. Packaging (4)

| Scene | Mood | Best For |
|---|---|---|
| **Cream Box — Foil Detail** | Luxury, beauty, premium | Luxury quiet, art deco |
| **Glass Bottle — Apothecary** | Editorial, clean, premium | Editorial serif, organic |
| **Tube — Skincare Modern** | Modern, beauty, clean | Swiss minimal, luxury quiet |
| **Coffee Bag — Kraft Brown** | Workwear, organic, café | Vintage workwear, organic handdrawn |

### 6. Digital Surfaces (3)

| Scene | Mood | Best For |
|---|---|---|
| **App Icon — iOS Glyph** | Modern, tech | Lettermarks, abstract marks |
| **Website Hero — Editorial** | Editorial, modern | Any wordmark/lockup |
| **Mobile Home Screen** | Tech, ui | Lettermarks, app-style |

### 7. Pure Isolation (3)

Sometimes the strongest presentation is no presentation. Background and logo, nothing else. These are the highest-skill scenes — when nothing distracts, the logo has to carry alone.

| Scene | Mood | Best For |
|---|---|---|
| **Bone Cream Canvas** | Editorial, quiet | All style families |
| **Off-Black Canvas** | Premium, dramatic | Luxury, editorial, fashion |
| **Single Saturated Tone (brand color)** | Bold, expressive | Bauhaus, postmodern, playful |

---

## Composition Rules (apply to every scene)

1. **Single hero** — one logo per scene, no decoration competing
2. **Breathing room** — logo never closer than 15% to canvas edge
3. **Optical center** — the logo sits where the eye expects, not the math center
4. **Lighting consistency** — single light source, soft falloff
5. **Color grading** — every scene has a unified color temperature (warm/neutral/cool)
6. **No watermarks** — ever
7. **No "AI feel"** — no melting edges, no surreal artifacts, no impossible reflections

---

## Scene-to-Style Matching Logic

The orchestration layer matches scenes to logos based on `compatible_style_families`. A logo in `editorial_serif` style → eligible for any scene tagged `editorial_serif` in compatible_style_families.

For the user's "Pinterest board" output, generate **6–9 scenes per logo system**:
- 2 stationery
- 2 surface/material
- 1 signage OR apparel
- 1 packaging
- 1 isolation
- 1 wildcard (postmodern pick that breaks the pattern)

This rhythm gives the editorial variety that makes Pinterest boards feel curated, not templated.

---

## How Scenes Are Built (production)

For each scene:
1. **Photoshoot or commission** the base plate (real photo > generated)
2. Define the **surface mask** in After Effects or Substance — exact geometry of where logos sit
3. Capture **lighting passes** — diffuse, specular, shadow — separately
4. Test with 5 logos across different style families to verify the scene flatters all of them
5. Once verified, encode as JSON and add to the manifest

**Real photography beats AI-generated scenes.** Hire a still-life photographer for the launch set. Once you have 30 strong scenes, expand quarterly based on usage data.

---

## What good looks like

A user generates a logo. The system delivers it across 6 scenes. The user opens the result, screenshots one, and posts it to their own Pinterest. People save it. That's the bar.
