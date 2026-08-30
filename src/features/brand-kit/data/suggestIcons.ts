import { FLATICON_RR_NAMES } from './flaticonNames';
import {
  ICON_PACKS,
  detectPackFromText,
  iconPack,
  packForIndustry,
  type IconPack,
  type IconPackId,
} from './iconPacks';
import { withIconWeight, type IconWeightId } from './iconWeights';

/**
 * The brand's icon set — CHOSEN from a curated pack, never searched for.
 *
 * ### What this used to do, and why it was wrong
 *
 * The old suggester walked all 3,557 Flaticon names and scored each one by how
 * many of its slug parts overlapped the brand's own prose. It was careful about
 * it — stopwords, synonyms, a one-directional loose match, family caps — and it
 * was still a SEARCH. A search over a catalogue that carries Waste Pollution,
 * Assistive Listening, Anatomical Heart, Blender Phone and Cvv Card will find
 * them, because those names contain ordinary English words. So a fintech was
 * offered Waste and Building NGO, and a card-game company was offered Turkey
 * and Anatomical Heart (audit D41). Every match was defensible. The set was
 * nonsense.
 *
 * The mistake was asking a machine the wrong question. "Which of 3,557 names
 * sound like this brand?" is a question with a bad answer. "Which of these 28
 * symbols matter most to this brand?" is a question with a good one, and the 28
 * come from `iconPacks.ts`, where a person decided them.
 *
 * So the split is:
 *
 *   • **Which symbols may appear at all** — `iconPacks.ts`. A decision.
 *   • **Which pack** — the brand's recorded industry first (a fact it already
 *     answered in Setup), its own words second, `general` last.
 *   • **What order they come in** — the brand's text, scored against the pack.
 *     This is the part a machine is good at, and the worst it can do is put a
 *     good icon in position 20 instead of position 3.
 *
 * The result is 24–32 icons, not 50: a set someone would ship, and eight rows
 * of tiles rather than seventeen screens (audit D59).
 */

/**
 * Families that are never a brand's icon, matched on the name's first part.
 *
 * Nothing in a curated pack needs this — it is the guard on the EDITOR's
 * search, where the user types into the whole catalogue. Directional and layout
 * chrome (an arrow is a control, not an identity), the emoji faces, and the
 * encoding alphabets. Blocking by family rather than by name is what keeps it
 * honest: `braille` is 27 entries and `arrow` is 94, and a list of individual
 * exclusions would fall behind the catalogue.
 */
const EXCLUDED_FAMILIES = new Set([
  'angle', 'arrow', 'arrows', 'caret', 'chevron', 'sort', 'border', 'align',
  'braille', 'face', 'grin', 'tachometer', 'age', 'percent', 'symbol',
  'resize', 'expand', 'compress', 'undo', 'redo',
]);

/**
 * A single letter or a bare number at the end of a name is a GLYPH — the
 * catalogue's way of drawing a character, not a symbol anyone would pick to
 * stand for their brand. `circle-a`, `square-7`, `braille-k`, `dice-d20`.
 */
function isGlyph(parts: string[]): boolean {
  const last = parts[parts.length - 1] ?? '';
  return /^[a-z]$/.test(last) || /^\d+$/.test(last) || /^d\d+$/.test(last);
}

/** Whether this catalogue entry could ever belong in a brand's icon set. */
export function isBrandIconCandidate(name: string): boolean {
  const bare = name.startsWith('fi-rr-') ? name.slice('fi-rr-'.length) : name;
  if (!bare) return false;
  const parts = bare.split('-');
  if (EXCLUDED_FAMILIES.has(parts[0]!)) return false;
  return !isGlyph(parts);
}

/** Every catalogue name a brand could reasonably pick, for the editor's search. */
export function searchableIconNames(): string[] {
  return FLATICON_RR_NAMES.filter(isBrandIconCandidate);
}

/** Words that describe every brand and therefore rank none of them. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'or', 'but', 'the', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'for', 'with', 'from', 'into', 'that', 'this', 'these', 'those', 'their',
  'our', 'your', 'its', 'who', 'what', 'which', 'when', 'where', 'while',
  'brand', 'brands', 'business', 'company', 'product', 'products', 'service',
  'services', 'team', 'people', 'user', 'users', 'customer', 'customers',
  'client', 'clients', 'project', 'projects', 'work', 'world', 'audience',
  'tone', 'voice', 'mission', 'vision', 'value', 'values', 'experience',
  'experiences', 'positioning', 'simple', 'modern', 'great', 'good', 'best',
  'better', 'every', 'more', 'most', 'other', 'some', 'they', 'them',
]);

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  for (const raw of text.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/)) {
    const t = raw.trim();
    if (t.length >= 3 && !STOPWORDS.has(t)) out.add(t);
  }
  return out;
}

/** How strongly one pack icon answers to the brand's own words. */
function relevance(bareName: string, tokens: Set<string>): number {
  if (tokens.size === 0) return 0;
  let score = 0;
  for (const part of bareName.split('-')) {
    if (part.length < 3) continue;
    if (tokens.has(part)) {
      score += 3;
      continue;
    }
    // Loose in ONE direction and with a floor on both sides, so "design"
    // reaches "designer" while "a" reaches nothing at all.
    if (part.length < 4) continue;
    for (const t of tokens) {
      if (t.length >= 4 && (part.startsWith(t) || t.startsWith(part))) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

export interface IconSuggestOptions {
  /**
   * The brand's recorded industry — a vocabulary id (`health-wellness`), the
   * label a person reads (`Health & Wellness`), or the free wording of an
   * `Other` answer. This is the strongest signal there is, because the brand
   * answered it on purpose.
   */
  industry?: string | null;
  /** A pack the user picked in the editor. Beats everything else. */
  pack?: IconPackId | string | null;
  /** Applied to every returned name, so the whole set shares one weight. */
  weight?: IconWeightId;
}

/**
 * The pack a brand belongs to, and why — exported so the editor can SAY which
 * pack it chose and on what evidence rather than presenting a fait accompli.
 */
export function resolveIconPack(
  text: string,
  options: IconSuggestOptions = {},
): { pack: IconPack; reason: 'chosen' | 'industry' | 'text' | 'default' } {
  if (options.pack) {
    const known = ICON_PACKS.find((p) => p.id === options.pack);
    if (known) return { pack: known, reason: 'chosen' };
  }
  const byIndustry = packForIndustry(options.industry);
  if (byIndustry) return { pack: byIndustry, reason: 'industry' };
  const byText = detectPackFromText(text);
  if (byText) return { pack: byText, reason: 'text' };
  return { pack: iconPack('general'), reason: 'default' };
}

/**
 * The icons a brand should open with: its pack, ordered by its own words.
 *
 * `max` TRIMS; it never tops up past the pack, because a pack is a designed
 * set and padding it to a round number is how 28 good icons became 50 mixed
 * ones. Ties keep declaration order, so the answer is stable enough to test.
 */
export function suggestIconsForBrand(
  text: string,
  max = 50,
  options: IconSuggestOptions = {},
): string[] {
  const { pack } = resolveIconPack(text, options);
  const tokens = tokenize(text);
  const ranked = pack.icons
    .map((name, index) => ({ name, index, score: relevance(name, tokens) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((entry) => `fi-rr-${entry.name}`)
    .slice(0, Math.max(0, max));
  const weight = options.weight;
  return weight && weight !== 'rr' ? ranked.map((n) => withIconWeight(n, weight)) : ranked;
}
