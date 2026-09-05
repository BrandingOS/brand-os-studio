/**
 * The answers the user already gave, stated back to the enrichment model as
 * settled — so it fills gaps rather than proposing a second brand beside the
 * first. Read from the pasted brief when there is one; free prose settles
 * nothing structured.
 */
import { looksLikeBrief, parseBrief } from '../brief/parseBrief';
import type { SettledAnswers } from './digest';

export function settledFromBrief(text: string | undefined): SettledAnswers {
  const t = text?.trim() ?? '';
  if (!t || !looksLikeBrief(t)) return {};
  const b = parseBrief(t);
  const join = (v: string[] | undefined) => (v && v.length ? v.join(', ') : undefined);
  return {
    ...(b.industry ? { industry: b.industry } : {}),
    ...(b.slogan ? { tagline: b.slogan } : {}),
    ...(join(b.products) ? { products: join(b.products) } : {}),
    ...(b.summary ? { summary: b.summary } : {}),
    ...(b.mission ? { mission: b.mission } : {}),
    ...(b.audience ? { audience: b.audience } : {}),
    ...(b.positioning ? { positioning: b.positioning } : {}),
    ...(join(b.personality) ? { personality: join(b.personality) } : {}),
    ...(b.tone ? { tone: b.tone } : {}),
    ...(join(b.style) ? { visualStyle: join(b.style) } : {}),
    ...(join(b.values) ? { values: join(b.values) } : {}),
  };
}
