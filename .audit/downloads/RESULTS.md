# Every downloadable element in the Brand Kit — before and after

> *"I need each Element to be downloadable! not all download give error!"*

Two measurements, both real. **The exporters** were measured by calling
the download path for every catalog entry × every row of its own menu and
unzipping what came back
(`src/features/brand-kit/__tests__/downloadMatrix.browser.test.tsx`, a
Chromium test). **The product** was measured by driving the running app —
menus opened, rows pressed, files saved and unzipped on disk
(`.audit/downloads/harness.mjs`, both seed brands).

---

## 1. The exporters — before

Measured on `/b/raqm/brand-kit`'s thirteen customer-visible cards, five
rows each: **15 of 65 rows failed.** Every one of them failed the same
way — the row was offered, the download *succeeded*, and the archive held
something other than what the chip promised.

| Card | Row | Before |
| --- | --- | --- |
| Logos | For web (PNG) | the whole `logos/` folder — 24 files of SVG, PNG and PDF |
| Logos | For print (PDF) | the whole folder again |
| Logos | Vector (SVG) | ok — 3 files |
| Logos | Flattened (JPG) | **FAIL** — no `.jpg` anywhere in it |
| Logos | Custom size… (PNG) | the whole folder, **unresized** |
| Colors | For web (PNG) | the whole `colors/` folder — 13 files |
| Colors | For print (PDF) | **FAIL** — no `.pdf` |
| Colors | Vector (SVG) | ok — 4 files |
| Colors | Flattened (JPG) | **FAIL** — no `.jpg` |
| Colors | Custom size… (PNG) | the whole folder, unresized |
| Typography | For web (PNG) | **FAIL** — the font folder (`.ttf`, `.css`, `.md`) |
| Typography | For print (PDF) | **FAIL** — the same font folder |
| Typography | Vector (SVG) | disabled |
| Typography | Flattened (JPG) | **FAIL** — the same font folder |
| Typography | Custom size… (PNG) | **FAIL** — the same font folder |
| Icons | all five | **FAIL** — produced nothing at all |
| Strategy | For web (PNG) | **FAIL** — a zip of `strategy.md` + `about.md` + `strategy.pdf` |
| Strategy | For print (PDF) | ok |
| Strategy | Vector (SVG) | disabled |
| Strategy | Flattened (JPG) | **FAIL** — the same three documents |
| Strategy | Custom size… (PNG) | **FAIL** — the same three documents |
| Photos | all five | disabled, with the reason (raqm has no photography) |
| the seven rendered deliverables | all five | ok |

Two notes on honesty:

* The four rows above marked "the whole folder" *passed* the first,
  looser assertion — "the archive contains a PNG" is true of an archive
  containing everything. They are counted as failures here because the
  test now requires an archive to hold **that format and nothing else but
  its notes**, which is what the owner's complaint actually means: the
  Logos card's PNG and SVG rows used to hand over the same 439 774-byte
  zip.
* The Icons "produced nothing" is partly an artefact of this worktree:
  its `node_modules` is a symlink outside the project, so Vite refused to
  serve the icon webfont (403) and the glyph exporter had nothing to
  read. On the running app the Icons card *did* download — it just
  ignored the format completely, like the other three brand-asset cards.

## 2. The exporters — after

**71 of 71 green**, plus 3 regression tests for the UI failures below.

| Card | Rows honoured | Rows disabled, with a reason |
| --- | --- | --- |
| Logos | PNG · PDF · SVG · JPG · Custom | — |
| Colors | PNG · PDF · SVG · JPG · Custom | — |
| Typography | **Font files (TTF)** | the four raster rows — "Typography is delivered as font files" |
| Icons | PNG · PDF · SVG · JPG · Custom | — |
| Photos | PNG · PDF · JPG · Custom *(proved on a brand that has one)* | Vector — "a photograph is pixels" |
| Strategy | **MD · PDF · JSON · PNG · ZIP** | — |
| Business Card · Letterhead · Invoice · Envelope | PNG · PDF · JPG · Custom | Vector — the design is drawn in the browser |
| Email Signature | PNG · PDF · **HTML** · JPG · Custom | — |
| Social Media System · Brand Board | PNG · PDF · JPG · Custom | Vector |
| Presentation System | PNG · PDF · **PPTX** · JPG · Custom | — |
| Favicon | PNG · PDF · **ICO** · JPG · Custom | — |
| Post · Story · Cover · Profile | PNG · PDF · **platform sizes** · JPG · Custom | — |

## 3. The product — the harness

`node .audit/downloads/harness.mjs --brands=raqm,skam`

```
416 rows · 0 failing
  · 84 items (37 cards + 5 brand-asset walls, twice over)
  · 370 card rows, 46 tile rows
  · 344 downloaded, verified and unzipped
  ·  71 disabled, each carrying a reason
  ·   1 n/a  (raqm has no photography, so its wall has no tiles)
```

The full table is `runs/full/matrix.md`; every file it downloaded is under
`runs/full/files/`.

Three failures it found that no other layer could — all three silent, with
no error, no toast and no file:

1. **The custom-size sheet could not be pressed.** Every Brand Kit card
   carries `will-change: opacity`, which creates a stacking context, so a
   `position: fixed; z-index: 200` dialog inside one card is trapped at
   that card's level and the next card paints over it. Measured on the
   Logos card: `elementsFromPoint` over the sheet's own Download button
   returned the **Letterhead** card's cover.
2. **On a tile, pressing it dismissed the sheet instead of downloading.**
   `TileActions` closes its menu on a `mousedown` outside its subtree, and
   the sheet — now on `<body>` — is outside. The two halves of one press
   went to two different components.
3. **Every row of a tile's menu on the Colours wall was covered** by the
   neighbouring tile, for the same stacking reason. The walls that worked
   were the ones whose menus had no later sibling underneath.

## 4. What was actually wrong, in one line each

| # | Fault | Fix |
| --- | --- | --- |
| 1 | Four bespoke arms in `handleDownloadCard` (Logos · Colors · Fonts · Icons) called their own bundle builders and never read `choice` | deleted — every card goes through `downloadEntry` |
| 2 | Three more in the drilldown header did the same for the whole wall | deleted — one call, with `allVariants` |
| 3 | A brand-asset **tile** rasterised a PNG whatever row was pressed | it honours the five picture rows, and reads its vector off the tile |
| 4 | `downloadEntry` fell through to "send whatever is in the archive" for any format it did not find | one rule: a row hands over files of that format, an existing file beating a derived one, and a refusal with a reason when there is neither |
| 5 | The menu offered five raster rows to families whose deliverable is not a picture | `downloadOptionsFor` asks `unitKindFor`: Typography offers its font files, Strategy offers the rows a document has, Photos admits it has no vector |
| 6 | Only Photos said "this card has nothing to export"; an empty Icons card answered every row with a toast | `entryUnavailableReason` covers every family assembled out of files the brand owns |
| 7 | The custom-size sheet was unreachable inside a card | it renders on `<body>`, carrying its theme and a propagation guard |
| 8 | Pressing it on a tile closed it | `isInsideDownloadSheet` — one predicate for every outside-click closer |
| 9 | Tile menus were covered by the next tile | the card with focus inside out-ranks its siblings |

Nothing that used to be in a download left it: `depth: 'full'` is what
lets a single card's ⬇ keep the print originals — the palette's JPGs and
`.ai` files — that the whole-kit zip deliberately leaves out.
