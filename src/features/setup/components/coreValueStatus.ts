/**
 * The rule for WHEN a Brand Core value's status is worth showing, plus its
 * wording. Split from the component so the file that renders JSX only exports
 * components (Fast Refresh requirement) — and so the rule can be asserted
 * directly in a test without rendering.
 *
 * FR-003 asks for status to be "clearly surfaced when relevant, without
 * requiring persistent UI labels or clutter". That is a real design constraint,
 * not a hedge: badging all forty Core values with "CONFIRMED" would make the
 * page noisier and tell the user nothing.
 */
import { isAtLeast, type Authority, type CoreValueMeta, type Provenance } from '@/domain/brand/coreMeta';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  'user-entered': 'you set this',
  'ai-suggested': 'suggested by AI',
  inferred: 'inferred from your uploads and activity',
  imported: 'imported with your brand',
};

export const AUTHORITY_LABEL: Record<Authority, string> = {
  suggested: 'Suggested',
  provisional: 'Assumed',
  confirmed: 'Confirmed',
  official: 'Official',
};

/**
 * True when the chip has something worth saying:
 *
 *   • the value is not settled yet (suggested / provisional), or
 *   • it is settled but did not come from the user (AI-suggested, inferred),
 *     which is worth surfacing even at Confirmed because it explains where a
 *     value the user does not remember typing came from.
 */
export function shouldSurfaceStatus(meta: CoreValueMeta): boolean {
  if (!isAtLeast(meta.authority, 'confirmed')) return true;
  return meta.provenance === 'ai-suggested' || meta.provenance === 'inferred';
}

export function statusTitle(meta: CoreValueMeta): string {
  return `${AUTHORITY_LABEL[meta.authority]} — ${PROVENANCE_LABEL[meta.provenance]}`;
}
