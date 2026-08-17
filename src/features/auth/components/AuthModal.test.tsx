import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const H = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendPasswordReset: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock('../session/authController', () => ({
  DEV_AUTH_BYPASS: false,
  DEV_BYPASS_USER: { id: 'dev-bypass-user' },
  DEV_BYPASS_STORAGE_KEY: 'brandos:dev-bypass',
  signInWithPassword: H.signInWithPassword,
  signUp: H.signUp,
  signInWithGoogle: H.signInWithGoogle,
  sendPasswordReset: H.sendPasswordReset,
}));
vi.mock('sonner', () => ({ toast: { error: H.toastError, success: H.toastSuccess } }));

import { AuthModal } from './AuthModal';

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const mount = (props: Partial<React.ComponentProps<typeof AuthModal>> = {}, from?: string) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: from ? { from } : undefined }]}>
      <Routes>
        <Route path="*" element={<><Where /><AuthModal isOpen onClose={() => {}} {...props} /></>} />
      </Routes>
    </MemoryRouter>,
  );

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};

beforeEach(() => vi.clearAllMocks());

describe('AuthModal', () => {
  it('shows the mapped error on a failed login and stays put', async () => {
    H.signInWithPassword.mockResolvedValueOnce({ error: 'Invalid email or password. Please try again.' });
    mount();
    fill('a@b.co', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(H.toastError).toHaveBeenCalledWith('Invalid email or password. Please try again.'));
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });

  it('navigates back to where the guard sent us from after a successful login', async () => {
    H.signInWithPassword.mockResolvedValueOnce({ error: null });
    mount({}, '/b/acme/setup');
    fill('a@b.co', 'right');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/b/acme/setup'));
    expect(H.signInWithPassword).toHaveBeenCalledWith('a@b.co', 'right');
  });

  it('refuses an off-site next target', async () => {
    H.signInWithPassword.mockResolvedValueOnce({ error: null });
    mount({ next: 'https://evil.example/x' });
    fill('a@b.co', 'right');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });

  it('after sign-up that needs confirmation, shows the inbox panel instead of navigating', async () => {
    H.signUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true });
    mount({ defaultMode: 'register' });
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New Person' } });
    fill('new@b.co', 'password1');
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByTestId('auth-sent-panel')).toBeInTheDocument());
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });

  it('Google sends the same-origin destination along', async () => {
    H.signInWithGoogle.mockResolvedValueOnce({ error: null });
    mount({}, '/b/acme/setup');
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => expect(H.signInWithGoogle).toHaveBeenCalledWith('/b/acme/setup'));
  });
});
