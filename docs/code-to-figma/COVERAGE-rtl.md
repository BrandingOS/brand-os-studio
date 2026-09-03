# Coverage — responsive and RTL risk

Measured against the shipping stylesheet, not assumed. These are the risks
Cycle 10 must clear; recording them now means Cycle 4 can build components that
do not have to be rebuilt later.

## The headline finding: the product is LTR-only today

| Measure | Count |
|---|---|
| Physical `margin-left` / `margin-right` / `padding-left` / `padding-right` | 4 |
| **Logical** `margin-inline` / `padding-inline` | **0** |
| Physical `left:` / `right:` | 8 |
| **Logical** `inset-inline` | **0** |
| Physical `text-align: left \| right` | 2 |
| `dir="rtl"`, `[dir=rtl]`, `direction: rtl` anywhere in `src/` | **0** |

**14 physical directional declarations, zero logical ones, and no RTL handling
anywhere in the application.** Arabic is not currently supported by the product,
so nothing in Figma can be generated *from* an RTL rendering — there is no RTL
rendering to capture.

This changes what Cycle 10 can honestly deliver. The owner's requirement is
"Arabic/RTL-**ready** architecture and tests", and the gate is "Arabic content can
be added without rebuilding component foundations". That is achievable and is
what will be built. What is **not** achievable is capturing a real RTL product
and mirroring it, because the product does not render RTL.

So the deliverable is:

- **Components built so mirroring is a property change, not a rebuild.** Auto
  layout with `HORIZONTAL` direction reverses cleanly; the risk is any child
  pinned by a physical constraint or an absolute offset. Every generated
  component avoids absolute positioning where auto-layout can express the same
  thing — which the priority order already demands for other reasons.
- **A `direction` variant axis only where geometry genuinely mirrors** — never a
  duplicated component per language. Text content is a **text property**, so an
  Arabic string does not require a second component.
- **Test frames on page `91 — Responsive & RTL Tests`** carrying representative
  Arabic strings, long-text expansion, and mixed-script runs, so the readiness
  claim is visible rather than asserted.
- **A recorded `LOSSES.md` entry** stating plainly that RTL frames are
  *constructed*, not *captured*, because the product has no RTL mode. Presenting
  a constructed frame as a capture would be the dishonest option.

## Font glyph coverage — must be measured, not assumed

`--ds-font` is `'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif`.

Plus Jakarta Sans is registered in `shared/design-system/googleFonts.ts:1459`,
and the repository carries **no subset handling at all** — no `arabic`, no
`subset` anywhere in that module. So the app never requests an Arabic cut, and
whether the family even has one is unverified here.

**Cycle 10 measures this rather than trusting it**, using the same method the
export pipeline already relies on: render representative Arabic text and compare
against a known-missing-glyph box. If the family lacks Arabic, the fallback that
actually paints is recorded and used for the Arabic test frames, and the
substitution goes in `LOSSES.md`. Asserting glyph coverage from memory is exactly
the error that produced the "free plan has no variables" mistake earlier in this
project.

## Fixed widths — mirroring and text-expansion risk

From `components.css`:

| Width | Where | Risk |
|---|---|---|
| 620px, 560px, 440px | modal sizes | fine; modals are fixed by design |
| 43px | rail card | fine; icon-sized |
| 38px, 36px, 30px, 17px, 16px, 11px, 7px, 6px | controls, dots, thumbs | fine; intrinsic control sizes |

No text-bearing container carries a fixed width, so **German/Arabic text
expansion has room to grow**. This is the good case and worth recording: had a
label been pinned, every translated string would have clipped.

## Responsive

Capture widths and the reasoning behind them are in `COVERAGE-states.md`. The
rule that binds: **a mobile frame is captured at a mobile viewport, never scaled
down from desktop.** A scaled desktop frame reports fake layout — it looks
plausible and encodes nothing true about how the product reflows.

## Directional icons

Seven icons ship (`shared/ds/icons.tsx`). Two are directional and must mirror
under RTL:

| Icon | Directional | Handling |
|---|---|---|
| `ArrowRightIcon` | **yes** | mirror |
| `ChevronDownIcon` | no (vertical) | as-is |
| `CheckIcon`, `CloseIcon`, `PlusIcon`, `AlertTriangleIcon`, `AlertCircleIcon` | no | as-is |

`DsButton`'s `arrow` prop renders `ArrowRightIcon`, so any button with
`arrow=true` is a mirroring site.
