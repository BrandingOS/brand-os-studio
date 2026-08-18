import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const H = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendPasswordReset: vi.fn(),
  verifySignupCode: vi.fn(),
  resendSignupCode: vi.fn(),
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
  verifySignupCode: H.verifySignupCode,
  resendSignupCode: H.resendSignupCode,
  SIGNUP_CODE_LENGTH: 6,
}));
vi.mock('sonner', () => ({ toast: { error: H.toastError, success: H.toastSuccess } }));

import { AuthModal } from './AuthModal';

// input-otp measures its slots; jsdom has no ResizeObserver.
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver ??= RO;
(document as any).elementFromPoint ??= () => null;

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

  it('sign-up without a session shows the code panel (no confirm-password field), and the code signs the user in', async () => {
    H.signUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true });
    H.verifySignupCode.mockResolvedValueOnce({ error: null });
    mount({ defaultMode: 'register' }, '/b/acme/setup');
    expect(screen.queryByLabelText('Confirm Password')).toBeNull();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New Person' } });
    fill('new@b.co', 'password1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByTestId('auth-code-panel')).toBeInTheDocument());
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
    // typing the full code verifies and navigates to the destination
    const otp = screen.getByLabelText('Confirmation code');
    fireEvent.change(otp, { target: { value: '123456' } });
    await waitFor(() => expect(H.verifySignupCode).toHaveBeenCalledWith('new@b.co', '123456'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/b/acme/setup'));
  });

  it('a wrong code shows the error and stays on the code panel', async () => {
    H.signUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true });
    H.verifySignupCode.mockResolvedValueOnce({ error: 'That code is wrong or has expired. Check the digits or request a new one.' });
    mount({ defaultMode: 'register' });
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New Person' } });
    fill('new@b.co', 'password1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByTestId('auth-code-panel')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '000000' } });
    await waitFor(() => expect(H.toastError).toHaveBeenCalledWith(expect.stringMatching(/wrong or has expired/)));
    expect(screen.getByTestId('auth-code-panel')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });

  it('logging in with an unconfirmed email re-sends the code and opens the code panel', async () => {
    H.signInWithPassword.mockResolvedValueOnce({ error: 'Please verify your email…', code: 'email_not_confirmed' });
    H.resendSignupCode.mockResolvedValueOnce({ error: null });
    mount();
    fill('old@b.co', 'pw');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(H.resendSignupCode).toHaveBeenCalledWith('old@b.co'));
    expect(screen.getByTestId('auth-code-panel')).toBeInTheDocument();
  });

  it('Google sends the same-origin destination along', async () => {
    H.signInWithGoogle.mockResolvedValueOnce({ error: null });
    mount({}, '/b/acme/setup');
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => expect(H.signInWithGoogle).toHaveBeenCalledWith('/b/acme/setup'));
  });
});
