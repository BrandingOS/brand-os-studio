# Brand Kit — the strongest brand kit on the internet (spec, 2026-08-29)

Owner decisions (asked once, final):
1. Add a MOCKUP family.
2. Promote every experimental family that passes QA to ACTIVE; report what does not.
3. Editing: Quick Edit in the kit for CONTENT (every field, live), Design for LAYOUT
   (Use Template → snapshot; Edit Template → master). Both entry points on every card.
4. Land on `feat/brand-kit-simplification` (merged, not pushed).

Inputs: `.audit/CODE.md` (code audit), `.audit/OURS.md` (67 defects), `.audit/REFERENCE.md`
(Brandmark). References: https://app.brandmark.io/v3/brand/demo/ and chat.brandmark.io/brandkit/demo.

## 1. The bar

Every card in the kit must satisfy ALL of:
- **Real content.** Nothing a customer reads is a literal. No "Jane Smith", "Acme", lorem,
  "$8,300", "brand.com", "a brand · 2026". Copy comes from the brand (name, strategy, contact) or
  from the deliverable's own content object, and is editable.
- **Editable.** Every visible text/number/date/list is a field in the kit's Quick Edit panel
  (schema-generated from the content kind) AND inline (click the text on the artwork). Every field
  repaints live. Save persists; reload shows it; exports ship it.
- **On brand.** Typefaces = the brand's (heading/body stacks), colours = the brand palette via
  `buildBrandPalette` / `pickSurfaceTokens`, foreground via `pickFgOnBackground`, logo via
  `pickLogoOnBackground`. Zero off-brand hex in renderers except pure white/black used for contrast.
- **Downloadable, properly.** Every card: at least PNG @ real pixel size AND the family's native
  format (see §5). Card ⬇, drilldown header ⬇, tile ⬇, context-menu ⬇ and Export Kit all produce the
  SAME payload for the same thing. No letterboxing. No 0-byte, no HTML-as-image, no junk numbered
  variants.
- **Curated.** Every variant shown is distinct, named by a designer (never "Wave 2 · 43"), readable
  at tile size, contrast-checked. Tripled families are collapsed to their real designs.
- **Both ways in.** Card menu: Edit (kit Quick Edit) · Use Template (Design snapshot) · Edit Template
  (master in Design) · Download.
- **Chrome.** DS tokens only, keyboard reachable, Esc closes, works at 1024 and 390, dark mode
  readable, toasts never cover actions, dialogs scroll.

## 2. Architecture (one mechanism)

```
content kind (data)  →  <Bind> in renderer (declaration)  →  ContentPanel (generated UI)
                     →  SavedCardCustomization.content  ≡  Design body.content (one object)
                     →  exporters/<kind>.ts (native format) + PNG snapshot (universal)
```
- `KIND_BY_TEMPLATE_TYPE` becomes TOTAL. New kinds (in `features/brandkit/content/kinds.ts`, with
  `fields.ts` groups, `schema.ts` zod, `hydrateContent` defaults from the brand):
  - `person` (widen): + company, address, tagline, pronouns?, socials[] (used by business card,
    email signature)
  - `letter` (exists): recipient/date/subject/body default from brand + today
  - `invoice` (exists)
  - `address` — envelope: sender{name,lines[]}, recipient{name,lines[]}, postageLabel?
  - `note` — notecard: greeting, message, signOff
  - `socialPost` — post/story/cover: headline, subline, body, cta, handle, date, tag
  - `profile` — profile icon / favicon: glyph 'logo'|'initial'|'custom', text, tabTitle, url
  - `webHero` — website/landing: nav[], eyebrow, headline, subhead, primaryCta, secondaryCta,
    stats[{value,label}], url
  - `deck` — decks + Presentation System: title, subtitle, presenter, date, slides[{kind, heading,
    body, bullets[], stat{value,label}, quote{text,by}}]
  - `mockupLabel` — mockups: primaryText, secondaryText, badge, url
  - `motion` — animations: text, durationMs, loop
  - `qr` — payload (url/vcard from person), label
- Design picks (`TemplateDesignPicks`: primary, secondary, logoId, logoColor, fontId, showLogo) are
  part of the saved object; renderers take `{brand, content, picks}`. The `TemplateOverrides` /
  `contentFieldsForType` / DOM-walker `LivePreviewFrame` / `<img>` src-swap legacy path is deleted.
- `renderers/brandStyle.ts` (new, shared): `fontStack(brand,'heading'|'body')`,
  `surface(brand,kind)`, `fgOn(bg)`, `logoOn(brand,bg)`. Every renderer uses it; no file hardcodes a
  family or a surface hex.
- `ContentPanel` gains `image` (AssetSourcePopover) and `color` field types; otherwise unchanged.
- Design reuses everything: `TemplateInstanceProperties` = ContentPanel; kit ↔ Design share
  `saveDeliverableContent(brandId, templateId, content)`.
- Guard tests (per family): (a) render sweep asserts `data-bind` paths ⊇ kind's field paths for
  EVERY variant; (b) literal scan of renderer source fails on the banned strings; (c) contrast
  sweep: every rendered text node ≥ 4.5:1 (3:1 for ≥ 24px) against its background.

## 3. Families and their targets

| family | today | target |
|---|---|---|
| Logos | combos w/o logo, desc-as-label, no rules | Real logo system page: originals (SVG/PNG/PDF each), contrast-checked on-brand pairings (`pickLogoOnBackground`), clear-space + min-size + misuse tiles, mono/reverse, favicon/app-icon derivations. Downloads: per-variant SVG+PNG(512/1024/2048)+PDF, all-combos zip, ICO/app-icon set. |
| Colors | read-only shade panel, 32 greys as colours, 10MB .ai | Editable hex/name/role (writes to the brand via the Setup chain with confirmation), contrast matrix, tints/shades that round-trip, token exports (CSS vars, SCSS, Tailwind, JSON design-tokens, Figma tokens, ASE), swatches SVG/PNG. Greys excluded by default. |
| Typography | 2 "Aa" in UI font, Regular only, CORS errors | Specimens in the REAL font (via `fonts.ts`/`googleFonts.ts` loaders, no third-party proxy), pairing, type scale, available weights, usage rules, CSS embed snippet + `@font-face`, licence note; download = all weights (Google via CSS API woff2→ttf) or uploads; missing → clear in-UI notice. |
| Icons | random keyword set, unpersisted edits, 14MB | Curated brand-relevant set (industry packs), add/remove/reorder, weight+tint persisted, downloads SVG/PNG/sprite; lean by default. |
| Photos | stock dupes / "Slot A" / HTML | Real uploads via `AssetSourcePopover`, brand treatment (duotone/overlay using palette), art-direction rules text, downloads originals + treated. Completion counts real uploads only. |
| Strategy | read-only, no ⬇ in drilldown | Edit (→ Setup strategy editors), ⬇ strategy.pdf/md/json in drilldown; the brand-book PDF (§5). |
| Business Card | 130 (100 junk), text doesn't repaint | ~24 curated designs, every field bound (person), print export PDF 85×55mm+bleed & 3.5×2in, PNG @300dpi. |
| Letterhead | 130, letterboxed, empty body | ~20 curated; letter kind fully bound incl. recipient/date/subject/body; PDF A4/Letter, DOCX. |
| Invoice | 130, 8 bound | ~20 curated; invoice kind bound everywhere incl. totals; PDF A4/Letter. |
| Envelope | exp, 130, "Jane Smith" | ~16 curated; address kind; PDF DL/#10; promote. |
| Email Signature | 5/30 bound | ~16 curated; person kind; export HTML (inline styles, hosted-logo PNG) + PNG. |
| Social Post/Story/Cover/Profile | exp, unbound | ~16 each curated; socialPost/profile kinds; PNG at exact platform sizes (1080², 1080×1920, 820×312 / 1500×500, 400²) + a "size set" zip; promote. |
| Favicon | exp, "brand.com" | profile kind; export favicon.ico (16/32/48) + PNG 180/192/512 + `site.webmanifest` snippet; promote. |
| Website / Landing | exp, lorem | webHero kind; ~12 each curated; PNG 1440-wide + HTML/CSS starter export; promote. |
| Decks ×4 + Presentation System | 10 tripled, "$1.4M seed" | 10 real slides each, deck kind, PPTX export (pptxgenjs) + PDF; promote. |
| Animations ×4 | static stills | Real CSS keyframe animations (logo reveal, slide, fade, rotate) with motion kind; preview plays; export GIF + MP4 (frame capture → gif.js / mp4-muxer) + Lottie-style JSON where feasible; promote what works. |
| Mockups (NEW) | none | Vector scenes (signage, tote, tee, mug, business-card stack, phone/laptop screen, packaging, billboard, sticker) with the logo composited via `pickLogoOnBackground`; mockupLabel kind; PNG 2000px; own group "Mockups". Existing hidden mockup renderers are the starting material. |
| Brand Board | ok | keep; PNG + PDF. |
| Guides ×5 | hidden | stay hidden (Guideline builder owns it); the kit links to it and the brand-book PDF export lives here. |

Variant curation rule: keep a design only if it is distinct, readable at tile size, contrast-clean,
and fully bound. Rename every kept design (human names). Keep template ids of kept designs
unchanged (persistence keys); removed ids stay reserved. Dev/admin can still see culled ones under
an "Archive" toggle for a release, then delete.

## 4. Editing surfaces

- **Quick Edit (kit)**: `BrandKitCardEditor` reduced to: preview (the real renderer, BindProvider)
  + `ContentPanel(kind)` + picks (colour/logo/font from the brand) + Save/Reset/Download. Inline
  click-to-edit on the artwork. Every field live. Toasts anchored top-centre inside the editor so
  they never cover the action bar.
- **Design**: Use Template / Edit Template on every card and tile menu (via masters). Both share
  the saved content object.
- **Brand-asset editors**: Logos (variants + rules), Colors (edit), Typography (choose pairing,
  weights), Icons (curate), Photos (upload) — each writes to the brand through the Setup chain
  (`editBrand`/`mockBrandToPatch`) with a confirmation naming what changes.

## 5. Downloads & exports (from the model, not the screen)

`exporters/` per kind: `stationery.ts` (PDF/SVG at real page sizes via jspdf + opentype embedding),
`deck.ts` (PPTX), `favicon.ts` (ICO + PNG set), `signature.ts` (HTML), `social.ts` (size sets),
`tokens.ts` (CSS/SCSS/Tailwind/JSON/Figma/ASE), `motion.ts` (GIF/MP4), `brandBook.ts` (PDF: cover,
logo rules, palette, type, applications — generated from the kit), `qr.ts` (real QR via `qrcode`).
PNG snapshot remains universal, at the deliverable's real pixel size (no 260px mount for
non-card sizes: social at 1080, web at 1440, decks at 1920). The export dialog gets a Formats
section (PNG · SVG · PDF · native) and a README.md in the zip. One payload per verb.

## 5b. Learned from the reference (`.audit/REFERENCE.md`) — adopted

- **Download vocabulary, everywhere the same**: primary menu = *For web (PNG)* · *For print (PDF)*;
  behind ⋮ = *Vector (SVG)* · *JPG* · *Custom size…* (modal: width/height px, padding, trim empty
  space, background colour/transparent, live preview). One component, `DownloadMenu`, used by every
  card, tile, drilldown header and the brand-asset editors.
- **Native formats**: DOCX letterhead in **US Letter and A4**; PPTX decks; **editable PDF**
  business cards; animations as **SVG + Lottie JSON** as well as GIF/MP4; bulk zip of everything.
- **Logo treatments** as first-class variants: Color · Transparent · Inverse · Black · White ·
  White/Transparent · Black/Transparent · on each accent — auto-derived and contrast-checked,
  each downloadable in every format. Profile icons = logo/icon × container shapes (circle,
  squircle, rounded, square, badge…) × colour modes, at exact platform sizes (a size list per
  platform is our edge: IG/LinkedIn/X/YouTube/TikTok/App Store/favicon).
- **Brand core = Settings**: name · logo · icon · palette (add/remove/edit, semantic roles, NOT
  index-mapped) · fonts (Title/Accent/Body slots) — ours already lives in Setup; the kit surfaces a
  compact "Brand core" strip with links, so nothing is edited in two places.
- **Kit-level contact info** ("Edit Info": name, role, phone, email, website, social handles,
  company address, tagline) — ours is the widened `person` kind seeded from the brand's business
  info; edit once, every stationery/signature template updates.
- **Filters that mean something**: by treatment (logos), by industry (cards/covers), by intent
  (posts: Sales · Announcement · Quotes · Holidays), Intro/Outro/Loop (animations). Add a `tags[]`
  to templates and a chip row + search per drilldown.
- **Decks flip in place** (carousel in the tile) — do it for decks and stories.
- **Brand guideline as a live page with a public share link** that also serves downloads —
  ours: link the kit to the Guideline builder, and add a read-only share route serving downloads.
  Clear-space formula diagram (R = ⅓ min dimension), RGB/CMYK, proportional usage bar — into the
  Logos and Colors pages and the brand-book PDF.
- **Branded QR generator**: payload, logo from the kit, colour, fill mode, B/W — one tile in
  Brand Applications, real `qrcode` output, SVG/PNG.
- **Smart-object mockups** with "click to upload" any artwork, plus logo-composited defaults.

Where we deliberately beat them: semantic colour roles + WCAG everywhere; typography as a
system (pairing, scale, weights, files); guideline builder with real sections; multi-select and
pack downloads (social pack, print pack); platform size intelligence; email signature, favicon,
envelope, invoice, website in ONE consistent kit; Quick Edit + Design editing of every template;
brand-rendered covers.

## 6. Chrome & UX

Tile actions (Download · Edit · Use Template · Set as primary · Copy SVG/hex); brand-rendered card
covers (no vendor stock); scrollable export dialog; toast placement; DS tokens in brand-kit.css
(`--bke-*` → `--ds-*`, radius/spacing tokens); lucide → `shared/ds/icons`; keyboard + focus rings;
responsive 1024/390; dark mode; completion counts real content; a "Share" affordance linking the
public brand page / guideline.

## 7. Waves (each task owns disjoint files; gates green per task)

- **W0 Foundation** (sequential): merge Design routing ✔ · fix letterbox (`templateSnapshot`) · fix
  label←description (`brandToMockBrand`) · content kinds + fields + schema + ContentPanel image/color ·
  `brandStyle.ts` · guard-test scaffolding (literal scan, bind sweep, contrast sweep) · catalog: add
  Mockups group + `archived` state.
- **W1 Families** (parallel, one agent each): Business Card · Letterhead · Invoice · Envelope ·
  Email Signature · Social (4) · Web (3) · Decks (4 + System) · Animations (4) · Mockups (new).
- **W2 Brand assets** (parallel): Logos · Colors · Typography · Icons · Photos · Strategy.
- **W3 Exporters** (parallel): stationery PDF/SVG · deck PPTX · favicon/ICO + signature HTML +
  social sizes · tokens · motion GIF/MP4 · brand book PDF · export dialog formats + README.
- **W4 Chrome** (parallel): tile actions + menus · covers · dialog/toasts/keyboard/responsive/dark ·
  DS tokenisation · completion semantics · promote-to-active.
- **W5 QA**: full browser sweep of EVERY card on 2 brands (the audit script, hardened), fix wave,
  full gates, merge to `feat/brand-kit-simplification`.
