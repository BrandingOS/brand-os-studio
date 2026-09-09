/**
 * The extractor driver — Playwright + CDP.
 *
 *   node scripts/figma/extract/extract.mjs --port 8083 --theme light --out <dir>
 *
 * Two rules here were learned the expensive way and are not optional:
 *
 * 1. TRANSITIONS MUST BE DISABLED BEFORE MEASURING. `.ds-btn` transitions
 *    transform, box-shadow and background over 150ms, so forcing :hover and
 *    reading immediately returns the OLD shadow — getComputedStyle hands back an
 *    in-flight value. Spike 1 went from 3/8 to 8/8 on this one change. Figma has
 *    no transitions; the destination is the only meaningful value.
 *
 * 2. `:hover`, `:active` and `:focus-visible` cannot be set from page script.
 *    They are forced through CDP's CSS.forcePseudoState — the same mechanism
 *    DevTools' ":hov" toggle uses. `:disabled` is NOT forced: it is a real DOM
 *    state and is rendered as one by the harness.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const PORT = arg('port', '8083');
const THEME = arg('theme', 'light');
const DIR = arg('dir', 'ltr');
const COMPONENT = arg('component', '');
const OUT = arg('out', 'scripts/figma/.captures');
const WIDTH = Number(arg('width', '1400'));

const collectorSrc = fs.readFileSync(
  path.resolve('scripts/figma/extract/collector.ts'), 'utf8',
);
// Pull the template literal out of the TS module without needing a build step.
const COLLECTOR = collectorSrc.slice(
  collectorSrc.indexOf('String.raw`') + 'String.raw`'.length,
  collectorSrc.lastIndexOf('`;'),
);

/**
 * The properties to read, taken FROM `raw.ts` rather than restated here.
 *
 * This driver carried its own copy, exactly as the pattern driver did, and the
 * copy silently outranked the typed list — so `margin-left` reached the pattern
 * pipeline and never reached this one. Two lists is one too many; there is now
 * one, and `collectedProps.test.ts` fails if a second appears in either driver.
 */
const rawSrc = fs.readFileSync(path.resolve('scripts/figma/extract/raw.ts'), 'utf8');
const propsBody = rawSrc.slice(rawSrc.indexOf('export const COLLECTED_PROPS = ['));
// eslint-disable-next-line no-eval
const PROPS = eval(propsBody.slice(propsBody.indexOf('['), propsBody.indexOf('] as const;') + 1));
if (!Array.isArray(PROPS) || !PROPS.includes('display')) {
  throw new Error('could not read COLLECTED_PROPS from scripts/figma/extract/raw.ts');
}

const url = `http://localhost:${PORT}/_dev/figma?theme=${THEME}&dir=${DIR}` +
  (COMPONENT ? `&component=${COMPONENT}` : '');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 1000 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });

// RULE 1 — measure the settled state.
await page.addStyleTag({
  content: `*, *::before, *::after {
    transition: none !important;
    animation: none !important;
  }`,
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(150);

// RULE 2 — force pseudo-states through CDP.
const cdp = await ctx.newCDPSession(page);
await cdp.send('DOM.enable');
await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: -1 });

/**
 * Every cell needing a forced pseudo-state, with the SELECTOR of the node that
 * should receive it.
 *
 * The target is usually the subject root, but not always: a component's :hover
 * rule often lives on a child. DsMenu hovers `.ds-menu-item`, so forcing the
 * root produced a hover capture identical to default — which deduplication
 * would then collapse, deleting the state from the output entirely. The
 * manifest declares the target; the harness emits it.
 */
const forced = await page.$$eval('[data-fx-component]', (els) =>
  els
    .map((el) => ({
      index: Number(el.dataset.fxIndex),
      pseudo: el.dataset.fxPseudo,
      target: el.dataset.fxPseudoTarget || '',
    }))
    .filter((c) => ['hover', 'active', 'focus', 'focus-visible'].includes(c.pseudo)),
);

let forcedOk = 0;
const forcedMisses = [];
for (const cell of forced) {
  const selector = cell.target
    ? `[data-fx-index="${cell.index}"] ${cell.target}`
    : `[data-fx-index="${cell.index}"] [data-fx-subject] > *`;
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) { forcedMisses.push(selector); continue; }
  await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [cell.pseudo] });
  forcedOk++;
}
await page.waitForTimeout(80);   // let the forced states resolve

const capture = await page.evaluate(
  ({ src, props }) => (0, eval)(src)(props),
  { src: COLLECTOR, props: PROPS },
);

fs.mkdirSync(OUT, { recursive: true });
const name = `capture-${THEME}-${DIR}-${WIDTH}${COMPONENT ? `-${COMPONENT}` : ''}.json`;
const file = path.join(OUT, name);
fs.writeFileSync(file, JSON.stringify(capture, null, 2));

console.log(JSON.stringify({
  file,
  theme: capture.theme,
  direction: capture.direction,
  cells: capture.cells.length,
  pseudoStates: { requested: forced.length, forced: forcedOk, missed: forcedMisses },
  tokensMapped: Object.keys(capture.tokens).length,
  pageErrors: pageErrors.length ? pageErrors : 'none',
}, null, 2));

// A pseudo-target that matches nothing is a silent state loss, so it fails.
if (forcedMisses.length) {
  console.error(`\n${forcedMisses.length} pseudo-target(s) matched no node — those states would be captured as defaults.`);
  process.exitCode = 1;
}

await browser.close();
