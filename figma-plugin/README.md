# BrandingOS → Figma

Turns the shipping product into an editable Figma file: the design system as real
component sets with variants, and (Phase B) Studio screens as editable layers.

    Rendered React/CSS  →  Extractor  →  IR  →  Figma renderer
       (harness route)     (Playwright     (pure)     (this plugin)
                            + CDP)

The manifest declares **semantics only** — component identity, variant axes, child
roles, naming and nesting. Every value (colour, spacing, type, radius, shadow,
geometry) is **measured from the rendered product**, so there is exactly one source
of visual truth and it is the code that ships.

## Running it

Figma desktop → `Plugins` → `Development` → `Import plugin from manifest…` → pick
`figma-plugin/manifest.json`. Then `Plugins` → `Development` → `BrandingOS → Figma`.

Run it in a **scratch file** — it creates nodes on the current page.

## Status: spike validation

Press **Run spikes**, then **Copy report** and paste the result back. The plugin
asserts against the live Figma API rather than producing something that merely
looks right in a screenshot:

| Spike | Proves |
|---|---|
| 1 | CDP forced pseudo-states through Playwright — **passed in the extractor, 8/8** |
| 2 | An inline DS icon becomes an editable VECTOR with 1.8px round-cap strokes |
| 3 | Components become one real `COMPONENT_SET` with named variant properties, and an instance stays connected |
| 5 | Auto-layout genuinely reflows on resize — hug stays, fill absorbs, padding holds, nothing scales |
| 4 | *(next)* An awkward component survives Browser → IR → Figma with losses recorded |

## Rules discovered so far

- **Measure the settled state.** Transitions make `getComputedStyle` return an
  in-flight value: forcing `:hover` and reading immediately returns the *old*
  shadow. The extractor disables all transitions and animations before measuring.
  Figma has no transitions, so the destination is the only meaningful value.
- **Auto-layout before children.** Set `layoutMode` and the sizing modes on a
  frame *before* appending, or it keeps its 100×100 birth size.
- **`prop=value, prop=value` is a contract.** Figma parses component names into
  variant properties on combine. Get the naming wrong and you get loose frames.
