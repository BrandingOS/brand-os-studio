// ============================================================================
// Settings → Members.
//
// This route existed as a redirect to /settings/account, with a comment saying members
// were "pure theatre — local useState plus a success toast, writing nothing — and
// BrandOS is single-user for now". It is not single-user any more: workspace_members,
// brand_access and the invitation RPCs are real, and this is their surface.
//
// The page shows what a person actually needs to decide: who is here, what they can
// reach, and how many seats are left. Detail lives in the sheet; the definition of each
// role lives one click away in the matrix, because nothing else in the product says what
// an Editor is versus a Designer.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DsButton, DsConfirmDialog, DsTabBar } from '@/shared/ds';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBrandStore } from '@/shared/store/brandStore';
import { useCurrentWorkspace, useCanShow, useAccessStore } from '@/shared/access';
import {
  checkLimit, listInvitations, listMembers, MembersError, removeMember, transferOwnership,
  type Invitation, type Member,
} from '@/features/members/data/membersApi';
import { MembersTable, type MemberRowAction } from '@/features/members/components/MembersTable';
import { MemberSheet } from '@/features/members/components/MemberSheet';
import { InviteMemberModal } from '@/features/members/components/InviteMemberModal';
import { InvitationsList } from '@/features/members/components/InvitationsList';
import { RoleMatrixModal } from '@/features/members/components/RoleMatrixModal';
import '@/features/members/members.css';

type Seats = { used: number; limit: number; guestUsed: number; guestLimit: number; plan: string };

export default function MembersSettingsPage() {
  const workspace = useCurrentWorkspace();
  const { user } = useAuth();
  const brands = useBrandStore((s) => s.list);
  const canManage = useCanShow('members.manage');
  const canInvite = useCanShow('members.invite');
  const canView = useCanShow('members.view');
  const reloadAccess = useAccessStore((s) => s.hydrate);

  const [tab, setTab] = useState<'people' | 'invitations'>('people');
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [seats, setSeats] = useState<Seats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetFor, setSheetFor] = useState<Member | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<Member | null>(null);

  const brandList = useMemo(
    () => brands.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, name: b.name })),
    [brands],
  );

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [m, inv, s, g] = await Promise.all([
        listMembers(workspace.id),
        canInvite ? listInvitations(workspace.id) : Promise.resolve([]),
        checkLimit(workspace.id, 'seats', 0),
        checkLimit(workspace.id, 'guest_seats', 0),
      ]);
      setMembers(m);
      setInvitations(inv);
      setSeats({ used: s.used, limit: s.limit, guestUsed: g.used, guestLimit: g.limit, plan: s.plan });
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not load the people here.');
    } finally {
      setLoading(false);
    }
  }, [workspace, canInvite]);

  useEffect(() => { void load(); }, [load]);

  if (!workspace) return null;

  // Guests have no member directory at all: the nav item is absent, and so is this.
  if (!canView) {
    return (
      <div data-members>
        <p className="mem-empty">You don’t have access to the people in this workspace.</p>
      </div>
    );
  }

  const doRemove = async (m: Member) => {
    try {
      await removeMember(workspace.id, m.userId);
      toast.success(`${m.name} was removed. Their access to every brand went with them.`);
      await load();
      await reloadAccess();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not remove that person.');
    } finally {
      setConfirmRemove(null);
    }
  };

  const doTransfer = async (m: Member) => {
    try {
      await transferOwnership(workspace.id, m.userId, true);
      toast.success(`${m.name} is now the owner. You are an admin.`);
      await load();
      await reloadAccess();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not transfer ownership.');
    } finally {
      setConfirmTransfer(null);
    }
  };

  const onAction = (action: MemberRowAction, m: Member) => {
    if (action === 'change-access') setSheetFor(m);
    if (action === 'remove') setConfirmRemove(m);
    if (action === 'transfer-ownership') setConfirmTransfer(m);
  };

  const seatsFull = seats ? seats.limit >= 0 && seats.used >= seats.limit : false;

  return (
    <div data-members>
      <div className="ws-hero">
        <span className="ws-hero-eyebrow">Workspace</span>
        <h1 className="ws-hero-title">People</h1>
        <p className="ws-hero-sub">
          Invite teammates, clients and freelancers, and choose which brands each of them can reach.
        </p>
      </div>

      <div className="mem-hero-actions">
        {seats && (
          <span className="mem-seats" data-tight={seatsFull || undefined}>
            {seats.limit < 0 ? `${seats.used} seats used` : `${seats.used} of ${seats.limit} seats`}
            {seats.guestLimit !== 0 && (
              <> · {seats.guestLimit < 0 ? `${seats.guestUsed} guests` : `${seats.guestUsed} of ${seats.guestLimit} guest seats`}</>
            )}
          </span>
        )}
        <DsButton tone="tertiary" onClick={() => setMatrixOpen(true)}>
          What can each role do?
        </DsButton>
        {canInvite && (
          <DsButton
            tone="primary"
            onClick={() => setInviteOpen(true)}
            disabled={seatsFull}
            // A limit is information, not a locked door: say what would fix it.
            title={seatsFull ? `All ${seats?.limit} seats are taken on the ${seats?.plan} plan.` : undefined}
          >
            Invite member
          </DsButton>
        )}
      </div>

      <DsTabBar
        tabs={[
          { value: 'people', label: `People (${members.length})` },
          ...(canInvite ? [{ value: 'invitations', label: `Invitations (${invitations.length})` }] : []),
        ]}
        value={tab}
        onChange={(v) => setTab(v as 'people' | 'invitations')}
      />

      {tab === 'people' ? (
        <MembersTable
          members={members}
          loading={loading}
          canManage={canManage}
          currentUserId={user?.id ?? null}
          onOpen={setSheetFor}
          onAction={onAction}
        />
      ) : (
        <InvitationsList invitations={invitations} canManage={canInvite} onChanged={load} />
      )}

      <MemberSheet
        member={sheetFor}
        brands={brandList}
        workspaceId={workspace.id}
        canManage={canManage}
        isSelf={sheetFor?.userId === user?.id}
        onClose={() => setSheetFor(null)}
        onSaved={() => { void load(); void reloadAccess(); }}
      />

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={workspace.id}
        brands={brandList}
        onInvited={({ email, link }) => {
          void navigator.clipboard.writeText(link).catch(() => undefined);
          toast.success(`Invitation sent to ${email}. The link is on your clipboard.`);
          void load();
        }}
      />

      <RoleMatrixModal open={matrixOpen} onClose={() => setMatrixOpen(false)} />

      <DsConfirmDialog
        open={Boolean(confirmRemove)}
        title={`Remove ${confirmRemove?.name ?? ''}?`}
        description={
          confirmRemove
            ? `They lose access to this workspace and to every brand in it, immediately. ` +
              `Their work stays where it is.`
            : ''
        }
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && void doRemove(confirmRemove)}
      />

      <DsConfirmDialog
        open={Boolean(confirmTransfer)}
        title={`Make ${confirmTransfer?.name ?? ''} the owner?`}
        description={
          `They gain everything, including billing and the ability to delete this workspace. ` +
          `You become an admin. Only an owner can undo this.`
        }
        confirmLabel="Transfer ownership"
        onCancel={() => setConfirmTransfer(null)}
        onConfirm={() => confirmTransfer && void doTransfer(confirmTransfer)}
      />
    </div>
  );
}
