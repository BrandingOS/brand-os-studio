/**
 * Screenshot the DS three ways, for the one comparison that matters.
 *
 *   node scripts/figma/analyze/ds-shot.mjs --component DsButton
 *
 * The Figma components are built from the CAPTURE HARNESS, not from the product,
 * so "does Figma match the design" is really two questions:
 *
 *   1. does the harness render a component the way the DS Controller does?
 *   2. does Figma render what the harness rendered?
 *
 * Only the first can be answered here, and it is the one that has been assumed
 * rather than checked. A harness that drifts from the Controller produces a
 * Figma library that is faithful to the wrong thing.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const PORT = arg('port', '8082');
const OUT = arg('out', 'scripts/figma/.captures');
const ONLY = arg('component', '');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot(url, file, opts = {}) {
  const page = await browser.newPage({ viewport: { width: opts.width || 1400, height: 900 } });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('brandos:dev-bypass', '1');
      localStorage.setItem('brandos-theme', 'light');
    } catch { /* private mode */ }
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const target = opts.selector ? await page.$(opts.selector) : null;
  await (target || page).screenshot({ path: path.join(OUT, file), fullPage: !opts.selector && !!opts.full });
  const measured = opts.measure ? await page.evaluate(opts.measure) : null;
  await page.close();
  return measured;
}

const harness = await shoot(
  `http://localhost:${PORT}/_dev/figma${ONLY ? `?component=${ONLY}` : ''}`,
  `ds-harness${ONLY ? `-${ONLY}` : ''}.png`,
  {
    full: true,
    measure: () => {
      const out = {};
      for (const cell of document.querySelectorAll('.fx-cell')) {
        const subject = cell.querySelector('.fx-subject > *');
        if (!subject) continue;
        const cs = getComputedStyle(subject);
        const r = subject.getBoundingClientRect();
        const key = cell.dataset.fxComponent + ' ' + (cell.dataset.fxVariant || '-');
        out[key] = {
          box: Math.round(r.width) + 'x' + Math.round(r.height),
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderTopWidth + ' ' + cs.borderTopColor,
          radius: cs.borderTopLeftRadius,
          font: cs.fontFamily.split(',')[0] + ' ' + cs.fontWeight + ' ' + cs.fontSize,
          pad: cs.paddingTop + ' ' + cs.paddingRight,
          shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 60),
        };
      }
      return out;
    },
  },
);

// The Controller's own preview — the canonical live showcase per CLAUDE.md.
const controller = await shoot(
  `http://localhost:${PORT}/_dev/design-system`,
  'ds-controller.png',
  {
    full: true,
    measure: () => {
      const out = {};
      // Anything the showcase renders that carries a ds- class, sampled once
      // per distinct class signature.
      for (const el of document.querySelectorAll('[class*="ds-"]')) {
        const sig = el.className;
        if (typeof sig !== 'string' || out[sig]) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        out[sig] = {
          box: Math.round(r.width) + 'x' + Math.round(r.height),
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderTopWidth + ' ' + cs.borderTopColor,
          radius: cs.borderTopLeftRadius,
          font: cs.fontFamily.split(',')[0] + ' ' + cs.fontWeight + ' ' + cs.fontSize,
          pad: cs.paddingTop + ' ' + cs.paddingRight,
        };
      }
      return out;
    },
  },
);

console.log(JSON.stringify({ harness, controller }, null, 2));
await browser.close();
