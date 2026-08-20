import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The page decides what to show from two stores; the shell and card menu are
// noise for what is under test.
vi.mock('@/shared/layouts/WorkspaceShellAlt', () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => <div data-workspace>{children}</div>,
}));
vi.mock('@/features/dashboard/components/BrandCardMenu', () => ({
  BrandCardMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/shared/brand/brandPalette', () => ({
  surfacePalette: () => ({ bg: '#123456', text: '#fff' }),
}));
// PARTIAL: this test only needs "no logo resolves", and the card face
// reaches for several other helpers in this module. A total mock breaks
// the moment one more is added — which is exactly what happened when the
// card-face work started calling variantsInPriorityOrder.
vi.mock('@/shared/brand/logoOnBackground', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/brand/logoOnBackground')>()),
  pickLogoOnBackground: () => undefined,
}));
vi.mock('@/shared/hooks/useUiPreference', () => ({ useUiPreference: () => 'studio' }));

const loadAll = vi.fn(async () => {});
const brandState = { list: [] as unknown[], listReady: false, error: undefined as string | undefined, loadAll };
const sessionState = { isAuthenticated: true, isLoading: false };
vi.mock('@/shared/store/brandStore', () => ({
  useBrandStore: (sel: (s: typeof brandState) => unknown) => sel(brandState),
}));
vi.mock('@/shared/store/sessionStore', () => ({
  useSessionStore: (sel: (s: typeof sessionState) => unknown) => sel(sessionState),
}));

import WorkspaceHome from './Home';

const brand = (name: string) => ({ id: name, name, slug: name, updatedAt: new Date() });
const mount = () => render(<MemoryRouter><WorkspaceHome /></MemoryRouter>);

beforeEach(() => {
  loadAll.mockClear();
  brandState.list = [];
  brandState.listReady = false;
  brandState.error = undefined;
  sessionState.isAuthenticated = true;
  sessionState.isLoading = false;
});

describe('WorkspaceHome — what shows while brands are unconfirmed', () => {
  it('shows the skeleton, not the empty state, while the list is unconfirmed', () => {
    mount();
    expect(screen.getByRole('status', { name: /loading your brands/i })).toBeInTheDocument();
    expect(screen.queryByText(/no brands yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Create a new brand')).not.toBeInTheDocument();
  });

  it('shows the skeleton while auth is still resolving, and does not fetch yet', () => {
    sessionState.isLoading = true;
    mount();
    expect(screen.getByRole('status', { name: /loading your brands/i })).toBeInTheDocument();
    expect(loadAll).not.toHaveBeenCalled();
  });

  it('shows the empty state only once a request confirmed zero brands', () => {
    brandState.listReady = true;
    mount();
    expect(screen.getByText(/no brands yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows cards only once the current user\'s list is confirmed', () => {
    brandState.list = [brand('Alpha'), brand('Beta')];
    // Unconfirmed brands (a previous scope's, mid-transition) never render…
    const { unmount } = mount();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    unmount();
    // …confirmed ones do.
    brandState.listReady = true;
    mount();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Create a new brand')).toBeInTheDocument();
  });

  it('a failed load shows an error with retry, never the empty state', () => {
    brandState.error = 'Network down';
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
    expect(screen.queryByText(/no brands yet/i)).not.toBeInTheDocument();
    screen.getByRole('button', { name: /try again/i }).click();
    expect(loadAll).toHaveBeenCalled();
  });
});
