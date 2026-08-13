/**
 * Shows how settled a Brand Core value is — and stays quiet when it is.
 *
 * FR-003 asks for status to be "clearly surfaced when relevant, without
 * requiring persistent UI labels or clutter". That is a real design constraint,
 * not a hedge: badging all forty Core values with "CONFIRMED" would make the
 * page noisier and tell the user nothing. So this renders NOTHING for the
 * ordinary case — a value the user set and confirmed — and appears only when
 * there is genuinely something to know:
 *
 *   • the value is not settled yet (suggested / provisional), or
 *   • it is settled but did not come from the user (AI-suggested, inferred),
 *     which is worth surfacing even at Confirmed because it explains where a
 *     value the user does not remember typing came from.
 *
 * FEATURE-LOCAL on purpose. "Authority" and "provenance" are product concepts;
 * the Design System supplies the generic badge and nothing more. If a second
 * surface needs this, promote it to the shared product layer then — not now.
 */
import { DsBadge } from '@/shared/ds';
import type { Authority, CoreValueMeta, Provenance } from '@/domain/brand/coreMeta';
import { isAtLeast } from '@/domain/brand/coreMeta';

/** 1.8px-stroke line icons, per the DS icon rule. */
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    </svg>
  );
}

const PROVENANCE_LABEL: Record<Provenance, string> = {
  'user-entered': 'you set this',
  'ai-suggested': 'suggested by AI',
  inferred: 'inferred from your uploads and activity',
  imported: 'imported with your brand',
};

const AUTHORITY_LABEL: Record<Authority, string> = {
  suggested: 'Suggested',
  provisional: 'Assumed',
  confirmed: 'Confirmed',
  official: 'Official',
};

export interface CoreValueStatusChipProps {
  meta: CoreValueMeta;
  /** Force the chip to render even when it would normally stay quiet. */
  alwaysShow?: boolean;
}

/** Returns true when the chip has something worth saying. */
export function shouldSurfaceStatus(meta: CoreValueMeta): boolean {
  if (!isAtLeast(meta.authority, 'confirmed')) return true;
  return meta.provenance === 'ai-suggested' || meta.provenance === 'inferred';
}

export function CoreValueStatusChip({ meta, alwaysShow = false }: CoreValueStatusChipProps) {
  if (!alwaysShow && !shouldSurfaceStatus(meta)) return null;

  const settled = isAtLeast(meta.authority, 'confirmed');
  const notFromUser = meta.provenance !== 'user-entered';

  return (
    <DsBadge
      tone={settled ? 'neutral' : 'warning'}
      icon={notFromUser ? <SparkIcon /> : <DraftIcon />}
      title={`${AUTHORITY_LABEL[meta.authority]} — ${PROVENANCE_LABEL[meta.provenance]}`}
    >
      {AUTHORITY_LABEL[meta.authority]}
    </DsBadge>
  );
}
