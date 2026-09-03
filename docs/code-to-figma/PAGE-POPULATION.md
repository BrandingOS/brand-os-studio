# Page population ledger

The non-empty page invariant: no required page is marked complete while it holds
only a title, an empty frame, a placeholder, or scaffolding. Every row is filled
from a live Figma read-back, never from intent.

**File:** `ZTR7jwR1cvjYvs0N9kuHCX` (Brand OS, pro) ·
https://www.figma.com/design/ZTR7jwR1cvjYvs0N9kuHCX

| Page | id | Expected | Generated | Root node ids | Components / variants / instances | Visual | Structural | Status |
|---|---|---|---|---|---|---|---|---|
| 00 — Cover & Usage | `0:1` | usage doc | — | — | — | — | — | **empty** |
| 01 — Foundations | `1:2` | colours, spacing, radii, type, effects, grids, a11y | 8 sections | `27:2` | 31 colour vars · 15 float vars · 4 effect styles · 4 text styles | ✅ screenshot | ✅ read-back | **complete** |
| 02 — Icons | `1:3` | 7 audited icons as vector components | 7 | `30:2` | 7 components / 7 instances, all connected | ✅ screenshot | ✅ read-back | **complete** |
| 03 — Components | `1:4` | ~30 audited DS components | 2 | `8:54`, `24:34` | 2 sets / 30 variants / 0 | ✅ screenshot | ✅ read-back | **in progress** |
| 04 — Patterns & Navigation | `1:5` | shell, nav, rail, headers | — | — | — | — | — | **empty** |
| 10 — Setup | `1:6` | 8 sections × states | — | — | — | — | — | **empty** |
| 11 — Brand Kit | `1:7` | 8 sections, browsing states | — | — | — | — | — | **empty** |
| 12 — Brand Kit Editors | `1:8` | editor families | — | — | — | — | — | **empty** |
| 13 — Design | `1:9` | launchpad + editor shell | — | — | — | — | — | **empty** |
| 90 — Component State Matrix | `1:10` | full state matrix | — | — | — | — | — | **empty** |
| 91 — Responsive & RTL Tests | `1:11` | breakpoints, long text, Arabic | — | — | — | — | — | **empty** |
| 98 — Visual Parity | `1:12` | browser/Figma evidence | — | — | — | — | — | **empty** |
| 99 — QA, Losses & Generation | `1:13` | QA + losses + report | — | — | — | — | — | **empty** |

## Page 03 — detail

| sid | Node | Type | Variants | Properties | Coverage entries satisfied |
|---|---|---|---|---|---|
| `ds/menu` | `8:54` | `COMPONENT_SET` | 2 | `state` = default \| hover | DsMenu, DsMenuItem, DsMenuDivider |
| `ds/button` | `24:34` | `COMPONENT_SET` | 28 | `arrow` (BOOLEAN, default false) · `size` = md \| sm · `state` = active \| default \| disabled \| focus-visible \| hover · `tone` = danger \| primary \| secondary \| tertiary | DsButton |

**Variables:** one `BrandingOS` collection, **31 colour variables**, real `Light`
and `Dark` modes. Verified bound: `ds/button` fills resolve to
`VARIABLE_ALIAS → VariableID:8:5`.

### DsButton benchmark

| Metric | Value |
|---|---|
| Declared cells | 76 (4 tone × 2 size × 5 state × 2 arrow) |
| After `arrow` → BOOLEAN property | 38 |
| After `sparse` (no `tertiary:active` rule) | 38 |
| After measured deduplication | **28** (10 collapsed) |
| Generation | 3 build calls + 1 combine, all under the 50k cap |
| Payload | 14.5KB + 11.5KB + 9.6KB + 0.5KB |
| Bound paints / unbound literals | 66 / 6 |
| Instance usability | 4 properties; `arrow` is a toggle, not a list |

The 6 unbound literals are the primary button's resting and hover shadows, which
are **hardcoded in `components.css`** rather than tokenised — a real finding for
`LOSSES.md`, not a pipeline defect.
