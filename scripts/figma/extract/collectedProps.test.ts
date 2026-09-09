import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COLLECTED_PROPS } from './raw';

/**
 * The driver reads this list out of `raw.ts` by slicing its source, because it
 * has no build step. That parse is load-bearing and invisible: for one round the
 * driver carried its OWN copy of the list, so adding `margin-left` to the typed
 * one changed nothing, the neutral ramp went on laying out 5,056px wide, and
 * there was no error anywhere to say why.
 */
describe('COLLECTED_PROPS is one list', () => {
  // BOTH drivers. The first version of this test checked only the pattern
  // driver, so the component driver kept its own copy for another five days —
  // which is how `margin-left` reached one pipeline and not the other. A guard
  // that covers one of two call sites is a guard that reports success while the
  // bug it was written for is still live.
  const drivers = ['extract-patterns.mjs', 'extract.mjs'].map((f) => ({
    file: f,
    src: fs.readFileSync(path.resolve('scripts/figma/extract', f), 'utf8'),
  }));

  it.each(drivers.map((d) => d.file))('%s writes no second property list', (file) => {
    const { src } = drivers.find((d) => d.file === file)!;
    expect(src).not.toMatch(/const PROPS = \[\s*'display'/);
    expect(src).toContain("rawSrc.indexOf('export const COLLECTED_PROPS = [')");
  });

  it('parses out of raw.ts the way the driver parses it', () => {
    const src = fs.readFileSync(path.resolve('scripts/figma/extract/raw.ts'), 'utf8');
    const body = src.slice(src.indexOf('export const COLLECTED_PROPS = ['));
    // eslint-disable-next-line no-eval
    const parsed = eval(body.slice(body.indexOf('['), body.indexOf('] as const;') + 1));
    expect(parsed).toEqual([...COLLECTED_PROPS]);
  });

  it('carries the properties whose absence has cost a rebuild', () => {
    // Each of these is here because something shipped wrong without it.
    expect(COLLECTED_PROPS).toContain('margin-left');   // overlapping swatch ramp
    expect(COLLECTED_PROPS).toContain('order');         // Website painted 6th
    expect(COLLECTED_PROPS).toContain('text-transform'); // eyebrows lost their case
    expect(COLLECTED_PROPS).toContain('flex-wrap');     // the board collapsed to a column
  });
});
