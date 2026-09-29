// Renders brand-book.html → BrandingOS-Brand-Guidelines.pdf (1440×810 pages).
// Run from the repo root: python3 docs/brand-book/build.py && node docs/brand-book/render.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(pathToFileURL(path.join(dir, 'brand-book.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const missing = await page.evaluate(() =>
  ['Funnel Display', 'Funnel Sans', 'Doto'].filter((f) => !document.fonts.check(`700 20px "${f}"`)),
);
if (missing.length) throw new Error(`fonts not loaded: ${missing.join(', ')}`);
await page.pdf({
  path: path.join(dir, 'BrandingOS-Brand-Guidelines.pdf'),
  width: '1440px',
  height: '810px',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log('pdf written');
