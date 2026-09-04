/**
 * Targeted DOM questions about the Setup screen.
 *
 *   node scripts/figma/analyze/probe.mjs
 *
 * Answers the questions a parity gap raises — which classes distinguish two
 * tiles that look different, what artwork each rail row carries, what order the
 * board actually paints in — so a fix is aimed rather than guessed.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const PORT = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1] : '8082';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.addInitScript(() => {
  try {
    localStorage.setItem('brandos:dev-bypass', '1');
    localStorage.setItem('brandos-theme', 'light');
  } catch { /* private mode */ }
});
await page.goto(`http://localhost:${PORT}/b/brandingos/setup`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

const out = await page.evaluate(() => {
  const clean = (svg) => svg.replace(/\sdata-(lov|component)-[a-z]+="[^"]*"/g, '');
  return {
    logoTiles: [...document.querySelectorAll('.logo-tile')].map((t) => ({
      classes: t.className,
      bg: getComputedStyle(t).backgroundColor,
      border: getComputedStyle(t).borderTopStyle + ' ' + getComputedStyle(t).borderTopColor,
      label: (t.querySelector('.logo-tile-name') || {}).textContent,
      hasSvg: !!t.querySelector('.logo-svg svg'),
    })),
    railRows: [...document.querySelectorAll('.panel-item')].map((r) => ({
      name: (r.querySelector('.panel-item-name') || {}).textContent,
      thumb: r.querySelector('.panel-item-thumb svg')
        ? clean(r.querySelector('.panel-item-thumb svg').outerHTML)
        : null,
    })),
    // Painted order, not DOM order: a wrapping board can reorder.
    boardOrder: [...document.querySelectorAll('.section')].map((s) => ({
      title: (s.querySelector('h2') || {}).textContent,
      top: Math.round(s.getBoundingClientRect().top + window.scrollY),
      w: Math.round(s.getBoundingClientRect().width),
      order: getComputedStyle(s).order,
    })).sort((a, b) => a.top - b.top),
    boardStyle: (() => {
      const m = document.querySelector('.board-wrap');
      if (!m) return null;
      const cs = getComputedStyle(m);
      return { display: cs.display, wrap: cs.flexWrap, gap: cs.gap, cols: cs.gridTemplateColumns };
    })(),
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
