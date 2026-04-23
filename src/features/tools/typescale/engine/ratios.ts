import type { Ratio, RatioName } from '@/shared/types/typescale';

export const RATIOS: Record<Exclude<RatioName, 'custom'>, number> = {
  'minor-second':     1.067,
  'major-second':     1.125,
  'minor-third':      1.2,
  'major-third':      1.25,
  'perfect-fourth':   1.333,
  'augmented-fourth': 1.414,
  'perfect-fifth':    1.5,
  'golden':           1.618,
};

export function resolveRatio(r: Ratio): number {
  if (r.name === 'custom') return r.value;
  return RATIOS[r.name];
}
