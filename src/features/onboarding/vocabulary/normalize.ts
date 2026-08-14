/**
 * Free text → a vocabulary member, or an honest `Other`.
 *
 * The one rule that matters here: **a miss is never coerced.** If someone's AI
 * answers "Property Development" and the industry list has no such member, the
 * result is `{ kind: 'other', text: 'Property Development' }` with the wording
 * untouched — not the nearest-looking member, and not a truncation. A closed
 * list that silently rounds answers off is worse than free text, because the
 * rounding is invisible to everyone downstream.
 *
 * Matching is deliberately conservative, in three widening passes, and stops at
 * the first that hits. There is no fuzzy distance threshold: "editorial" and
 * "elegant" are four edits apart and mean different things, so a distance
 * metric would confidently produce a wrong answer, which is the failure this
 * module exists to prevent.
 *
 * Pure. No service, no store, no React — asserted by the boundary test.
 */
import type { Normalized, VocabularyMember } from './vocabularies';

/** Lowercase, strip accents and anything that is not a letter or digit. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Very common English plural/adverb tails, removed only for comparison. */
function stem(s: string): string {
  return s.replace(/(ness|ity|ly|es|s)$/, '');
}

/**
 * Hand-written equivalences, kept small on purpose.
 *
 * Only for words an AI or a person genuinely uses for the same concept. Adding
 * a near-synonym here is a product decision, not a convenience — anything in
 * this map is a case where the vocabulary would otherwise send two identical
 * brands to different buckets.
 */
const ALIASES: Record<string, string> = {
  // style
  contemporary: 'modern',
  clean: 'minimal',
  simple: 'minimal',
  traditional: 'classic',
  timeless: 'classic',
  vintage: 'retro',
  hightech: 'futuristic',
  premium: 'luxury',
  upmarket: 'luxury',
  refined: 'elegant',
  natural: 'organic',
  handmade: 'artisanal',
  craft: 'artisanal',
  crafted: 'artisanal',
  editorialdesign: 'editorial',
  typographic: 'editorial',
  engineered: 'technical',
  systematic: 'technical',
  institutional: 'corporate',
  raw: 'brutalist',
  // personality / tone
  fun: 'playful',
  serious: 'professional',
  dependable: 'reliable',
  honest: 'trustworthy',
  casual: 'conversational',
  informal: 'conversational',
  humorous: 'witty',
  funny: 'witty',
  motivating: 'inspiring',
  aspirational: 'inspiring',
  // values
  eco: 'sustainability',
  sustainable: 'sustainability',
  green: 'sustainability',
  honesty: 'integrity',
  openness: 'transparency',
  tradition: 'heritage',
  inclusive: 'inclusivity',
  // industry
  property: 'real-estate',
  realestate: 'real-estate',
  realty: 'real-estate',
  restaurant: 'food-beverage',
  cafe: 'food-beverage',
  food: 'food-beverage',
  software: 'technology',
  tech: 'technology',
  healthcare: 'health-wellness',
  wellness: 'health-wellness',
  law: 'legal',
  ecommerce: 'retail',
  shop: 'retail',
  gym: 'fitness',
  charity: 'non-profit',
  nonprofit: 'non-profit',
  nfp: 'non-profit',
  consulting: 'professional-services',
  agency: 'marketing',
  advertising: 'marketing',
};

/**
 * Matches one answer against one vocabulary.
 *
 * Passes, in order: exact id or label → alias table → stemmed comparison.
 * Anything that survives all three is `Other`, verbatim.
 */
export function normalize(text: string, vocab: VocabularyMember[]): Normalized {
  const raw = text.trim();
  if (!raw) return { kind: 'other', text: '' };

  // An explicit "Other: X" from the prompt is honoured as written.
  const explicit = raw.match(/^other\s*[:\-–]\s*(.+)$/i);
  if (explicit) return { kind: 'other', text: explicit[1].trim() };

  const key = fold(raw);
  if (!key) return { kind: 'other', text: raw };

  const byExact = vocab.find((v) => fold(v.id) === key || fold(v.label) === key);
  if (byExact) return { kind: 'member', member: byExact };

  const aliased = ALIASES[key];
  if (aliased) {
    const hit = vocab.find((v) => v.id === aliased);
    if (hit) return { kind: 'member', member: hit };
  }

  const stemmed = stem(key);
  const byStem = vocab.find((v) => stem(fold(v.id)) === stemmed || stem(fold(v.label)) === stemmed);
  if (byStem) return { kind: 'member', member: byStem };

  return { kind: 'other', text: raw };
}

/**
 * Matches a list of answers, de-duplicated, capped.
 *
 * `max` reflects the concept's cardinality — tone takes one, values take five.
 * Order is the user's, not the vocabulary's: what they said first is what they
 * meant most.
 */
export function normalizeMany(
  values: readonly string[],
  vocab: VocabularyMember[],
  max = Number.POSITIVE_INFINITY,
): Normalized[] {
  const out: Normalized[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const n = normalize(v, vocab);
    const key = n.kind === 'member' ? `m:${n.member.id}` : `o:${fold(n.text)}`;
    if (n.kind === 'other' && !n.text) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

/** What gets persisted: the member id, or the user's own words. */
export function storedValue(n: Normalized): string {
  return n.kind === 'member' ? n.member.id : n.text;
}

/** What gets shown: the member's label, or the user's own words. */
export function displayValue(n: Normalized): string {
  return n.kind === 'member' ? n.member.label : n.text;
}

/** Splits one answer line into candidates. Matches the retired values split. */
export function splitList(raw: string): string[] {
  return raw
    .split(/[,;·•|]+|\s+\/\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);
}
