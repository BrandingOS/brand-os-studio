/**
 * Shows how settled a Brand Core value is — and stays quiet when it is.
 *
 * Renders NOTHING for the ordinary case (a value the user set and confirmed)
 * and appears only when there is genuinely something to know. The rule itself
 * and its wording live in `./coreValueStatus` so this file exports components
 * only.
 *
 * FEATURE-LOCAL on purpose. "Authority" and "provenance" are product concepts;
 * the Design System supplies the generic badge and nothing more. If a second
 * surface needs this, promote it to the shared product layer then — not now.
 */
import { DsBadge } from '@/shared/ds';
import { isAtLeast, type CoreValueMeta } from '@/domain/brand/coreMeta';
import { AUTHORITY_LABEL, shouldSurfaceStatus, statusTitle } from './coreValueStatus';

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

export interface CoreValueStatusChipProps {
  meta: CoreValueMeta;
  /** Force the chip to render even when it would normally stay quiet. */
  alwaysShow?: boolean;
}

export function CoreValueStatusChip({ meta, alwaysShow = false }: CoreValueStatusChipProps) {
  if (!alwaysShow && !shouldSurfaceStatus(meta)) return null;

  const settled = isAtLeast(meta.authority, 'confirmed');
  const notFromUser = meta.provenance !== 'user-entered';

  return (
    <DsBadge
      tone={settled ? 'neutral' : 'warning'}
      icon={notFromUser ? <SparkIcon /> : <DraftIcon />}
      title={statusTitle(meta)}
    >
      {AUTHORITY_LABEL[meta.authority]}
    </DsBadge>
  );
}
