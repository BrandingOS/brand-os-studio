/**
 * Semantic outline of a rendered product screen.
 *
 *   node scripts/figma/analyze/outline.mjs --url http://localhost:8082/b/brandingos/setup
 *
 * This is NOT the extractor. The extractor measures a component in the harness
 * and produces IR. This walks a whole SCREEN and answers the question a
 * composition map asks: which subtrees repeat, which of them are already DS
 * components, and which are the screen's own vocabulary.
 *
 * It reports SHAPE, never pixels — a repeated class signature is evidence for
 * promotion; a measured colour is not. Deciding what to promote from measured
 * appearance is exactly the mistake that produced a component zoo with no
 * relationship to the product.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const URL_ = arg('url', 'http://localhost:8082/b/brandingos/setup');
const WIDTH = Number(arg('width', '1440'));
const HEIGHT = Number(arg('height', '1200'));
const OUT = arg('out', 'scripts/figma/.captures/outline.json');
const MAXDEPTH = Number(arg('depth', '14'));

const COLLECT = `(() => {
  const DS = /^(ds-|brand-mark|loading-pill)/;
  const NOISE = /^(sr-only|group|flex|grid|absolute|relative|inline|block|hidden|w-|h-|p[xytblr]?-|m[xytblr]?-|gap-|text-|bg-|border|rounded|shadow|items-|justify-|overflow|min-|max-|top-|left-|right-|bottom-|z-|opacity-|transition|duration|cursor-|select-|font-|leading-|tracking-|space-|col-|row-|self-|order-|shrink|grow|basis|truncate|whitespace|pointer-|outline|ring|hover:|focus:|active:|disabled:|sm:|md:|lg:|xl:|2xl:|dark:|aria-|data-)/;

  const sig = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '').split(/\\s+/)
      .filter(Boolean).filter((c) => !NOISE.test(c));
    return cls.length ? cls[0] : null;
  };

  const rows = [];
  const walk = (el, depth, pathArr) => {
    if (depth > ${MAXDEPTH}) return;
    const s = sig(el);
    const here = s ? [...pathArr, s] : pathArr;
    if (s) {
      const r = el.getBoundingClientRect();
      rows.push({
        sig: s,
        tag: el.tagName.toLowerCase(),
        depth,
        path: here.join(' > '),
        parent: pathArr.length ? pathArr[pathArr.length - 1] : null,
        ds: DS.test(s),
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: (el.childNodes.length === 1 && el.firstChild.nodeType === 3)
          ? el.textContent.trim().slice(0, 40) : null,
      });
    }
    for (const c of el.children) walk(c, depth + 1, here);
  };
  walk(document.body, 0, []);
  return rows;
})()`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));

await page.addInitScript(() => {
  try { localStorage.setItem('brandos:dev-bypass', '1'); } catch { /* private mode */ }
});
await page.goto(URL_, { waitUntil: 'networkidle', timeout: 60_000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

const rows = await page.evaluate(COLLECT);
await browser.close();

// --- aggregate -------------------------------------------------------------
const bySig = new Map();
for (const r of rows) {
  const e = bySig.get(r.sig) ?? { sig: r.sig, ds: r.ds, n: 0, tags: new Set(), parents: new Set(), sizes: new Set() };
  e.n += 1;
  e.tags.add(r.tag);
  if (r.parent) e.parents.add(r.parent);
  e.sizes.add(`${r.w}x${r.h}`);
  bySig.set(r.sig, e);
}

const summary = [...bySig.values()]
  .map((e) => ({
    sig: e.sig, ds: e.ds, count: e.n,
    tags: [...e.tags], parents: [...e.parents].slice(0, 4),
    distinctSizes: e.sizes.size,
  }))
  .sort((a, b) => b.count - a.count || (a.sig < b.sig ? -1 : 1));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ url: URL_, width: WIDTH, rows, summary }, null, 2));

console.log(`nodes with a semantic class: ${rows.length}`);
console.log(`distinct signatures: ${summary.length}`);
console.log('');
console.log('sig'.padEnd(34), 'n'.padStart(4), ' ds   sizes  parents');
for (const s of summary.slice(0, 70)) {
  console.log(
    s.sig.slice(0, 33).padEnd(34),
    String(s.count).padStart(4),
    s.ds ? ' DS ' : '  . ',
    String(s.distinctSizes).padStart(5),
    ' ', s.parents.join(', ').slice(0, 46),
  );
}
console.log(`\nwritten: ${OUT}`);
