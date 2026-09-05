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
import { fromWebsite } from '../website/fromWebsite';
import type { WebsiteEvidence } from '../website/evidence';

export type DescriptionAuthorship = 'pasted' | 'written';

/** The rank free prose lands at, by who wrote it. */
export function proseRank(authorship: DescriptionAuthorship | undefined): (typeof RANK)[keyof typeof RANK] {
  return authorship === 'written' ? RANK.authored : RANK.generated;
}

export interface InterpretInput {
  /** What the user typed or pasted on the profile screen. */
  description?: string;
  /** Material already in the Library, in the order it was supplied. */
  items: OnboardingAsset[];
  /** Typed on the profile screen. Ranked as user-supplied. */
  website?: string;
  /** What the scan read off that website, when it ran. Ranked `website`. */
  websiteEvidence?: WebsiteEvidence;
  /**
   * What the enrichment model concluded from that evidence, already validated
   * and ranked (extracted / inferred / generated). Its business facts fill
   * only gaps: an inference never replaces a fact.
   */
  websiteInference?: { candidates: Candidate[]; business: BusinessFacts; origins: Record<string, string> };
  /**
   * Who wrote the description. `written` is the user in their own words and
   * outranks everything but their explicit choices; `pasted` (the default) is
   * an AI reply handed over through the brief handoff.
   */
  authorship?: DescriptionAuthorship;
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
  /** Where website values came from, keyed by Core path or `business.<field>`. */
  websiteOrigins: Record<string, string>;
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

function fromSections(
  sections: ParsedSection[],
  rank: (typeof RANK)[keyof typeof RANK],
  evidence: string,
  authorship?: DescriptionAuthorship,
): Candidate[] {
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
      // Their own words, restructured: derived from what they supplied, not a
      // suggestion of ours. A pasted AI reply stays `ai-suggested`.
      provenance: authorship === 'written' ? 'inferred' : 'ai-suggested',
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

  // Its own field. Filing it as the mission meant a brief that answered both
  // "what is this brand" and "what does it set out to do" kept only one.
  if (b.summary) add('strategy.summary', b.summary);
  // Audience and positioning are vocabularies in Setup now (scalar ids, with
  // an honest "Other" keeping the wording), so a brief answer is normalised
  // the way industry and tone are — never coerced into the nearest member.
  if (b.audience) add('strategy.targetAudience', storedValue(normalize(b.audience, VOCABULARIES.audience)));
  if (b.positioning) add('strategy.positioning', storedValue(normalize(b.positioning, VOCABULARIES.positioning)));
  if (b.mission) add('strategy.mission', b.mission);
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

/**
 * Colours the user placed or we extracted, most prominent first.
 *
 * Colours read from artwork the WEBSITE scan brought rank as website
 * evidence: a scraped logo is the site's material, not the user's upload.
 */
function fromColors(items: OnboardingAsset[]): Candidate[] {
  const colours = items.filter((a) => a.kind === 'color' && a.value);
  if (!colours.length) return [];
  // Each swatch carries its OWN rank: a website colour beside an uploaded one
  // must not borrow the upload's standing.
  const meta = (a: OnboardingAsset) =>
    a.origin === 'website'
      ? { rank: RANK.website, provenance: 'imported' as const, evidence: 'your website' }
      : { rank: RANK.uploaded, provenance: 'inferred' as const, evidence: 'your artwork' };
  const hex = (a: OnboardingAsset) => (a.value ?? '').toUpperCase();
  const out: Candidate[] = [{ corePath: 'colors.primary', value: { hex: hex(colours[0]) }, ...meta(colours[0]) }];
  if (colours[1]) out.push({ corePath: 'colors.secondary', value: { hex: hex(colours[1]) }, ...meta(colours[1]) });
  const rest = colours.slice(2);
  for (const origin of ['user', 'website'] as const) {
    const group = rest.filter((a) => (a.origin === 'website') === (origin === 'website'));
    if (!group.length) continue;
    out.push({ corePath: 'colors.neutrals', value: group.map((a) => ({ hex: hex(a) })), ...meta(group[0]) });
  }
  return out;
}


/**
 * One colour, one role. When the roles were won by different sources — the
 * logo's pixels took primary, the site's CSS took the rest — the same hex can
 * land twice. The higher role keeps it.
 */
export function dedupeColours(proposals: Proposal[]): Proposal[] {
  const hexOf = (v: unknown) => (v as { hex?: string } | undefined)?.hex?.toUpperCase();
  const taken = new Set<string>();
  const out: Proposal[] = [];
  for (const path of ['colors.primary', 'colors.secondary', 'colors.accent'] as const) {
    const h = hexOf(proposals.find((p) => p.corePath === path)?.value);
    if (h) taken.add(h);
  }
  for (const p of proposals) {
    if (p.corePath === 'colors.secondary' || p.corePath === 'colors.accent') {
      const h = hexOf(p.value);
      const primary = hexOf(proposals.find((x) => x.corePath === 'colors.primary')?.value);
      if (h && h === primary) continue;
    }
    if (p.corePath === 'colors.neutrals' && Array.isArray(p.value)) {
      const kept = (p.value as Array<{ hex: string }>).filter((c) => !taken.has(c.hex.toUpperCase()));
      if (!kept.length) continue;
      out.push({ ...p, value: kept });
      continue;
    }
    out.push(p);
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

  // ── The website: extracted facts, ranked below material, above the brief ──
  const site = input.websiteEvidence ? fromWebsite(input.websiteEvidence) : null;
  if (site) candidates.push(...site.candidates);
  if (input.websiteInference) candidates.push(...input.websiteInference.candidates);
  const websiteOrigins = { ...(input.websiteInference?.origins ?? {}), ...(site?.origins ?? {}) };

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
      candidates.push(
        ...fromSections(await parse(text), proseRank(input.authorship), 'your description', input.authorship),
      );
    } catch {
      // Degrade, never fail (FR-020). The material-derived proposals stand on
      // their own and the user is not shown an error for a tier they never
      // asked for.
    }
  }

  // Business facts carry no rank of their own, so precedence is decided here:
  // the site's facts replace the AI-written brief's, and never the user's own
  // (a brief the user WROTE is theirs).
  if (site) {
    const briefIsTheirs = usedBrief && input.authorship === 'written';
    for (const [k, v] of Object.entries(site.business) as Array<[keyof BusinessFacts, unknown]>) {
      if (v === undefined) continue;
      if (briefIsTheirs && business[k] !== undefined) continue;
      (business as Record<string, unknown>)[k] = v;
    }
  }
  // An inference fills a gap, never replaces a fact from any source.
  if (input.websiteInference) {
    for (const [k, v] of Object.entries(input.websiteInference.business) as Array<[keyof BusinessFacts, unknown]>) {
      if (v !== undefined && business[k] === undefined) (business as Record<string, unknown>)[k] = v;
    }
  }
  if (input.website) business.website = input.website;

  // ── A path the user already decided is untouchable ───────────────────────
  const decided = new Set<string>(input.decided ?? []);
  const open = candidates.filter((c) => !decided.has(c.corePath));

  return { proposals: dedupeColours(mergeCandidates(open)), business, suggestions, usedBrief, websiteOrigins };
}

export { VOCAB_PATHS };
