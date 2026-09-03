# Coverage — components

**Generated** by `node scripts/figma/coverage.mjs` on 2026-09-03. Do not hand-edit.

Every row is derived from shipping source: CSS classes from the `className`
literals the component emits, props from the interface named `<Component>Props`,
states from pseudo-classes and modifier classes defined on those exact classes.
Nothing here is typed by hand, so the matrix cannot drift from the code.

**40** exported components · **21** with CSS-defined states · **7** icons.

| Component | File | Props (declared axes) | States (CSS evidence) | Figma model | Cycle |
|---|---|---|---|---|---|
| `DsAssetRow` | AssetRow.tsx | — | `--danger` `:hover` | component set | 4 |
| `BrandMark` | BrandMark.tsx | `loading`=false\|true<br>`idle`=false\|true<br>`showSpokes`=false\|true | — | component set | 4 |
| `LoadingPill` | BrandMark.tsx | — | — | single component | 4 |
| `DsButton` | Button.tsx | `tone`=primary\|secondary\|tertiary\|danger<br>`size`=md\|sm<br>`arrow`=false\|true | `--danger` `--disabled` `--primary` `--secondary` `--sm` `--tertiary` `:active` `:disabled` `:focus-visible` `:hover` | component set | 4 |
| `DsToast` | Feedback.tsx | `tone`=success\|neutral | `:hover` | component set | 4 |
| `DsBanner` | Feedback.tsx | `tone`=warning\|danger\|success\|neutral | `--danger` `--success` `--warning` | component set | 4 |
| `DsBadge` | Feedback.tsx | `tone`=neutral\|success\|warning\|danger | `--danger` `--success` `--warning` | component set | 4 |
| `DsStatusDot` | Feedback.tsx | `tone`=success\|warning\|danger\|muted | `--danger` `--muted` `--success` `--warning` | component set | 4 |
| `DsInput` | Input.tsx | `pill`=false\|true | `--error` `--pill` `:focus` | component set | 4 |
| `DsTextArea` | Input.tsx | — | `:focus` | component set | 4 |
| `DsDropZone` | Input.tsx | — | — | single component | 4 |
| `DsLogoTile` | LogoTile.tsx | — | `--empty` `:hover` | component set | 4 |
| `DsLogoTileEmpty` | LogoTile.tsx | — | `--empty` `:hover` | component set | 4 |
| `DsMenu` | Menu.tsx | — | `:hover` | component set | 4 |
| `DsMenuItem` | Menu.tsx | `danger`=false\|true | `--danger` `:hover` | component set | 4 |
| `DsMenuDivider` | Menu.tsx | — | — | single component | 4 |
| `DsModal` | Modal.tsx | `open`=false\|true | `:empty` `:hover` | component set | 4 |
| `DsConfirmDialog` | Modal.tsx | `open`=false\|true | — | component set | 4 |
| `DsSkeleton` | Progress.tsx | — | — | single component | 4 |
| `DsProgress` | Progress.tsx | — | — | single component | 4 |
| `DsRail` | Rail.tsx | `compact`=false\|true | `--active` `--compact` `:focus-visible` `:hover` | component set | 4 |
| `DsSelect` | Select.tsx | — | `--selected` `:focus-visible` `:hover` | component set | 4 |
| `DsSwatchRow` | SwatchRow.tsx | — | — | single component | 4 |
| `DsTabBar` | TabBar.tsx | — | `--active` `:focus-visible` `:hover` | component set | 4 |
| `DsSwitch` | Toggle.tsx | `checked`=false\|true<br>`disabled`=false\|true | `--on` `:focus-visible` | component set | 4 |
| `DsCheckbox` | Toggle.tsx | `checked`=false\|true<br>`disabled`=false\|true | `--checked` `:focus-visible` | component set | 4 |
| `DsRadio` | Toggle.tsx | `checked`=false\|true<br>`disabled`=false\|true | `--checked` `:focus-visible` | component set | 4 |
| `DsSegmented` | Toggle.tsx | — | `--active` `:focus-visible` | component set | 4 |
| `ArrowRightIcon` | icons.tsx | — | — | icon component | 4 |
| `CheckIcon` | icons.tsx | — | — | icon component | 4 |
| `ChevronDownIcon` | icons.tsx | — | — | icon component | 4 |
| `CloseIcon` | icons.tsx | — | — | icon component | 4 |
| `PlusIcon` | icons.tsx | — | — | icon component | 4 |
| `AlertTriangleIcon` | icons.tsx | — | — | icon component | 4 |
| `AlertCircleIcon` | icons.tsx | — | — | icon component | 4 |
| `DsEyebrow` | primitives.tsx | — | — | single component | 4 |
| `DsKbd` | primitives.tsx | — | — | single component | 4 |
| `DsChip` | primitives.tsx | `active`=false\|true<br>`dashed`=false\|true | `--active` `--dashed` `:focus-visible` `:hover` | component set | 4 |
| `DsTooltip` | primitives.tsx | — | — | single component | 4 |
| `DsEmptyState` | primitives.tsx | — | — | single component | 4 |

## How to read "States"

- `:hover`, `:focus-visible`, `:active`, `:disabled` — real pseudo-class rules.
  These are captured by forcing the state through CDP (spike 1) and measuring the
  **settled** value with transitions disabled.
- `--modifier` — a modifier class the component applies itself
  (`.ds-btn--primary`, `.ds-input--error`). These map to variant properties.
- `[data-*]` / `[aria-*]` — attribute-driven states.

A component showing `—` has no state rules **in the stylesheet**. That is
evidence of absence, not a gap to be filled: per the Cycle 1 gate, a state is
never invented to populate a matrix.

## Deliberately excluded

`BrandMark` renders in `idle` mode only. `loading` is a live animation with no
honest static representation, and a mark permanently wearing the loader would say
the product is permanently busy. Recorded in LOSSES.md, not represented.
