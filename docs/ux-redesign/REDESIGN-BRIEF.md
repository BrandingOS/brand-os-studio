# BrandingOS — UI/UX Redesign Brief

> **Audience:** an AI UI/UX generator (v0, Lovable, Galileo, Figma AI, Bolt,
> Cursor with a UI agent) **or** a senior product designer.
>
> **Mission:** redraw BrandingOS from scratch as a coherent, premium creative
> SaaS product. Use this brief as your source of truth. Don't invent
> structure, vocabulary, or screens that aren't here.
>
> Companion docs in this folder:
> - `ARCHITECTURE.md` — IA, page templates, feature placement
> - `USER-FLOWS.md` — personas, user stories, end-to-end flows
> - `EXECUTION.md` — what's been built and what's not

---

## 0. The 10-Second Pitch

> **BrandingOS is the workspace where founders and designers build, manage,
> and ship a brand — from logo to colors to a delivered guidelines PDF.
> One brand or fifty. Calm enough for a first-timer, deep enough for a
> power user.**

That's the entire product. Every screen serves it.

---

## 1. Product Positioning

| | |
|---|---|
| **What it is** | A creative SaaS workspace for building brand identity systems. |
| **What it is not** | A general-purpose design tool (Figma). A logo-maker fad app. A stock template marketplace. |
| **Tone** | Premium, calm, intentional, confident. Closer to Linear or Notion than Canva. Closer to Things or Arc than Adobe. |
| **Closest aesthetic neighbours** | Linear (information density done right), Vercel (restraint), Stripe Dashboard (grown-up SaaS), Framer (creative confidence), Notion (structured forgiveness), Things 3 (calm typographic care). |
| **Aesthetic enemies** | Generic shadcn-default look. Card-grid-on-grey-background SaaS. Pastel gradient overload. "AI tool" cyberpunk. Crowded sidebars. Loud illustrations. |
| **Emotional promise** | "I feel in control of my brand. I know where everything is. The product respects my time." |

If a screen doesn't feel like the brands a serious designer would actually
ship to a client, it's wrong. **The product itself is a brand. Its UI is
its first proof of competence.**

---

## 2. Target Users

Design for these eight humans. Every screen must serve at least one of them.

| ID | Name | Role | What they want first | What kills them today |
|---|---|---|---|---|
| P1 | **Maya** | Solo founder, no design background | "I want a logo and a one-page brand sheet I can hand to a freelancer." | 19-item sidebars; jargon (brandkit, guidelines editor) |
| P2 | **Daniel** | In-house designer, 1–2 brands | "I want to refine assets and export print-ready files quickly." | Each editor feeling different; relearning shortcuts |
| P3 | **Priya** | Agency lead, 8–15 client brands | "Switch brands fast. Don't let me edit the wrong one by accident." | No clear brand context; switcher buried |
| P4 | **Tomás** | Small-business owner | "Pick a template, answer 3 questions, download." | 4 ways to start, none obvious |
| P5 | **Sam** | Power user / heavy editor | "Deep control, undo, keyboard shortcuts everywhere." | Shortcuts in some editors, none in others |
| P6 | **Jordan** | Invited collaborator (one brand only) | "Just let me do my part and leave." | (Permissions don't exist yet — design for them anyway) |
| P7 | **Riley** | Returning user (forgot what they were doing) | "Show me where I left off." | No 'continue' surface; cold dashboard every time |
| P8 | **Quinn** | Curious newcomer, doesn't know what 'brand' means | "Just let me look around." | Vocabulary wall before exploration |

**Primary** persona: **Maya** (sets the floor for usability) and **Daniel**
(sets the ceiling for craft).

---

## 3. The Three Scopes — Information Architecture

BrandingOS has exactly **three scopes**. Every screen belongs to one.

```
┌────────────────────────────────────────────────────┐
│  WORKSPACE  ─ cross-brand: home, brands, learn     │
│  ──────────────────────────────────────────────    │
│  BRAND      ─ per-brand: identity, assets, share   │
│  ──────────────────────────────────────────────    │
│  EDITOR     ─ focused canvas: full-screen work     │
└────────────────────────────────────────────────────┘
```

Scope is determined by URL prefix and visualized by **which sidebar
mounts**. Don't show the workspace sidebar inside a brand. Don't show
chrome at all inside an editor.

| Scope | URL prefix | Sidebar | Topbar |
|---|---|---|---|
| Workspace | `/` | `WorkspaceSidebar` (5 items) | `WorkspaceTopBar` |
| Brand | `/b/:slug/...` | `BrandSidebar` (5 sections) | `BrandTopBar` (with brand switcher) |
| Editor | `/b/:slug/edit/:surface/:id` | `EditorRail` (icons only) | `EditorTopBar` (h-12, back/title/save/actions) |

### 3.1 Workspace sidebar — five items, no more

```
─ Workspace ─
  ◇ Home              /
  ◇ Brands            /brands
  ◇ Templates         /templates
  ◇ Learn             /learn
─────────────
  ◇ Settings          /settings
  ◇ Account           /account
```

### 3.2 Brand sidebar — five sections, no more

```
─ {Brand Name} ─       (brand switcher in topbar, NOT here)
  ◇ Overview          /b/:slug
  ◇ Identity          /b/:slug/identity
  ◇ Assets            /b/:slug/assets
  ◇ Guidelines        /b/:slug/guidelines
  ◇ Share             /b/:slug/share
─────────────
  ◇ Brand settings    /b/:slug/settings
```

If you're tempted to add a sixth brand-level item, the answer is
"it goes inside one of these five." Period.

### 3.3 Inside Identity (a tabbed page)

```
Identity
├── Logo            (uploads, variants, profile icons, "Open Logo Lab" button)
├── Colors          (palette, harmonies, contrast checks, suggested neutrals)
├── Typography      (pairings, scale, hierarchy preview)
├── Voice           (tone, do/don't word lists)
└── Strategy        (mission, vision, values, positioning statement)
```

### 3.4 Inside Assets (a filterable hub)

```
Assets   [All] [Print] [Social] [Screen] [Utility]
─────────────────────────────────────────────────
   Card grid: business cards · invoices · IG posts · IG stories ·
   FB covers · social media hub · presentations · mockups ·
   animations · design canvas · QR · brand assets uploader
```

### 3.5 Inside Share (the outbox)

```
Share
├── Public showcase    (a single canonical link, copy / open / settings)
├── Logo presentation  (deck of concepts for client review)
├── Brand book PDF     (export Guidelines as PDF / PPTX / web link)
└── Per-asset exports  (batch zip)
```

### 3.6 Sitemap

```
/                              → Workspace Home (Continue · Brands · Activity · Quick Start)
/brands                        → Brand library (grid + filters)
/templates                     → Template library
/learn                         → Lessons + examples
/settings                      → Workspace settings (members, billing, integrations)
/account                       → Personal account (profile, theme, password)
/onboarding                    → Brand-creation wizard (FocusPage)
/b/:slug                       → Brand Overview
/b/:slug/identity?tab=...      → Identity tabs
/b/:slug/assets?category=...   → Assets categories
/b/:slug/guidelines            → Guidelines viewer/editor
/b/:slug/share                 → Share hub
/b/:slug/settings              → Brand settings
/b/:slug/edit/:surface/:docId  → Editor (full-screen)
/brand/:slug/showcase          → Public showcase (PublicShell)
```

---

## 4. Visual Direction

This is where the previous redesign work was lacking. Take this section
seriously — it determines whether the product feels premium or generic.

### 4.1 Mood

> Calm, generous, considered. The product has nothing to prove and
> doesn't shout.
>
> Whitespace is the most expensive material. Spend it.
>
> Color is used to **mean** something, not to decorate.
>
> Type does the heavy lifting. Most of the page is words on canvas.

### 4.2 Five visual principles

1. **Restraint over decoration.** No gradients on cards. No blurred
   blobs as background. No purple-to-pink rainbow icons. One accent
   color, used precisely.
2. **Type-led hierarchy.** Three weights, three sizes, careful tracking.
   The h1 and the body copy together should feel like an editorial site.
3. **Generous breathing room.** Card padding ≥ 24px. Vertical rhythm in
   8px or 12px increments. Section gaps ≥ 48px.
4. **Hover is a promise of behavior.** Every interactive element changes
   state on hover — not just opacity. Cursor, micro-shadow, slight rise,
   icon shift. The product *feels* alive on hover.
5. **Motion is an answer, not a flourish.** Use motion to explain *what
   just happened* (a save, a navigation, a selection). Never animate for
   delight alone.

### 4.3 References (extract patterns, don't copy pixels)

| Reference | Take from it | Don't take from it |
|---|---|---|
| **Linear** | Information density, command palette, list rhythm, keyboard-first | Their dark-mode-first aesthetic — BrandingOS is light-mode-first |
| **Vercel dashboard** | Restraint, type, generous spacing | Their grey-on-white-only palette — we need warmth |
| **Stripe Dashboard** | Tabular precision, calm color, financial-grade trust | Their density on data-heavy screens |
| **Notion** | Forgiving inline editing, content-first hierarchy | Their toolbar-first chrome |
| **Framer** | Creative confidence, bold typographic hero moments | Their landing-page maximalism |
| **Things 3** | Typographic care, generous spacing, calm restraint | Their iOS-only patterns |
| **Arc browser** | Interaction craft, micro-animation, sidebar polish | Their experimental layouts |

### 4.4 Anti-references — explicit "do not"

- **Generic shadcn-default look** — `Card className="p-6"` everywhere is
  what BrandingOS looks like today. The redesign must feel handmade, not assembled.
- **Pastel gradient on every card** — the current screens are full of
  `from-rose-500 to-pink-600` decorative gradients. Strip them. Use color
  to *categorize*, not to decorate.
- **Cluttered sidebars** — never repeat the 19-item submenu mistake.
- **Dashboard-as-stat-grid** — four "Total Brands" stat tiles at the top
  is the laziest SaaS pattern. Don't.
- **"Welcome back, User!"** as a header — patronizing.
- **Gradient hero buttons with emoji** — no.

---

## 5. Color System

Don't invent new colors. Use this palette.

### 5.1 Foundation (light mode is canonical)

```
Background           #FBFBFA   warm white, NOT pure white
Surface              #FFFFFF   pure white (cards, sheets)
Surface raised       #F5F5F4   subtle elevation
Border               #E8E6E1   warm neutral, low contrast
Border strong        #D6D3CC   for inputs and dividers that need to read

Text primary         #1A1A1A   not pure black
Text secondary       #57534E   stone-600 warm
Text tertiary        #A8A29E   stone-400 warm
Text disabled        #D6D3CC

Accent / Primary     #1F2937   slate-800 — used for primary buttons & active state
Accent hover         #111827   slate-900
Accent foreground    #FFFFFF
```

> The accent is **dark slate**, not blue. BrandingOS is a tool for creating
> brands — it should not impose its own loud accent color. Saving a
> primary blue for itself is what every other SaaS does. We do the
> opposite: we let the user's brand colors be loud and ours be quiet.

### 5.2 Semantic

```
Success   #15803D   green-700  (only for save-confirmed, never decorative)
Warning   #B45309   amber-700  (only for "this could break", never for highlights)
Danger    #B91C1C   red-700    (only for destructive, never for emphasis)
Info      #0369A1   sky-700    (rarely used)
```

### 5.3 Category accents (used to *categorize*, not decorate)

These map to the brand sections so a returning user learns the language:

```
Identity    #7C3AED   violet-600  → logo / colors / type
Assets      #0891B2   cyan-600    → deliverables
Guidelines  #C2410C   orange-700  → brand book
Share       #15803D   green-700   → outbox / public
Editor      #1F2937   slate-800   → focus mode
```

Use these as a 2px left border on cards, as the icon tint, and as the
section color on the sidebar active state. **Never as a card background.**

### 5.4 Dark mode

Build it. Same palette, inverted, with the same warmth (don't use pure
black `#000`; use `#0C0A09`, stone-950). Same accent / category colors.
Light mode is the design canvas; dark mode follows automatically.

---

## 6. Typography

Type is 70% of the design. Get this right and most of the product looks
good for free.

### 6.1 Font stack

```
Display & headings:  "Söhne", "Inter", -apple-system, system-ui
Body & UI:           "Söhne", "Inter", -apple-system, system-ui
Mono / code / kbd:   "Söhne Mono", "JetBrains Mono", ui-monospace
```

If Söhne isn't available, use **Inter Tight** (display) + **Inter** (body)
+ **JetBrains Mono**. If even that isn't available, use system stack.
**Never** Roboto, never Open Sans, never Lato.

### 6.2 Scale

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display`  | 48 / 56 | 600 | Brand showcase headings only |
| `h1`       | 30 / 38 | 600 | Page titles |
| `h2`       | 22 / 30 | 600 | Section titles |
| `h3`       | 17 / 24 | 600 | Card titles, sub-section |
| `body`     | 14 / 22 | 400 | Default body text |
| `body-sm`  | 13 / 20 | 400 | Secondary body, cards |
| `caption`  | 12 / 16 | 500 | Eyebrows, breadcrumbs, meta |
| `micro`    | 11 / 14 | 600 | Tags, status pills, uppercase labels |

Letter spacing:
- Display & h1: `-0.02em`
- h2 & h3: `-0.01em`
- Body: `0`
- Micro / caption uppercase: `+0.06em`

### 6.3 Rules

- Headings are **never centered** except on `FocusPage` (onboarding) and
  the public `/showcase`.
- Body copy max width is **65–70 characters**. Always.
- Use **two weights max per page**: 600 for headings, 400 for body. 500
  exists for buttons and pill labels and that's it.
- Numbers are tabular (`font-feature-settings: "tnum"`) in tables and
  stat displays.

---

## 7. Spacing, Density & Layout

### 7.1 Spacing scale (in `px`)

```
2  4  8  12  16  20  24  32  40  48  64  80  96  128
```

That's the only scale. No `13px`, no `15px`, no `35px`. If you need
something between, you're wrong about the layout, not the scale.

### 7.2 Page rhythm

```
Topbar height           56  (h-14)
Editor topbar height    48  (h-12)
Sidebar width expanded 256
Sidebar width collapsed 56
Content gutter         24 sm / 32 md / 40 lg  (px-6 sm:px-8 lg:px-10)
Page vertical padding  32 sm / 48 md          (py-8 sm:py-12)
Section gap            48
Card padding           24
Card padding (compact) 16
List row height        56  (data tables, brand list)
List row height (sm)   48
Button height          36  (h-9, default)
Button height (sm)     32  (h-8)
Input height           36
```

### 7.3 Grid

- Page max width: **1200px** (`max-w-6xl` on most pages).
- Brand showcase / public pages: **1024px**.
- Editor pages: full width, no max.
- Card grids: 1 → 2 → 3 → 4 columns at sm / md / lg / xl breakpoints.

### 7.4 Page templates (only four exist)

1. **AppPage** — sidebar + topbar + padded content. 99% of screens.
2. **EditorPage** — icon rail + topbar + canvas + properties panel. All editors.
3. **FocusPage** — centered max-w-3xl, sticky footer with primary action. Onboarding & wizards.
4. **PublicPage** — minimal top nav, long-form layout. `/brand/:slug/showcase` and auth.

If a screen isn't one of these four, it's a bug.

---

## 8. Motion

### 8.1 Duration tokens

```
fast      120ms   (hover state changes, tooltip in)
base      180ms   (most transitions)
slow      280ms   (route changes, drawer slides)
slower    400ms   (modal in, hero reveal)
```

### 8.2 Easing

```
standard    cubic-bezier(0.22, 1, 0.36, 1)   (decelerate — most things)
emphasized  cubic-bezier(0.34, 1.56, 0.64, 1) (gentle overshoot — only on success)
linear      linear (only for spinners and loaders)
```

### 8.3 Where motion happens

- **Hover**: bg color shift `120ms`, shadow ramp `180ms`, slight `-translate-y-0.5` on cards `180ms`.
- **Active state on tab click**: underline slides between tabs `180ms standard`.
- **Brand switcher dropdown**: scale-from 0.96 + fade `180ms standard`.
- **Save indicator**: spinner → check icon morph `200ms emphasized`.
- **Page route change**: 100ms cross-fade only. **No slide transitions.**
- **Empty state illustration**: 0 motion. Static.

### 8.4 Where motion does NOT happen

- No "wow" entrance animations on dashboard load
- No parallax
- No animated gradients
- No floating shapes in the background
- No springy bouncing buttons
- Nothing that delays the user's next action

---

## 9. Iconography

- Library: **Lucide** (`lucide-react`). Already in the project.
- Stroke width: **1.75** (slightly thinner than default for elegance).
- Size scale: **14 / 16 / 20 / 24**. Nothing else.
- Icons are **always paired with a label** in primary nav and primary
  buttons. Icon-only is reserved for: toolbar, table row actions,
  collapsed sidebar.
- Color: inherits from text. Tinted only with the category accent (§5.3)
  on section icons.

---

## 10. Component Library

This is the inventory the AI generator must produce. Each component has
states, sizes, and clear rules.

### 10.1 Foundation primitives

- **`Button`** — variants: `primary`, `secondary`, `ghost`, `outline`, `destructive`. Sizes: `sm` (h-8), `md` (h-9), `lg` (h-11). States: default, hover, focus-visible, active, disabled, loading.
- **`IconButton`** — square, icon-only. Same variants.
- **`Input`** — text, number, email, password. States: default, focus, error, disabled. With optional left icon, right icon, suffix, prefix.
- **`Textarea`** — auto-grow.
- **`Select`** — native-feeling dropdown with search when > 8 options.
- **`Combobox`** — searchable, used for fonts, brands, templates.
- **`Switch`** — for binary settings.
- **`Checkbox`** — for multi-select.
- **`RadioGroup`** — for exclusive selection.
- **`Slider`** — for numeric ranges (color HSL, size, opacity).
- **`Tabs`** — pill style on background, underline style on toolbars.
- **`Tooltip`** — appears after 400ms hover. Mono font for keyboard shortcuts inside.
- **`Dialog`** — modal with focus trap, backdrop blur 8px, max-w-md default.
- **`Sheet`** — side drawer. Used for properties panels and brand creation.
- **`Popover`** — non-modal, anchor-aligned.
- **`DropdownMenu`** — for action menus and the brand switcher.
- **`ContextMenu`** — right-click on cards and editor canvas.
- **`Toast`** — top-right, auto-dismiss 4s, stacked.
- **`Skeleton`** — for loading states. Shimmer is OK here, gentle, not flashy.
- **`Avatar`** — square (8px radius) for brands, circle for users.
- **`Badge`** — micro-text, used for status pills (Draft / Published / Pro).
- **`Kbd`** — keyboard key glyph in a tooltip or hint.

### 10.2 Layout primitives

- **`AppShell`** — root for AppPage. Mounts sidebar + topbar + content.
- **`EditorShell`** — root for EditorPage.
- **`FocusShell`** — root for FocusPage.
- **`PublicShell`** — root for PublicPage.
- **`PageHeader`** — title + subtitle + breadcrumb + actions slot + below slot.
  - Used on every AppPage. **No exceptions.**
- **`PageSection`** — visual section wrapper with title and gap-y rhythm.
- **`Container`** — `max-w-6xl mx-auto`.
- **`Sidebar`** — collapsible, with section labels and item groups.
- **`SidebarItem`** — icon + label + active state + optional badge.

### 10.3 Brand-specific components

- **`BrandSwitcher`** — dropdown in BrandTopBar. Shows all brands. Section-preserving.
- **`BrandAvatar`** — square logo (or initial on brand color) at sizes 24/32/40/56/80.
- **`BrandCard`** — used in `/brands` list. Logo + name + meta + actions on hover.
- **`BrandStatusPill`** — Draft / In Progress / Published / Archived.
- **`ContinueCard`** — large hero card on workspace home. "Resume editing X."
- **`SectionCard`** — the cards inside Identity / Assets / Share. NOT a generic `Card`. Different padding, different hover, category-tinted left border.
- **`ProgressRing`** — small SVG ring shown next to brand cards: "60% complete."

### 10.4 Identity components

- **`LogoGrid`** — square slot grid: primary, wordmark, icon, dark, light. Each slot is drag-droppable.
- **`ColorChip`** — large color square with hex / RGB / contrast info on hover.
- **`PalettePreview`** — full palette laid out as horizontal swatches with semantic labels.
- **`FontPairCard`** — H/B preview for a font pair, click to select.
- **`TypographyScale`** — visual cascade from display → caption with the brand's font.
- **`VoicePill`** — single tone-of-voice tag (e.g. "Confident", "Playful", "Editorial").

### 10.5 Asset components

- **`AssetTile`** — preview image + name + asset type. Click to open. Hover reveals quick actions.
- **`CategoryTabs`** — the All/Print/Social/Screen/Utility strip on Assets.
- **`AssetEmptyState`** — when a category has nothing yet.
- **`TemplatePreview`** — large preview for the template gallery.

### 10.6 Editor components

- **`EditorChrome`** — canonical editor topbar (already shipped). h-12. Back · breadcrumb · title · save state · actions.
- **`EditorRail`** — left icon strip. Tools: Select · Text · Shape · Image · Brand assets · Layers.
- **`EditorPropertiesPanel`** — right panel, context-sensitive to selection. Tabs: Properties · Position · Brand.
- **`EditorCanvas`** — the canvas. Generic shell that can host Fabric.js or DOM slides.
- **`EditorStatusBar`** — bottom bar with zoom, position, page count.
- **`SaveIndicator`** — already shipped inside EditorChrome.

### 10.7 Share components

- **`ShareLinkRow`** — copyable URL with copy button + open button + settings.
- **`PublicShowcaseCard`** — large card with "View public page" + visibility toggle.
- **`ExportCard`** — format icon + name + size + download button.

---

## 11. Per-Screen Briefs

For each screen below: required content (top to bottom), primary action,
secondary actions, what state to design first.

### 11.1 Workspace Home — `/`

**Purpose:** in 2 seconds, the user knows what to do next.

**Content (top to bottom):**
1. `PageHeader` — "Hi, {firstName}." (no exclamation. Calm.) Subtitle: "{N} brands · {M} assets · last edit {timeAgo}."
2. `ContinueCard` — IF the user has a recently-edited brand. Big, hero, single primary "Resume" button.
3. **Your brands** — title `h2`, then a horizontal row of up to 4 `BrandCard`s, plus a "+ New brand" tile on the right. "View all" link to `/brands`.
4. **Activity** — title `h2`, then a vertical feed: 5 most recent edits / exports / comments. Each row: brand avatar + action + relative time.
5. **Quick start** — title `h2`, then 3 cards: "Tour BrandingOS", "Browse templates", "What is brand identity".

**Empty state:** when no brands exist, replace #2 + #3 with a single hero
"Let's make your first brand" panel with one CTA.

**Primary action:** Resume (if applicable) → otherwise "Create brand."

### 11.2 Brands library — `/brands`

**Purpose:** find a brand, switch to it, manage many.

**Content:**
1. `PageHeader` — "Brands". Action slot: "+ New brand" (primary), "Filter", "Sort".
2. Filter row — All · Published · Draft · Archived. Plus a search input.
3. Brand grid — 2 → 3 → 4 columns of `BrandCard`s.

**`BrandCard` design:**
- Square logo top-left (40px)
- Brand name (h3)
- Tone tagline (body-sm, muted)
- Status pill bottom-left
- 4-color palette dots bottom-right
- Hover: shadow ramp + slide-up 1px + reveal 3 quick action icons (Open, Duplicate, Archive)
- Click anywhere on the card → opens `/b/:slug`

**Empty state:** illustrated empty card grid with one CTA.

### 11.3 Brand Overview — `/b/:slug`

**Purpose:** glance at the brand state and pick the next action.

**Content:**
1. `PageHeader` — title is brand name. Eyebrow is the brand logo (40px). Subtitle is the brand tone. Breadcrumb: "Brands ›". Actions: "Share" (secondary), "..." menu.
2. **Brand at a glance** — a card with: logo big (80px), name, tone, primary palette, primary font pair. Read-only. Click to jump to Identity.
3. **Completeness** — a row of 5 progress chips: Identity · Assets · Guidelines · Voice · Strategy. Each shows %. Click jumps to that section.
4. **Recent edits** — last 5 edits in this brand, with timestamps and section icons.
5. **What's next** — 1 contextual suggestion: "Your brand book is 70% done. Generate it." OR "You haven't picked a typography pair. Pick one." Single primary action.

**No 10-card menu of features. The sidebar is the menu.**

### 11.4 Identity — `/b/:slug/identity?tab=...`

**Purpose:** define what the brand looks and sounds like.

**Layout:**
- `PageHeader` — title "Identity", subtitle one line.
- `Tabs` strip below header: Logo · Colors · Typography · Voice · Strategy.
- Active tab persists to `?tab=`.

**Logo tab:**
- `LogoGrid` — 6 square slots (full / wordmark / icon / dark / light / alternate).
- Below: "Open Logo Lab" — secondary button that opens the logo editor.
- Right side: "Download all logos" panel (zip).

**Colors tab:**
- `PalettePreview` at top (horizontal swatch row, full width).
- "Add color" button.
- Below: harmonies suggestion grid (complementary, analogous, etc.) — 6 cards.
- Sidebar (right column on lg+): contrast checker preview ("Primary on background: AAA").

**Typography tab:**
- Top: current pair (display + body), large preview ("The quick brown fox..." in headline + body).
- Below: 6–8 alternative pairings as `FontPairCard`s.
- "Apply" replaces the pair.

**Voice tab:**
- Selected tone pills at top (3–5 tone words).
- Sentence-by-sentence "Do" / "Don't" examples.
- Editable do/don't lists.

**Strategy tab:**
- Mission · Vision · Values · Positioning — each as a long-form text block, inline-editable. Save on blur.

### 11.5 Assets — `/b/:slug/assets?category=...`

**Purpose:** generate deliverables fast.

**Layout:**
- `PageHeader` — title "Assets", subtitle one line.
- `CategoryTabs`: All · Print · Social · Screen · Utility. Persist to `?category=`.
- Filterable grid of `AssetTile`s. Each tile shows: preview thumbnail, name, last edit time. Click → opens editor for that asset.

**Empty state per category:** "No print assets yet" with a CTA per category.

**Tile detail:** when the user has saved instances, the tile shows the
most recent one as a thumbnail. Otherwise, a stylized icon.

### 11.6 Guidelines — `/b/:slug/guidelines`

**Purpose:** view, edit, and export the brand book.

**Layout:**
- `PageHeader` — title "Guidelines", subtitle "Your brand book.", actions: "Open editor" (primary), "Export PDF" (secondary).
- Below: a long-scroll preview of the brand book (read mode), section by section.
- Sticky right column (lg+): table of contents with anchor links.

**Edit mode:** clicking "Open editor" enters the EditorPage shell. Same
content, now editable in slides.

### 11.7 Share — `/b/:slug/share`

**Purpose:** turn this brand into a shareable artifact.

**Content:**
1. `PageHeader` — "Share", subtitle "Send this brand to the world."
2. **Public showcase** — `PublicShowcaseCard` with: status (private/public toggle), URL row with copy, "Open" button, "Customize" link.
3. **Logo presentation deck** — card with thumbnail of the deck, "Build deck" or "View deck" button.
4. **Brand book** — card with PDF preview, format selector (PDF / PPTX / Web link), "Export" button.
5. **Per-asset exports** — small grid of recent exports with re-download.

### 11.8 Editor (any) — `/b/:slug/edit/:surface/:docId`

**Purpose:** focused work. No noise.

**Layout (full screen):**
```
┌─ EditorChrome (h-12) ──────────────────────────┐
│ ←  Brand · Section · Doc            ●Saved  ⋯  │
├─┬──────────────────────────────────┬────────────┤
│ │                                  │            │
│E│           CANVAS                 │ Properties │
│R│                                  │   Panel    │
│a│                                  │            │
│i│                                  │            │
│l│                                  │            │
└─┴──────────────────────────────────┴────────────┘
```

**Rules:**
- The canvas is **edge-to-edge** of the available space.
- The right panel collapses to 40px when no selection.
- Cmd+S triggers a flush save and shows ●Saved for 1.5s.
- Esc exits selection. Esc again exits the editor (with a confirmation if dirty).
- All editors share this exact chrome. No exceptions.

### 11.9 Onboarding — `/onboarding` (FocusPage)

**Purpose:** create the first brand in <3 minutes with no jargon.

**Layout:** centered max-w-2xl, sticky bottom footer with one primary action, breadcrumb of dots showing step N of 5.

**Steps:**
1. **Name** — single big input: "What's the brand called?" subtitle: "You can change this anytime." One next button.
2. **Industry** — searchable combobox: "What does it do?"
3. **Vibe** — pick one of 6 vibe presets, each shown as a 4-color palette + sample type. Big visual cards.
4. **Logo** — three paths: pick from 12 AI-generated options · upload · open Logo Lab.
5. **Done** — "Welcome to your brand. Continue to Identity →" — one button. Lands user on `/b/:slug/identity`.

**No "Skip onboarding" link.** It's already 5 fast steps.

### 11.10 Public Showcase — `/brand/:slug/showcase` (PublicShell)

**Purpose:** beautiful read-only public page.

This is the screen that determines whether a freelancer or stakeholder
takes BrandingOS seriously. It must be the **best-looking screen in the
product**.

**Content:**
- Hero: brand logo (large), brand name (display weight), tone tagline.
- Section 1: Story / mission paragraph (long-form, 65ch wide).
- Section 2: Logo system (variants on light + dark backgrounds).
- Section 3: Color palette (full-bleed horizontal swatches).
- Section 4: Typography (display sample + body sample, in the brand fonts).
- Section 5: Voice ("Sounds like..." with do/don't examples).
- Section 6: Examples gallery (asset thumbnails from the brand).
- Footer: small "Made with BrandingOS" attribution.

**No app chrome. No login prompt. Pure brand showcase.**

---

## 12. Interaction Patterns

These are non-negotiable.

### 12.1 Selection (everywhere)

- Click selects.
- Cmd+click multi-selects in lists.
- Shift+click range-selects in lists.
- Esc deselects.
- Selected state: 2px ring in the accent color, never fill.

### 12.2 Save semantics (every editor)

- Auto-save on change, debounced 1200ms.
- Save state visible in `EditorChrome`: idle / saving / saved / error.
- Cmd+S forces a flush save.
- Cmd+S NEVER opens a file dialog. Override the browser default.
- On error: a "Retry" link appears next to the indicator. No toast.
- Before navigating away from a dirty doc: a `Dialog` confirms.

### 12.3 Navigation

- Breadcrumb in `PageHeader` is the canonical "where am I" — not the back button.
- Back button only exists in `EditorChrome` and `FocusPage`.
- Brand switcher is **section-preserving**: switching from `/b/acme/identity?tab=logo` to "Globex" goes to `/b/globex/identity?tab=logo`.
- Cmd+K opens command palette from any scope (workspace, brand, editor).
- Cmd+B toggles the sidebar.

### 12.4 Drag and drop

- Logo slots accept dropped image files.
- Asset tiles can be dragged to reorder.
- Editor canvas accepts pasted/dropped images.
- Drag over feedback: 2px dashed accent border on the drop target.

### 12.5 Empty states

Never a blank screen. Every empty state has:
1. A small monochrome icon (24–32px).
2. One sentence describing what would normally be here.
3. One primary action button.

**No illustrations of cartoon people or fictional UI.** Quiet empty
states only.

### 12.6 Loading states

- Use `Skeleton` placeholders that match the final shape.
- Never a centered spinner unless the load is < 200ms guaranteed.
- Skeletons never shimmer for more than 800ms before showing real content
  (set a min-display-time so they don't flash).

### 12.7 Error states

- Inline errors below inputs in red-700.
- Page-level errors in a small banner at the top of the content area.
- Network errors retry once silently, then surface.

---

## 13. Microcopy Guidelines

Voice: **calm, direct, slightly editorial**. The product talks to the
user like a senior colleague, not a chirpy assistant.

| Don't say | Say |
|---|---|
| "Welcome back, User!" | "Hi, Maya." or just the page title |
| "Oops! Something went wrong" | "Couldn't load your brands. Try again." |
| "Awesome! 🎉 Logo saved!" | "Logo saved." |
| "Click here to..." | (just label the action with the verb) |
| "Are you sure you want to delete?" | "Delete this brand? You'll lose its assets and history." |
| "Loading..." | "Loading brands..." (specific) |
| "No items found" | "No brands match this filter." |

Use sentence case for labels. Title case is reserved for proper names.
Buttons say what they do: "Create brand", not "Submit". Confirmation
buttons name the action: "Delete brand", not "OK".

---

## 14. Sample Data (for the generator to populate)

Use these brands when populating mockups. They're realistic and look
distinct enough to test the design.

```yaml
brands:
  - name: Raqm
    tone: Editorial typography studio
    primary: "#1F2937"
    accent: "#D97706"
    font_display: "Söhne Breit"
    font_body: "Söhne"
    status: published
    completeness: 0.92

  - name: Meridian
    tone: Sustainable architecture practice
    primary: "#15803D"
    accent: "#FBBF24"
    font_display: "GT Sectra"
    font_body: "Inter"
    status: published
    completeness: 0.78

  - name: Halcyon Coffee
    tone: Specialty roaster, third-wave
    primary: "#7C2D12"
    accent: "#FED7AA"
    font_display: "Söhne Mono"
    font_body: "Söhne"
    status: in_progress
    completeness: 0.45

  - name: Pollen Labs
    tone: Microbiology research startup
    primary: "#1E40AF"
    accent: "#FACC15"
    font_display: "Söhne"
    font_body: "Söhne"
    status: draft
    completeness: 0.20
```

Use real-feeling activity:
> "Daniel updated **Halcyon Coffee** color palette · 2h ago"
> "You exported **Meridian** brand book PDF · yesterday"
> "Priya commented on **Raqm** logo concept #3 · 3d ago"

Don't use lorem ipsum. Don't use placeholder names. Use these.

---

## 15. Accessibility

- **WCAG 2.2 AA** is the floor. AAA on text contrast where reasonable.
- Every interactive element has a visible focus ring (`outline` 2px,
  offset 2px, accent color). Never `outline: none` without a replacement.
- Keyboard reachable: every action must be doable without a mouse.
- Skip-to-content link at the top of every AppPage.
- All icons have `aria-label`s when icon-only.
- Tab order follows visual reading order.
- Color is never the only signal — pair with icons or text.
- Animations respect `prefers-reduced-motion`.

---

## 16. Responsive

Breakpoints (Tailwind defaults):
```
sm  640    → tablet portrait, sidebar collapses
md  768    → tablet landscape, sidebar collapses still
lg 1024    → desktop, sidebar expands
xl 1280    → wide desktop, properties panels show
2xl 1536   → ultrawide, no extra columns
```

**Mobile rules** (< sm):
- Sidebar becomes a drawer triggered by a hamburger in the topbar.
- Topbar shrinks to: hamburger + brand name + user menu.
- Brand switcher becomes a full-screen sheet.
- Editor pages on mobile: read-only preview with a "Open on desktop" notice.

**Don't try to make editors work on mobile.** It's a desktop product.

---

## 17. What to Avoid (anti-patterns, explicit)

These are real mistakes the current product makes. Don't replicate any.

- ❌ A sidebar item that points to a NotFound route
- ❌ Two routes for the same concept (`/brand-guides` and `/guidelines`)
- ❌ A tool with no destination for its output (Logo Maker today)
- ❌ A page where the user has to scroll past 19 nav items
- ❌ Different layouts for the "same" page from different entry points
- ❌ Save semantics that vary by editor
- ❌ Brand context that's invisible in the topbar
- ❌ Onboarding that doesn't connect to where the user lands afterwards
- ❌ Stat-tile dashboards with no actionable insight
- ❌ Cards with decorative gradients that mean nothing
- ❌ Toast notifications for minor confirmations (use the inline save indicator)
- ❌ Hidden features behind hover-only triggers (mobile users miss them)
- ❌ Any text smaller than 12px
- ❌ Any line of body copy longer than 75 characters
- ❌ Welcome messages that use the user's name with an exclamation point
- ❌ "Pro" badges scattered around — group them in a single upgrade surface
- ❌ Multi-color icon decorations (Lucide line icons, single tint)
- ❌ Multiple primary buttons on one screen
- ❌ Sidebars that change items based on which page you're on (the brandkit submenu sin)

---

## 18. Generator-Specific Instructions

How to feed this brief into the most common AI UI generators.

### 18.1 v0.dev (by Vercel)

- Paste sections **§4 (Visual)** + **§5 (Color)** + **§6 (Type)** + **§7 (Spacing)** + the brief for the screen you want from **§11**.
- Tell it: "Use shadcn/ui components but **strip all default decorative styling**. No gradients. Use the color palette and type scale exactly as specified. Tailwind only."
- Iterate per screen, not all at once.

### 18.2 Lovable / Bolt

- Paste the **whole brief**.
- Tell it: "Build a Vite + React + TypeScript + Tailwind app. Use the IA in §3 verbatim. Implement screens in §11 in order: Workspace Home → Brands → Brand Overview → Identity → Assets → Guidelines → Share → Public Showcase → Onboarding → Editor. Stop and let me review after each screen."
- Insist on **the four page templates** (§7.4) being implemented as actual layout components, not duplicated per page.

### 18.3 Figma AI / Galileo / Uizard

- Treat each screen brief in §11 as a separate prompt.
- For each, paste: §1 (positioning), §4 (visual), §5 (color), §6 (type), §7 (spacing), §11.X (the screen).
- Specify desktop 1440 width first, then ask for mobile 390.
- Demand the public showcase (`§11.10`) be the most polished screen, since it sets the visual ceiling.

### 18.4 Cursor / Claude Code / GitHub Copilot Chat

- Drop this entire file in `docs/ux-redesign/` (it already lives there).
- Tell the agent: "Read `docs/ux-redesign/REDESIGN-BRIEF.md` and `ARCHITECTURE.md`. Implement screens one at a time. Use the existing `BrandLayout`, `DashboardLayout`, `PageHeader`, `EditorChrome` primitives. Don't introduce new layout files. Don't touch `src/shared/services/export/vectorize/*`."

### 18.5 What to give the generator AS REFERENCE IMAGES (if it accepts them)

- A Linear screenshot for sidebar density and information hierarchy.
- A Vercel Dashboard screenshot for restraint and spacing.
- A Things 3 screenshot for typographic care.
- A Stripe Dashboard screenshot for trust + tabular precision.
- An Arc browser screenshot for hover craft.

**Do not give it Canva, Adobe Express, or any logo-maker tool as a
reference.** That's the aesthetic the redesign exists to escape.

---

## 19. Output Checklist

Hand this checklist back to the generator and ask it to grade itself.
A successful redesign passes every line.

```
─ Information architecture
[ ] Three scopes implemented (Workspace, Brand, Editor)
[ ] Workspace sidebar has exactly 5 items
[ ] Brand sidebar has exactly 5 sections
[ ] Identity is a tabbed page (5 tabs)
[ ] Assets is a filterable hub (5 categories)
[ ] Share is a hub with public showcase + deck + book + exports
[ ] Editor uses the EditorChrome / EditorRail / Properties pattern
[ ] No sidebar item points to a NotFound page

─ Page templates
[ ] Exactly 4 page templates exist (AppPage / EditorPage / FocusPage / PublicPage)
[ ] PageHeader is used on every AppPage
[ ] Topbar height is h-14 everywhere except editors (h-12)
[ ] No page redeclares horizontal/vertical padding inside the layout

─ Visual
[ ] No decorative gradients on cards
[ ] One accent color (slate-800), used precisely
[ ] Category accents are used as left borders / icon tints, never fills
[ ] Lucide icons only, stroke 1.75
[ ] Two font weights max per page (600 + 400)
[ ] Body copy max width 65–70 ch

─ Interaction
[ ] Auto-save in every editor with normalized save state
[ ] Cmd+S flushes a save
[ ] Cmd+K opens a command palette
[ ] Brand switcher is section-preserving
[ ] All hover states animate (180ms standard)
[ ] All empty states have icon + sentence + action

─ Accessibility
[ ] WCAG 2.2 AA color contrast on all text
[ ] Visible focus rings everywhere
[ ] Every icon-only button has aria-label
[ ] prefers-reduced-motion respected

─ Content
[ ] No lorem ipsum
[ ] Sample data uses Raqm / Meridian / Halcyon / Pollen
[ ] No exclamation marks in headers
[ ] No emoji in product UI

─ Premium feel
[ ] Public showcase is the best-looking screen
[ ] Onboarding is ≤ 5 steps
[ ] First screen a new user sees has at most 3 things to do
[ ] Returning user sees a Continue surface
[ ] Page rhythm uses the 8/12-px scale
```

---

## 20. One-Line North Star

> **BrandingOS should feel like a tool a senior designer would willingly
> show their clients — quietly confident, considered in every detail, and
> completely out of the user's way.**

If a screen doesn't pass that line, redraw it.
