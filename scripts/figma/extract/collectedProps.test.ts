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
  const driver = fs.readFileSync(
    path.resolve('scripts/figma/extract/extract-patterns.mjs'), 'utf8',
  );

  it('is the only place the property list is written', () => {
    // A second array literal starting with 'display' in the driver is the copy
    // that outranked this file once already.
    expect(driver).not.toMatch(/const PROPS = \[\s*'display'/);
    expect(driver).toContain("rawSrc.indexOf('export const COLLECTED_PROPS = [')");
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
