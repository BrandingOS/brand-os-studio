# Returning the Brand Kit designs

**Branch** `kit/restore-designs` · measured 2026-09-09 · both seed brands (Raqm, SKAM)

---

## The finding that changed the job

The brief was "un-archive by default, hold back only on measured failure". So
the first thing done was to measure, and the measurement changed what "restore"
could mean.

`renderers/curation/*.ts` archived **512 template ids** across every card the kit
offers. Each one was rendered through the real dispatch
(`renderCosmosTemplate`), on the real content the drilldown passes, and its DOM
compared structurally — tags, classes and inline styles, with the words removed
— against every other variant of the same card.

> **510 of the 512 archived ids drew a picture that was already on the shelf.**

The curation pass did not hide 512 designs. It hid 512 **ids** and **deleted 510
of the drawings**. `EnvelopeExtended`'s `DESIGNS` record went sparse; the
`designs` arrays in Letterhead, Favicon, Website, Landing and Email Signature
were truncated; `EnvelopeExtended2` / `NotecardExtended2` / `LetterheadExtended2`
/ `InvoicesExtended2` were replaced by stubs that forward to a kept design. An
archived id today falls through to `designs[0]`.

So there was nothing to un-archive. Un-archiving all 510 would have added 510
tiles showing pictures the kit already shows, under 510 more names.

**The designs were therefore RE-AUTHORED** — at their exact reserved indices, in
the current bound architecture, from each family's own primitives. 94 designs
came back that way. The 2 archived ids that still had artwork of their own were
simply un-archived.

The evidence file is `archived-measurements.tsv` (every archived id, its bind
count, and the kept design it draws). The property is now pinned by
`renderers/__guards__/archivedDesigns.test.ts`: *every id that is still archived
draws a design the kit already offers.*

---

## Per family

| Card | Offered before | Restored | Offered now | Still archived | Measured reason for the hold-back |
|---|---:|---:|---:|---:|---|
| **Envelope** | 16 | **+14** | **30** | 100 | wave 2 (`ext-31…130`): every id renders `Classic Return` — its artwork is gone |
| **Letterhead** | 20 | **+10** | **30** | 100 | wave 2 (`ext-31…130`): `LetterheadExtended2` maps each onto the kept design at the same rank |
| **Favicon** | 12 | **+18** | **30** | 0 | — |
| **Website** | 12 | **+18** | **30** | 0 | — |
| **Landing Page** | 12 | **+18** | **30** | 0 | — |
| **Email Signature** | 16 | **+14** | **30** | 0 | — |
| **Invoice** | 20 | **+2** | **22** | 8 | legacy `invoices-1…8`: no content route; 2 pictures across 8 ids |
| **Business Card** | 24 | 0 | 24 | 12 | legacy `business-cards-1…12`: no content route; 2 pictures across 12 ids |
| **Profile** | 24 | 0 | 24 | 12 | legacy `profile-icons-1…12`: no content route; already delegates to the kept designs |
| **Post** | 16 | 0 | 16 | 10 | legacy `instagram-posts-1…10`: no content route; already delegates to the kept designs |
| **Story** | 16 | 0 | 16 | 8 | legacy `instagram-stories-1…8`: same |
| **Cover** | 12 | 0 | 12 | 8 | legacy `facebook-covers-1…8`: same |
| **Pitch Deck / Business Plan / Proposal / Case Studies** | 10 each | 0 | 10 each | 20 each (80) | never a distinct design — the list was `[...slides, ...slides, ...slides]` |
| **Logo Reveal / Slide In / Fade / Rotate** | 10 each | 0 | 10 each | 20 each (80) | never a distinct design — the list was `[...stills, ...stills, ...stills]` |
| Brand Guides ×5, Mockups ×8 | 30 / 6 each | 0 | unchanged | 0 | nothing was archived |
| **TOTAL** | **478** | **+94** | **572** | **418** | |

Counts are the drilldown's own — read off the running app by
`scripts/kit-contact-sheets.mjs` (three featured tiles + the picker), not off a
test.

---

## What was restored, and how

Every restored design is **new code at an old id**. A template id is a
persistence key — it appears in `brandos:brand-kit:customizations`,
`brandos:brand-kit:featured-variants`, the `brand_kit_state` JSONB column and
inside saved Design documents — so nothing was renumbered, reordered or reused.
Restoring is purely additive.

Each one is composed from its family's existing primitives, which is what makes
it pass the guards by construction: the primitives already declare their
`<Bind path=…>` regions, and every colour comes from
`brandStyle.surface()` / `brandColors` / `fontStack`.

### Envelope · 14 (`ext-5, 8, 10, 11, 13, 15, 17, 18, 19, 22, 23, 24, 28, 29`)

Wax Seal · Diagonal Cut · Airmail Border · Centred Mark · Corner Seal · Brand
Wash · Side Flap · Type Stack · Brand Tape · Hand Ruled · Striped Edge ·
Monogram Plate · Big Mark · Mosaic Corner.

The reasons the old fourteen were culled were real, and **none is rebuilt**:

- *Vintage Airmail* and *Brand Tape* ran type over a repeating gradient — which
  the contrast sweep **skips** rather than judges, so they could have "passed"
  while being unreadable. The stripes are now a ring, and the tape is solid and
  square to the sheet; every word on both is set on a flat colour and measured.
- *Hand-Drawn* was set in `Caveat, cursive`, another brand's typeface. The hand
  is now in the **ruling**, not the type.
- *Type Stack* spelled the brand name one letter per line. That is a column of
  letters, not a name; it is now a stack of **lines**.
- The five that were a decoration with nowhere to put an address (Wax Sealed,
  Sealed Sticker, Centred Mark, Logo Big, Mosaic) each give the address a block
  of its own first and take what is left for the device.

### Letterhead · 10 (`ext-21…30`)

Colour Half · Meta Column · Stamp Date · Colour Frame · Signature Foot · Split
Head · Edge Bands · Wide Margin · Subject Bar · Header Panel.

All ten declare **all eight** letter fields. The family's sweep is
all-or-nothing about that on purpose: a design that binds the body and prints
the recipient loses whatever the customer typed, silently.

Not rebuilt: the page framed by four brackets and nothing else, the ledger of
empty ruled lines, and the memo whose `TO · Team / RE · Quarterly Brief / DATE
27 · 04 · 2026` header was three literals. *Stamp Date* keeps the one idea the
memo was reaching for — a date set apart from the letter — with the customer's
own bound date in the block.

### Favicon · 18 (`ext-13…30`)

Bookmark Bar · Address Bar · New Tab · Link Preview · Notification · Dock ·
Widget · Splash · Install Card · Keyline Grid · Clear Space · Pixel Grid · Type
Lockup · Inbox Row · Facepile · Profile Card · Sign In · App Switcher.

The kept twelve are **delivery contexts**, not marks, and the eighteen continue
that: every place a favicon or app icon is actually seen, plus the spec sheets a
developer is handed. Two primitives joined `Sheet`/`Mark`/`Window` — `Slab` and
`Blank` — because half of these measure the mark against its real neighbours
rather than against nothing.

The 30 marks the family shipped in 2026-08 (`Initial`, `Dot`, `Star`, `Diamond`,
`Quad`, `Hashtag`, `Triangle`…) were **not** brought back: they hardcoded
`#0F1216`, `brand.com`, `font-serif` and `font-mono`, which `literals.test.ts`
bans and whose allowlist may only ever shrink.

### Email Signature · 14 (`ext-17…30`)

Flush Right · Brand Column · Dark Footer · Framed · Bulleted · Caps Lockup ·
Running Line · Role Badge · Corner Mark · Half Panel · Ruled Rows · Wordmark Top
· Inset Block · Quiet. Every one of the thirty declares all ten `person` paths.

`ARCHIVED_NAMES` is gone from that renderer: the archived list is now
`30 − DESIGNS.length`, zero **by construction** rather than by a second list
somebody has to remember to empty.

### Website · 18 (`ext-13…30`)

Reverse Split · Float Card · Marquee · Deep Field · Right Rail · Foot Band ·
Pill Row · Framed Lede · Stack Bands · Left Rule · Quiet Top · Colour Column ·
Cell Grid · Inset Frame · Base Nav · Tint Wash · Half Page · Corner Card.

### Landing Page · 18 (`ext-13…30`)

Waitlist · Stacked Offer · Dark Split · Two Panel · Ticket · Proof Strip · Side
Offer · Bold Claim · Checklist · Narrow · Frame · Half Tone · Corner Action ·
Mid Band · Quiet Offer · Three Up · Bottom Sheet · Aside.

A Website design is the front door of a whole site; a Landing design is one
offer and one action. The two families share a content kind, so keeping their
intent apart is what keeps them from becoming one family of sixty.

**Two pre-existing layout defects were fixed rather than budgeted for.**
`website-ext-5` (Night Shift) hung its two buttons **11.5px** below the page and
`landing-ext-4` (Big Type) pushed its whole footer off by **11.9px** — in both
cases because a flex item's automatic minimum is its own content, so three lines
of display type refuse to shrink. Two lines and `min-h-0` each. The render
sweep's budget for both cards drops 1 → 0.

### Invoice · 2 (`ext-18` Stamp Header, `ext-22` Ledger Lines)

The only two archived ids in the whole kit that still had artwork of their own.
They were culled on taste — *"a second stamp motif"*, *"the weakest of the
editorial group"* — and taste is not a measurement. Re-measured: both declare
all 22 invoice bind paths, both scan clean of literals, both clear the contrast
and layout sweeps. Nothing objective held them back.

---

## What stays archived, and the measurement behind each

### 1 · The legacy `<type>-N` ids — 58 ids

`business-cards-1…12`, `invoices-1…8`, `profile-icons-1…12`,
`instagram-posts-1…10`, `instagram-stories-1…8`, `facebook-covers-1…8`.

**Objective failure: they cannot show the customer's content.** An id with no
`-ext-N` suffix routes through `renderTemplateDesign`, which is handed no
`content` at all — the third condition in `rendererBindsContent`. Use Template
and Edit Template are dark on every one of them *by construction*, so
un-archiving one would put a design on the shelf that a customer cannot put
their own words on.

**Second failure: they are not N designs.** `BusinessCardRenderer` and
`InvoiceRenderer` each alternate one branded and one plain reading by index
parity, so `business-cards-1…12` are **2** pictures and `invoices-1…8` are **2**.
Twelve ids showing two pictures is a shelf, not a library.

**And the 38 social legacy ids fail a third way:** `SocialMediaRenderer` and
`ProfileIconRenderer` already delegate to the curated `-ext-` families at
`rank % N`, so every one of them is measured as an exact structural duplicate of
a design the kit offers — with the content stripped out, because the legacy route
carries none.

They are structurally exempt in the archived-designs guard, by name, so that
adding one is a decision somebody has to write down.

### 2 · The wave-2 stationery ids — 200 ids

`envelope-ext-31…130` and `letterhead-ext-31…130`.

**Objective failure: they draw a design the kit already offers.** Measured
through the dispatch: every envelope wave-2 id renders `Classic Return`; every
letterhead wave-2 id renders the kept design at the same rank (`KEPT_DESIGNS`,
now 30). Restoring one adds a second copy of a tile already on the shelf, under
a generator's name.

Their historical artwork is recoverable from git and was read. It fails the
literal scan outright: roughly seventy envelopes addressed to a "Jane Smith" who
does not exist, `jane@…` addresses, 99 hardcoded hexes, and the same ten-motif
block pasted into four stationery families at once. `letterhead-ext-104` printed
a whole invented letter as a literal; `:105` signed it `JANE.SMITH`. Restoring
that verbatim would add hundreds of hits to a guard whose allowlist may only
shrink.

### 3 · Presentations and Animations — 160 ids

`pres-{pitch,plan,proposal,case}-ext-11…30` and
`anim-{reveal,slide,fade,rotate}-ext-11…30`.

**Objective failure: these were never distinct designs.** The template lists were
literally `[...slides, ...slides, ...slides]` and `[...stills, ...stills,
...stills]`, and the renderers still resolve `templateIndex % slides.length` /
`designs[i] ?? designs[0]`. `pres-pitch-ext-14` was pixel-identical to
`pres-pitch-ext-4` before the curation and is pixel-identical to it now. There is
no earlier version of the repo in which they differ.

Filling those 160 slots would be **inventing** 160 designs, not returning any.
Flagged below as a product decision rather than taken unilaterally.

### 4 · Business Card wave 2 — 94 ids, not reachable at all

`business-cards-ext-25…118` are archived, but `BUSINESS_CARDS_EXTENDED_2` emits
only six entries, so those ids never reach the template list and cannot be
un-archived into anything. Their historical artwork is the measured disaster the
curation file records: ~55 printed the string "VP" **over** the bound job title,
five tiled the letters of an invented person's initials, one printed
`> jane_smith`, one a founding year computed from the LENGTH of the brand's name.

---

## Two findings that are not about archiving

**Notecard is unreachable.** `NotecardExtended.tsx` holds 12 real designs and
`curation/notecard.ts` archives 118 ids — but **no card in
`data/legacy-mapping.ts`'s `MAP` points at the notecard family**, so none of it,
kept or archived, appears anywhere in the product. The 118 archived ids are moot;
the 12 kept designs are invisible. Surfacing them is a one-entry change to the
Stationery map plus `cardPresentation` and `kit/registry` entries — a new card in
the kit's IA, which is a product decision and is left to the owner.

**Three featured ids named archived designs.** `kit/registry.ts` seeded the kit
generator from `business-cards-ext-113` (the wave-2 card that printed "VP" over
the bound job title), `letterhead-ext-69`/`-73` and `envelope-ext-127`.
`featuredTemplates` silently drops an id it cannot resolve, so a card promising
three tiles showed two and nothing said so. Fixed, and pinned: no featured id, on
the card or in the registry, may be archived.

---

## The guards

Three existed; a third dimension was missing, so a fourth landed with this work.

| Guard | What it measures | Result |
|---|---|---|
| `__guards__/literals.ts` | source scan: no invented person, address, phone, email, or hardcoded typeface | 2 dirty files, 28 hits — **unchanged**, neither of them touched here; the allowlist did not grow |
| `__guards__/contrast.ts` | every rendered text node clears WCAG AA against its real background, in Chromium | **0 violations** for every restored family on both seed brands |
| `__guards__/bindSweep.ts` | every design declares every content path its panel offers | every restored design fully bound |
| `__guards__/renderSweep.ts` **(new)** | real geometry in Chromium: reading text that escapes its clip box, text cut off with no ellipsis, two texts printed over each other | budgets held; the four families restored into a **zero** card are still at zero |

`renderSweep`'s per-card budgets are today's measurement and may only go down.
**Ten of the twelve** content-bearing cards are at zero — eight were, and Website
and Landing Page joined them when the two defects above were fixed. The two that
remain are **pre-existing** and were measured before any restoration: Cover 9
(the tagline runs past the bottom of the banner and over its own "Learn more"
link) and Invoice 1 (`ext-5` Stamped Due prints the due date across the word
"Due"). None of the 94 restored designs adds to either.

`__guards__/archivedDesigns.test.ts` **(new)** pins the property this restore
leaves behind, and writes `archived-measurements.tsv` as it goes.

---

## Contact sheets

`scripts/kit-contact-sheets.mjs` drives a real Chromium against the running dev
server, walks into each card's drilldown and its "+" picker, and screenshots
both — so the pictures are of the shipping product, not of a test harness that
mounts the renderers its own way. It doubles as the browser gate: it fails on any
console error and prints the design count per card.

```
node scripts/kit-contact-sheets.mjs            # both seed brands
```

Files in this directory: `<card>-<brand>-featured.png` (the three on the card)
and `<card>-<brand>-library.png` (everything else, with the filter chips).

---

## Gates

| Gate | Result |
|---|---|
| `npx vitest run --project unit src/features/brand-kit` | **46 files, 781 tests, all pass** |
| `__guards__/literals.test.ts` | **5/5** — 2 dirty files, 28 hits, unchanged; the allowlist did not grow |
| `__guards__/contrast.browser.test.tsx` | **7/7** |
| `__guards__/renderSweep.browser.test.tsx` | **24/24** |
| `__guards__/archivedDesigns.test.ts` | **2/2** |
| per-family browser suites (envelope · letterhead · invoices · web · emailSignature · businessCards · social · notecard · mockups · presentations ×2 · animations ×3 · qr · colors · icons · logos · photos · typography), one file at a time | **all pass** |
| kit-level browser suites (drilldown · reach · chrome · navigation · photos · quickEdit · covers · designHandoff · brandKitToDesign · tileTypeFloor · exporters · officialKit · templateSnapshot · kitExportConsole) | **all pass** |
| `npm run typecheck:ci` | **0 new** (279/279 baseline) |
| `npx eslint src/features/brand-kit/renderers/ …` | **0 errors** (131 pre-existing `react-refresh/only-export-components` warnings) |
| the kit in a real browser, both brands, all 12 content cards | **0 console errors**, counts as in the table above |

**One pre-existing failure, not caused by this work:**
`src/features/brand-kit/__tests__/kitExport.browser.test.tsx` → *"Icons produced
nothing to download"*. Verified by checking out the branch's base commit
(`8dc62368`) into a scratch worktree and running the same file: **identical
failure**. The cause is environmental — the icon artwork is fetched from
`cdn-uicons.flaticon.com`, which answers **403** from this machine.
