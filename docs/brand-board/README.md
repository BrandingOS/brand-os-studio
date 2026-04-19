# Brand Board — Scenario + Test Plan

Canonical reference for what `/b/:slug/brand-board` is, how every control
behaves, and the manual test matrix to run before shipping any change.
Code lives at `src/features/brand-board/`.

## 1. What it is

A brand-identity poster editor. The left panel exposes the brand's raw
design decisions (logos, colors, typography, UI style). The right panel
renders a single poster — a branding deliverable, **not a website
preview** — that updates live as the user edits. "Shuffle" keeps the
editor playful: it rotates a palette/font-pairing/UI preset with a
single click, but respects per-color locks so the user can pin what
they like.

## 2. User scenario — "I want a brand board in 60 seconds"

1. User lands on `/b/:slug/brand-board`.
2. Poster loads pre-filled with the brand's existing logo, primary,
   secondary, heading, body fonts.
3. User presses `SPACE` → palette + typography + UI all shuffle.
4. User likes the new green → clicks the Lock on the "Main" card.
5. User presses `SPACE` a few more times. Green stays. Everything
   else rotates.
6. User clicks a logo tile → inline upload popover opens, they drop in
   the SVG mark variant, popover closes, the Mark tile shows the new
   logo. They never leave the page.
7. User drags the corner-radius slider → every rounded element on the
   poster follows in real time.
8. User picks "Bold · black" from the weight dropdown → the poster's
   headings thicken.
9. User picks "Roomy" from the spacing buttons → the poster's
   padding / gaps grow.
10. User presses Save. Hard-refreshes. Everything they picked is still
    there.

## 3. Controls spec — what each thing does

### 3.1 Left panel

| Control | Store field written | Preview element(s) that MUST change |
|---|---|---|
| LogosPanel tile click | (upload) writes to brand.logoSystem[role] | Matching tile + poster's hero logo |
| LogosPanel Variants button | navigates to `/b/:slug/tools/variant-studio` | n/a |
| ColorsPanel card click | opens native picker | — |
| Color picker onChange → `setColor(role, hex)` | `draft.colors[role]` | Every element using `var(--bb-<role>)` |
| Lightness slider | derives new hex via HSL, calls `setColor` | same |
| Light/Dark toggle | `toggleDarkMode()` | Poster bg, fg, logo-card on dark |
| Shuffle Colors button / `C` | `shuffleColors()` (respects locks) | primary, secondary, accent, neutrals |
| Lock button | `toggleColorLock(role)` | Next shuffle skips that role |
| Remove button | resets role to default | same slot updates |
| Add Color (+) | fills first empty slot (secondary if still default, else accent) | new swatch in poster |
| TypographyPanel font card → picker → onSelect | `setFont(slot, family)` + preload font | `--bb-font-heading` / `--bb-font-body` text on poster |
| Weight dropdown | `setWeight('light'\|'regular'\|'bold')` | `--bb-weight-heading` / `--bb-weight-body` applied to poster headings + body |
| Shuffle Typography / `T` | `shuffleTypography()` | heading + body font |
| UIStylingPanel corner radius slider | `setBorderRadius(px)` | `--bb-radius` → every rounded-var element |
| Shadow selector | `setShadowIntensity(v)` | `--bb-shadow` → card + mock shadows |
| Spacing selector | `setSpacing(v)` | `--bb-pad` + palette gap + app-mock padding |
| UI Styling Shuffle / `U` | `shuffleUI()` | radius + shadow + spacing all roll |

### 3.2 Shell

| Control | Behavior |
|---|---|
| Back | `navigate(-1)` |
| Concepts switcher | Save / Load / Delete up to 5 concepts. Save disabled when full. |
| Shuffle All / `SPACE` | Rolls colors (locked skipped) + typography + UI |
| Save | Writes the **full draft** back to `brand` — primary, secondary, accent, neutrals, bg/fg, fonts.primary, fonts.secondary, weight, borderRadius, shadowIntensity, spacing |

## 4. Test matrix — run before shipping

### 4.1 Click-through (Raqm or Meridian seed brand)

Run through every row in §3.1 and §3.2 once; the "MUST change" column
is the acceptance criteria. Any control that doesn't move the preview
is a dead control and should be fixed or removed.

### 4.2 Persistence

- Shuffle all → pick accent → lock it → set radius=20, shadow=bold,
  spacing=roomy → weight=bold → Save → hard refresh → all choices
  survive.
- Toggle dark mode → Save → refresh → dark mode still on.

### 4.3 Shuffle locks

- Lock primary → press `SPACE` 5 times → primary never changes.
- Lock neutrals → change primary → neutrals do NOT regenerate.
- Unlock primary → `C` → primary genuinely rotates (not the same
  hue twice in a row across 5 runs).

### 4.4 Logo upload

- Click any logo tile → popover opens → drop a file → tile shows the
  new artwork → URL stays `/b/:slug/brand-board` throughout.
- Cancel the popover → nothing is saved.

### 4.5 Concepts

- Save 5 concepts → Save button goes disabled with a tooltip
  explaining the 5-cap.
- Load each → full draft restores (including radius, shadow, weight).

### 4.6 Keyboard

- `SPACE`, `C`, `T`, `U` work when focus is on the body.
- `SPACE`, `C`, `T`, `U` are IGNORED while typing in an input (e.g.
  the font search field).

### 4.7 Visual parity

- Every color the user picks on the left appears somewhere on the
  poster within the same frame tick.
- Poster font specimens update on every font change.
- Weight change visibly thickens/thins headings and body.
- Spacing change visibly grows/shrinks gap and padding.

## 5. Known shape of the store

`src/features/brand-board/store/useBrandBoardStore.ts`

```ts
draft: {
  colors: { primary, secondary, accent, neutrals[6], background, foreground }
  typography: { heading, body, weight }
  uiStyle: { borderRadius, shadowIntensity, spacing }
  logo?, brandName
}
lockedColors: { primary, secondary, accent, neutrals }  // all boolean
```

Save must round-trip every field in `draft`. Load (`initFromBrand`)
must restore every field from the brand.

## 6. Files touched by a fix pass

- `src/features/brand-board/store/useBrandBoardStore.ts` — initFromBrand
- `src/features/brand-board/BrandBoardPage.tsx` — handleSave
- `src/features/brand-board/preview/BrandBoardCanvas.tsx` — add
  `--bb-weight-heading`, `--bb-weight-body`, `--bb-pad` CSS vars; apply
  them to the relevant elements
- `src/features/brand-board/panels/UIStylingPanel.tsx` — spacing
  button already writes; no change
- `src/features/brand-board/panels/LogosPanel.tsx` — inline upload
  popover instead of navigating
- `src/features/brand-board/panels/ColorsPanel.tsx` — addColor
  fills first empty slot
- `src/features/brand-board/panels/ConceptSwitcher.tsx` — disable
  Save button at cap + tooltip
- `src/shared/types/brand.ts` — the Brand type already has everything
  needed (accent, fonts, guidelines) but we'll persist uiStyle + weight
  on `brand.guidelines` so they survive.

## 7. Non-goals (this pass)

- Dark mode aware poster background — later.
- Export to PDF / PNG — later.
- Multi-brand concept sharing — later.
