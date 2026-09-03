/**
 * Merge several component plans into as few use_figma calls as possible.
 *
 * Every byte travels through the agent's context (the Figma environment has no
 * fetch), so call count and payload both matter. This packs whole component sets
 * into scripts under the 50,000-character cap, keeping each set intact so it can
 * still be built and combined in one pass.
 *
 *   node scripts/figma/merge-plans.mjs --page "03 — Components" \
 *     --components DsInput,DsTextArea,DsSelect --budget 30000
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const PAGE = arg('page', '03 — Components');
const OUT = arg('out', 'scripts/figma/.plans');
const NAME = arg('name', 'merged');
const BUDGET = Number(arg('budget', '30000'));
const COMPONENTS = arg('components', '').split(',').filter(Boolean);

const PREFIX = `const _p=figma.root.children.find(p=>p.name===${JSON.stringify(PAGE)});await figma.setCurrentPageAsync(_p);
const _s=figma.root.getSharedPluginData('brandingos','walker');
const runPlan=new Function('return ('+_s.replace('async function runPlan','async function')+')')();
`;

/** Read each component's compacted wire plan back out of its emitted chunk. */
function wireSetsFor(component) {
  const files = fs.readdirSync(OUT).filter((f) => f.indexOf(component + '.build') === 0);
  const sets = new Map();
  for (const f of files.sort()) {
    const src = fs.readFileSync(path.join(OUT, f), 'utf8');
    const json = src.slice(src.indexOf('return await runPlan(') + 'return await runPlan('.length, src.lastIndexOf(');'));
    const plan = JSON.parse(json);
    for (const set of plan.sets) {
      const existing = sets.get(set.sid);
      if (existing) existing.variants.push(...set.variants);
      else sets.set(set.sid, JSON.parse(JSON.stringify(set)));
    }
  }
  return [...sets.values()];
}

const all = [];
for (const c of COMPONENTS) all.push(...wireSetsFor(c));

const scripts = [];
let current = [];
let size = PREFIX.length + 120;
for (const set of all) {
  const cost = JSON.stringify(set).length;
  if (current.length && size + cost > BUDGET) {
    scripts.push(current); current = []; size = PREFIX.length + 120;
  }
  current.push(set); size += cost;
}
if (current.length) scripts.push(current);

const emitted = scripts.map((sets, i) => {
  // No collections here: the variables already exist in the document, and the
  // walker falls back to looking up every local colour variable by name.
  const plan = { planVersion: 1, gen: new Date().toISOString(), collections: [], sets };
  const src = PREFIX + 'return await runPlan(' + JSON.stringify(plan) + ');';
  const file = path.join(OUT, `${NAME}${i + 1}.js`);
  fs.writeFileSync(file, src);
  return {
    file, bytes: src.length, fits: src.length < 50_000,
    sets: sets.map((s) => `${s.name}(${s.variants.length})`),
  };
});

console.log(JSON.stringify({ components: COMPONENTS.length, sets: all.length, scripts: emitted }, null, 2));
