/**
 * Source priority — the one rule that decides which value wins.
 *
 *     user choice / edit  >  uploaded evidence  >  structured brief  >  AI suggestion
 *
 * Every candidate value carries the rank of where it came from, and the merge
 * keeps the highest. Two consequences the product depends on:
 *
 *  - When a logo exists, colours come FROM the logo rather than from a guess.
 *  - A palette an AI merely *suggested* is never written as the brand's actual
 *    palette, even when nothing else is available — it stays a suggestion the
 *    review offers.
 *
 * The rule lives in ONE function, and `mergeCandidates` is the only place in
 * the feature that constructs a `Proposal`. That is deliberate: enforcing this
 * at each call site would make it a convention, and conventions rot. As a
 * single function with an exhaustive test it is a property of the system, which
 * is what makes re-running understanding safe by construction — a rank-0
 * suggestion cannot displace the rank-3 value the user just typed, on any run.
 *
 * Pure — no service, no store, no React.
 */
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { Proposal, ProposalProvenance } from './proposals';

/**
 * Higher wins. The numbers are ordering only and are never persisted.
 *
 * Extended for the website scan (Gate 1, 2026-09-06). The ladder, top down:
 *
 *     user  >  authored  >  uploaded  >  website  >  brief  >  websiteInferred  >  generated
 *
 * `authored` is what the user typed THEMSELVES on the profile screen (the
 * "write it yourself" mode); `brief` is a reply an AI wrote for them and they
 * pasted. The website beats the AI-written brief because a site is what the
 * brand actually says; it never beats what the user personally provided.
 */
export const RANK = {
  /** A palette direction, a font pairing, fallback prose, anything we offered. */
  generated: 0,
  /**  alias of `generated`, kept for existing call sites. */
  ai: 0,
  /** A conclusion the enrichment model drew from website evidence. */
  websiteInferred: 1,
  /** A concrete value stated in the structured (AI-written, pasted) brief. */
  brief: 2,
  /** A fact found on the website itself. */
  website: 3,
  /** Derived from material the user actually supplied. */
  uploaded: 4,
  /** Prose the user wrote in their own words. */
  authored: 5,
  /** The user picked it, typed it or dragged it. Never overwritten. */
  user: 6,
} as const;

export type SourceRank = (typeof RANK)[keyof typeof RANK];

export interface Candidate {
  corePath: CoreFieldPath;
  value: unknown;
  rank: SourceRank;
  /** What the belief rests on, in the user's language. */
  evidence: string;
  /**
   * Provenance recorded on the Core value. Independent of rank: a value can be
   * high-ranked and still machine-derived (a logo we analysed), and low-ranked
   * while sounding authoritative (a colour an AI suggested).
   */
  provenance: ProposalProvenance;
}

/**
 * Keeps the highest-ranked candidate for each Core path.
 *
 * Ties break by arrival order, deterministically, so the review does not
 * reshuffle between renders for the same input.
 */
export function mergeCandidates(candidates: readonly Candidate[]): Proposal[] {
  const best = new Map<CoreFieldPath, { c: Candidate; at: number }>();

  candidates.forEach((c, at) => {
    if (c.value === undefined || c.value === null) return;
    if (typeof c.value === 'string' && !c.value.trim()) return;
    if (Array.isArray(c.value) && c.value.length === 0) return;

    const held = best.get(c.corePath);
    // Strictly greater: an equal-ranked later candidate loses, which is what
    // makes arrival order the tie-break rather than a coin toss.
    if (!held || c.rank > held.c.rank) best.set(c.corePath, { c, at });
  });

  return [...best.values()]
    .sort((a, b) => a.at - b.at)
    .map(({ c }) => ({
      corePath: c.corePath,
      value: c.value,
      provenance: c.provenance,
      evidence: c.evidence,
    }));
}

/** Convenience for callers that only have a rank name. */
export function rankOf(name: keyof typeof RANK): SourceRank {
  return RANK[name];
}
