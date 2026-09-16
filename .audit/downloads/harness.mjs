/**
 * EVERY DOWNLOADABLE THING IN THE BRAND KIT, PRESSED FOR REAL.
 *
 * The matrix test next door calls `downloadEntry` directly, which proves
 * the exporters. This proves the PRODUCT: a real page, real menus, a real
 * click, the file the browser was handed, unzipped on disk, and the toast
 * that came back. It is the only layer that can catch a menu wired to the
 * wrong handler, a row that opens a dialog nobody can finish, or an
 * unhandled rejection behind a spinner.
 *
 *   node .audit/downloads/harness.mjs [--base=http://localhost:8097]
 *                                     [--brands=raqm,skam]
 *                                     [--out=.audit/downloads/runs/<name>]
 *                                     [--cards-only] [--limit=N]
 *
 * It writes one row per (brand, surface, item, menu row) to `matrix.json`
 * and a readable table to `matrix.md`.
 */
import { chromium } from 'playwright';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const BASE = arg('base', 'http://localhost:8097');
const BRANDS = arg('brands', 'raqm,skam').split(',').filter(Boolean);
const OUT = path.resolve(arg('out', '.audit/downloads/runs/latest'));
const LIMIT = Number(arg('limit', '0')) || Infinity;
const FILES = path.join(OUT, 'files');

/** The extension a chip promises. `null` = the row names an archive. */
const PROMISED = {
  PNG: /\.png$/i,
  JPG: /\.jpe?g$/i,
  PDF: /\.pdf$/i,
  SVG: /\.svg$/i,
  PPTX: /\.pptx$/i,
  ICO: /\.ico$/i,
  HTML: /\.html$/i,
  MD: /\.md$/i,
  JSON: /\.json$/i,
  TTF: /\.ttf$/i,
  ZIP: null,
};

// A `waitForEvent` that is abandoned when the click before it throws stays
// pending until the browser closes, then rejects with nobody listening —
// and an unhandled rejection is fatal in Node. It would kill the run before
// the failure it was reporting ever reached the matrix.
process.on('unhandledRejection', (err) => {
  console.log(`! unhandled: ${String(err).split('\n')[0]}`);
});

const rows = [];
let failures = 0;

function record(row) {
  rows.push(row);
  if (row.verdict.startsWith('FAIL')) failures += 1;
  const mark = row.verdict.startsWith('FAIL') ? '✗' : row.verdict.startsWith('disabled') ? '·' : '✓';
  console.log(`${mark} ${row.brand} ${row.surface} ${row.item} — ${row.row} — ${row.verdict}`);
}

/** What is inside what the browser was handed, and how big each part is. */
async function inspect(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.byteLength === 0) return { members: [{ path: path.basename(file), size: 0 }], zip: false };
  if (!/\.zip$/i.test(file)) return { members: [{ path: path.basename(file), size: bytes.byteLength }], zip: false };
  const zip = await JSZip.loadAsync(bytes);
  const members = [];
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    members.push({ path: name, size: (await zip.files[name].async('uint8array')).byteLength });
  }
  return { members, zip: true };
}

function verdictFor(chip, name, members) {
  if (members.length === 0) return 'FAIL — the archive is empty';
  const empty = members.filter((m) => m.size === 0).map((m) => m.path);
  if (empty.length) return `FAIL — 0 bytes: ${empty.slice(0, 4).join(', ')}`;
  const promised = PROMISED[chip];
  if (promised && !members.some((m) => promised.test(m.path))) {
    return `FAIL — no ${chip} in ${members.slice(0, 6).map((m) => m.path).join(', ')}`;
  }
  const total = members.reduce((n, m) => n + m.size, 0);
  return `ok — ${name} · ${members.length} file${members.length === 1 ? '' : 's'} · ${total} B`;
}

/**
 * The ⬇ is a HOVER affordance — `opacity: 0; pointer-events: none` until
 * the card is hovered or focused within. Focusing it is steadier than
 * hovering: a hover is lost the moment a menu, a toast or the next
 * screenshot moves the pointer, and `:focus-within` holds.
 */
async function reveal(opener) {
  await opener.evaluate((el) => el.focus());
}

/** Read a Download menu's rows without pressing any of them. */
async function readMenu(page, opener) {
  await reveal(opener);
  await opener.click();
  const menu = page.locator('[role="menu"]').first();
  await menu.waitFor({ state: 'visible', timeout: 5000 });
  const items = await menu.locator('[role="menuitem"]').all();
  const read = [];
  for (const item of items) {
    read.push({
      label: (await item.getAttribute('aria-label')) ?? (await item.innerText()),
      disabled: (await item.getAttribute('aria-disabled')) === 'true' || (await item.isDisabled()),
      reason: await item.getAttribute('title'),
    });
  }
  // Close it the way it was opened. Escape is NOT safe here: on some
  // drilldowns the key reaches the drilldown itself and collapses the
  // whole wall, after which the tiles are still in the DOM but sit under
  // `pointer-events: none` — every later click times out on an element
  // that is right there and cannot be pressed.
  await opener.click().catch(() => {});
  await page.locator('[role="menu"]').first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  return read;
}

/** Press one row and keep whatever the browser was handed. */
async function pressRow(page, opener, label, saveAs) {
  await reveal(opener);
  await opener.click();
  // Addressed by the ROW rather than by "the first menu on the page": a
  // drilldown can have more than one menu mounted, and picking the first
  // one meant waiting for a row that was never going to be in it.
  const item = page.locator(`[role="menu"] [role="menuitem"][aria-label="${label}"]`).first();
  await item.waitFor({ state: 'visible', timeout: 8000 });
  // "Custom size…" is the one row that does not download on click — it
  // opens a sheet, and the download is behind that sheet's own button.
  const isCustom = label.startsWith('Custom size');
  if (isCustom) {
    await item.click();
    const confirm = page.getByRole('button', { name: 'Download PNG' });
    await confirm.waitFor({ state: 'visible', timeout: 15_000 });
    const wait = page.waitForEvent('download', { timeout: 240_000 });
    wait.catch(() => {});
    await confirm.click();
    const got = await wait;
    const gotName = got.suggestedFilename();
    const gotFile = path.join(FILES, `${saveAs}--${gotName}`);
    await got.saveAs(gotFile);
    return { name: gotName, file: gotFile };
  }
  const wait = page.waitForEvent('download', { timeout: 240_000 });
  wait.catch(() => {});
  await item.click();
  const download = await wait;
  const name = download.suggestedFilename();
  const file = path.join(FILES, `${saveAs}--${name}`);
  await download.saveAs(file);
  return { name, file };
}

/**
 * Anything the page shouted about while a row was running.
 *
 * Never throws. It is read from a CATCH block, where the page may already
 * be gone — and a diagnostic that throws replaces the failure it was
 * supposed to describe.
 */
async function toastText(page) {
  try {
    const toasts = await page.locator('[data-sonner-toast]').allInnerTexts();
    return toasts.join(' | ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

/**
 * A page that can be replaced under the run.
 *
 * Two hundred real exports in one tab is a lot of canvases, blobs and
 * object URLs, and the tab eventually dies — measured: it crashed at row
 * 190 mid-download, which is a fact about the harness rather than about
 * the product. So the page is reopened every `RESET_EVERY` downloads and
 * whenever it has gone. Card order is stable across a reload, so nothing
 * is lost by doing it.
 */
const RESET_EVERY = 20;

class Session {
  constructor(browser, slug) {
    this.browser = browser;
    this.slug = slug;
    this.pressed = 0;
    this.crashes = [];
    this.noise = [];
  }

  async open() {
    if (this.context) await this.context.close().catch(() => {});
    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1600, height: 1000 },
    });
    const page = await this.context.newPage();
    this.page = page;
    page.on('pageerror', (err) => this.crashes.push(String(err)));
    page.on('crash', () => this.crashes.push('the tab crashed'));
    // Console errors are page NOISE — a seed brand whose stock photo 404s
    // logs one on every paint, and counting that as a failed download
    // marked three of skam's Strategy rows broken when all three files
    // arrived. Only an uncaught exception or a dead tab is a failure.
    page.on('console', (m) => {
      if (m.type() === 'error') this.noise.push(m.text().slice(0, 160));
    });
    await page.addInitScript(() => {
      localStorage.setItem('brandos:dev-bypass', '1');
    });
    await this.home();
  }

  async home() {
    await this.page.goto(`${BASE}/b/${this.slug}/brand-kit`, { waitUntil: 'domcontentloaded' });
    await this.page.locator('.bk-card').first().waitFor({ timeout: 60_000 });
    await this.page.waitForTimeout(1200);
  }

  /** Before each row: a live page, and a fresh one every so often. */
  async ready() {
    if (!this.page || this.page.isClosed()) {
      await this.open();
      return;
    }
    if (this.pressed > 0 && this.pressed % RESET_EVERY === 0) await this.open();
  }

  async close() {
    await this.context?.close().catch(() => {});
  }
}

/** Press one row, record what came back, and never let a failure end the run. */
async function runRow(session, { surface, item, row, opener, saveAs }) {
  const { slug } = session;
  const chip = row.label.match(/\(([A-Z]+)\)\s*$/)?.[1] ?? '';
  if (row.disabled) {
    record({
      brand: slug, surface, item, row: row.label,
      verdict: row.reason ? `disabled — ${row.reason}` : 'FAIL — disabled with no reason',
    });
    return;
  }
  const before = session.crashes.length;
  try {
    const { name, file } = await pressRow(session.page, opener, row.label, saveAs);
    session.pressed += 1;
    const { members } = await inspect(file);
    let verdict = verdictFor(chip, name, members);
    const errs = await session.page
      .locator('[data-sonner-toast][data-type="error"]')
      .allInnerTexts()
      .catch(() => []);
    if (errs.length) verdict = `FAIL — toast: ${errs.join(' | ').replace(/\s+/g, ' ')}`;
    if (session.crashes.length > before) {
      verdict = `FAIL — uncaught: ${session.crashes.at(-1).split('\n')[0]}`;
    }
    record({ brand: slug, surface, item, row: row.label, verdict });
  } catch (err) {
    const note = session.crashes.slice(before).join(' / ').slice(0, 160);
    record({
      brand: slug, surface, item, row: row.label,
      verdict: `FAIL — ${err.message.split('\n').slice(0, 3).join(' / ')} ${await toastText(session.page)} ${note}`.trim(),
    });
    if (!session.page.isClosed()) await session.page.keyboard.press('Escape').catch(() => {});
  }
}

const safeName = (value) => value.replace(/[^a-z0-9-]+/gi, '_');

/** Stand on a family's wall, reopening it if we are not there. */
async function ensureDrilldown(session, family) {
  if (!session.page || session.page.isClosed()) await session.open();
  const tiles = session.page.locator('.bk-stage-layer--page2 [data-template-id]');
  const showing =
    (await session.page.locator('.bk-stage[data-active="drilldown"]').count()) > 0 &&
    (await tiles.count()) > 0 &&
    (await tiles.first().locator('[aria-label^="Download"]').count()) > 0;
  if (showing) return;
  await session.home();
  await session.page.locator(`.bk-card[aria-label="Open ${family}"]`).first().click();
  await tiles.first().waitFor({ timeout: 20_000 });
  await session.page.waitForTimeout(900);
}

async function runBrand(browser, slug) {
  const session = new Session(browser, slug);
  await session.open();

  const names = [];
  for (const card of await session.page.locator('.bk-card').all()) {
    names.push((await card.getAttribute('aria-label'))?.replace(/^Open /, '') ?? '?');
  }
  console.log(`\n=== ${slug}: ${names.length} cards ===`);

  let done = 0;
  for (let i = 0; i < names.length && done < LIMIT && !flag('tiles-only'); i += 1, done += 1) {
    const item = names[i];
    await session.ready();
    const opener = () => session.page.locator('.bk-card').nth(i).locator(`[aria-label="Download ${item}"]`).first();
    if ((await opener().count()) === 0) {
      record({ brand: slug, surface: 'card', item, row: '—', verdict: 'FAIL — no Download control' });
      continue;
    }
    let menu;
    try {
      menu = await readMenu(session.page, opener());
    } catch (err) {
      record({ brand: slug, surface: 'card', item, row: '—', verdict: `FAIL — menu did not open: ${err.message.split('\n')[0]}` });
      continue;
    }
    for (const row of menu) {
      await session.ready();
      const chip = row.label.match(/\(([A-Z]+)\)\s*$/)?.[1] ?? '';
      await runRow(session, {
        surface: 'card', item, row, opener: opener(),
        saveAs: safeName(`${slug}--card--${item}--${chip}`),
      });
    }
  }

  if (!flag('cards-only')) {
    // The tiles. One drilldown per brand-asset family, its first tile,
    // every row — the surface that used to answer every row with a PNG.
    for (const family of ['Logos', 'Colors', 'Typography', 'Icons', 'Photos']) {
      // A FRESH PAGE PER FAMILY. A drilldown left behind by the previous
      // family keeps its own tiles mounted in the inactive stage layer,
      // and the ⬇ on the family you actually opened then sits under an
      // element that refuses the click for ever.
      await session.open();
      const card = session.page.locator(`.bk-card[aria-label="Open ${family}"]`).first();
      if ((await card.count()) === 0) continue;
      let menu = null;
      const tileOpener = () =>
        session.page.locator('.bk-stage-layer--page2 [data-template-id]').first().locator('[aria-label^="Download"]').first();
      try {
        await card.click();
        await session.page.locator('.bk-stage-layer--page2 [data-template-id]').first().waitFor({ timeout: 20_000 });
        await session.page.waitForTimeout(800);
        if ((await tileOpener().count()) === 0) {
          record({ brand: slug, surface: 'tile', item: family, row: '—', verdict: 'FAIL — no Download control on the tile' });
        } else {
          menu = await readMenu(session.page, tileOpener());
        }
      } catch (err) {
        // A family with no material has no tiles to press — that is the
        // empty state doing its job, and the CARD's menu is where the
        // reason is reported.
        const empty = (await session.page.locator('.bk-stage-layer--page2 [data-template-id]').count()) === 0;
        record({
          brand: slug, surface: 'tile', item: family, row: '—',
          verdict: empty
            ? 'n/a — this brand has nothing in this family, so the wall has no tiles'
            : `FAIL — drilldown: ${err.message.split('\n')[0]}`,
        });
      }
      for (const row of menu ?? []) {
        const chip = row.label.match(/\(([A-Z]+)\)\s*$/)?.[1] ?? '';
        // The wall is re-entered before EVERY row rather than trusted to
        // still be there. A drilldown re-renders its grid as its own state
        // settles, and a locator resolved before that lands on a tile that
        // no longer exists — which reads as "the control is unclickable"
        // when the control is simply somewhere else now.
        await ensureDrilldown(session, family);
        await runRow(session, {
          surface: 'tile', item: family, row, opener: tileOpener(),
          saveAs: safeName(`${slug}--tile--${family}--${chip}`),
        });
      }
    }
  }

  await session.close();
}

fs.mkdirSync(FILES, { recursive: true });
const browser = await chromium.launch();
try {
  for (const slug of BRANDS) await runBrand(browser, slug);
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'matrix.json'), JSON.stringify(rows, null, 2));
const md = [
  '| brand | surface | item | row | verdict |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.brand} | ${r.surface} | ${r.item} | ${r.row} | ${r.verdict.replace(/\|/g, '/')} |`),
].join('\n');
fs.writeFileSync(path.join(OUT, 'matrix.md'), `${md}\n`);
console.log(`\n${rows.length} rows · ${failures} failing · ${OUT}`);
process.exit(failures > 0 ? 1 : 0);
