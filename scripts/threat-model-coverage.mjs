#!/usr/bin/env node
// Every attack id in docs/access-architecture/07 §2 must be named by a test, and every
// id a test names must be in the threat model. A guard that silently stops firing is worse
// than none, so this fails loudly in both directions.
//
//   node scripts/threat-model-coverage.mjs
//
// Ids the later plans own are listed in supabase/tests/threat-coverage.allow, one per line,
// with the reason after a '#'. That file is the to-do list, and it must shrink.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const model = readFileSync(join(root, 'docs/access-architecture/07-security-threat-model.md'), 'utf8');

const declared = [...model.matchAll(/^\|\s*(A\d+)\s*\|/gm)].map((m) => m[1]);
if (declared.length === 0) {
  console.error('threat model: no attack ids found — has the table changed shape?');
  process.exit(2);
}

const allowFile = join(root, 'supabase/tests/threat-coverage.allow');
const allowed = new Set(
  existsSync(allowFile)
    ? readFileSync(allowFile, 'utf8').split('\n').map((l) => l.split('#')[0].trim()).filter(Boolean)
    : [],
);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(sql|ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}
const haystack = [
  ...walk(join(root, 'supabase/tests')),
  ...walk(join(root, 'supabase/functions')).filter((f) => f.includes('test')),
].map((f) => readFileSync(f, 'utf8')).join('\n');

// A test CLAIMS an id by naming it on a COMMENT or pass-notice line (`-- A13`,
// `// A29, A31`, `✓ A13 …`). Scanning whole lines rather than one id per marker means a
// comment covering two ids is honest about both. A bare word match would collide with
// fixture names like brand "A2".
const covered = new Set();
for (const line of haystack.split('\n')) {
  if (!/(--|\/\/|✓)/.test(line)) continue;
  for (const m of line.matchAll(/\bA\d+\b/g)) covered.add(m[0]);
}

const missing = declared.filter((id) => !covered.has(id) && !allowed.has(id));
const staleAllow = [...allowed].filter((id) => covered.has(id));

for (const id of staleAllow) console.log(`· ${id} is covered now — remove it from threat-coverage.allow`);
if (missing.length) {
  console.error(`\nuncovered attack ids: ${missing.join(', ')}`);
  console.error('add a test naming the id, or list it in supabase/tests/threat-coverage.allow with a reason');
  process.exit(1);
}
console.log(`threat model: ${declared.length} ids, ${declared.length - allowed.size} covered, ${allowed.size} deferred`);
