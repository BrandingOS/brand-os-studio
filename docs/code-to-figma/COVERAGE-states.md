# Coverage — states, breakpoints and ARIA

**Generated** by `node scripts/figma/coverage.mjs` on 2026-09-03. Do not hand-edit.

## Real breakpoints

Hand-written CSS media queries across `src/**/*.css`. The Tailwind config
overrides only the container's `2xl` (1400px), so these — not Tailwind's
defaults — are what the product actually responds to.

| Query | Occurrences |
|---|---|
| ax-width: 720px | 9 |
| ax-width: 640px | 6 |
| ax-width: 900px | 5 |
| ax-width: 1100px | 5 |
| ax-width: 860px | 2 |
| ax-width: 560px | 2 |
| ax-width: 680px | 2 |
| ax-width: 1180px | 1 |
| ax-width: 520px | 1 |
| ax-width: 480px | 1 |
| ax-width: 880px | 1 |
| in-width: 640px | 1 |
| in-width: 1024px | 1 |
| ax-width: 1024px | 1 |
| ax-width: 1080px | 1 |

**Capture viewports.** 1440 (above every breakpoint — full desktop) and 390
(below 480, so it crosses every mobile rule). Cycle 10 additionally re-runs at
the structural boundaries that carry the most rules — 1100, 900 and 720 — because
those are where layouts actually change. Desktop frames are never scaled to
imitate mobile.

## ARIA states in the target surfaces

Counted across `features/brand-kit`, `features/brand-setup`, `shared/layouts`
and `shared/ds`.

| Attribute | Occurrences |
|---|---|
| `aria-label` | 131 |
| `aria-hidden` | 16 |
| `aria-pressed` | 14 |
| `aria-expanded` | 10 |
| `aria-checked` | 8 |
| `aria-haspopup` | 6 |
| `aria-modal` | 6 |
| `aria-selected` | 3 |
| `aria-invalid` | 2 |
| `aria-current` | 1 |
| `aria-valuemin` | 1 |
| `aria-valuemax` | 1 |
| `aria-valuenow` | 1 |

`aria-expanded`, `aria-pressed`, `aria-checked`, `aria-selected` and
`aria-current` are **state-bearing** and each must appear as a represented state.
`aria-label` and `aria-hidden` are not states and are not represented.

## The audited state vocabulary

A state is represented only where shipping code evidences it. Sources are
pseudo-class rules, modifier classes, `data-*`/`aria-*` attributes, and props
whose values change rendering.

| State | Evidence required | Represented as |
|---|---|---|
| default | always | base variant |
| hover | `:hover` rule | variant (CDP-forced capture) |
| active | `:active` rule | variant |
| focus-visible | `:focus-visible` rule | variant |
| disabled | `:disabled` or `--disabled` | variant |
| checked / selected | `aria-checked`/`aria-selected`/`--checked` | variant |
| expanded / open | `aria-expanded`, `--open` | variant or separate frame |
| error | `--error`, `aria-invalid` | variant |
| loading / saving | prop or explicit class | variant, static |
| empty / populated | branch in the component | separate frames |

Any state not traceable to one of these is **not represented**, and its absence
is recorded rather than filled.
