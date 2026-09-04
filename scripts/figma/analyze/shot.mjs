/**
 * Reference screenshot + spot measurements of the running product.
 *
 *   node scripts/figma/analyze/shot.mjs --out /tmp/product-setup.png
 *
 * The comparison target for a FINAL screen. Everything it prints is measured
 * from the live page, so a Figma/product difference can be attributed rather
 * than guessed at.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const OUT = arg('out', 'scripts/figma/.captures/product-setup.png');
const PORT = arg('port', '8082');
const WIDTH = Number(arg('width', '1440'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1200 } });
await page.addInitScript(() => {
  try {
    localStorage.setItem('brandos:dev-bypass', '1');
    localStorage.setItem('brandos-theme', 'light');
  } catch { /* private mode */ }
});
await page.goto(`http://localhost:${PORT}/b/brandingos/setup`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.screenshot({ path: OUT, fullPage: true });

const measured = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const box = (e) => (e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null);
  const sections = [...document.querySelectorAll('.section')];
  return {
    panel: box(q('.panel')),
    panelList: box(q('.panel-list')),
    rows: document.querySelectorAll('.panel-item').length,
    rowThumbSvgs: [...document.querySelectorAll('.panel-item-thumb svg')].map((s) => s.outerHTML),
    sectionBorderColor: sections[1] ? getComputedStyle(sections[1]).borderTopColor : null,
    sectionBorderWidth: sections[1] ? getComputedStyle(sections[1]).borderTopWidth : null,
    logoTile: box(q('.logo-tile')),
    logoSvgViewBox: (() => { const s = q('.logo-tile .logo-svg svg'); return s ? s.getAttribute('viewBox') : null; })(),
    swatchRowOverflow: (() => {
      const row = q('.colors-row');
      return row ? { scrollW: row.scrollWidth, clientW: row.clientWidth, overflowX: getComputedStyle(row).overflowX } : null;
    })(),
  };
});

console.log(JSON.stringify({ ...measured, rowThumbSvgs: measured.rowThumbSvgs.length }, null, 2));
console.log('--- thumb svgs ---');
measured.rowThumbSvgs.forEach((s, i) => console.log(i, s.slice(0, 220)));
await browser.close();
