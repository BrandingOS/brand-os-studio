// ============================================================================
// The access gates in a real browser (Chromium).
//
// What is worth proving here is not "does `can()` return true" — the resolver has 869
// unit cells for that — but the RENDERING policy, which is where a permission model
// actually hurts people:
//
//   • a gate must never flash the denied branch while access is still loading
//   • read-only must render the content and remove the controls, not blank the page
//   • a brand you cannot reach inside your OWN workspace is a 403 that names someone,
//     not a 404 that implies the work is gone
// ============================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Can, AccessGate, ReadOnlyNotice, AccessDeniedPanel } from '../Can';
import { useAccessStore } from '../accessStore';

const WS = {
  id: 'ws-1', name: 'Kaafex', slug: 'kaafex', isPersonal: false,
  role: 'member' as const, mode: 'all' as const, defaultBrandRole: 'viewer' as const,
  overrides: {}, creditsMonthlyCap: null,
  capabilities: ['workspace.view', 'brands.list', 'members.view'],
};

function seed(partial: Partial<ReturnType<typeof useAccessStore.getState>>) {
  useAccessStore.setState({
    phase: 'unknown', workspaces: [], currentWorkspaceId: null,
    brands: {}, brandsLoadedFor: null, ...partial,
  } as never);
}

beforeEach(() => {
  useAccessStore.getState().reset();
});

describe('a gate never guesses while access is loading', () => {
  it('renders neither branch before hydration', () => {
    seed({ phase: 'unknown' });
    render(
      <Can capability="designs.edit" fallback={<p>denied</p>} pending={<p>waiting</p>}>
        <p>allowed</p>
      </Can>,
    );
    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(screen.queryByText('denied')).not.toBeInTheDocument();
    expect(screen.queryByText('allowed')).not.toBeInTheDocument();
  });

  it('shows the denied branch only once the answer is known', async () => {
    seed({ phase: 'unknown' });
    const { rerender } = render(
      <Can capability="designs.edit" fallback={<p>denied</p>} pending={<p>waiting</p>}>
        <p>allowed</p>
      </Can>,
    );
    expect(screen.getByText('waiting')).toBeInTheDocument();

    seed({ phase: 'ready', workspaces: [WS], currentWorkspaceId: WS.id, brandsLoadedFor: WS.id });
    rerender(
      <Can capability="designs.edit" fallback={<p>denied</p>} pending={<p>waiting</p>}>
        <p>allowed</p>
      </Can>,
    );
    await waitFor(() => expect(screen.getByText('denied')).toBeInTheDocument());
  });

  it('shows the allowed branch when the capability is held', async () => {
    seed({
      phase: 'ready',
      workspaces: [{ ...WS, capabilities: [...WS.capabilities, 'members.invite'] }],
      currentWorkspaceId: WS.id,
      brandsLoadedFor: WS.id,
    });
    render(
      <Can capability="members.invite" fallback={<p>denied</p>}>
        <button type="button">Invite member</button>
      </Can>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument());
  });
});

describe('brand-scoped gates', () => {
  it('waits for the brand map even when the workspace is known', () => {
    // The workspace has hydrated but the brand list has not: the honest answer is still
    // "we don't know", or every brand page would flash its read-only banner on entry.
    seed({ phase: 'ready', workspaces: [WS], currentWorkspaceId: WS.id, brandsLoadedFor: null });
    render(
      <Can capability="brand.setup.edit" brandId="b-1" fallback={<p>read-only</p>} pending={<p>waiting</p>}>
        <p>editable</p>
      </Can>,
    );
    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('answers from the brand entry once it has arrived', async () => {
    seed({
      phase: 'ready',
      workspaces: [WS],
      currentWorkspaceId: WS.id,
      brandsLoadedFor: WS.id,
      brands: {
        'b-1': {
          id: 'b-1', slug: 'a1', archived: false, role: 'editor',
          capabilities: ['brand.view', 'brand.setup.edit', 'designs.edit'],
        },
      },
    });
    render(
      <Can capability="brand.setup.edit" brandId="b-1" fallback={<p>read-only</p>}>
        <p>editable</p>
      </Can>,
    );
    await waitFor(() => expect(screen.getByText('editable')).toBeInTheDocument());
  });

  it('a viewer sees the brand but not its controls', async () => {
    seed({
      phase: 'ready',
      workspaces: [WS],
      currentWorkspaceId: WS.id,
      brandsLoadedFor: WS.id,
      brands: { 'b-1': { id: 'b-1', slug: 'a1', archived: false, role: 'viewer', capabilities: ['brand.view'] } },
    });
    render(
      <div>
        <h1>Setup</h1>
        <Can capability="brand.setup.edit" brandId="b-1" fallback={<ReadOnlyNotice managers={['Alice Hamza']} />}>
          <button type="button">Add colour</button>
        </Can>
      </div>,
    );
    // The content is still there — read-only is not a blank page
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Add colour' })).not.toBeInTheDocument();
    // …and the notice names someone who can actually help
    expect(screen.getByRole('status')).toHaveTextContent('Ask Alice Hamza');
  });
});

describe('the two denied panels say different things on purpose', () => {
  it('names who can grant access inside your own workspace', () => {
    render(<AccessDeniedPanel variant="forbidden" managers={['Alice Hamza', 'Adam Ortiz']} />);
    const panel = screen.getByRole('alert');
    expect(panel).toHaveTextContent('You don’t have access to this brand');
    expect(panel).toHaveTextContent('Alice Hamza or Adam Ortiz');
  });

  it('says nothing about the tenant when the caller is outside it', () => {
    render(<AccessDeniedPanel variant="not-found" />);
    const panel = screen.getByRole('alert');
    expect(panel).toHaveTextContent('We couldn’t find that');
    // No workspace name, no member names, nothing to enumerate
    expect(panel.textContent).not.toMatch(/Alice|Kaafex|workspace/i);
  });

  it('an archived brand reads as archived, not as a permission problem', () => {
    render(<ReadOnlyNotice reason="archived" what="Client A" />);
    expect(screen.getByRole('status')).toHaveTextContent('Client A is archived');
  });
});

describe('AccessGate picks the right panel', () => {
  it('renders a 403 when the brand is one of ours', async () => {
    seed({
      phase: 'ready',
      workspaces: [WS],
      currentWorkspaceId: WS.id,
      brandsLoadedFor: WS.id,
      brands: { 'b-1': { id: 'b-1', slug: 'a1', archived: false, role: 'viewer', capabilities: ['brand.view'] } },
    });
    render(
      <AccessGate capability="brand.setup.edit" brandId="b-1" managers={['Alice Hamza']}>
        <p>Setup</p>
      </AccessGate>,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('don’t have access'));
  });

  it('renders the 404 shape for a brand we have never heard of', async () => {
    seed({ phase: 'ready', workspaces: [WS], currentWorkspaceId: WS.id, brandsLoadedFor: WS.id, brands: {} });
    render(
      <AccessGate capability="brand.setup.edit" brandId="someone-elses-brand">
        <p>Setup</p>
      </AccessGate>,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('couldn’t find'));
  });
});
