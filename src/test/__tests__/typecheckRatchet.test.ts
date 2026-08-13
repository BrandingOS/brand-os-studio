/**
 * The typecheck ratchet's path normalizer.
 *
 * A baseline that leaks an absolute path is valid on exactly one machine and
 * reports phantom regressions everywhere else. That already happened once: CI
 * reported three "new" errors that were really the committed baseline carrying
 * a contributor's home directory. The normalizer is the fix, so the shapes it
 * has to collapse are pinned here rather than left to a future reader's memory.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('scripts/typecheck-ratchet.mjs', 'utf8');
const body = source.slice(
  source.indexOf('function stripAbsolutePaths'),
  source.indexOf('function signatures'),
);
const { stripAbsolutePaths, absolutePathLeaks } = new Function(
  'ROOT',
  `${body}; return { stripAbsolutePaths, absolutePathLeaks };`,
)('/workspace/repo') as {
  stripAbsolutePaths: (s: string) => string;
  absolutePathLeaks: (s: string) => boolean;
};

describe('every absolute form of the same path normalizes identically', () => {
  const expected = '"node_modules/pkg/index"';

  it.each([
    ['this checkout', '"/workspace/repo/node_modules/pkg/index"'],
    ['another checkout', '"/other/place/node_modules/pkg/index"'],
    ['windows backslashes', String.raw`"C:\ws\node_modules\pkg\index"`],
    ['windows forward slashes', '"C:/ws/node_modules/pkg/index"'],
    ['file URI', '"file:///ws/node_modules/pkg/index"'],
  ])('%s', (_label, input) => {
    expect(stripAbsolutePaths(input)).toBe(expected);
  });

  it('keeps the leftmost meaningful segment, so the package stays visible', () => {
    expect(stripAbsolutePaths('"/x/node_modules/fabric/dist/src/util/index"')).toBe(
      '"node_modules/fabric/dist/src/util/index"',
    );
  });

  it('strips a bare repo-root path with no node_modules/src segment', () => {
    expect(stripAbsolutePaths('"/workspace/repo/vite.config.ts"')).toBe('"vite.config.ts"');
  });

  it('leaves ordinary message prose alone', () => {
    const prose = "Property 'length' does not exist on type 'never'.";
    expect(stripAbsolutePaths(prose)).toBe(prose);
  });
});

describe('the leak detector refuses what it cannot normalize', () => {
  it('flags an absolute path that reaches no known segment', () => {
    // Nothing safe to collapse to, so `--update` must refuse to write it and
    // ask a human to extend the normalizer — not silently commit it.
    expect(absolutePathLeaks('Type refers to "/workspace/cache/generated.d.ts"')).toBe(true);
  });

  it.each([
    ['home directory', "'/Users/someone/proj/x.ts'"],
    ['windows drive', String.raw`'C:\Users\someone\x.ts'`],
    ['file URI', "'file:///home/someone/x.ts'"],
  ])('flags a leaked %s', (_label, input) => {
    expect(absolutePathLeaks(input)).toBe(true);
  });

  it('passes a fully normalized signature', () => {
    expect(absolutePathLeaks('src/a.ts | TS2339 | Property x does not exist')).toBe(false);
  });
});
