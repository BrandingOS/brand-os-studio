/**
 * The PATTERN extractor — measures product patterns in situ.
 *
 *   node scripts/figma/extract/extract-patterns.mjs --port 8082 --theme light
 *
 * The component extractor mounts a declared cell in the harness. A pattern has
 * no harness cell: it is shared Studio chrome that only exists inside a real
 * screen, wearing that screen's real content. So this driver navigates to the
 * product route and STAMPS the harness attributes onto the elements the pattern
 * manifest names.
 *
 * Stamping rather than wrapping is load-bearing. Inserting a wrapper element
 * would reflow the page, so every measurement taken after the first insertion
 * would describe a document the user never sees. `data-fx-self` (collector.ts)
 * lets a node be its own subject, which changes no layout at all.
 *
 * Rule 1 from the component extractor applies unchanged and is not optional:
 * TRANSITIONS MUST BE DISABLED BEFORE MEASURING, or getComputedStyle returns
 * in-flight values.
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

const PORT = arg('port', '8082');
const THEME = arg('theme', 'light');
const WIDTH = Number(arg('width', '1440'));
const OUT = arg('out', `scripts/figma/.captures/patterns-${THEME}.json`);
const ONLY = arg('only', '');

const collectorSrc = fs.readFileSync(path.resolve('scripts/figma/extract/collector.ts'), 'utf8');
const COLLECTOR = collectorSrc.slice(
  collectorSrc.indexOf('String.raw`') + 'String.raw`'.length,
  collectorSrc.lastIndexOf('`;'),
);

const PROPS = [
  'display', 'position', 'flex-direction', 'flex-wrap', 'gap', 'row-gap', 'column-gap',
  'justify-content', 'align-items', 'align-self', 'flex-grow', 'flex-shrink', 'flex-basis',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'background-color', 'color', 'opacity', 'overflow',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-radius',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'font-family', 'font-size', 'font-weight',
  'line-height', 'letter-spacing', 'text-align', 'direction',
  'transform', 'visibility',
];

// The manifest is TypeScript with no runtime deps beyond the array literal, so
// it is read rather than imported — the extractor has no build step.
const src = fs.readFileSync(path.resolve('src/shared/ds/figma.patterns.ts'), 'utf8');
const body = src.slice(src.indexOf('FX_PATTERNS: readonly FxPattern[] = ['));
const json = body.slice(body.indexOf('['), body.lastIndexOf('] as const;') + 1);
// eslint-disable-next-line no-eval -- a literal array from a file in this repo.
const PATTERNS = eval(json).filter((p) => !ONLY || p.key === ONLY);

const routes = [...new Set(PATTERNS.map((p) => p.route))];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 1200 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

/**
 * The theme is NOT a query parameter on a product route — that is a harness
 * affordance. `brandos-theme` is the one key the product reads (next-themes'
 * storageKey AND what `[data-workspace] data-theme` resolves from), so setting
 * anything else yields a "dark" capture that is byte-identical to light. That
 * happened once here and was caught only by diffing `--ds-bg` between the two
 * files; the assertion below now makes it impossible to miss.
 */
await page.addInitScript((theme) => {
  try {
    localStorage.setItem('brandos:dev-bypass', '1');
    localStorage.setItem('brandos-theme', theme);
  } catch { /* private mode */ }
}, THEME);

const cells = [];
let tokens = null;
let tokenValues = null;
const misses = [];

/**
 * One PASS per pseudo-state, not one stamp per cell.
 *
 * `at: [0, 4, 0, 4]` names the same two elements twice — once at rest and once
 * hovered. Stamping all four in a single pass would simply overwrite the first
 * two, and forcing :hover would then apply to the cells labelled "default" as
 * well. So each pseudo gets its own pass over a freshly reloaded page.
 */
const passes = [];
for (const route of routes) {
  const here = PATTERNS.filter((p) => p.route === route);
  const states = new Set();
  for (const p of here) {
    (p.pseudo ?? p.at.map(() => 'default')).forEach((s) => states.add(s));
  }
  for (const state of states) {
    const work = [];
    for (const def of here) {
      const per = def.pseudo ?? def.at.map(() => 'default');
      const idx = def.at.map((n, i) => [n, i]).filter(([, i]) => per[i] === state);
      if (idx.length) {
        // Every pattern a container may reference, so the stamping pass can read
        // the CONTAINED pattern's own variant rule without a second lookup.
        const variantOf = {};
        for (const other of here) {
          if (other.variantBy) variantOf[other.sid] = { variantBy: other.variantBy };
        }
        work.push({
          key: def.key, sid: def.sid, selector: def.selector, roles: def.roles,
          pseudoTarget: def.pseudoTarget || '',
          contains: def.contains || null,
          variantOf,
          at: idx.map(([n]) => n),
          axes: idx.map(([, i]) => (def.axes && def.axes[i]) || {}),
        });
      }
    }
    if (work.length) passes.push({ route, state, work });
  }
}

for (const pass of passes) {
  const { route, state, work: here } = pass;
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 60_000 });

  // Prove the theme took. A capture that silently stays light produces variable
  // modes with two identical values, which looks like a working dark theme.
  const applied = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
    ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  if (applied !== THEME) {
    console.error(`THEME NOT APPLIED: asked for ${THEME}, document reports ${applied}`);
    process.exit(1);
  }

  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const stamped = await page.evaluate((defs) => {
    const missed = [];
    let index = 0;
    for (const def of defs) {
      const all = Array.from(document.querySelectorAll(def.selector));
      def.at.forEach((n, i) => {
        const el = all[n];
        if (!el) { missed.push(`${def.key}[${n}] via ${def.selector}`); return; }
        el.setAttribute('data-fx-self', '');
        // Figma groups the assets panel on "/", so the prefix is what keeps the
        // product layer legible beside the DS primitives instead of interleaved
        // with them alphabetically.
        el.setAttribute('data-fx-component', `pattern/${def.key}`);
        el.setAttribute('data-fx-sid', def.sid);
        el.setAttribute('data-fx-index', String(index++));
        el.setAttribute(
          'data-fx-variant',
          Object.entries(def.axes[i]).map(([k, v]) => `${k}=${v}`).join(','),
        );
        if (def.roles) el.setAttribute('data-fx-roles', JSON.stringify(def.roles));

        // Mark descendants that are themselves patterns. The collector records
        // them as references and does not descend, so the container composes
        // them rather than embedding a flattened copy.
        if (def.contains) {
          for (const sel in def.contains) {
            let hit = 0;
            for (const d of Array.from(el.querySelectorAll(sel))) {
              // Only the OUTERMOST match: a nested one is already inside the
              // component being referenced.
              if (d.parentElement && d.parentElement.closest(sel)) continue;
              d.setAttribute('data-fx-ref', def.contains[sel]);

              // Which VARIANT this occurrence is, and what TEXT it overrides.
              // An instance that carries neither is a picture of the default —
              // seven identical rail rows all reading "Website".
              const target = def.variantOf[def.contains[sel]];
              if (target && target.variantBy) {
                const axes = {};
                for (const axis in target.variantBy) {
                  const rule = target.variantBy[axis];
                  axes[axis] = d.querySelector(rule.selector) ? rule.present : rule.absent;
                }
                d.setAttribute(
                  'data-fx-ref-variant',
                  Object.keys(axes).sort().map((k) => k + '=' + axes[k]).join(','),
                );
              }
              // Text in DOCUMENT ORDER, which is the order the walker walks the
              // instance's own text nodes in. Only the characters travel — the
              // styling belongs to the component being instanced.
              const texts = [];
              const tw = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
              let t;
              while ((t = tw.nextNode())) {
                // Text INSIDE an <svg> is drawn geometry, not a label — the
                // rail's thumbnail is an SVG containing the glyphs "A" and "a",
                // which would otherwise be written over the row's name and
                // subtitle. Figma renders that subtree as a vector, so it has no
                // text node to receive an override anyway.
                if (t.parentElement && t.parentElement.closest('svg')) continue;
                const v = t.textContent.replace(/\s+/g, ' ').trim();
                if (v) texts.push(v);
              }
              if (texts.length) d.setAttribute('data-fx-ref-text', JSON.stringify(texts));
              hit++;
            }
            if (!hit) missed.push(`${def.key} contains ${sel} — matched nothing`);
          }
        }
      });
    }
    return missed;
  }, here);

  misses.push(...stamped);

  // Force the pseudo-state through CDP — the same mechanism DevTools' ":hov"
  // toggle uses, and the only way to reach :hover from outside the page.
  if (state !== 'default') {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const targets = await page.$$eval('[data-fx-component]', (els) =>
      els.map((el) => Number(el.dataset.fxIndex)));
    for (const idx of targets) {
      const def = here.find((d) => d.pseudoTarget);
      const selector = def && def.pseudoTarget
        ? `[data-fx-index="${idx}"] ${def.pseudoTarget}`
        : `[data-fx-index="${idx}"]`;
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      // A target that matches nothing yields a capture identical to default,
      // which deduplication would then report as a duplicate state. Loud beats
      // plausible.
      if (!nodeId) { misses.push(`pseudo target ${selector}`); continue; }
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [state] });
    }
    await page.waitForTimeout(120);
  }

  const capture = await page.evaluate(
    ([srcText, props]) => (0, eval)(`(${srcText})`)(props),
    [COLLECTOR, PROPS],
  );
  cells.push(...capture.cells);
  tokens ??= capture.tokens;
  tokenValues ??= capture.tokenValues;
}

await browser.close();

// A selector that matches nothing is a manifest that has drifted from the
// product. Failing loudly beats emitting a pattern set with a silent hole —
// the same rule the component extractor applies to an unmatched pseudo-target.
if (misses.length) {
  console.error('PATTERN SELECTORS MATCHED NOTHING:');
  for (const m of misses) console.error('  ' + m);
  process.exit(1);
}
if (pageErrors.length) {
  console.error('PAGE ERRORS:');
  for (const e of pageErrors) console.error('  ' + e);
  process.exit(1);
}

const out = {
  theme: THEME,
  direction: 'ltr',
  viewport: { w: WIDTH, h: 1200 },
  url: routes.join(','),
  capturedAt: new Date().toISOString(),
  tokens,
  tokenValues,
  cells,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));

console.log(`patterns declared : ${PATTERNS.length}`);
console.log(`cells captured    : ${cells.length}`);
console.log(`tokens            : ${Object.keys(tokenValues || {}).length}`);
for (const c of cells) {
  const n = (function count(x) { return 1 + x.children.reduce((a, k) => a + count(k), 0); })(c.root);
  console.log(`  ${c.component.padEnd(22)} ${JSON.stringify(c.variant).padEnd(22)} ${String(n).padStart(4)} nodes`);
}
console.log(`written: ${OUT}`);
