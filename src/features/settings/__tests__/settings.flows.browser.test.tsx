// Browser E2E — the settings surface, end to end in a real DOM.
//
// There were NO tests on src/pages/settings/ or SettingsLayout before this.
// These pin the contracts that matter rather than the markup:
//   * the three tabs are real routes, so a refresh and a back button work
//   * the interface choice actually writes through to the preferences service
//   * a pending deletion is visible and cancellable from anywhere
//   * the Danger Zone hides itself when migration 029 is not deployed

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

// ── Stubs ───────────────────────────────────────────────────────────────────

// vi.mock is hoisted above every top-level statement, so anything its factory
// closes over has to be hoisted too — otherwise the factory hits the TDZ.
const { rpc, authUpdateUser } = vi.hoisted(() => ({
  rpc: vi.fn(),
  authUpdateUser: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        update: () => chain,
        upsert: async () => ({ error: null }),
      };
      return chain;
    },
    rpc: (...args: unknown[]) => rpc(...args),
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } } }),
      updateUser: authUpdateUser,
      signInWithPassword: async () => ({ error: null }),
    },
    functions: { invoke: async () => ({ data: null, error: null }) },
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn(async () => {}) }),
}));

import { SettingsLayout } from '@/shared/layouts/SettingsLayout';
import AccountSettingsPage from '@/pages/settings/account';
import PreferencesSettingsPage from '@/pages/settings/preferences';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useUiPreferenceStore } from '@/shared/hooks/useUiPreference';
import { useAccountDeletionStore } from '@/features/auth/deletion/accountDeletionStore';
import { AccountDeletionBanner } from '@/features/auth/deletion/AccountDeletionBanner';
import { bootServices } from '@/core/boot';
import { PreferencesBridge } from '@/shared/preferences/PreferencesBridge';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IUserPreferencesService } from '@/core/types/services';

function mountSettings(initial = '/settings/account') {
  let location = '';
  function Probe() {
    location = useLocation().pathname;
    return null;
  }
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
      {/* The bridge is what carries a store change through to the preferences
          service. It lives in AuthProvider in the real app, so a harness
          without it would silently prove the wrong thing. */}
      <PreferencesBridge />
      <Routes>
        <Route path="/settings" element={<SettingsLayout />}>
          <Route path="account" element={<AccountSettingsPage />} />
          <Route path="preferences" element={<PreferencesSettingsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return () => location;
}

beforeEach(() => {
  window.localStorage.clear();
  container.clear();
  bootServices();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
  useSessionStore.setState({
    user: {
      id: 'user-1',
      email: 'a@example.com',
      name: 'Ada Lovelace',
      plan: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isAuthenticated: true,
    isLoading: false,
  } as never);
  useUiPreferenceStore.setState({ preference: 'studio' });
  useAccountDeletionStore.setState({ available: false, pending: null });
});

afterEach(() => cleanup());

// ── Shell ───────────────────────────────────────────────────────────────────

describe('the settings shell', () => {
  it('renders the sections this account has', () => {
    // People joined Account/Preferences/Plan when membership stopped being theatre.
    // It hides itself for anyone without `members.view` — every guest — but access has
    // not hydrated in this test, and `unknown` shows it optimistically rather than
    // flashing a tab away a moment later.
    mountSettings();
    const tablist = screen.getByRole('tablist', { name: /settings sections/i });
    const labels = Array.from(tablist.querySelectorAll('[role="tab"]')).map(
      (t) => t.textContent,
    );
    expect(labels).toEqual(['Account', 'People', 'Preferences', 'Plan']);
  });

  it('each tab is a real route, so refresh and Back work', async () => {
    const where = mountSettings();
    expect(where()).toBe('/settings/account');

    fireEvent.click(screen.getByRole('tab', { name: 'Preferences' }));
    await waitFor(() => expect(where()).toBe('/settings/preferences'));
  });

  it('marks the tab matching the URL as selected on a cold load', () => {
    mountSettings('/settings/preferences');
    expect(screen.getByRole('tab', { name: 'Preferences' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

// ── Preferences ─────────────────────────────────────────────────────────────

describe('the interface preference', () => {
  it('writes through to the preferences service, not just local state', async () => {
    mountSettings('/settings/preferences');
    const prefs = container.get<IUserPreferencesService>(SERVICE_KEYS.USER_PREFERENCES);

    fireEvent.click(screen.getByRole('button', { name: /Classic/ }));

    await waitFor(() => {
      expect(useUiPreferenceStore.getState().preference).toBe('classic');
    });
    // The bridge is what carries a store change to the service; without it the
    // choice would never leave this browser.
    await waitFor(() => {
      expect(prefs.getCached().uiPreference).toBe('classic');
    });
  });

  it('shows which of the two is active', () => {
    mountSettings('/settings/preferences');
    const studio = screen.getByRole('button', { name: /Studio/ });
    expect(studio).toHaveAttribute('aria-pressed', 'true');
  });
});

// ── Account ─────────────────────────────────────────────────────────────────

describe('the account page', () => {
  it('hides the Danger Zone when migration 029 is not deployed', () => {
    useAccountDeletionStore.setState({ available: false, pending: null });
    mountSettings('/settings/account');
    expect(screen.queryByRole('button', { name: /delete account/i })).toBeNull();
  });

  it('offers deletion once 029 is available', () => {
    useAccountDeletionStore.setState({ available: true, pending: null });
    mountSettings('/settings/account');
    expect(screen.getByRole('button', { name: /delete account/i })).toBeTruthy();
  });

  it('will not save a name that has not changed', () => {
    mountSettings('/settings/account');
    const save = screen.getAllByRole('button', { name: 'Save' })[0];
    expect(save).toBeDisabled();
  });

  it('enables Save once the name is edited', () => {
    mountSettings('/settings/account');
    const input = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Grace Hopper' } });
    expect(screen.getAllByRole('button', { name: 'Save' })[0]).not.toBeDisabled();
  });
});

// ── The pending-deletion banner ─────────────────────────────────────────────

describe('a scheduled deletion', () => {
  const inFiveDays = new Date(Date.now() + 5 * 86_400_000).toISOString();

  it('is invisible when nothing is scheduled', () => {
    render(<AccountDeletionBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says what will go and when', () => {
    useAccountDeletionStore.setState({
      available: true,
      pending: { id: 'r1', purgeAfter: inFiveDays, requestedAt: '', graceDays: 7 },
    });
    render(<AccountDeletionBanner />);
    const banner = screen.getByRole('status');
    expect(banner.textContent).toMatch(/brands you own/i);
    expect(banner.textContent).toMatch(/in 5 days/i);
  });

  it('can be cancelled, and clears itself when it is', async () => {
    useAccountDeletionStore.setState({
      available: true,
      pending: { id: 'r1', purgeAfter: inFiveDays, requestedAt: '', graceDays: 7 },
    });
    render(<AccountDeletionBanner />);

    fireEvent.click(screen.getByText('Keep my account'));

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('cancel_account_deletion');
    });
    await waitFor(() => {
      expect(useAccountDeletionStore.getState().pending).toBeNull();
    });
  });
});
