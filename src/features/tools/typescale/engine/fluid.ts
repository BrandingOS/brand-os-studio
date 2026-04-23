import type { ScaleStep } from '@/shared/types/typescale';

export interface FluidOpts { minVwPx: number; maxVwPx: number; minRatioMultiplier: number; }

export function toFluid(step: ScaleStep, opts: FluidOpts): ScaleStep {
  if (opts.maxVwPx <= opts.minVwPx) return step;
  const minPx = round2(step.sizePx * opts.minRatioMultiplier);
  const maxPx = step.sizePx;
  const slope = (maxPx - minPx) / (opts.maxVwPx - opts.minVwPx);
  const intercept = round3(minPx - slope * opts.minVwPx);
  const vwCoef = round4(slope * 100);
  const clamp = `clamp(${minPx}px, ${intercept}px + ${vwCoef}vw, ${maxPx}px)`;
  return { ...step, fluid: { minPx, maxPx, minVwPx: opts.minVwPx, maxVwPx: opts.maxVwPx, clamp } };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
