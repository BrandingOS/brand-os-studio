// ============================================================================
// "No AI, except on Client B."
//
// A per-brand grant beating a workspace-wide deny is the whole reason the precedence rule
// exists, and it was the one state the People screen could not show: the row said "no AI"
// and the sheet's switch read OFF, while the server said ON for one brand. Two costs, and
// the second is the expensive one — the exception was invisible, and the next save wrote
// every brand grant from the WORKSPACE switch, so it was taken away by accident.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MembersTable } from '../components/MembersTable';
import { MemberSheet } from '../components/MemberSheet';
import type { Member } from '../data/membersApi';

const grantBrandAccess = vi.fn().mockResolvedValue(undefined);
const setMemberRole = vi.fn().mockResolvedValue(undefined);
const revokeBrandAccess = vi.fn().mockResolvedValue(undefined);

vi.mock('../data/membersApi', async (orig) => ({
  ...(await orig<typeof import('../data/membersApi')>()),
  grantBrandAccess: (...a: unknown[]) => grantBrandAccess(...a),
  setMemberRole: (...a: unknown[]) => setMemberRole(...a),
  revokeBrandAccess: (...a: unknown[]) => revokeBrandAccess(...a),
}));

const BRANDS = [{ id: 'b1', name: 'Client A' }, { id: 'b2', name: 'Client B' }];

const dana: Member = {
  userId: 'u-dana', role: 'member', status: 'active', mode: 'selected',
  defaultBrandRole: 'designer', overrides: { deny: ['ai.generate'] },
  creditsMonthlyCap: null, joinedAt: null,
  name: 'Dana Ortiz', email: 'dana@demo.test', avatarUrl: null,
  grants: [
    { brandId: 'b1', role: 'designer' },
    { brandId: 'b2', role: 'designer', overrides: { grant: ['ai.generate'] } },
  ],
};

beforeEach(() => {
  grantBrandAccess.mockClear();
  setMemberRole.mockClear();
  revokeBrandAccess.mockClear();
});

describe('the row tells the truth about AI', () => {
  it('counts the exception instead of claiming no AI', () => {
    render(
      <MembersTable members={[dana]} loading={false} canManage currentUserId="u-alice"
        onOpen={() => {}} onAction={() => {}} />,
    );
    expect(screen.getByText(/AI on 1 of 2/)).toBeInTheDocument();
    expect(screen.queryByText(/· no AI/)).not.toBeInTheDocument();
  });

  it('still says "no AI" when there is genuinely none', () => {
    const flat = { ...dana, grants: dana.grants.map((g) => ({ ...g, overrides: undefined })) };
    render(
      <MembersTable members={[flat]} loading={false} canManage currentUserId="u-alice"
        onOpen={() => {}} onAction={() => {}} />,
    );
    expect(screen.getByText(/no AI/)).toBeInTheDocument();
  });
});

describe('the sheet shows the exception and keeps it', () => {
  const open = (member: Member = dana) =>
    render(
      <MemberSheet member={member} brands={BRANDS} workspaceId="ws-1" canManage isSelf={false}
        onClose={() => {}} onSaved={() => {}} />,
    );

  it('names the brand the exception is on', () => {
    open();
    expect(screen.getByText(/Except on Client B/)).toBeInTheDocument();
  });

  it('saving an untouched member does not strip the exception', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Save access' }));
    await waitFor(() => expect(setMemberRole).toHaveBeenCalled());
    // Nothing changed, so no brand grant is rewritten at all — the exception survives
    // because it was never overwritten with the workspace switch.
    expect(grantBrandAccess).not.toHaveBeenCalled();
    expect(revokeBrandAccess).not.toHaveBeenCalled();
  });

  it('extending the exception to a second brand writes allowAi for that brand only', async () => {
    open();
    // Client A's row offers "AI here" precisely because the workspace switch is off
    const rowToggles = screen.getAllByLabelText('AI here');
    expect(rowToggles).toHaveLength(2);
    fireEvent.click(rowToggles[0]);            // Client A
    fireEvent.click(screen.getByRole('button', { name: 'Save access' }));

    await waitFor(() => expect(grantBrandAccess).toHaveBeenCalledTimes(1));
    // The EXCEPTION is an explicit grant. `allowAi: true` alone only suppresses the deny
    // the RPC would otherwise add — it stores `{}` and grants nothing, so asserting the
    // argument without the override passed while creating no exception at all.
    expect(grantBrandAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'b1',
        allowAi: true,
        overrides: { grant: ['ai.generate'] },
      }),
    );
  });

  it('removing the exception confirms the loss by name before writing', async () => {
    open();
    const rowToggles = screen.getAllByLabelText('AI here');
    fireEvent.click(rowToggles[1]);            // untick Client B
    fireEvent.click(screen.getByRole('button', { name: 'Save access' }));

    // A confirm step, not a silent write
    await waitFor(() =>
      expect(screen.getByRole('alertdialog')).toHaveTextContent('lose the AI exception on Client B'));
    expect(grantBrandAccess).not.toHaveBeenCalled();
  });

  it('offers no per-brand toggle when AI is on for the whole workspace', () => {
    open({ ...dana, overrides: {} });
    expect(screen.queryByLabelText('AI here')).not.toBeInTheDocument();
  });
});
