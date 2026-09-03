// ============================================================================
// Brand → Access, in a real browser.
//
// What is worth proving here is the RULE that shapes the screen: a row is editable on this
// brand only when the person is on it BECAUSE of this brand. Someone who reaches it as an
// owner, or through an `all`-brands membership, is not this brand's business — offering a
// control that would silently change every other brand is the failure this screen must not
// have. Plus the two things every access surface owes: it must not flash "denied" while
// the answer is still loading, and it must not describe an exception that is not there.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const listBrandPeople = vi.fn();
const listMembers = vi.fn();
const grantBrandAccess = vi.fn().mockResolvedValue(undefined);
const revokeBrandAccess = vi.fn().mockResolvedValue(undefined);

vi.mock('../data/membersApi', async (orig) => ({
  ...(await orig<typeof import('../data/membersApi')>()),
  listBrandPeople: (...a: unknown[]) => listBrandPeople(...a),
  listMembers: (...a: unknown[]) => listMembers(...a),
  grantBrandAccess: (...a: unknown[]) => grantBrandAccess(...a),
  revokeBrandAccess: (...a: unknown[]) => revokeBrandAccess(...a),
}));

import { BrandPeoplePanel } from '../components/BrandPeoplePanel';
import { useAccessStore } from '@/shared/access';

const BRAND = 'b-1';

const WS = {
  id: 'ws-1', name: 'Kaafex', slug: 'kaafex', isPersonal: false,
  role: 'owner' as const, mode: 'all' as const, defaultBrandRole: 'manager' as const,
  overrides: {}, creditsMonthlyCap: null,
  capabilities: ['workspace.view', 'brands.list'],
};

/** Seed the access store as though `my_access` had answered. */
function seedAccess(brandCaps: string[]) {
  useAccessStore.setState({
    phase: 'ready',
    workspaces: [WS],
    currentWorkspaceId: WS.id,
    brandsLoadedFor: WS.id,
    brands: {
      [BRAND]: { id: BRAND, slug: 'client-b', archived: false, role: 'manager', capabilities: brandCaps },
    },
  } as never);
}

const owner = {
  userId: 'u-alice', name: 'Alice Hamza', email: 'alice@demo.test', avatarUrl: null,
  workspaceRole: 'owner', status: 'active', brandRole: 'manager',
  via: 'role', overrides: {}, workspaceOverrides: {},
};
const allBrands = {
  userId: 'u-emma', name: 'Emma Said', email: 'emma@demo.test', avatarUrl: null,
  workspaceRole: 'member', status: 'active', brandRole: 'editor',
  via: 'workspace', overrides: {}, workspaceOverrides: {},
};
const direct = {
  userId: 'u-dana', name: 'Dana Ortiz', email: 'dana@demo.test', avatarUrl: null,
  workspaceRole: 'member', status: 'active', brandRole: 'designer',
  via: 'direct',
  overrides: { grant: ['ai.generate'] },
  workspaceOverrides: { deny: ['ai.generate'] },
};

const panel = () => (
  <BrandPeoplePanel brandId={BRAND} brandName="Client B" workspaceId={WS.id} currentUserId="u-alice" />
);

beforeEach(() => {
  useAccessStore.getState().reset();
  listBrandPeople.mockReset().mockResolvedValue([owner, allBrands, direct]);
  listMembers.mockReset().mockResolvedValue([]);
  grantBrandAccess.mockClear();
  revokeBrandAccess.mockClear();
});

describe('the list answers "who can reach this brand"', () => {
  it('names everyone, with the reason each one is here', async () => {
    seedAccess(['brand.view', 'brand.access.view', 'brand.access.manage']);
    render(panel());
    await waitFor(() => expect(screen.getByText('Alice Hamza')).toBeInTheDocument());
    expect(screen.getByText('Owner of the workspace')).toBeInTheDocument();
    expect(screen.getByText('Has every brand')).toBeInTheDocument();
    expect(screen.getByText('On this brand')).toBeInTheDocument();
    expect(screen.getByText('3 people can open this brand.')).toBeInTheDocument();
  });

  it('reports the brand role in force, not the workspace role', async () => {
    seedAccess(['brand.access.view']);
    render(panel());
    // Alice is an owner and therefore a MANAGER here — the server decides this, not the row
    await waitFor(() => expect(screen.getByText('Manager')).toBeInTheDocument());
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});

describe('a row is editable here only when it belongs to this brand', () => {
  it('offers no control for someone who is here by role or by scope', async () => {
    seedAccess(['brand.access.view', 'brand.access.manage']);
    render(panel());
    await waitFor(() => expect(screen.getByText('Alice Hamza')).toBeInTheDocument());
    // Exactly one Change and one Remove: Dana's. Changing Alice or Emma from here would
    // change every other brand too.
    expect(screen.getAllByRole('button', { name: 'Change' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
    expect(screen.getAllByText('Change in People')).toHaveLength(2);
  });

  it('offers nothing at all without brand.access.manage', async () => {
    seedAccess(['brand.access.view']);
    render(panel());
    await waitFor(() => expect(screen.getByText('Dana Ortiz')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add people' })).not.toBeInTheDocument();
  });
});

describe('the exception is described only when it is one', () => {
  it('says "AI here" when the person has AI off across the workspace', async () => {
    seedAccess(['brand.access.view']);
    render(panel());
    await waitFor(() => expect(screen.getByText(/AI here/)).toBeInTheDocument());
  });

  it('says nothing when AI is already on for them everywhere', async () => {
    // Same brand grant, but no workspace-wide deny — so it grants nothing extra and
    // announcing it would be noise.
    listBrandPeople.mockResolvedValue([{ ...direct, workspaceOverrides: {} }]);
    seedAccess(['brand.access.view']);
    render(panel());
    await waitFor(() => expect(screen.getByText('Dana Ortiz')).toBeInTheDocument());
    expect(screen.queryByText(/AI here/)).not.toBeInTheDocument();
  });
});

describe('editing writes only this brand', () => {
  it('stores the exception as an explicit grant', async () => {
    seedAccess(['brand.access.view', 'brand.access.manage']);
    render(panel());
    await waitFor(() => expect(screen.getByText('Dana Ortiz')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    await waitFor(() => expect(screen.getByText('Role on this brand')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(grantBrandAccess).toHaveBeenCalledTimes(1));
    expect(grantBrandAccess).toHaveBeenCalledWith(expect.objectContaining({
      brandId: BRAND,
      userId: 'u-dana',
      role: 'designer',
      overrides: { grant: ['ai.generate'] },
      allowAi: true,
    }));
  });

  it('removing says what it does and does not touch other brands', async () => {
    seedAccess(['brand.access.view', 'brand.access.manage']);
    render(panel());
    await waitFor(() => expect(screen.getByText('Dana Ortiz')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(screen.getByRole('alertdialog')).toHaveTextContent('access to other brands is unchanged'));
    expect(revokeBrandAccess).not.toHaveBeenCalled();
  });
});

describe('adding picks from people who are already in the workspace', () => {
  it('leaves out anyone who can already reach the brand', async () => {
    listMembers.mockResolvedValue([
      { userId: 'u-dana', name: 'Dana Ortiz', email: 'dana@demo.test', status: 'active', overrides: {} },
      { userId: 'u-grace', name: 'Grace Lee', email: 'grace@demo.test', status: 'active', overrides: {} },
    ]);
    seedAccess(['brand.access.view', 'brand.access.manage']);
    render(panel());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add people' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add people' }));

    await waitFor(() => expect(screen.getByText('Grace Lee')).toBeInTheDocument());
    // Dana is already on this brand; offering her again is offering a no-op
    expect(screen.getAllByText('Dana Ortiz')).toHaveLength(1);   // the row behind, not the list
  });
});

describe('access is never guessed', () => {
  it('shows neither the list nor a refusal while the answer is unknown', () => {
    useAccessStore.setState({ phase: 'unknown', workspaces: [], brands: {}, brandsLoadedFor: null } as never);
    const { container } = render(panel());
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText(/can see who has access/)).not.toBeInTheDocument();
  });

  it('refuses plainly once the answer is known', async () => {
    seedAccess(['brand.view']);   // no brand.access.view
    render(panel());
    await waitFor(() =>
      expect(screen.getByText(/Only people who manage Client B/)).toBeInTheDocument());
    expect(listBrandPeople).not.toHaveBeenCalled();
  });
});
