/**
 * The literal scan — "nothing a customer reads is a literal."
 *
 * `.audit/CODE.md` §7 found 31 renderer files painting somebody else's
 * content: "Jane Smith" 140 times, a $8,300 invoice total, "brand.com",
 * lorem, and eleven files hardcoding a typeface. None of it is reachable
 * by an edit, so the customer's own name never appears — the design ships
 * with the placeholder in it.
 *
 * This module is the SCANNER, kept separate from the test so a family
 * agent can run it directly while cleaning a renderer:
 *
 *     npx vitest run --project unit src/features/brand-kit/renderers/__guards__
 *
 * It reads SOURCE, not rendered output, on purpose. A rendered sweep can
 * only see the variants it managed to mount with the content it happened
 * to pass; a source scan sees every branch of every design, including the
 * ones no test reaches.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Repo root.
 *
 * `process.cwd()` and not `import.meta.url`: Vitest transforms this module
 * through Vite, so `import.meta.url` is an http URL and `fileURLToPath`
 * throws "The URL must be of scheme file". The Vitest root IS the repo root.
 */
const ROOT = process.cwd();

/** Every directory whose files are renderer ARTWORK. */
export const RENDERER_DIRS = [
  'src/features/brand-kit/renderers',
  'src/features/brandkit/components/renderers',
] as const;

/**
 * Strings no deliverable may contain.
 *
 * Each one is a real string found in the audit, not a category. A literal
 * ban list is deliberately blunt: it cannot be argued with, and a family
 * agent who removes the placeholder removes the failure.
 */
export const BANNED_STRINGS = [
  'Jane Smith',
  'Vice President',
  'Acme',
  'lorem',
  'Lorem',
  '+1 234',
  'brand.com',
  '$8,300',
  '$9,000',
  'jane@',
  'Sarah Chen',
  'Cedar Bar',
  'seed round',
  'a brand · ',
  'Est. 20',
  'NOW HIRING',
  'Playfair',
] as const;

/**
 * A hardcoded `fontFamily:` — matched only when the value is a LITERAL.
 *
 * `fontFamily: stack` is the correct call: the family came from
 * `brandStyle.fontStack`. `fontFamily: 'Caveat, cursive'` is another
 * brand's typeface, welded into ours.
 */

/**
 * Comments are not artwork. A renderer's doc comment that says "this used
 * to print Jane Smith" is the record of the fix, not a regression — so the
 * scan reads the code with block and line comments removed.
 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

const HARDCODED_FONT_FAMILY = /fontFamily:\s*['"`]/g;

/**
 * Tailwind's generic type classes. Same failure in class form: they pick a
 * family from the Tailwind config, which is not the customer's brand.
 */
const TAILWIND_GENERIC_FONT = /\bfont-(serif|mono)\b/g;

export type LiteralHit = { pattern: string; count: number };
export type FileScan = { file: string; total: number; hits: LiteralHit[] };

function countOccurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

function countMatches(source: string, re: RegExp): number {
  return (source.match(re) ?? []).length;
}

/**
 * Modules that live in a renderer folder but are not ARTWORK.
 *
 * `brandStyle.ts` is the styling authority: it names typeface families
 * ("Playfair", "Georgia") as CLASSIFICATION hints for the fallback ladder,
 * which is the opposite of welding one into a design. Scanning it would
 * make the guard fail on the module whose whole purpose is to end the
 * failure. `contentBinding.ts` is a lookup table with no output at all.
 *
 * Nothing else belongs here. A renderer is never exempt.
 */
const NON_ARTWORK = new Set(['brandStyle.ts', 'contentBinding.ts']);

/** Every renderer source file, repo-relative, in a stable order. */
export function rendererFiles(): string[] {
  const files: string[] = [];
  for (const dir of RENDERER_DIRS) {
    for (const name of readdirSync(join(ROOT, dir))) {
      if (!/\.tsx?$/.test(name)) continue;
      // A guard's own source names the strings it bans.
      if (/\.(test|spec)\.tsx?$/.test(name)) continue;
      if (NON_ARTWORK.has(name)) continue;
      files.push(relative(ROOT, join(ROOT, dir, name)));
    }
  }
  return files.sort();
}

/** Scan one file. `total` is 0 for a clean one. */
export function scanFile(file: string): FileScan {
  const source = stripComments(readFileSync(join(ROOT, file), 'utf8'));
  const hits: LiteralHit[] = [];
  for (const banned of BANNED_STRINGS) {
    const count = countOccurrences(source, banned);
    if (count > 0) hits.push({ pattern: banned, count });
  }
  const fontFamily = countMatches(source, HARDCODED_FONT_FAMILY);
  if (fontFamily > 0) hits.push({ pattern: 'fontFamily: <literal>', count: fontFamily });
  const tailwind = countMatches(source, TAILWIND_GENERIC_FONT);
  if (tailwind > 0) hits.push({ pattern: 'font-serif / font-mono', count: tailwind });
  return { file, total: hits.reduce((n, h) => n + h.count, 0), hits };
}

/** Scan every renderer. */
export function scanRenderers(): FileScan[] {
  return rendererFiles().map(scanFile);
}

/** The failure message: a per-file count table, worst first. */
export function formatScanTable(scans: FileScan[]): string {
  const dirty = scans.filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
  if (dirty.length === 0) return '(none)';
  const width = Math.max(...dirty.map((s) => s.file.length));
  return dirty
    .map(
      (s) =>
        `  ${s.file.padEnd(width)}  ${String(s.total).padStart(4)}   ` +
        s.hits.map((h) => `${h.pattern}×${h.count}`).join(', '),
    )
    .join('\n');
}

/**
 * The renderers that were ALREADY dirty when this guard landed.
 *
 * 33 files, 861 hits, measured 2026-08-29. They are reported, never failed:
 * every family in W1 owns a different subset, and a guard that fails on work
 * nobody has started yet is a guard the next agent disables.
 *
 * **THIS LIST MUST ONLY EVER SHRINK.** Adding a file to it is choosing to
 * ship a placeholder. When a family lands, delete its files from here — the
 * `never lets a clean renderer go dirty` test then holds them clean for good.
 * When the list reaches zero, delete it and the allowlist branch with it.
 */
export const KNOWN_DIRTY_FILES: ReadonlySet<string> = new Set([
  'src/features/brand-kit/renderers/BrandGuidesExtended.tsx',
  'src/features/brandkit/components/renderers/BrandGuideRenderer.tsx',
]);
