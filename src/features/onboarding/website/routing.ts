/**
 * Which model reads the digest, and how much it may say.
 *
 * Haiku is the default. Sonnet is for semantic COMPLEXITY only — several
 * languages, several candidate names, contradictory signals — never for thin
 * evidence: a stronger model cannot manufacture facts a site does not carry.
 * Thin evidence narrows the ASK instead: only the fallback fields, at the
 * generated rank.
 */
import type { AnthropicModelTier } from '@/shared/ai/anthropicProxy';
import type { WebsiteEvidence } from './evidence';

export interface RoutingDecision {
  tier: AnthropicModelTier;
  /** One short reason, for telemetry and calibration. */
  reason: string;
  /** Under this much evidence only summary and tone may be produced, as generated. */
  thin: boolean;
  /** Nothing to interpret at all: skip the call. */
  skip: boolean;
}

export const THIN_WORDS = 150;
export const SKIP_WORDS = 40;

export function chooseTier(ev: WebsiteEvidence): RoutingDecision {
  const q = ev.quality;
  if (q.copyWords < SKIP_WORDS) return { tier: 'haiku', reason: 'no_copy', thin: true, skip: true };
  const thin = q.copyWords < THIN_WORDS || q.pagesRead <= 1;
  if (q.languages.length >= 2) return { tier: 'sonnet', reason: 'multilingual', thin, skip: false };
  if (q.nameCandidates >= 3) return { tier: 'sonnet', reason: 'ambiguous_name', thin, skip: false };
  if (contradictoryIndustry(ev)) return { tier: 'sonnet', reason: 'contradictory_signals', thin, skip: false };
  return { tier: 'haiku', reason: thin ? 'thin_evidence' : 'default', thin, skip: false };
}

/** Pages whose headings point at unrelated industries at once. */
const INDUSTRY_CUES: Array<[string, RegExp]> = [
  ['food', /\b(restaurant|menu|dish|café|cafe|bakery|kitchen|chef)\b/i],
  ['tech', /\b(software|platform|api|saas|app|developer|cloud)\b/i],
  ['property', /\b(real estate|property|apartment|listing|mortgage)\b/i],
  ['health', /\b(clinic|dental|therapy|patient|wellness|medical)\b/i],
  ['legal', /\b(law firm|attorney|solicitor|legal advice)\b/i],
  ['fashion', /\b(collection|apparel|clothing|wear|lookbook)\b/i],
];

function contradictoryIndustry(ev: WebsiteEvidence): boolean {
  const text = ev.pages.map((p) => [p.h1 ?? '', ...p.headings].join(' ')).join(' ');
  const hits = INDUSTRY_CUES.filter(([, re]) => re.test(text)).length;
  return hits >= 3;
}
