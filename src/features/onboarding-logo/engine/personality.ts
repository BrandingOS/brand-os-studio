import type { LogoTraits } from '../model/types';

/** What the mark suggests about personality. Ordered by strength of signal. */
export function personalityFromTraits(t: LogoTraits): string[] {
  const out: string[] = [];
  if (t.weight === 'heavy') out.push('bold', 'confident');
  if (t.weight === 'light') out.push('elegant', 'sophisticated');
  if (t.geometry === 'geometric') out.push('professional', 'innovative');
  if (t.geometry === 'organic') out.push('warm', 'friendly', 'creative');
  if (t.symmetric) out.push('trustworthy');
  else out.push('creative');
  return Array.from(new Set(out)).slice(0, 3);
}
