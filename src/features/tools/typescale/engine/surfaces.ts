import type {
  ScaleStep, ScaleSurface, SemanticMap, SurfaceKey,
} from '@/shared/types/typescale';

type SurfaceDefault = Omit<ScaleSurface, 'steps' | 'semantic' | 'key'>;

export const DEFAULT_SURFACES: Record<SurfaceKey, SurfaceDefault> = {
  web: {
    basePx: 16,
    ratio: { name: 'minor-third', value: 1.2 },
    stepsUp: 7, stepsDown: 2,
    leading: 'normal', tracking: 'normal',
    fluid: { minVwPx: 360, maxVwPx: 1440, minRatioMultiplier: 0.78 },
  },
  ui: {
    basePx: 16,
    ratio: { name: 'major-second', value: 1.125 },
    stepsUp: 5, stepsDown: 2,
    leading: 'normal', tracking: 'normal',
  },
  presentation: {
    basePx: 24,
    ratio: { name: 'perfect-fourth', value: 1.333 },
    stepsUp: 6, stepsDown: 1,
    leading: 'tight', tracking: 'normal',
  },
  social: {
    basePx: 32,
    ratio: { name: 'major-third', value: 1.25 },
    stepsUp: 5, stepsDown: 1,
    leading: 'tight', tracking: 'tight',
  },
};

const ROLE_TARGET_INDEX: Record<SurfaceKey, Array<[string, number]>> = {
  web:           [['display',7],['h1',6],['h2',5],['h3',4],['h4',3],['h5',2],['h6',1],['bodyLg',1],['body',0],['bodySm',-1],['caption',-2],['overline',-2]],
  ui:            [['display',5],['h1',4],['h2',3],['h3',2],['h4',1],['bodyLg',1],['body',0],['bodySm',-1],['caption',-2],['label',-1],['button',0]],
  presentation:  [['display',6],['h1',5],['h2',4],['h3',3],['h4',2],['bodyLg',1],['body',0],['caption',-1]],
  social:        [['display',5],['h1',4],['h2',3],['h3',2],['bodyLg',1],['body',0]],
};

export function defaultSemanticMap(surface: SurfaceKey, steps: ScaleStep[]): SemanticMap {
  const byIndex = new Map(steps.map(s => [s.index, s]));
  const out: SemanticMap = {};
  for (const [role, idx] of ROLE_TARGET_INDEX[surface]) {
    const step = byIndex.get(idx) ?? nearest(steps, idx);
    if (!step) continue;
    out[role as keyof SemanticMap] = {
      stepId: step.id,
      font: isHeadingRole(role) ? 'heading' : 'body',
      weight: isHeadingRole(role) ? (idx >= 3 ? 700 : 600) : 400,
    };
  }
  return out;
}

function nearest(steps: ScaleStep[], index: number): ScaleStep | undefined {
  let best: ScaleStep | undefined;
  let bestDist = Infinity;
  for (const s of steps) {
    const d = Math.abs(s.index - index);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best;
}

function isHeadingRole(role: string): boolean {
  return role === 'display' || role.startsWith('h') || role === 'overline';
}
