import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/shared/store/sessionStore';
import { ProtectedRoute } from './ProtectedRoute';

const LoginProbe = () => {
  const loc = useLocation();
  return <div data-testid="login">login from={(loc.state as { from?: string } | null)?.from ?? ''}</div>;
};

const mount = (path = '/b/acme/setup?tab=x', role?: 'moderator') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/dashboard" element={<div data-testid="dashboard" />} />
        <Route
          path="/b/:slug/setup"
          element={
            <ProtectedRoute role={role}>
              <div data-testid="secret" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const setSession = (patch: Partial<ReturnType<typeof useSessionStore.getState>>) =>
  useSessionStore.setState(patch as any);

beforeEach(() => {
  setSession({ isLoading: true, isAuthenticated: false, platformRole: 'user', roleResolved: false, isModerator: false });
});

describe('ProtectedRoute', () => {
  it('shows a spinner while the session is loading', () => {
    mount();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).toBeNull();
  });

  it('redirects a guest to /login and remembers where they were going', () => {
    setSession({ isLoading: false, isAuthenticated: false });
    mount();
    expect(screen.getByTestId('login')).toHaveTextContent('from=/b/acme/setup?tab=x');
  });

  it('renders children when authenticated', () => {
    setSession({ isLoading: false, isAuthenticated: true });
    mount();
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('role gate waits for the role lookup, then admits or bounces', () => {
    setSession({ isLoading: false, isAuthenticated: true, roleResolved: false });
    const { unmount } = mount('/b/acme/setup', 'moderator');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    unmount();

    setSession({ isLoading: false, isAuthenticated: true, roleResolved: true, platformRole: 'user' });
    const r2 = mount('/b/acme/setup', 'moderator');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    r2.unmount();

    setSession({ isLoading: false, isAuthenticated: true, roleResolved: true, platformRole: 'admin' });
    mount('/b/acme/setup', 'moderator');
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });
});
