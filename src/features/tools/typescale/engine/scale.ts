import type { LeadingCurve, ScaleStep, TrackingCurve } from '@/shared/types/typescale';
import { leadingFor } from './leading';
import { trackingFor } from './tracking';

export interface BuildLadderInput {
  basePx: number;
  ratio: number;
  stepsUp: number;
  stepsDown: number;
  leading: LeadingCurve;
  tracking: TrackingCurve;
}

export function buildLadder(input: BuildLadderInput): ScaleStep[] {
  const { basePx, ratio, stepsUp, stepsDown, leading, tracking } = input;
  const out: ScaleStep[] = [];
  for (let i = -stepsDown; i <= stepsUp; i++) {
    const sizePx = round2(basePx * Math.pow(ratio, i));
    out.push({
      id: `t${i}`,
      index: i,
      sizePx,
      lineHeight: round3(leadingFor(sizePx, leading)),
      letterSpacingEm: round4(trackingFor(sizePx, tracking)),
      weight: i >= 3 ? 700 : i >= 1 ? 600 : 400,
    });
  }
  return out;
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
