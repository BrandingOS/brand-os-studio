/**
 * Material and words in, proposals out. Pure.
 *
 * "Pure" is enforced by a boundary test, not just intent: this module imports
 * no service, no store and no React. That is what makes the mapping testable
 * without a database, and it is why it can never accidentally promote anything.
 *
 * Two tiers, and the caller cannot tell them apart except by a proposal's
 * provenance: an assisted read of the description (`ai-suggested`), and
 * deterministic analysis of the material itself (`inferred`). When the assisted
 * tier is unavailable the deterministic one still produces a usable set — the
 * flow never blocks on a network call it cannot guarantee.
 */
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { parseDescriptionToSections, type ParsedSection } from './parseDescription';
import type { Proposal } from './proposals';

export interface InterpretInput {
  /** What the user typed. Never itself a proposal — they already decided it. */
  description?: string;
  /** Material already in the Library, in the order it was supplied. */
  items: OnboardingAsset[];
  /** Set when the user took the "Help me start" path. */
  direction?: StartingDirection;
}

/** A generated hypothesis about this brand. Never a template or a preset. */
export interface StartingDirection {
  id: string;
  /** Names a real position — "Quiet technical", never "Modern". */
  title: string;
  /** Three qualities, shown under the title. */
  qualities: string;
  colors: string[];
  fontFamily: string;
  fontWeight: number;
  /** The voice this direction implies, proposed alongside its visuals. */
  tone: string;
}

/** Maps a parsed section key onto its Core path. Closed on purpose. */
const SECTION_TO_PATH: Record<string, CoreFieldPath> = {
  mission: 'strategy.mission',
  vision: 'strategy.vision',
  audience: 'strategy.targetAudience',
  voice: 'voice.tone',
  values: 'strategy.values',
  positioning: 'strategy.positioning',
};

/** Values arrive as one sentence; downstream wants real entries. */
function splitValues(raw: string): string[] {
  return raw
    .split(/[,;·•|]+/)
    .map((v) => v.trim().replace(/\.$/, ''))
    .filter(Boolean);
}

function fromDescription(sections: ParsedSection[]): Proposal[] {
  const out: Proposal[] = [];
  for (const s of sections) {
    const path = SECTION_TO_PATH[s.key];
    const content = s.content.trim();
    // A section we can't address is not dropped from the product — it is simply
    // not a Core proposal. `story` and custom headings have no Core path.
    if (!path || !content) continue;
    out.push({
      corePath: path,
      value: path === 'strategy.values' ? splitValues(content) : content,
      provenance: 'ai-suggested',
      evidence: 'your description',
    });
  }
  return out;
}

/** Colours the user placed or we extracted, most prominent first. */
function fromColors(items: OnboardingAsset[]): Proposal[] {
  const hexes = items
    .filter((a) => a.kind === 'color' && a.value)
    .map((a) => (a.value ?? '').toUpperCase());
  if (!hexes.length) return [];
  const out: Proposal[] = [
    { corePath: 'colors.primary', value: { hex: hexes[0] }, provenance: 'inferred', evidence: 'your artwork' },
  ];
  if (hexes[1]) {
    out.push({ corePath: 'colors.secondary', value: { hex: hexes[1] }, provenance: 'inferred', evidence: 'your artwork' });
  }
  // Everything past the second is neutrals — deliberately NOT an accent. An
  // uploaded palette is just the brand's colours; guessing that the third
  // swatch is "the accent" drops a lone colour into a section on its own.
  const rest = hexes.slice(2);
  if (rest.length) {
    out.push({
      corePath: 'colors.neutrals',
      value: rest.map((hex) => ({ hex })),
      provenance: 'inferred',
      evidence: 'your artwork',
    });
  }
  return out;
}

/** Typefaces, grouped so five weights of one family are one typeface. */
function fromFonts(families: Array<{ family: string; source: string }>): Proposal[] {
  const out: Proposal[] = [];
  if (families[0]) {
    out.push({
      corePath: 'typography.primary',
      value: { family: families[0].family },
      provenance: 'inferred',
      evidence: families[0].source,
    });
  }
  if (families[1]) {
    out.push({
      corePath: 'typography.secondary',
      value: { family: families[1].family },
      provenance: 'inferred',
      evidence: families[1].source,
    });
  }
  return out;
}

function fromDirection(d: StartingDirection): Proposal[] {
  const out: Proposal[] = [
    { corePath: 'colors.primary', value: { hex: d.colors[0] }, provenance: 'inferred', evidence: `the ${d.title.toLowerCase()} direction` },
  ];
  if (d.colors[1]) {
    out.push({ corePath: 'colors.secondary', value: { hex: d.colors[1] }, provenance: 'inferred', evidence: `the ${d.title.toLowerCase()} direction` });
  }
  out.push({
    corePath: 'typography.primary',
    value: { family: d.fontFamily },
    provenance: 'inferred',
    evidence: `the ${d.title.toLowerCase()} direction`,
  });
  out.push({
    corePath: 'voice.tone',
    value: d.tone,
    provenance: 'inferred',
    evidence: `the ${d.title.toLowerCase()} direction`,
  });
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
): Promise<Proposal[]> {
  const parse = deps.parse ?? parseDescriptionToSections;
  const proposals: Proposal[] = [];

  // A chosen direction replaces extraction — the user picked it just now, so
  // re-deriving colours from nothing would only contradict them.
  if (input.direction) {
    proposals.push(...fromDirection(input.direction));
  } else {
    proposals.push(...fromColors(input.items));
    if (deps.groupFonts) proposals.push(...fromFonts(deps.groupFonts(input.items)));
  }

  const text = input.description?.trim();
  if (text) {
    try {
      proposals.push(...fromDescription(await parse(text)));
    } catch {
      // Degrade, never fail (FR-020). The material-derived proposals stand on
      // their own and the user is not shown an error for a tier they never
      // asked for.
    }
  }

  // One proposal per path. Earlier wins, which keeps a direction the user just
  // chose ahead of anything the description implies.
  const seen = new Set<string>();
  return proposals.filter((p) => {
    if (seen.has(p.corePath)) return false;
    seen.add(p.corePath);
    return true;
  });
}
