/**
 * Contact sheets from the REAL Brand Kit, in a real browser.
 *
 * The three guards say a design binds, reads and lays out. None of them
 * says it is any good, and none of them can be handed to the person who
 * asked for the designs back. This opens `/b/:slug/brand-kit` in Chromium,
 * walks into each card's drilldown, and screenshots the grid — so the
 * picture is of the shipping product rather than of a test harness that
 * mounts the renderers its own way.
 *
 * It doubles as the browser gate: it fails if the console reports an
 * error, and it prints the design count per card so the restored numbers
 * can be read off the running app rather than off a test.
 *
 *     node scripts/kit-contact-sheets.mjs                  # both seed brands
 *     node scripts/kit-contact-sheets.mjs --brand raqm     # one
 *     node scripts/kit-contact-sheets.mjs --port 8099      # dev server port
 *
 * The dev server must already be running on `--port` (default 8099).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const PORT = Number(flag('port', '8099'));
const ORIGIN = `http://localhost:${PORT}`;
const OUT = '.audit/designs';
const BRANDS = flag('brand') ? [flag('brand')] : ['raqm', 'skam'];

/** The cards whose designs carry a customer's own words. */
const CARDS = [
  'Business Card',
  'Letterhead',
  'Envelope',
  'Invoice',
  'Profile',
  'Cover',
  'Post',
  'Story',
  'Favicon',
  'Website',
  'Email Signature',
  'Landing Page',
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  deviceScaleFactor: 2,
});
// The dev auth bypass, set before the app's first script runs.
await context.addInitScript(() => {
  window.localStorage.setItem('brandos:dev-bypass', '1');
  window.localStorage.setItem('brandos-theme', 'light');
});

/**
 * Tiles paint their artwork as they approach the viewport, so a shot
 * taken on arrival is a sheet of blanks. Scroll the whole scroller (the
 * picker's own grid when one is named) and come back.
 */
async function settle(page, scrollerSelector) {
  await page.evaluate(async (sel) => {
    const el = sel ? document.querySelector(sel) : null;
    const scroller = el ?? document.scrollingElement ?? document.documentElement;
    const step = 300;
    for (let y = 0; y < scroller.scrollHeight; y += step) {
      scroller.scrollTop = y;
      if (!el) window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    scroller.scrollTop = 0;
    if (!el) window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  }, scrollerSelector ?? null);
}

const consoleErrors = [];
const counts = {};

for (const slug of BRANDS) {
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // React's own dev-mode act() and hydration chatter is not the kit's.
    if (/Download the React DevTools/.test(text)) return;
    // Supabase is not reachable from a dev-bypass session — every brand
    // read falls back to local. That 403 is the bypass working.
    if (/status of 40[13]/.test(text)) return;
    consoleErrors.push(`${slug}: ${text}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`${slug}: ${err.message}`));

  await page.goto(`${ORIGIN}/b/${slug}/brand-kit`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bk-card-label', { timeout: 60_000 });

  for (const label of CARDS) {
    const card = page
      .locator('.bk-card')
      .filter({ has: page.locator('.bk-card-label', { hasText: new RegExp(`^${label}$`) }) })
      .first();
    if ((await card.count()) === 0) {
      console.log(`  ${slug} · ${label}: card not found`);
      continue;
    }
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const grid = page.locator('.bk-drilldown-grid');
    await grid.waitFor({ state: 'visible', timeout: 30_000 });
    await settle(page);

    const slugName = `${label}-${slug}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const featured = await page.locator('.bk-variant-card[data-template-id]').count();
    await grid.screenshot({ path: `${OUT}/${slugName}-featured.png` });

    // The drilldown shows the three FEATURED designs; the rest of the
    // family lives behind the "+" in its header. Both halves have to be
    // in the sheet, or the picture is of three tiles and a claim.
    let library = 0;
    // By its label, not its class: the Icons and Colors drilldowns put
    // their own `.section-add` buttons in the same row.
    const more = page.locator('button[aria-label^="Browse more"]');
    if ((await more.count()) > 0) {
      await more.click();
      const picker = page.locator('.bk-card-picker');
      await picker.waitFor({ state: 'visible', timeout: 30_000 });
      await settle(page, '.bk-card-picker-grid');
      library = await page.locator('.bk-card-picker-cell').count();
      await picker.screenshot({ path: `${OUT}/${slugName}-library.png` });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    counts[label] = featured + library;
    console.log(
      `  ${slug} · ${label}: ${featured + library} designs ` +
        `(${featured} featured + ${library} in the picker) → ${slugName}-*.png`,
    );

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  await page.close();
}

await browser.close();

writeFileSync(
  `${OUT}/kit-counts.json`,
  JSON.stringify({ counts, consoleErrors }, null, 2) + '\n',
);

if (consoleErrors.length > 0) {
  console.error(`\n${consoleErrors.length} console error(s):`);
  for (const e of consoleErrors) console.error(`  ${e}`);
  process.exit(1);
}
console.log('\nno console errors.');
