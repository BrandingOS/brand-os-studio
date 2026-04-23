import type { LeadingCurve } from '@/shared/types/typescale';

function normalAt(sizePx: number): number {
  const clamped = Math.min(Math.max(sizePx, 8), 120);
  const a = 1.05, b = 7;
  return a + b / clamped;
}

export function leadingFor(sizePx: number, curve: LeadingCurve): number {
  const base = normalAt(sizePx);
  if (curve === 'tight') return Math.max(base - 0.08, 1.0);
  if (curve === 'loose') return base + 0.12;
  return base;
}
