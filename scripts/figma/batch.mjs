/**
 * Extract + build a batch of components in both themes.
 *
 *   node scripts/figma/batch.mjs --port 8083 --page "03 — Components" \
 *     --components DsInput,DsTextArea,DsSelect
 *
 * Reports one line per component so a failure names itself rather than
 * disappearing into a loop.
 */
import { execFileSync } from 'node:child_process';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const PORT = arg('port', '8083');
const PAGE = arg('page', '03 — Components');
const BUDGET = arg('budget', '22000');
const COMPONENTS = arg('components', '').split(',').filter(Boolean);

const run = (file, args) => execFileSync('node', [file, ...args], {
  encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
});

const summary = [];
for (const component of COMPONENTS) {
  const row = { component };
  try {
    for (const theme of ['light', 'dark']) {
      const out = run('scripts/figma/extract/extract.mjs',
        ['--port', PORT, '--theme', theme, '--component', component]);
      const parsed = JSON.parse(out.slice(out.indexOf('{')));
      row[theme] = { cells: parsed.cells, missed: parsed.pseudoStates.missed.length };
      if (parsed.pseudoStates.missed.length) row.warning = 'pseudo-target matched nothing';
    }
    const built = run('scripts/figma/build-plan.mjs',
      ['--component', component, '--page', PAGE, '--budget', BUDGET]);
    const plan = JSON.parse(built.slice(built.indexOf('{')));
    row.variants = plan.variantCount;
    row.visuallyIdentical = plan.visuallyIdenticalVariants;
    row.chunks = plan.chunks.map((c) => c.bytes);
    row.allFit = plan.chunks.every((c) => c.fits);
    row.unmapped = plan.unmappedThemeValues;
  } catch (e) {
    row.error = String(e.stderr || e.message).slice(0, 300);
  }
  summary.push(row);
  console.log(JSON.stringify(row));
}

const failed = summary.filter((r) => r.error || r.warning);
console.log('\n' + JSON.stringify({
  ok: summary.length - failed.length,
  failed: failed.map((r) => ({ component: r.component, error: r.error, warning: r.warning })),
}, null, 2));
if (failed.length) process.exitCode = 1;
