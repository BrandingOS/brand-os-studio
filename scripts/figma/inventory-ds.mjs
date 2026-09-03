/**
 * Cycle 1 — product truth inventory for the design system.
 *
 * Reports, per exported component: the CSS classes it actually emits, the prop
 * union declared on its OWN interface, and the pseudo-class / attribute states
 * its CSS genuinely defines.
 *
 * Everything is DERIVED from source. Nothing is hand-listed — an earlier draft
 * hand-mapped component -> CSS class and got four of them wrong (ds-field for
 * ds-input, ds-drop for ds-dropzone, ds-check for ds-checkbox, ds-logo for
 * ds-logo-tile), silently under-reporting states. A hand-maintained map is a
 * second source of truth; this reads the className literals the component emits.
 *
 *   node scripts/figma/inventory-ds.mjs            # human-readable
 *   node scripts/figma/inventory-ds.mjs --json     # machine-readable
 */
import fs from 'node:fs';
import path from 'node:path';

const DS = path.resolve('src/shared/ds');
const css = fs.readFileSync(path.join(DS, 'components.css'), 'utf8');
const files = fs.readdirSync(DS).filter(f => f.endsWith('.tsx') && !f.includes('.test.')).sort();

/** Every class root the stylesheet defines, longest first so the most specific wins. */
const CSS_CLASSES = [...new Set(
  [...css.matchAll(/\.(ds-[a-z0-9-]+)/g)].map(m => m[1])
)].sort((a, b) => b.length - a.length);

/**
 * Slice a component's source: from its declaration to the next top-level
 * `export` at column 0. Props and classNames are then attributed to the right
 * component instead of bleeding across everything in the file.
 */
function sliceFor(src, name) {
  const decl = new RegExp(`export\\s+(?:const|function)\\s+${name}\\b`);
  const start = src.search(decl);
  if (start === -1) return null;
  const rest = src.slice(start + 1);
  const next = rest.search(/\nexport\s+(?:const|function|interface|type)\s/);
  return next === -1 ? src.slice(start) : src.slice(start, start + 1 + next);
}

/** The interface literally named <Component>Props. */
function propsFor(src, name) {
  const re = new RegExp(`interface\\s+${name}Props[^{]*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = src.match(re);
  if (!m) return null;
  const props = {};
  for (const line of m[1].split('\n')) {
    const p = line.match(/^\s{2}(?:\/\*\*.*)?([a-zA-Z]+)\??:\s*(.+?);?\s*$/);
    if (!p) continue;
    const [, prop, type] = p;
    const literals = [...type.matchAll(/'([^']+)'/g)].map(x => x[1]);
    if (literals.length >= 2) props[prop] = literals;
    else if (/^boolean$/.test(type.trim())) props[prop] = ['false', 'true'];
  }
  return Object.keys(props).length ? props : null;
}

/** CSS classes this component's own JSX emits, matched against real stylesheet classes. */
function classesFor(slice) {
  if (!slice) return [];
  const emitted = new Set();
  for (const m of slice.matchAll(/['"`](ds-[a-z0-9-]+)/g)) emitted.add(m[1]);
  for (const m of slice.matchAll(/`(ds-[a-z0-9-]+)--\$\{/g)) emitted.add(m[1]);
  return [...emitted].filter(c => CSS_CLASSES.includes(c)).sort();
}

/** States defined on those exact classes (and their BEM children/modifiers). */
function statesFor(classes) {
  const states = new Set();
  for (const c of classes) {
    const esc = c.replace(/-/g, '\\-');
    for (const m of css.matchAll(new RegExp(`\\.${esc}[a-z0-9\\-]*(?:--[a-z0-9\\-]+)?:([a-z\\-]+)`, 'g'))) {
      if (!['root', 'is', 'where', 'not'].includes(m[1])) states.add(':' + m[1]);
    }
    for (const m of css.matchAll(new RegExp(`\\.${esc}[a-z0-9\\-]*\\[((?:data|aria)-[a-z\\-]+)`, 'g'))) {
      states.add('[' + m[1] + ']');
    }
    // modifier classes are states too: .ds-btn--disabled, .ds-checkbox--checked
    for (const m of css.matchAll(new RegExp(`\\.${esc}--([a-z0-9\\-]+)`, 'g'))) {
      states.add('.--' + m[1]);
    }
  }
  return [...states].sort();
}

const report = [];
for (const file of files) {
  const src = fs.readFileSync(path.join(DS, file), 'utf8');
  for (const m of src.matchAll(/export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/g)) {
    const name = m[1];
    if (name === name.toUpperCase()) continue;           // RING_CENTRES etc. are constants
    const slice = sliceFor(src, name);
    if (slice && !/</.test(slice)) continue;             // no JSX -> not a component
    const classes = classesFor(slice);
    report.push({
      component: name,
      file: `src/shared/ds/${file}`,
      classes,
      props: propsFor(src, name),
      states: statesFor(classes),
    });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`${report.length} exported components across ${files.length} files\n`);
  for (const r of report) {
    console.log(`■ ${r.component}`);
    console.log(`    classes : ${r.classes.join(', ') || '— (no own class; composed or svg-only)'}`);
    console.log(`    props   : ${r.props ? Object.entries(r.props).map(([k, v]) => `${k}=${v.join('|')}`).join('  ') : '—'}`);
    console.log(`    states  : ${r.states.join(' ') || '—'}`);
  }
  const withStates = report.filter(r => r.states.length).length;
  const withProps = report.filter(r => r.props).length;
  console.log(`\n${withStates}/${report.length} have CSS-defined states · ${withProps}/${report.length} declare prop unions`);
}
