/**
 * Material and words in, proposals out. Pure.
 *
 * "Pure" is enforced by a boundary test, not just intent: this module imports
 * no service, no store and no React. That is what makes the mapping testable
 * without a database, and it is why it can never accidentally promote anything.
 *
 * Understanding is **adaptive** (FR-052, FR-053). The route is chosen by the
 * shape of the text, not by asking the user:
 *
 *   recognisable brief  →  parsed deterministically, NO assisted call
 *   free-form prose     →  assisted parse, deterministic fallback
 *   a partial brief     →  both: labels parsed, residual prose sent on
 *
 * Every candidate goes through `mergeCandidates`, which is the only place a
 * `Proposal` is constructed. That is what makes source priority a property of
 * the system rather than a convention each call site has to remember.
 */
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { parseDescriptionToSections, type ParsedSection } from './parseDescription';
import type { BusinessFacts, Proposal } from './proposals';
import { RANK, mergeCandidates, type Candidate } from './sources';
import { looksLikeBrief, parseBrief, type ParsedBrief } from '../brief/parseBrief';
import { normalize, normalizeMany, splitList, storedValue } from '../vocabulary/normalize';
import { CARDINALITY, VOCABULARIES } from '../vocabulary/vocabularies';

export interface InterpretInput {
  /** What the user typed or pasted on the profile screen. */
  description?: string;
  /** Material already in the Library, in the order it was supplied. */
  items: OnboardingAsset[];
  /** Typed on the profile screen. Ranked as user-supplied. */
  website?: string;
  /** Core paths the user has already decided. Never overwritten. */
  decided?: readonly CoreFieldPath[];
}

export interface Understanding {
  proposals: Proposal[];
  business: BusinessFacts;
  /** Palettes and pairings the brief SUGGESTED. Offered, never written. */
  suggestions: {
    palettes: Array<{ name: string; hexes: string[] }>;
    pairings: Array<{ heading: string; body: string }>;
  };
  /** True when the brief route was taken — used to assert no assisted call. */
  usedBrief: boolean;
}

/** Maps a parsed section key onto its Core path. Closed on purpose. */
const SECTION_TO_PATH: Record<string, CoreFieldPath> = {
  mission: 'strategy.mission',
  vision: 'strategy.vision',
  audience: 'strategy.targetAudience',
  voice: 'voice.tone',
  values: 'strategy.values',
  positioning: 'strategy.positioning',
  personality: 'strategy.personality',
};

const VOCAB_PATHS = ['voice.tone', 'strategy.values', 'strategy.personality'] as const;

/** Normalises a parsed value against its vocabulary when it has one. */
function toVocabulary(path: CoreFieldPath, content: string): unknown {
  if (path === 'voice.tone') {
    const n = normalize(splitList(content)[0] ?? content, VOCABULARIES.tone);
    return storedValue(n);
  }
  if (path === 'strategy.values') {
    return normalizeMany(splitList(content), VOCABULARIES.values, CARDINALITY.values.max).map(storedValue);
  }
  if (path === 'strategy.personality') {
    return normalizeMany(splitList(content), VOCABULARIES.personality, CARDINALITY.personality.max).map(
      storedValue,
    );
  }
  return content;
}

function fromSections(sections: ParsedSection[], rank: (typeof RANK)[keyof typeof RANK], evidence: string): Candidate[] {
  const out: Candidate[] = [];
  for (const s of sections) {
    const path = SECTION_TO_PATH[s.key];
    const content = s.content.trim();
    // A section we can't address is not dropped from the product — it is
    // simply not a Core proposal. `story` and custom headings have no path,
    // and survive as the About section's free-form entries.
    if (!path || !content) continue;
    out.push({
      corePath: path,
      value: toVocabulary(path, content),
      rank,
      provenance: 'ai-suggested',
      evidence,
    });
  }
  return out;
}

/** The brief's own answers. Concrete values rank `brief`; nothing here is a guess. */
function fromBrief(b: ParsedBrief): Candidate[] {
  const out: Candidate[] = [];
  const add = (corePath: CoreFieldPath, value: unknown) => {
    out.push({ corePath, value, rank: RANK.brief, provenance: 'ai-suggested', evidence: 'your brand profile' });
  };

  if (b.summary) add('strategy.mission', b.summary);
  if (b.audience) add('strategy.targetAudience', b.audience);
  if (b.positioning) add('strategy.positioning', b.positioning);
  if (b.tone) add('voice.tone', storedValue(normalize(b.tone, VOCABULARIES.tone)));
  if (b.style?.length) {
    add(
      'visualStyle.descriptors',
      normalizeMany(b.style, VOCABULARIES.style, CARDINALITY.style.max)
        // Only real members reach `visualStyle.descriptors` — the field is a
        // closed union, so an "Other" answer cannot be stored there and is
        // carried on the business side instead.
        .filter((n) => n.kind === 'member')
        .map(storedValue),
    );
  }
  if (b.personality?.length) {
    add(
      'strategy.personality',
      normalizeMany(b.personality, VOCABULARIES.personality, CARDINALITY.personality.max).map(storedValue),
    );
  }
  if (b.values?.length) {
    add('strategy.values', normalizeMany(b.values, VOCABULARIES.values, CARDINALITY.values.max).map(storedValue));
  }
  // CONCRETE colours only. Suggested directions are deliberately absent here —
  // they travel in `suggestions` and are offered by the review, never written.
  if (b.colors?.length) {
    add('colors.primary', { hex: b.colors[0] });
    if (b.colors[1]) add('colors.secondary', { hex: b.colors[1] });
    if (b.colors.length > 2) add('colors.neutrals', b.colors.slice(2).map((hex) => ({ hex })));
  }
  if (b.fonts?.length) {
    add('typography.primary', { family: b.fonts[0] });
    if (b.fonts[1]) add('typography.secondary', { family: b.fonts[1] });
  }
  return out;
}

/** Colours the user placed or we extracted, most prominent first. */
function fromColors(items: OnboardingAsset[]): Candidate[] {
  const hexes = items
    .filter((a) => a.kind === 'color' && a.value)
    .map((a) => (a.value ?? '').toUpperCase());
  if (!hexes.length) return [];
  const ev = 'your artwork';
  const out: Candidate[] = [
    { corePath: 'colors.primary', value: { hex: hexes[0] }, rank: RANK.uploaded, provenance: 'inferred', evidence: ev },
  ];
  if (hexes[1]) {
    out.push({ corePath: 'colors.secondary', value: { hex: hexes[1] }, rank: RANK.uploaded, provenance: 'inferred', evidence: ev });
  }
  // Everything past the second is neutrals — deliberately NOT an accent. An
  // uploaded palette is just the brand's colours; guessing that the third
  // swatch is "the accent" drops a lone colour into a section on its own.
  const rest = hexes.slice(2);
  if (rest.length) {
    out.push({
      corePath: 'colors.neutrals',
      value: rest.map((hex) => ({ hex })),
      rank: RANK.uploaded,
      provenance: 'inferred',
      evidence: ev,
    });
  }
  return out;
}

/** Typefaces, grouped so five weights of one family are one typeface. */
function fromFonts(families: Array<{ family: string; source: string }>): Candidate[] {
  const out: Candidate[] = [];
  if (families[0]) {
    out.push({
      corePath: 'typography.primary',
      value: { family: families[0].family },
      rank: RANK.uploaded,
      provenance: 'inferred',
      evidence: families[0].source,
    });
  }
  if (families[1]) {
    out.push({
      corePath: 'typography.secondary',
      value: { family: families[1].family },
      rank: RANK.uploaded,
      provenance: 'inferred',
      evidence: families[1].source,
    });
  }
  return out;
}

/**
 * The whole understanding pass.
 *
 * Ordering is deterministic for a given input so the review does not reshuffle
 * between renders. Nothing is proposed from nothing: every proposal traces to
 * supplied material or supplied text through its `evidence`.
 */
export async function interpret(
  input: InterpretInput,
  deps: {
    parse?: (text: string) => Promise<ParsedSection[]>;
    groupFonts?: (items: OnboardingAsset[]) => Array<{ family: string; source: string }>;
  } = {},
): Promise<Understanding> {
  const parse = deps.parse ?? parseDescriptionToSections;
  const candidates: Candidate[] = [];
  const business: BusinessFacts = {};
  const suggestions: Understanding['suggestions'] = { palettes: [], pairings: [] };

  // ── Material first: uploaded evidence outranks anything written ──────────
  candidates.push(...fromColors(input.items));
  if (deps.groupFonts) candidates.push(...fromFonts(deps.groupFonts(input.items)));

  // ── The text, routed by its shape ────────────────────────────────────────
  const text = input.description?.trim() ?? '';
  const usedBrief = looksLikeBrief(text);

  if (usedBrief) {
    const brief = parseBrief(text);
    candidates.push(...fromBrief(brief));

    if (brief.industry) {
      business.industry = storedValue(normalize(brief.industry, VOCABULARIES.industry));
    }
    if (brief.slogan) business.tagline = brief.slogan;
    if (brief.products?.length) business.description = brief.products.join(', ');
    if (brief.audience) business.audienceSummary = brief.audience;
    if (brief.colorDirections?.length) suggestions.palettes = brief.colorDirections;
    if (brief.fontDirections?.length) suggestions.pairings = brief.fontDirections;

    // A partially-recognised brief still has prose in it. Run the assisted
    // tier over just that remainder rather than discarding it.
    if (brief.residualProse) {
      try {
        candidates.push(...fromSections(await parse(brief.residualProse), RANK.brief, 'your brand profile'));
      } catch {
        /* degrade, never fail */
      }
    }
  } else if (text) {
    try {
      candidates.push(...fromSections(await parse(text), RANK.ai, 'your description'));
    } catch {
      // Degrade, never fail (FR-020). The material-derived proposals stand on
      // their own and the user is not shown an error for a tier they never
      // asked for.
    }
  }

  if (input.website) business.website = input.website;

  // ── A path the user already decided is untouchable ───────────────────────
  const decided = new Set<string>(input.decided ?? []);
  const open = candidates.filter((c) => !decided.has(c.corePath));

  return { proposals: mergeCandidates(open), business, suggestions, usedBrief };
}

export { VOCAB_PATHS };
