#!/usr/bin/env node
/**
 * TypeScript error ratchet.
 *
 * Runs the REAL application type-check (`tsc -p tsconfig.app.json --noEmit`, which
 * covers all of `src/`) and compares its errors against a committed baseline of the
 * KNOWN existing debt. It distinguishes:
 *
 *   EXISTING TYPE DEBT  — errors already present in `.typecheck-baseline.txt`
 *   NEW TYPE REGRESSION — errors NOT in the baseline (or extra occurrences of one)
 *
 * Exit 0 if no new regressions (existing debt is tolerated). Exit 1 and print the
 * offending errors if any regression is introduced. This lets CI block new type
 * errors WITHOUT requiring the ~324-error legacy debt to be fixed first.
 *
 * Signatures ignore line/column numbers so unrelated edits that merely shift lines
 * do not register as regressions.
 *
 * Usage:
 *   node scripts/typecheck-ratchet.mjs            # check (CI): fail on new errors
 *   node scripts/typecheck-ratchet.mjs --update   # regenerate the baseline
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, '.typecheck-baseline.txt');
const UPDATE = process.argv.includes('--update');

function runTsc() {
  try {
    execSync('npx tsc -p tsconfig.app.json --noEmit', { cwd: ROOT, stdio: 'pipe' });
    return ''; // no errors
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

/**
 * Strip machine-specific absolute paths out of an error message.
 *
 * TypeScript inlines absolute paths into some messages, e.g.
 *   Conversion of type 'typeof import("/Users/you/repo/node_modules/lucide-react/…")'
 *
 * Baselining that verbatim makes the file valid on exactly ONE machine: the
 * same error reads `/home/runner/work/…` in CI, does not match, and is
 * reported as a new regression. Three entries (IconSelector, LogoCanvas,
 * fabric-setup) failed CI for precisely this reason while passing locally.
 *
 * Normalizing to a repo-relative path keeps the error's identity — file, code
 * and meaning are unchanged — while making the baseline portable.
 */
/**
 * Remove every machine-specific path form, so a baseline written on one machine
 * matches on every other. A leaked absolute path reports phantom regressions
 * everywhere else — which is exactly how this file's own bug presented in CI.
 *
 * The forms that have to collapse: this checkout's root; a Windows drive path
 * in either slash direction; a `file://` URI; and any other absolute prefix
 * that reaches a `node_modules/` or `src/` segment (a pnpm store, a container
 * mount, a differently-rooted checkout).
 */
function stripAbsolutePaths(text) {
  let out = text;
  // `file:///abs/path` → `/abs/path`, so one rule below handles both.
  out = out.replace(/file:\/\/\//g, '/');
  // Windows separators, but only inside path-shaped runs, so ordinary prose
  // and escape sequences in a message are left alone.
  out = out.replace(/[A-Za-z]:(?:\\|\/)[^"'()\s]*/g, (m) => m.replace(/\\/g, '/'));
  // Collapse to the meaningful segment FIRST, while the path is still intact.
  // A Windows drive prefix reaching node_modules/src…
  out = out.replace(/[A-Za-z]:\/(?:[^"'()\s]*?\/)??(node_modules|src)\//g, '$1/');
  // …and any other absolute path reaching node_modules/src (a pnpm store, a
  // container mount, a differently-rooted checkout).
  // Lazy, so the LEFTMOST meaningful segment wins: a path through
  // `node_modules/fabric/dist/src/util` collapses to `node_modules/…`, keeping
  // the package it came from rather than the bare `src/…` tail.
  out = out.replace(/(^|["'( ])\/(?:[^"'()\s]*?\/)??(node_modules|src)\//g, '$1$2/');
  // Whatever is left that still starts with this checkout's root. Anchored to a
  // segment boundary so a root that happens to be a substring elsewhere in the
  // message is not spliced out of the middle of another path.
  out = out.replace(
    new RegExp(`(^|["'( ])${ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?`, 'g'),
    '$1',
  );
  return out;
}

/**
 * Any absolute path still standing after normalization. Used to refuse writing
 * a machine-specific baseline rather than discovering it in someone else's CI.
 */
function absolutePathLeaks(sig) {
  return (
    /(^|["'( ])\/(?:Users|home|root|tmp|workspace|var|opt|private)\//.test(sig) ||
    /[A-Za-z]:[\\/]/.test(sig) ||
    /file:\/\//.test(sig)
  );
}

/** Normalize each `file(line,col): error TSxxxx: message` to `file | TSxxxx | message`. */
function signatures(output) {
  const re = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
  const sigs = [];
  for (const line of output.split('\n')) {
    const m = re.exec(line.trim());
    // The FILE is repo-relative for an ordinary local run, but not for every
    // invocation (a Windows runner, or tsc started from another directory), so
    // it goes through the same normalizer as the message.
    if (m) sigs.push(`${stripAbsolutePaths(m[1])} | ${m[4]} | ${stripAbsolutePaths(m[5])}`);
  }
  return sigs.sort();
}

function counts(arr) {
  const map = new Map();
  for (const s of arr) map.set(s, (map.get(s) ?? 0) + 1);
  return map;
}

const output = runTsc();
const current = signatures(output);

if (UPDATE) {
  // A baseline containing an absolute path is valid on one machine only and
  // will report phantom regressions everywhere else — the bug this normalizer
  // exists to prevent. Fail loudly rather than committing one again.
  const leaked = current.filter(absolutePathLeaks);
  if (leaked.length) {
    console.error(
      `[typecheck-ratchet] Refusing to write a machine-specific baseline: ${leaked.length} ` +
        'entr(y|ies) still contain an absolute path. Extend stripAbsolutePaths().',
    );
    console.error(leaked.slice(0, 3).map((l) => `  ${l.slice(0, 160)}`).join('\n'));
    process.exit(2);
  }

  writeFileSync(BASELINE, current.join('\n') + (current.length ? '\n' : ''));
  console.log(`[typecheck-ratchet] Baseline updated: ${current.length} known errors written to .typecheck-baseline.txt`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error('[typecheck-ratchet] No .typecheck-baseline.txt found. Run: npm run typecheck:baseline');
  process.exit(2);
}

const baseline = counts(readFileSync(BASELINE, 'utf8').split('\n').filter(Boolean));
const cur = counts(current);

const regressions = [];
for (const [sig, n] of cur) {
  const allowed = baseline.get(sig) ?? 0;
  for (let i = allowed; i < n; i++) regressions.push(sig);
}

const total = current.length;
const baseTotal = [...baseline.values()].reduce((a, b) => a + b, 0);

if (regressions.length > 0) {
  console.error(`\n[typecheck-ratchet] ✗ ${regressions.length} NEW type error(s) introduced (not in baseline):\n`);
  for (const r of regressions) console.error(`  ${r}`);
  console.error(`\n  Baseline debt: ${baseTotal}. Current total: ${total}.`);
  console.error('  Fix the new error(s), or if intentional, run `npm run typecheck:baseline` to re-freeze.');
  process.exit(1);
}

console.log(`[typecheck-ratchet] ✓ No new type errors. Existing debt: ${total}/${baseTotal} baseline (no regressions).`);
if (total < baseTotal) {
  console.log(`[typecheck-ratchet]   ↓ ${baseTotal - total} fewer than baseline — consider re-freezing with npm run typecheck:baseline.`);
}
process.exit(0);
