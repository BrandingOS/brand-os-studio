/**
 * Capture(s) -> IR -> RenderPlan -> a ready-to-run use_figma script.
 *
 *   node scripts/figma/build-plan.mjs --component DsButton --page "03 — Components"
 *
 * Writes:
 *   scripts/figma/.plans/<name>.plan.json    the pure-data plan
 *   scripts/figma/.plans/<name>.script.js    walker + plan, ready for use_figma
 *
 * The script is what the MCP transport sends. The local plugin reads the SAME
 * plan through the SAME walker — only delivery differs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const COMPONENT = arg('component', '');
const PAGE = arg('page', '03 — Components');
const CAPTURES = arg('captures', 'scripts/figma/.captures');
const OUT = arg('out', 'scripts/figma/.plans');
const GEN = arg('gen', new Date().toISOString());

const suffix = COMPONENT ? `-${COMPONENT}` : '';
// Product PATTERNS are measured in situ by extract-patterns.mjs and land under
// their own names, so the two capture files can be named explicitly. Everything
// downstream — IR, plan, walker, transport — is identical for both layers.
const lightFile = arg('light', path.join(CAPTURES, `capture-light-ltr-1400${suffix}.json`));
const darkFile = arg('dark', path.join(CAPTURES, `capture-dark-ltr-1400${suffix}.json`));
for (const f of [lightFile, darkFile]) {
  if (!fs.existsSync(f)) {
    console.error(`missing capture: ${f}\nrun extract.mjs for both themes first`);
    process.exit(1);
  }
}

// The IR conversion and plan modules are TypeScript; run them through vite-node
// so there is no separate build step to keep in sync.
const bridge = path.join(OUT, '_bridge.mjs');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(bridge, `
import fs from 'node:fs';
import { nodeToIR } from '${path.resolve('scripts/figma/extract/toIR.ts')}';
import { mergeThemes } from '${path.resolve('scripts/figma/render/plan.ts')}';
import { IR_VERSION } from '${path.resolve('scripts/figma/ir/types.ts')}';

const light = JSON.parse(fs.readFileSync(${JSON.stringify(lightFile)}, 'utf8'));
const dark  = JSON.parse(fs.readFileSync(${JSON.stringify(darkFile)}, 'utf8'));

function toDoc(cap) {
  const roots = cap.cells.map((cell) => {
    const node = nodeToIR(cell.root, {
      sidRoot: cell.sidRoot,
      variant: cell.variant,
      tokens: cap.tokens,
      direction: cap.direction,
      roles: cell.roles,
    });
    node.semantic = { component: cell.component, variant: cell.variant, booleanProps: cell.booleanProps };
    return node;
  });
  const tokens = Object.entries(cap.tokenValues || {})
    .filter(([, value]) => /^#|^rgba\\(/.test(value))
    .map(([name, value]) => ({ name, value, kind: 'color' }));
  return {
    irVersion: IR_VERSION,
    meta: {
      capturedAt: cap.capturedAt, theme: cap.theme, direction: cap.direction,
      viewport: cap.viewport, appCommit: '', url: cap.url, fixture: 'brandingos',
    },
    tokens, roots, losses: [],
  };
}

const merged = mergeThemes(toDoc(light), toDoc(dark), {
  page: ${JSON.stringify(PAGE)},
  gen: ${JSON.stringify(GEN)},
});
// Written to a FILE, not stdout. vite-node loads the root vite.config.ts, whose
// landingPageDevPlugin prints a whole Vite build — which lands on stdout ahead
// of the payload and takes the first "{" with it.
fs.writeFileSync(${JSON.stringify(path.resolve(OUT, '_bridge.out.json'))}, JSON.stringify(merged));
`);

const bridgeOut = path.join(OUT, '_bridge.out.json');
execFileSync('npx', ['vite-node', bridge], {
  maxBuffer: 64 * 1024 * 1024,
  stdio: ['ignore', 'ignore', 'inherit'],
  // The documented opt-out (CLAUDE.md): anything running `vite build` otherwise
  // rebuilds the landing page, which this has no use for.
  env: { ...process.env, SKIP_LANDING_BUILD: '1' },
});
const { plan, unmapped, visuallyIdentical, droppedAxes } = JSON.parse(
  fs.readFileSync(bridgeOut, 'utf8'),
);
fs.unlinkSync(bridge);
fs.unlinkSync(bridgeOut);

const name = COMPONENT || 'all';
const planFile = path.join(OUT, `${name}.plan.json`);
fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

// The walker travels as source text so both transports execute identical code.
const walkerSrc = fs.readFileSync(path.resolve('scripts/figma/transport/walk.ts'), 'utf8');
const walkerRaw = walkerSrc.slice(
  walkerSrc.indexOf('String.raw`') + 'String.raw`'.length,
  walkerSrc.lastIndexOf('`;'),
);
// The walker is repeated in every chunk, so its comments are pure transmission
// cost. The readable source stays in walk.ts; only the wire copy is stripped.
// `.trim()` is load-bearing, not tidiness. The template literal opens and closes
// on its own line, so the stripped string carries a leading and a trailing
// newline. Those two invisible characters cost two failed installs: every tool
// that prints the file shows them as blank lines, so a transcription is short by
// exactly two and the byte-count check fails with nothing visible to fix.
const walker = walkerRaw
  .replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*\n/g, '\n').replace(/^ {2,}/gm, ' ')
  .trim();

/**
 * The installed copy of the walker and this string must be IDENTICAL, and the
 * only cheap proof of that is a byte count both sides can compute.
 *
 * A stale installed walker is the worst failure mode here: every chunk reads it
 * from document plugin data, so an old copy silently applies old rules to a new
 * plan and the output looks plausible. It has already happened twice — once
 * two generations behind, and once off by the two newlines an install wrapper
 * added around a string that already carried them. So the length is written
 * beside the plan, and the install payload adds nothing to the string.
 */
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, '_walker.js'), walker);
fs.writeFileSync(
  path.join(OUT, '_walker.meta.json'),
  JSON.stringify({ bytes: walker.length, note: 'assert getSharedPluginData length equals this' }, null, 2),
);

/**
 * Drop fields the walker treats as absent-equals-default.
 *
 * The plan travels inside a `use_figma` script whose `code` parameter is capped
 * at 50,000 characters, and the same payload is re-sent for every component, so
 * empty arrays and default values are pure cost. The walker was made tolerant of
 * omitted fields specifically so this is safe — the compaction and that
 * tolerance are one change in two places.
 */
function compact(node, isRoot = false) {
  const out = { sid: node.sid, name: node.name, kind: node.kind };
  if (node.layout?.mode === 'auto') out.layout = node.layout;   // absolute is the default
  // A node with no children has no intrinsic size in Figma, so it MUST carry
  // its measured dimensions. Dropping them made the 1px menu divider render as
  // a 100x100 grey block — an empty auto-layout frame falls back to Figma's
  // default size, which looks nothing like a hairline.
  const leaf = !node.children?.length && !node.text && !node.svg;
  // An ABSOLUTELY-laid-out container has no intrinsic size in Figma either: its
  // children are positioned, not flowed, so nothing pushes its bounds out. Left
  // without dimensions it fell back to Figma's 100x100 default — which is how
  // the workspace top bar, the icon tile and the logo tile all came out as
  // identical small squares.
  /**
   * TEXT is never "absolute" in this sense, and must not be given a fixed width.
   *
   * `deriveLayout` reports every text node as absolute because it carries no
   * flex container of its own — so the rule below marked all of them fixed, and
   * a measured browser width became a hard box in Figma. Figma's metrics differ
   * by a fraction of a pixel, so "BrandingOS" clipped to "Brandin" and "Rebrand
   * with AI" wrapped and lost its second line.
   *
   * A label hugs. A width is imposed only when the source text ACTUALLY wrapped,
   * which is the one case where hugging would change the design.
   */
  const isText = !!node.text;
  const lineHeight = isText
    ? (typeof node.text.lineHeight === 'number' ? node.text.lineHeight : node.text.size * 1.2)
    : 0;
  // Two WHOLE lines, not "taller than one". A flex parent with align-items:
  // stretch makes a single-line label as tall as its row — the segmented-nav
  // items measure 32.75 against an 18.75 line-height, which is 1.75x and not a
  // wrap at all. A genuine wrap lands near an integer multiple of 2 or more.
  const wrapped = isText && node.sizing?.h >= lineHeight * 1.9;
  const absolute = !isText && node.layout?.mode !== 'auto';
  /**
   * A pattern ROOT always takes its measured size.
   *
   * `brand-field` hugs to 69px on its own, because its real 510px width comes
   * from the grid cell it sits in — true of the CSS and useless as a component,
   * since a fill child then collapses with it. What a designer must see is the
   * thing as it ships, at the width it was measured at.
   */
  const fixW = isText ? wrapped : (isRoot || node.sizing?.width === 'fixed');
  const fixH = isText ? false : node.sizing?.height === 'fixed';
  const needsSize = leaf || absolute || fixW || fixH;
  if (node.sizing?.width === 'fill' || node.sizing?.height === 'fill'
      || node.sizing?.minW || node.sizing?.maxW || needsSize) {
    out.sizing = {};
    if (node.sizing.width === 'fill') out.sizing.width = 'fill';
    if (node.sizing.height === 'fill') out.sizing.height = 'fill';
    if (node.sizing.minW) out.sizing.minW = node.sizing.minW;
    if (node.sizing.maxW) out.sizing.maxW = node.sizing.maxW;
    if (needsSize) { out.sizing.w = node.sizing.w; out.sizing.h = node.sizing.h; }
  }
  // An auto-layout frame HUGS unless told otherwise, so a measured width means
  // nothing to the walker without the intent beside it. Without these, the
  // section-add affordance hugged its 15px icon instead of being the 30px
  // square it ships as, and the colours group hugged to 178 instead of 1044.
  if (fixW) out.fixW = true;
  if (fixH) out.fixH = true;
  if (node.fills?.length) out.fills = node.fills;
  if (node.strokes?.length) out.strokes = node.strokes;
  if (node.sw) out.sw = node.sw;
  if (node.radii?.some((r) => r !== 0)) out.radii = node.radii;
  if (node.effects?.length) out.effects = node.effects;
  if (node.opacity !== 1) out.opacity = node.opacity;
  if (node.text) out.text = node.text;
  if (node.svg) out.svg = node.svg;
  // Without this an instance arrives with nothing to resolve, so the walker
  // builds it as an empty frame — a composed pattern quietly becomes a hollow
  // one, with no error anywhere. `kind` alone is not enough.
  if (node.ref) out.ref = node.ref;
  if (node.pos) out.pos = node.pos;
  if (node.ov) out.ov = node.ov;
  if (node.children?.length) out.children = node.children.map(compact);
  return out;
}

/**
 * Compaction must not lose meaning, only defaults.
 *
 * `compact` is an allow-list, so any field added to PlanNode is silently
 * dropped until someone remembers to add it here. That is exactly what happened
 * to `ref`: every instance arrived with nothing to resolve and the walker built
 * it as an empty frame — composed patterns became hollow ones with no error
 * anywhere. Counting the refs on both sides makes the next omission loud.
 */
function countRefs(node) {
  return (node.ref ? 1 : 0) + (node.children || []).reduce((a, c) => a + countRefs(c), 0);
}
const refsBefore = plan.sets.reduce(
  (a, s) => a + s.variants.reduce((b, v) => b + countRefs(v.node), 0), 0,
);

const wirePlan = {
  ...plan,
  sets: plan.sets.map((s) => ({
    ...s,
    variants: s.variants.map((v) => ({ ...v, node: compact(v.node, true) })),
  })),
};

const refsAfter = wirePlan.sets.reduce(
  (a, s) => a + s.variants.reduce((b, v) => b + countRefs(v.node), 0), 0,
);
if (refsAfter !== refsBefore) {
  console.error(`compaction lost ${refsBefore - refsAfter} of ${refsBefore} instance references`);
  process.exit(1);
}

const script = `${walker}\nreturn await runPlan(${JSON.stringify(wirePlan)});\n`;
const scriptFile = path.join(OUT, `${name}.script.js`);
fs.writeFileSync(scriptFile, script);

/**
 * Split into scripts that each fit `use_figma`'s 50,000-character cap.
 *
 * Components persist between calls, so a large set is BUILT across several
 * 'build' calls that leave components loose on the page carrying their sid, and
 * then formed by one small 'combine' call. Splitting is a delivery concern only;
 * every chunk runs the same walker over the same plan shape.
 */
// Sized to what can be RELIABLY READ AND RESENT, not to the 50k API cap.
// The Figma execution environment has no fetch, XHR or WebSocket (probed), so
// every byte travels inside the code parameter and therefore through the
// agent's context. Smaller chunks cost more calls but never truncate.
const BUDGET = Number(arg('budget', '38000'));

/**
 * Bin-pack SETS into chunks, splitting a set only when one alone overflows.
 *
 * This used to emit at least one chunk per set, so 14 small product patterns
 * became 14 round trips carrying 76KB in total — where four would have done.
 * The walker is no longer inlined (LEAN_PREFIX reads the installed copy), so
 * the budget is plan data plus a preamble of a few hundred bytes.
 */
const chunks = [];
{
  let bin = [];
  let size = 0;
  const flush = () => { if (bin.length) { chunks.push(bin); bin = []; size = 0; } };

  for (const set of wirePlan.sets) {
    const whole = JSON.stringify(set).length;
    if (whole <= BUDGET) {
      if (size + whole > BUDGET) flush();
      bin.push(set); size += whole;
      continue;
    }
    // One set is too large on its own: split it across chunks by variant, and
    // give it whole chunks so a partial set is never mixed with complete ones.
    flush();
    let current = [];
    let vsize = 0;
    for (const variant of set.variants) {
      const cost = JSON.stringify(variant).length;
      if (current.length && vsize + cost > BUDGET) {
        chunks.push([{ ...set, variants: current }]);
        current = []; vsize = 0;
      }
      current.push(variant); vsize += cost;
    }
    if (current.length) chunks.push([{ ...set, variants: current }]);
  }
  flush();
}


/**
 * Lean chunks: the walker is INSTALLED ONCE in document plugin data and eval'd
 * by each call, so only plan data travels. The Figma execution environment has
 * no fetch/XHR/WebSocket (probed), so every byte passes through the agent's
 * context — removing the ~10KB walker from each call is the single largest
 * saving available.
 *
 * A function DECLARATION inside eval does not leak, so the stored source is
 * wrapped as an expression and returned.
 */
// The page is matched on its NUMBER, not its title. Titles are the one thing a
// designer is free to reword — "04 — Patterns" became "04 — Patterns &
// Navigation" and an exact match threw inside setCurrentPageAsync with a
// message that named neither the page nor the plan.
const LEAN_PREFIX = (page) => `const _n=${JSON.stringify(String(page).trim().split(/[^0-9]/)[0])};
const _p=figma.root.children.find(p=>p.name.trim().split(/[^0-9]/)[0]===_n);
if(!_p)throw new Error('no page numbered '+_n+'; have: '+figma.root.children.map(p=>p.name).join(' | '));
await figma.setCurrentPageAsync(_p);
const _s=figma.root.getSharedPluginData('brandingos','walker');
if(_s.length!==${walker.length})throw new Error('stale walker: installed '+_s.length+' bytes, this plan was built for ${walker.length}. Reinstall scripts/figma/.plans/_walker.js');
const runPlan=new Function('return ('+_s.replace('async function runPlan','async function')+')')();
`;

// Stale chunks from a previous, differently-packed run would otherwise be
// re-sent as if they were current — the exact shape of the stale-walker bug.
for (const f of fs.readdirSync(OUT)) {
  if (new RegExp(`^${name}\\.build\\d+\\.js$`).test(f)) fs.unlinkSync(path.join(OUT, f));
}

const chunkFiles = chunks.map((sets, i) => {
  const p = {
    planVersion: wirePlan.planVersion,
    gen: wirePlan.gen,
    phase: 'build',
    // Variables are created by the FIRST chunk only; later chunks find them.
    collections: i === 0 ? wirePlan.collections : [],
    sets,
  };
  // The payload travels through an agent's context as literal source, so a
  // truncated or mis-copied plan is a live risk. These two counts are cheap and
  // catch the failure that matters — a plan that arrives short still builds,
  // and silently produces a page missing components nobody notices are absent.
  const counts = {
    sets: p.sets.length,
    variants: p.sets.reduce((a, s) => a + s.variants.length, 0),
  };
  const src = LEAN_PREFIX(PAGE)
    + 'const _plan = ' + JSON.stringify(p) + ';\n'
    + `if(_plan.sets.length!==${counts.sets}||_plan.sets.reduce((a,s)=>a+s.variants.length,0)!==${counts.variants})`
    + `throw new Error('payload incomplete: expected ${counts.sets} sets / ${counts.variants} variants');\n`
    + 'return await runPlan(_plan);';
  const file = path.join(OUT, `${name}.build${i + 1}.js`);
  fs.writeFileSync(file, src);
  return {
    file,
    bytes: src.length,
    sets: sets.map((s) => s.name),
    variants: sets.reduce((a, s) => a + s.variants.length, 0),
    fits: src.length < 50_000,
  };
});

const combinePlan = {
  planVersion: wirePlan.planVersion,
  gen: wirePlan.gen,
  phase: 'combine',
  collections: [],
  sets: wirePlan.sets.map((s) => ({ sid: s.sid, name: s.name, variants: [], width: 1400, x: 0, y: 0 })),
};
const combineSrc = LEAN_PREFIX(PAGE) + 'return await runPlan(' + JSON.stringify(combinePlan) + ');';
fs.writeFileSync(path.join(OUT, `${name}.combine.js`), combineSrc);

const variantCount = plan.sets.reduce((n, s) => n + s.variants.length, 0);
console.log(JSON.stringify({
  planFile, scriptFile,
  sets: plan.sets.map((s) => ({ sid: s.sid, name: s.name, variants: s.variants.length })),
  variantCount,
  variables: plan.collections[0]?.variables.length ?? 0,
  unmappedThemeValues: unmapped.length,
  visuallyIdenticalVariants: visuallyIdentical.length,
  droppedAxes,
  scriptBytes: script.length,
  // use_figma caps `code` at 50,000 characters.
  withinMcpLimit: script.length < 50_000,
  chunks: chunkFiles,
  combineBytes: combineSrc.length,
}, null, 2));
