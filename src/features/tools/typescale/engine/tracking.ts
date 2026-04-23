import type { TrackingCurve } from '@/shared/types/typescale';

function normalAt(sizePx: number): number {
  if (sizePx <= 12) return 0.02;
  if (sizePx >= 64) return -0.02;
  if (sizePx <= 16) return 0 + (16 - sizePx) * (0.02 / 4);
  return 0 - (sizePx - 16) * (0.02 / 48);
}

export function trackingFor(sizePx: number, curve: TrackingCurve): number {
  const base = normalAt(sizePx);
  if (curve === 'tight') return base - 0.01;
  if (curve === 'loose') return base + 0.01;
  return base;
}
