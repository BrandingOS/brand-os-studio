/**
 * Cycle 1 — coverage matrices, generated from shipping source.
 *
 * Writes docs/code-to-figma/COVERAGE-components.md and COVERAGE-states.md.
 *
 * The gate for Cycle 1 is that every planned component and state points at
 * shipping-code evidence, and that no state is invented to fill a matrix. That
 * is only credible if the matrix is DERIVED, so this reads:
 *   - className literals each component emits           -> its CSS classes
 *   - the interface named <Component>Props              -> its prop unions
 *   - pseudo-classes and modifier classes on those      -> its real states
 *   - @media widths across app CSS                      -> real breakpoints
 *   - aria-* attributes in the target features          -> a11y states
 *
 *   node scripts/figma/coverage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DS = path.join(ROOT, 'src/shared/ds');
const OUT = path.join(ROOT, 'docs/code-to-figma');
const css = fs.readFileSync(path.join(DS, 'components.css'), 'utf8');

const CSS_CLASSES = [...new Set([...css.matchAll(/\.(ds-[a-z0-9-]+)/g)].map(m => m[1]))];

const sliceFor = (src, name) => {
  const start = src.search(new RegExp(`export\\s+(?:const|function)\\s+${name}\\b`));
  if (start === -1) return null;
  const rest = src.slice(start + 1);
  const next = rest.search(/\nexport\s+(?:const|function|interface|type)\s/);
  return next === -1 ? src.slice(start) : src.slice(start, start + 1 + next);
};

const propsFor = (src, name) => {
  const m = src.match(new RegExp(`interface\\s+${name}Props[^{]*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  if (!m) return null;
  const props = {};
  for (const line of m[1].split('\n')) {
    const p = line.match(/^\s{2}(?:\/\*\*.*)?([a-zA-Z]+)\??:\s*(.+?);?\s*$/);
    if (!p) continue;
    const lits = [...p[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
    if (lits.length >= 2) props[p[1]] = lits;
    else if (/^boolean$/.test(p[2].trim())) props[p[1]] = ['false', 'true'];
  }
  return Object.keys(props).length ? props : null;
};

const classesFor = (slice) => {
  if (!slice) return [];
  const out = new Set();
  for (const m of slice.matchAll(/['"`](ds-[a-z0-9-]+)/g)) out.add(m[1]);
  for (const m of slice.matchAll(/`(ds-[a-z0-9-]+)--\$\{/g)) out.add(m[1]);
  return [...out].filter(c => CSS_CLASSES.includes(c)).sort();
};

const statesFor = (classes) => {
  const s = new Set();
  for (const c of classes) {
    const e = c.replace(/-/g, '\\-');
    for (const m of css.matchAll(new RegExp(`\\.${e}[a-z0-9\\-]*(?:--[a-z0-9\\-]+)?:([a-z\\-]+)`, 'g')))
      if (!['root', 'is', 'where', 'not'].includes(m[1])) s.add(':' + m[1]);
    for (const m of css.matchAll(new RegExp(`\\.${e}[a-z0-9\\-]*\\[((?:data|aria)-[a-z\\-]+)`, 'g')))
      s.add('[' + m[1] + ']');
    for (const m of css.matchAll(new RegExp(`\\.${e}--([a-z0-9\\-]+)`, 'g'))) s.add('--' + m[1]);
  }
  return [...s].sort();
};

// ---- components -----------------------------------------------------------
const files = fs.readdirSync(DS).filter(f => f.endsWith('.tsx') && !f.includes('.test.')).sort();
const components = [];
for (const file of files) {
  const src = fs.readFileSync(path.join(DS, file), 'utf8');
  for (const m of src.matchAll(/export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/g)) {
    const name = m[1];
    if (name === name.toUpperCase()) continue;
    const slice = sliceFor(src, name);
    if (slice && !/</.test(slice)) continue;
    const classes = classesFor(slice);
    components.push({ name, file, classes, props: propsFor(src, name), states: statesFor(classes) });
  }
}

// ---- breakpoints ----------------------------------------------------------
function walk(dir, ext, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, acc);
    else if (e.name.endsWith(ext)) acc.push(p);
  }
  return acc;
}
const breakpoints = {};
for (const f of walk(path.join(ROOT, 'src'), '.css')) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/@media \(m(in|ax)-width: (\d+)px\)/g)) {
    const key = `${m[1]}-${m[2]}`;
    breakpoints[key] = (breakpoints[key] ?? 0) + 1;
  }
}

// ---- aria across target features ------------------------------------------
const TARGETS = ['src/features/brand-kit', 'src/features/brand-setup', 'src/shared/layouts', 'src/shared/ds'];
const aria = {};
for (const t of TARGETS) {
  const dir = path.join(ROOT, t);
  if (!fs.existsSync(dir)) continue;
  for (const f of [...walk(dir, '.tsx'), ...walk(dir, '.ts')]) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\b(aria-[a-z]+)=/g)) {
      aria[m[1]] = (aria[m[1]] ?? 0) + 1;
    }
  }
}

// ---- emit -----------------------------------------------------------------
const stamp = new Date().toISOString().slice(0, 10);
const withStates = components.filter(c => c.states.length);
const icons = components.filter(c => !c.classes.length && /Icon$/.test(c.name));

let md = `# Coverage — components

**Generated** by \`node scripts/figma/coverage.mjs\` on ${stamp}. Do not hand-edit.

Every row is derived from shipping source: CSS classes from the \`className\`
literals the component emits, props from the interface named \`<Component>Props\`,
states from pseudo-classes and modifier classes defined on those exact classes.
Nothing here is typed by hand, so the matrix cannot drift from the code.

**${components.length}** exported components · **${withStates.length}** with CSS-defined states · **${icons.length}** icons.

| Component | File | Props (declared axes) | States (CSS evidence) | Figma model | Cycle |
|---|---|---|---|---|---|
`;
for (const c of components) {
  const props = c.props ? Object.entries(c.props).map(([k, v]) => `\`${k}\`=${v.join('\\|')}`).join('<br>') : '—';
  const states = c.states.length ? c.states.map(s => `\`${s}\``).join(' ') : '—';
  const model = !c.classes.length && /Icon$/.test(c.name) ? 'icon component'
    : c.props || c.states.length ? 'component set' : 'single component';
  md += `| \`${c.name}\` | ${c.file} | ${props} | ${states} | ${model} | 4 |\n`;
}

md += `
## How to read "States"

- \`:hover\`, \`:focus-visible\`, \`:active\`, \`:disabled\` — real pseudo-class rules.
  These are captured by forcing the state through CDP (spike 1) and measuring the
  **settled** value with transitions disabled.
- \`--modifier\` — a modifier class the component applies itself
  (\`.ds-btn--primary\`, \`.ds-input--error\`). These map to variant properties.
- \`[data-*]\` / \`[aria-*]\` — attribute-driven states.

A component showing \`—\` has no state rules **in the stylesheet**. That is
evidence of absence, not a gap to be filled: per the Cycle 1 gate, a state is
never invented to populate a matrix.

## Deliberately excluded

\`BrandMark\` renders in \`idle\` mode only. \`loading\` is a live animation with no
honest static representation, and a mark permanently wearing the loader would say
the product is permanently busy. Recorded in LOSSES.md, not represented.
`;
fs.writeFileSync(path.join(OUT, 'COVERAGE-components.md'), md);

const bpRows = Object.entries(breakpoints).sort((a, b) => b[1] - a[1])
  .map(([k, n]) => { const [dir, px] = k.split('-'); return `| ${dir}-width: ${px}px | ${n} |`; }).join('\n');
const ariaRows = Object.entries(aria).sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `| \`${k}\` | ${n} |`).join('\n');

fs.writeFileSync(path.join(OUT, 'COVERAGE-states.md'), `# Coverage — states, breakpoints and ARIA

**Generated** by \`node scripts/figma/coverage.mjs\` on ${stamp}. Do not hand-edit.

## Real breakpoints

Hand-written CSS media queries across \`src/**/*.css\`. The Tailwind config
overrides only the container's \`2xl\` (1400px), so these — not Tailwind's
defaults — are what the product actually responds to.

| Query | Occurrences |
|---|---|
${bpRows}

**Capture viewports.** 1440 (above every breakpoint — full desktop) and 390
(below 480, so it crosses every mobile rule). Cycle 10 additionally re-runs at
the structural boundaries that carry the most rules — 1100, 900 and 720 — because
those are where layouts actually change. Desktop frames are never scaled to
imitate mobile.

## ARIA states in the target surfaces

Counted across \`features/brand-kit\`, \`features/brand-setup\`, \`shared/layouts\`
and \`shared/ds\`.

| Attribute | Occurrences |
|---|---|
${ariaRows}

\`aria-expanded\`, \`aria-pressed\`, \`aria-checked\`, \`aria-selected\` and
\`aria-current\` are **state-bearing** and each must appear as a represented state.
\`aria-label\` and \`aria-hidden\` are not states and are not represented.

## The audited state vocabulary

A state is represented only where shipping code evidences it. Sources are
pseudo-class rules, modifier classes, \`data-*\`/\`aria-*\` attributes, and props
whose values change rendering.

| State | Evidence required | Represented as |
|---|---|---|
| default | always | base variant |
| hover | \`:hover\` rule | variant (CDP-forced capture) |
| active | \`:active\` rule | variant |
| focus-visible | \`:focus-visible\` rule | variant |
| disabled | \`:disabled\` or \`--disabled\` | variant |
| checked / selected | \`aria-checked\`/\`aria-selected\`/\`--checked\` | variant |
| expanded / open | \`aria-expanded\`, \`--open\` | variant or separate frame |
| error | \`--error\`, \`aria-invalid\` | variant |
| loading / saving | prop or explicit class | variant, static |
| empty / populated | branch in the component | separate frames |

Any state not traceable to one of these is **not represented**, and its absence
is recorded rather than filled.
`);

console.log(`wrote COVERAGE-components.md (${components.length} components)`);
console.log(`wrote COVERAGE-states.md (${Object.keys(breakpoints).length} breakpoints, ${Object.keys(aria).length} aria attrs)`);
