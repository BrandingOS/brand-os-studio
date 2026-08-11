/**
 * ══════════════════════════════════════════════════════════════════════════
 * NODE-ONLY. Never import this from browser code.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Import specifier → repo-relative file path.
 *
 * This is the link that makes the explorer useful: it turns
 * `lazy(() => import("./pages/b/[slug]/setup"))` into
 * `src/pages/b/[slug]/setup.tsx`. Mirrors the two resolution modes the app
 * actually uses — relative specifiers and the `@/` → `src/` alias from
 * vite.config.ts / tsconfig paths. Bare package specifiers resolve to null,
 * which the caller reports as an external dependency rather than a failure.
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/** Extension/index candidates, in the order a bundler would try them. */
const CANDIDATE_SUFFIXES = [
  '',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '/index.tsx',
  '/index.ts',
  '/index.jsx',
  '/index.js',
];

const toPosix = (value: string) => value.split('\\').join('/');

const isFile = (absolute: string) => {
  try {
    return existsSync(absolute) && statSync(absolute).isFile();
  } catch {
    return false;
  }
};

export interface ResolveResult {
  /** Repo-relative POSIX path, or null when unresolvable / external. */
  file: string | null;
  /** True when the specifier is a bare package name (not first-party). */
  external: boolean;
}

/**
 * @param specifier  As written in the source, e.g. `./pages/x` or `@/shared/ds`.
 * @param fromFile   Repo-relative file the import appears in.
 * @param rootDir    Absolute repo root.
 */
export function resolveSpecifier(
  specifier: string,
  fromFile: string,
  rootDir: string,
): ResolveResult {
  let absoluteBase: string;

  if (specifier.startsWith('@/')) {
    absoluteBase = resolve(rootDir, 'src', specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    absoluteBase = resolve(dirname(resolve(rootDir, fromFile)), specifier);
  } else if (specifier.startsWith('/')) {
    // Vite treats a root-absolute specifier as repo-root relative.
    absoluteBase = join(rootDir, specifier);
  } else {
    return { file: null, external: true };
  }

  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${absoluteBase}${suffix}`;
    if (isFile(candidate)) {
      return { file: toPosix(relative(rootDir, candidate)), external: false };
    }
  }

  return { file: null, external: false };
}
