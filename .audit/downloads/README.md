# Brand Kit downloads — the harness

Every downloadable thing in the Brand Kit, pressed for real: a running
app, a real menu, a real click, the file the browser was handed, unzipped
on disk, and the toast that came back.

It exists because the layers below it cannot see the failures that matter
most here. A unit test cannot rasterise. The browser matrix
(`src/features/brand-kit/__tests__/downloadMatrix.browser.test.tsx`) calls
`downloadEntry` directly, so it proves the EXPORTERS and nothing about the
wiring. Three of the bugs this work fixed were only visible here:

* the custom-size sheet painted under the next card and could not be
  pressed at all;
* pressing it on a tile dismissed the sheet instead of downloading,
  because the mousedown and the click went to two different components;
* every row of a tile's menu on the Colours wall was covered by the
  neighbouring tile.

All three were silent: no error, no toast, no file.

## Running it

```bash
# a dev server of your own — :8090 belongs to another worktree
printf 'VITE_DEV_BYPASS_AUTH=true\n' > .env.local     # once
npm run dev -- --port 8097

node .audit/downloads/harness.mjs                     # both seed brands
node .audit/downloads/harness.mjs --brands=raqm --cards-only --limit=3
node .audit/downloads/harness.mjs --tiles-only --out=.audit/downloads/runs/tiles
```

`VITE_DEV_BYPASS_AUTH=true` is what makes the storage flag the harness sets
(`brandos:dev-bypass`) mean anything: without it the controller never looks
at the flag and every route bounces to `/login`.

It writes `matrix.json`, `matrix.md` and every downloaded file to
`--out` (default `.audit/downloads/runs/latest`), and exits non-zero if any
row failed.

## What a row asserts

1. The row downloaded something.
2. The archive contains the extension the row's CHIP promised — SVG means
   `.svg`, PPTX means `.pptx`, TTF means `.ttf`. A row that says PNG and
   hands over the family's whole folder is the bug this catches.
3. Nothing in it is 0 bytes.
4. No error toast, and no uncaught exception, while it ran.

A DISABLED row is checked too, the other way round: it must carry a
reason, and it is never pressed.

## Things learned the hard way, kept in the harness

* **The ⬇ is a hover affordance.** `opacity: 0; pointer-events: none`
  until the card is hovered or focused within. The harness focuses it
  instead of hovering — a hover is lost the moment a menu, a toast or a
  screenshot moves the pointer.
* **Close a menu the way it was opened.** Escape reaches the drilldown on
  some walls and collapses it; the tiles then stay in the DOM under
  `pointer-events: none` and every later click times out on an element
  that is right there.
* **Re-enter the wall before every tile row.** A drilldown re-renders its
  grid as its own state settles, and a locator resolved before that lands
  on a tile that no longer exists.
* **Reopen the page every 20 downloads.** Two hundred real exports in one
  tab is a lot of canvases and object URLs; it crashed at row 190.
* **A console error is page noise, not a failed download.** A seed brand
  whose stock photo 404s logs one on every paint.
* **Never let a `waitForEvent` float.** Abandoned when the click before it
  throws, it rejects later with nobody listening, and an unhandled
  rejection is fatal in Node — it killed the run before the failure it was
  reporting could be recorded.
