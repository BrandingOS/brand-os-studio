// ============================================================================
// The four ways a surface says "not for you", and when to use each
// (docs/access-architecture/03 §4.3, 10 §6).
//
//   HIDDEN            a whole section the role never has → not in the nav at all
//   READ-ONLY         they may look but not touch → content renders, controls do not,
//                     one notice at the top that NAMES someone who can grant access
//   DISABLED + REASON blocked by plan, limit or credits — never by role
//   403 / 404-shaped  a brand they cannot reach: a real 403 inside their own workspace
//                     (a colleague pasted the link and the app must not claim the brand
//                     does not exist), the 404 shape everywhere else
//
// Every one of them waits for access to hydrate first: `unknown` renders neither branch.
// ============================================================================
import type { ReactNode } from 'react';
import { useAccessStore } from './accessStore';
import { useCan, useCurrentWorkspace } from './useAccess';
import { reasonMessage, type AccessDenialReason, type DenialDetail } from './reasons';
import { DsButton } from '@/shared/ds';

type CanProps = {
  capability: string;
  brandId?: string | null;
  children: ReactNode;
  /** Rendered when they definitively may NOT. Omit to render nothing. */
  fallback?: ReactNode;
  /** Rendered while access is still loading. Omit to render nothing. */
  pending?: ReactNode;
};

/** Show `children` only when the user may. Never flashes the fallback during hydration. */
export function Can({ capability, brandId, children, fallback = null, pending = null }: CanProps) {
  const answer = useCan(capability, brandId);
  if (answer === 'unknown') return <>{pending}</>;
  return <>{answer ? children : fallback}</>;
}

type ReadOnlyReason = 'no_edit_access' | 'archived' | 'plan_readonly';

/**
 * The one banner a read-only surface shows. It names WHO can grant access, because
 * "ask an administrator" is an instruction with no target — and this product knows their
 * names (members.view is a Member capability).
 */
export function ReadOnlyNotice({
  reason = 'no_edit_access',
  managers = [],
  what = 'this brand',
}: {
  reason?: ReadOnlyReason;
  managers?: string[];
  what?: string;
}) {
  const text =
    reason === 'archived'
      ? `${cap(what)} is archived, so it can’t be edited. A manager can restore it.`
      : reason === 'plan_readonly'
        ? `${cap(what)} is read-only on your current plan.`
        : managers.length
          ? `You can view ${what}. Ask ${listNames(managers)} for edit access.`
          : `You can view ${what}, but not change it.`;

  return (
    <div
      role="status"
      data-access-notice={reason}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2, 8px)',
        padding: 'var(--ds-space-3, 12px) var(--ds-space-4, 16px)',
        borderRadius: 'var(--ds-radius-md, 10px)',
        border: '1px solid var(--ds-border-subtle, rgba(0,0,0,.08))',
        background: 'var(--ds-surface-subtle, rgba(0,0,0,.02))',
        color: 'var(--ds-text-muted, #6b6b6b)',
        font: 'var(--ds-font-body-sm, 13px/1.5 system-ui)',
      }}
    >
      {text}
    </div>
  );
}

/**
 * A brand the caller cannot reach.
 *
 * Enumeration protection is a CROSS-TENANT concern. The common case is intra-tenant: a
 * colleague pastes `/b/kaafex/setup` in Slack, you are a member of that workspace, and
 * telling you the brand does not exist reads as data loss. So: a real 403 that names who
 * can help when the caller is a member of the brand's workspace, and the 404 shape for
 * everyone else — including guests, who have no member directory to name anyone from.
 */
export function AccessDeniedPanel({
  variant,
  managers = [],
  onSwitchWorkspace,
  workspaceName,
}: {
  variant: 'forbidden' | 'not-found';
  managers?: string[];
  onSwitchWorkspace?: () => void;
  workspaceName?: string;
}) {
  const forbidden = variant === 'forbidden';
  return (
    <div
      role="alert"
      data-access-denied={variant}
      style={{
        maxWidth: 420, margin: '15vh auto', textAlign: 'center',
        display: 'grid', gap: 'var(--ds-space-3, 12px)',
      }}
    >
      <h1 style={{ font: 'var(--ds-font-title, 600 20px/1.3 system-ui)', margin: 0 }}>
        {forbidden ? 'You don’t have access to this brand' : 'We couldn’t find that'}
      </h1>
      <p style={{ color: 'var(--ds-text-muted, #6b6b6b)', margin: 0 }}>
        {forbidden
          ? managers.length
            ? `Ask ${listNames(managers)} to give you access.`
            : 'Ask an owner or admin of this workspace to give you access.'
          : 'The page may have been moved or deleted, or you may not have access to it.'}
      </p>
      {onSwitchWorkspace && workspaceName && (
        <div>
          <DsButton tone="secondary" onClick={onSwitchWorkspace}>
            Switch to {workspaceName}
          </DsButton>
        </div>
      )}
    </div>
  );
}

/**
 * Route-level gate. Renders children when the capability holds, a skeleton while access
 * loads, and the right denied panel otherwise.
 */
export function AccessGate({
  capability,
  brandId,
  children,
  loading = null,
  managers = [],
}: {
  capability: string;
  brandId?: string | null;
  children: ReactNode;
  loading?: ReactNode;
  managers?: string[];
}) {
  const answer = useCan(capability, brandId);
  const workspace = useCurrentWorkspace();
  const brandKnown = useAccessStore((s) => (brandId ? Boolean(s.brands[brandId]) : true));

  if (answer === 'unknown') return <>{loading}</>;
  if (answer) return <>{children}</>;

  // Inside our own workspace the brand is real but closed to us → a real 403.
  const inTenant = Boolean(workspace) && brandKnown;
  return <AccessDeniedPanel variant={inTenant ? 'forbidden' : 'not-found'} managers={managers} />;
}

/**
 * A control blocked by MONEY or PLAN, not by role: shown, disabled, and explained. Role
 * denials are hidden instead — an action you will never have is noise, but a limit you
 * could lift is information.
 */
export function useDenialMessage(
  reason: AccessDenialReason | null,
  detail?: DenialDetail,
): string | null {
  return reason ? reasonMessage(reason, detail) : null;
}

function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names[0]} or ${names[1]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
