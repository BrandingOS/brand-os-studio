# Change Branding from a Prompt — Setup page

**Date:** 2026-08-24 · **Status:** approved by owner (chat, 2026-08-24)

## What

One top-level action on `/b/:slug/setup` — **Change branding with AI** — that
rewrites the brand from a single AI reply: **Color** (core + accent as one
palette), **Typography** (heading + body as one pairing), **Brand Strategy**
(the eleven fields), and **Iconography** (regenerated client-side). **Never
logos.** The user's own AI tool does the thinking (Copy prompt / Open in
ChatGPT / Open in Claude — the shipped `AiPromptMenu` handoff); the product
authors the prompt and parses the reply. No key, no cost, no vendor.

## Why not silent

A reply that rewrote the brand on paste would be indistinguishable from data
loss. Three protections, in order of importance:

1. **Per-section approval, replacement-unticked.** The reply renders as four
   review blocks. A block that would REPLACE something the brand already has
   starts UNTICKED — overwriting is opt-in. A block filling an empty section
   starts ticked. Apply writes only ticked blocks, as ONE edit.
2. **Checkpoints.** Immediately before an apply, the before-state of the four
   sections is snapshotted (localStorage, per brand, newest-first, cap 20).
   Any checkpoint restores whole or one section at a time.
3. **The parser refuses non-replies** — the three-layer defense already shipped
   for the strategy import (sentinel phrases → whole-prompt refusal; value ==
   its own ASK → dropped; instruction-shaped/option-list values → dropped).

## Shape

- **Direction is optional input**: one text box, "What's changing? (optional)"
  — baked into the prompt when present ("make it premium", "pivoting younger").
- **Ask chips**: Colors · Typography · Brand Strategy · Icons, all on by
  default. An excluded section that has values is handed to the AI as settled
  context, so narrowing the ask never costs coherence.
- **Units of approval**: whole palette, whole pairing, whole icon set;
  strategy stays the shipped per-field rows.
- **Visual diff**: colors as before→after swatches (hex + name); fonts as
  family names each rendered in its own face; icons as before→after glyph
  grids (`fi fi-rr-*`, flaticon CSS already imported by Setup).

## Mechanics

- **Prompt** (`setup/strategy/brandingPrompt.ts`): the strategy prompt's
  labelled-line format plus two labels — `Colors:` (3–5 hexes, primary first;
  no example hexes in the instruction, so an echoed instruction can never
  parse as a palette) and `Fonts:` (`Heading Family + Body Family`, Google
  Fonts). Its own sentinel list (it ASKS for colors/fonts, so it cannot carry
  the strategy prompt's "do not suggest colours" line; it says "Never suggest
  a logo" instead). Exported `BRANDING_ASKS` / `BRANDING_PROMPT_SENTINELS`
  mirror the strategy module's contract, tests assert both are genuinely in
  the built prompt.
- **Parser** (`setup/strategy/parseBrandingBrief.ts`): reuses
  `labelledBlocks`/`looksLabelled` over the extended label list; strategy
  fields via the same normalization as `parseStrategyBrief`; colors via hex
  extraction (first 3 → core, rest → accent, names via `hexToName`); fonts by
  splitting on `+`. Refuses both branding AND strategy prompts.
- **Icons are NOT asked from the AI.** They are computed client-side by the
  existing `suggestIconsForBrand` over the POST-apply strategy text (+
  direction), previewed as a grid, applied only if ticked. The 5 hand-curated
  industry sets are a separate follow-up (owner-approved split); they slot
  into this same diff UI later with no UI change.
- **Checkpoints** (`setup/strategy/checkpoints.ts`): key
  `brandos:branding-checkpoints:<brandId>`. Snapshot = colors (core+accent),
  fonts (families/roles/weights — `files` dataURLs are STRIPPED to protect the
  5MB localStorage budget; the approval UI warns when replacing uploaded
  fonts that the files themselves are not recoverable), strategy fields,
  about entries, icons. Restore = one `setBrand` merging chosen sections.
- **Apply** (`SetupPage.handleApplyBranding`): save checkpoint → one
  `setBrand` → existing debounced autosave persists via `mockBrandToPatch`
  (routes colors/typography/strategy through the canonical ops — no new
  write path). The grey ramp stays generated, never AI-written.
- **Entry**: a ghost pill beside "Brand Identity" in `WorkspaceShell`
  rightActions. History lives in the same modal (collapsible list, restore
  all / restore per-section).

## Tests

Unit: prompt contract (labels, sentinels, asks, direction, ask-filtering,
settled context), parser (palette/pairing/mixed/refusals), checkpoints
(save/cap/strip-files/restore-section). Browser: modal flow (paste → blocks,
replace-unticked vs fill-ticked defaults, refusal message, apply payload,
history restore).

## Out of scope

Logos (hard exclusion). The 5 curated industry icon sets. Calling any AI
directly. Undo-stack integration (`shared/history` is session-only; the
checkpoint list is the persistence story here).
