// ============================================================================
// One vocabulary for "no", shared by Postgres, the Edge Functions and the UI.
//
// The five systems that can refuse an action are different questions with different
// answers (docs/access-architecture/04 §4): may you, does your plan include it, how much
// have you used, can you pay, and not so fast. Collapsing them into one "Upgrade
// required" toast is how a permission problem gets sold as a billing problem.
// ============================================================================

export type AccessDenialReason =
  // authorization — you may not
  | 'not_authenticated'
  | 'permission_denied'
  | 'brand_access_denied'
  | 'not_a_member'
  | 'self_role_change'
  | 'last_owner'
  | 'use_transfer_ownership'
  | 'implicit_manager'
  // entitlement — your plan does not include it
  | 'feature_not_in_plan'
  // quota — you have used them all
  | 'brands_limit_reached'
  | 'seats_limit_reached'
  | 'guest_seats_limit_reached'
  | 'workspace_limit_reached'
  | 'storage_mb_limit_reached'
  | 'share_links_limit_reached'
  | 'exports_month_limit_reached'
  // money — you cannot pay for it
  | 'insufficient_credits'
  | 'member_credit_cap_reached'
  // rate — not this fast
  | 'rate_limited'
  // concurrency — someone else moved it
  | 'conflict'
  // invitations
  | 'invitation_invalid'
  | 'email_mismatch'
  | 'already_member'
  | 'cannot_invite_owner'
  | 'invalid_email'
  | 'brand_not_in_workspace'
  | 'not_found';

export type DenialDetail = {
  capability?: string;
  feature?: string;
  limit?: number;
  used?: number;
  plan?: string;
  required?: number;
  balance?: number;
  cap?: number;
  retryAfter?: number;
  currentVersion?: number;
  updatedBy?: string;
  updatedByName?: string;
  invitedEmail?: string;
  managers?: string[];
};

/** True when the honest fix is a bigger plan — the ONLY place "Upgrade" belongs. */
export function isUpgradeable(reason: AccessDenialReason): boolean {
  return reason === 'feature_not_in_plan' || reason.endsWith('_limit_reached');
}

const PLURAL = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * One sentence, in the second person, saying what happened and — where there is one —
 * what to do. No error codes, no "contact your administrator" when we know their name.
 */
export function reasonMessage(reason: AccessDenialReason, d: DenialDetail = {}): string {
  switch (reason) {
    case 'not_authenticated':
      return 'Sign in to continue.';
    case 'permission_denied':
    case 'brand_access_denied':
      return d.managers?.length
        ? `You don't have access to this. Ask ${listNames(d.managers)}.`
        : "You don't have access to this.";
    case 'not_a_member':
      return 'That person is not a member of this workspace.';
    case 'self_role_change':
      return 'You can’t change your own role. Ask another owner or admin.';
    case 'last_owner':
      return 'A workspace needs at least one owner. Make someone else an owner first.';
    case 'use_transfer_ownership':
      return 'Ownership is transferred, not assigned. Use Transfer ownership.';
    case 'implicit_manager':
      return 'Owners and admins already manage every brand.';

    case 'feature_not_in_plan':
      return `${d.feature ?? 'That'} isn’t included on the ${d.plan ?? 'current'} plan.`;

    case 'brands_limit_reached':
      return `You’ve used all ${d.limit} ${PLURAL(d.limit ?? 0, 'brand', 'brands')} on the ${d.plan ?? 'current'} plan.`;
    case 'seats_limit_reached':
      return `All ${d.limit} ${PLURAL(d.limit ?? 0, 'seat', 'seats')} are taken. Remove someone, or upgrade.`;
    case 'guest_seats_limit_reached':
      return d.limit === 0
        ? `Guests aren’t included on the ${d.plan ?? 'current'} plan.`
        : `All ${d.limit} guest seats are taken.`;
    case 'workspace_limit_reached':
      return `You can own ${d.limit} ${PLURAL(d.limit ?? 0, 'workspace', 'workspaces')} on the ${d.plan ?? 'current'} plan.`;
    case 'storage_mb_limit_reached':
      return `You’ve used all ${d.limit} MB of storage.`;
    case 'share_links_limit_reached':
      return `You can have ${d.limit} active share ${PLURAL(d.limit ?? 0, 'link', 'links')} on the ${d.plan ?? 'current'} plan.`;
    case 'exports_month_limit_reached':
      return `You’ve used this month’s ${d.limit} exports.`;

    case 'insufficient_credits':
      return `This needs ${d.required} credits; you have ${d.balance ?? 0}.`;
    case 'member_credit_cap_reached':
      return `You’ve used your ${d.cap}-credit limit for this month (${d.used ?? 0} so far).`;

    case 'rate_limited':
      return d.retryAfter
        ? `Too many requests. Try again in ${Math.ceil(d.retryAfter / 60)} minutes.`
        : 'Too many requests. Try again shortly.';

    case 'conflict':
      return d.updatedByName
        ? `${d.updatedByName} changed this while you were editing. Reload to see their version.`
        : 'Someone changed this while you were editing. Reload to see their version.';

    case 'invitation_invalid':
      return 'This invitation link is no longer valid. Ask for a new one.';
    case 'email_mismatch':
      return `This invitation was sent to ${d.invitedEmail ?? 'another address'}. Sign in with that address to accept it.`;
    case 'already_member':
      return 'That address already belongs to a member of this workspace.';
    case 'cannot_invite_owner':
      return 'Ownership is transferred to an existing member, not invited.';
    case 'invalid_email':
      return 'That doesn’t look like an email address.';
    case 'brand_not_in_workspace':
      return 'One of those brands isn’t in this workspace.';
    case 'not_found':
      return 'That no longer exists.';
    default:
      return 'That didn’t work.';
  }
}

function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names[0]}, ${names[1]} or ${names.length - 2} others`;
}

/** Pull a reason out of whatever the transport handed back, or null if it is not one. */
export function parseDenial(error: unknown): { reason: AccessDenialReason; detail: DenialDetail } | null {
  const body = (error as { error?: unknown })?.error ?? (error as { message?: unknown })?.message;
  if (typeof body !== 'string') return null;
  const known = KNOWN.has(body as AccessDenialReason);
  if (!known) return null;
  const { error: _drop, message: _drop2, ...detail } = (error ?? {}) as Record<string, unknown>;
  return { reason: body as AccessDenialReason, detail: detail as DenialDetail };
}

const KNOWN = new Set<AccessDenialReason>([
  'not_authenticated', 'permission_denied', 'brand_access_denied', 'not_a_member',
  'self_role_change', 'last_owner', 'use_transfer_ownership', 'implicit_manager',
  'feature_not_in_plan', 'brands_limit_reached', 'seats_limit_reached',
  'guest_seats_limit_reached', 'workspace_limit_reached', 'storage_mb_limit_reached',
  'share_links_limit_reached', 'exports_month_limit_reached', 'insufficient_credits',
  'member_credit_cap_reached', 'rate_limited', 'conflict', 'invitation_invalid',
  'email_mismatch', 'already_member', 'cannot_invite_owner', 'invalid_email',
  'brand_not_in_workspace', 'not_found',
]);
