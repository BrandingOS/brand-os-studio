/**
 * Rebuilding the review from the brand.
 *
 * Proposals are not stored anywhere — a proposal IS a Core value whose
 * authority is below `confirmed`. That is what lets the review survive a closed
 * tab, a reload, or a different device: there is nothing to restore, only
 * something to read.
 *
 * Without this the flow would appear to lose everything on resume, because the
 * in-memory proposal list is transient by design. The values were never lost;
 * they were on the brand the whole time.
 */
import { CORE_FIELD_PATHS, readCoreValue, type CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { coreValueMeta, isAtLeast } from '@/domain/brand/coreMeta';
import type { CanonicalBrand } from '@/domain/brand';
import { PATH_LABEL, sectionFor, type Proposal } from './proposals';

/**
 * Whether a Core value is worth showing.
 *
 * An empty string is NOT a value. The legacy brand record initialises several
 * strategy fields to `''`, and treating those as present put blank rows on the
 * review asking the user to confirm nothing.
 */
function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/** What the review needs to render, derived entirely from the brand. */
export interface HydratedReview {
  proposals: Proposal[];
  /** Paths the user has already confirmed — rendered as settled. */
  confirmed: Set<string>;
}

/**
 * Turns provenance back into the user's words.
 *
 * The origin line is written for a person, so it says where the belief came
 * from rather than naming a provenance enum.
 */
function evidenceFor(provenance: string): string {
  if (provenance === 'ai-suggested') return 'your description';
  if (provenance === 'inferred') return 'what you brought';
  if (provenance === 'imported') return 'an earlier import';
  return 'you';
}

/**
 * Every Core value that belongs in the review, with what has been decided.
 *
 * `sentinelPaths` are excluded outright — a stand-in that exists only to
 * satisfy a NOT NULL column is not something to ask the user about.
 */
export function hydrateReview(
  brand: CanonicalBrand,
  sentinelPaths: readonly string[] = [],
): HydratedReview {
  const proposals: Proposal[] = [];
  const confirmed = new Set<string>();

  for (const path of CORE_FIELD_PATHS) {
    if (sentinelPaths.includes(path)) continue;
    // Only paths the review knows how to show. Logos are placed on the material
    // step, not accepted as statements, so they carry no row here yet.
    if (sectionFor(path) === null || path.startsWith('logos.')) continue;

    // Only paths the review has a human label for. Anything else would render
    // its dotted path as a heading, which is the schema leaking onto a screen
    // built to show the brand.
    if (!PATH_LABEL[path]) continue;

    const value = readCoreValue(brand.identity, path);
    if (!hasContent(value)) continue;

    const meta = coreValueMeta(brand.identityMeta, path);
    // A value nobody has decided is a proposal; one the user confirmed is shown
    // as settled. Both belong on the screen — hiding confirmed values would
    // make the review look emptier every time the user agreed with something.
    if (isAtLeast(meta.authority, 'confirmed')) confirmed.add(path);

    proposals.push({
      corePath: path as CoreFieldPath,
      value,
      provenance: meta.provenance === 'user-entered' ? 'inferred' : (meta.provenance as never),
      evidence: evidenceFor(meta.provenance),
    });
  }

  return { proposals, confirmed };
}
