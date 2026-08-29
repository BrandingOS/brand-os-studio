// Pending invitations. A seat is held from the moment one is sent, so this list is part
// of the seat count people see — not a side note.
import { useState } from 'react';
import { toast } from 'sonner';
import { DsBadge, DsEmptyState } from '@/shared/ds';
import { WORKSPACE_ROLE_LABEL, BRAND_ROLE_LABEL } from '@/shared/access';
import { MembersError, resendInvitation, revokeInvitation, type Invitation } from '../data/membersApi';
import { RowMenu } from './RowMenu';

export function InvitationsList({
  invitations,
  canManage,
  onChanged,
}: {
  invitations: Invitation[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (invitations.length === 0) {
    return (
      <DsEmptyState>
        No pending invitations. Invite someone and they’ll appear here until they join —
        a pending invitation holds a seat.
      </DsEmptyState>
    );
  }

  const copy = async (id: string) => {
    setBusy(id);
    try {
      // Resending rotates the token — the previous link dies — so the copied link is
      // always the live one rather than a stale token we happened to remember.
      const { token } = await resendInvitation(id);
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
      toast.success('Invitation link copied. The previous link no longer works.');
      onChanged();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not refresh that link.');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (id: string, email: string) => {
    setBusy(id);
    try {
      await revokeInvitation(id);
      toast.success(`The invitation to ${email} was revoked.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not revoke that.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="mem-rows">
      {invitations.map((inv) => (
        <li key={inv.id} className="mem-row" data-busy={busy === inv.id || undefined}>
          <div className="mem-row-main mem-row-main--static">
            <span className="mem-avatar mem-avatar--pending" aria-hidden>✉</span>
            <span className="mem-row-identity">
              <span className="mem-row-name">
                {inv.email}
                {inv.role === 'guest' && <DsBadge tone="neutral">Guest</DsBadge>}
              </span>
              <span className="mem-row-email">
                Invited by {inv.invitedByName} · expires {expiresIn(inv.expiresAt)}
              </span>
            </span>
            <span className="mem-row-access">{summary(inv)}</span>
          </div>
          {canManage && (
            <RowMenu
              label={`Actions for the invitation to ${inv.email}`}
              items={[
                { label: 'Copy a fresh link', onSelect: () => void copy(inv.id) },
                { label: 'Revoke', danger: true, onSelect: () => void revoke(inv.id, inv.email) },
              ]}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function summary(inv: Invitation): string {
  if (inv.role === 'admin') return WORKSPACE_ROLE_LABEL.admin;
  const role = inv.defaultBrandRole ? BRAND_ROLE_LABEL[inv.defaultBrandRole] : 'Viewer';
  const scope = inv.mode === 'all'
    ? 'All brands'
    : `${inv.brandGrants.length} ${inv.brandGrants.length === 1 ? 'brand' : 'brands'}`;
  return `${role} · ${scope}`;
}

function expiresIn(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}
