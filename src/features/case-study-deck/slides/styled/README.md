# Styled archetype renderers — the rules

These are the per-archetype slide renderers used by the case-study deck.
They MUST follow the rules below to keep the deck consistent across the
10 templates. Breaking any rule produces visible bugs (duplicate
eyebrows, off-canvas text, mismatched chrome between slides).

## Rule 1 — chrome owns slide-level metadata

The TopBar / BottomBar / CornerNumeral primitives in
`styles/chrome.tsx` are the ONE place that renders:

- the section eyebrow ("§03 Moodboard", "MOODBOARD", etc.)
- the page indicator ("03 / 10")
- the brand mark (top-right logo)
- the document meta ("Brand Document · Edition 01")

The body MUST NOT render these again. Doing so produces stacked
duplicate text — a body eyebrow on top of the chrome eyebrow.

The body's job is the **content**: headline, subhead, image, palette
chips, type ladder, mockup. Nothing else.

If a style needs a different chrome treatment (e.g. tabular vs.
minimal), express it via `style.chrome.*` tokens, not by adding a
second eyebrow inside the body.

## Rule 2 — never render text larger than what fits

For headlines that take a brand-supplied string (tagline, headline
override), use `fitHeadingSize(style, base, text, maxChars)` instead
of `headingSize(style, base)`. The fit helper auto-shrinks as the
string grows so a long tagline doesn't run off the canvas. Test with
the longest brand tagline in the seed set (SKAM's is 110+ chars).

## Rule 3 — pad the slide enough for the chrome

Chrome reserves space at the top (~110–170px depending on style) and
at the bottom (~80–120px). Body content should always start with
`paddingTop: 170` and end with at least 120px below it, otherwise
the chrome lands on top of content.

## Rule 4 — accent / background colors come from `resolveSurface`

Never hard-code a hex. Pull `surface.bg / surface.ink / surface.accent`
from `resolveSurface(style, profile)`. That keeps colors readable on
every brand and respects per-style background roles.

## Rule 5 — fonts come from `resolveFonts`

Never inline `fontFamily: 'Inter, ...'`. Use the resolver — it picks
the right family for the active style (brand / sans / serif / mono)
and dovetails with the master Heading/Body scale sliders.

---

If you find yourself violating one of these in a new slide, fix the
violation first; don't paper over it with a body element. The
template system depends on these rules to ship a clean deck.
