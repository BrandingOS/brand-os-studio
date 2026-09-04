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
const lightFile = path.join(CAPTURES, `capture-light-ltr-1400${suffix}.json`);
const darkFile = path.join(CAPTURES, `capture-dark-ltr-1400${suffix}.json`);
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
process.stdout.write(JSON.stringify(merged));
`);

const raw = execFileSync('npx', ['vite-node', bridge], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'inherit'],
});
const { plan, unmapped, visuallyIdentical, droppedAxes } = JSON.parse(raw.slice(raw.indexOf('{')));
fs.unlinkSync(bridge);

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
const walker = walkerRaw.replace(/^\s*\/\/.*$/gm,'').replace(/\n\s*\n/g,'\n').replace(/^ {2,}/gm,' ');

/**
 * Drop fields the walker treats as absent-equals-default.
 *
 * The plan travels inside a `use_figma` script whose `code` parameter is capped
 * at 50,000 characters, and the same payload is re-sent for every component, so
 * empty arrays and default values are pure cost. The walker was made tolerant of
 * omitted fields specifically so this is safe — the compaction and that
 * tolerance are one change in two places.
 */
function compact(node) {
  const out = { sid: node.sid, name: node.name, kind: node.kind };
  if (node.layout?.mode === 'auto') out.layout = node.layout;   // absolute is the default
  // A node with no children has no intrinsic size in Figma, so it MUST carry
  // its measured dimensions. Dropping them made the 1px menu divider render as
  // a 100x100 grey block — an empty auto-layout frame falls back to Figma's
  // default size, which looks nothing like a hairline.
  const leaf = !node.children?.length && !node.text && !node.svg;
  const needsSize = leaf || node.sizing?.width === 'fixed' || node.sizing?.height === 'fixed';
  if (node.sizing?.width === 'fill' || node.sizing?.height === 'fill'
      || node.sizing?.minW || node.sizing?.maxW || needsSize) {
    out.sizing = {};
    if (node.sizing.width === 'fill') out.sizing.width = 'fill';
    if (node.sizing.height === 'fill') out.sizing.height = 'fill';
    if (node.sizing.minW) out.sizing.minW = node.sizing.minW;
    if (node.sizing.maxW) out.sizing.maxW = node.sizing.maxW;
    if (needsSize) { out.sizing.w = node.sizing.w; out.sizing.h = node.sizing.h; }
  }
  if (node.fills?.length) out.fills = node.fills;
  if (node.strokes?.length) out.strokes = node.strokes;
  if (node.sw) out.sw = node.sw;
  if (node.radii?.some((r) => r !== 0)) out.radii = node.radii;
  if (node.effects?.length) out.effects = node.effects;
  if (node.opacity !== 1) out.opacity = node.opacity;
  if (node.text) out.text = node.text;
  if (node.svg) out.svg = node.svg;
  if (node.children?.length) out.children = node.children.map(compact);
  return out;
}

const wirePlan = {
  ...plan,
  sets: plan.sets.map((s) => ({
    ...s,
    variants: s.variants.map((v) => ({ ...v, node: compact(v.node) })),
  })),
};

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
const BUDGET = Number(arg('budget', '25000'));
const chunks = [];
for (const set of wirePlan.sets) {
  let current = [];
  let size = 0;
  for (const variant of set.variants) {
    const cost = JSON.stringify(variant).length;
    if (current.length && size + cost > BUDGET - walker.length) {
      chunks.push({ set, variants: current });
      current = []; size = 0;
    }
    current.push(variant); size += cost;
  }
  if (current.length) chunks.push({ set, variants: current });
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
const LEAN_PREFIX = (page) => `const _p=figma.root.children.find(p=>p.name===${JSON.stringify(page)});await figma.setCurrentPageAsync(_p);
const _s=figma.root.getSharedPluginData('brandingos','walker');
const runPlan=new Function('return ('+_s.replace('async function runPlan','async function')+')')();
`;

const chunkFiles = chunks.map((chunk, i) => {
  const p = {
    planVersion: wirePlan.planVersion,
    gen: wirePlan.gen,
    phase: 'build',
    // Variables are created by the FIRST chunk only; later chunks find them.
    collections: i === 0 ? wirePlan.collections : [],
    sets: [{ ...chunk.set, variants: chunk.variants }],
  };
  const src = LEAN_PREFIX(PAGE) + 'return await runPlan(' + JSON.stringify(p) + ');';
  const file = path.join(OUT, `${name}.build${i + 1}.js`);
  fs.writeFileSync(file, src);
  return { file, bytes: src.length, variants: chunk.variants.length, fits: src.length < 50_000 };
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
