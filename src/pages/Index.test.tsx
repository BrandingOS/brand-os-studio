// `/` inside the SPA is a BRIDGE to the landing document, not a landing.
//
// The landing is its own document (landingpage/ → dist/landing/index.html,
// served at `/` by functions/_middleware.ts). React Router only reaches this
// route on an IN-APP navigation to `/` — a logo click, a logout, NotFound's
// "home". The honest answer to that is to ask the server for `/` again.
//
// The bug this file pins: the route used to RENDER a second, legacy
// marketing landing (src/domains/landing, orange --accent-pop #F36123) as
// its visible content while it waited for the session to resolve, and only
// then bounce. The visitor saw the old landing, then the real one. Anything
// marketing painting here is that bug coming back.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = { isAuthenticated: false, isLoading: false };
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => auth }));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import Index from './Index';

/** Every scrap of visible text the route paints. */
const painted = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

const mount = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Index />
    </MemoryRouter>,
  );

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  auth.isAuthenticated = false;
  auth.isLoading = false;
  navigate.mockClear();
  sessionStorage.clear();
  replace = vi.fn();
  // jsdom refuses a real navigation; take the method, not the whole location.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, replace, pathname: '/', search: '' },
  });
});

afterEach(() => cleanup());

describe('the SPA `/` route paints no landing of its own', () => {
  it('renders nothing while the session is still resolving', () => {
    auth.isLoading = true;
    const { container } = mount();
    expect(painted(container)).toBe('');
  });

  it('renders nothing for a guest, and asks the server for the landing', async () => {
    const { container } = mount();
    expect(painted(container)).toBe('');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('renders nothing for a signed-in visitor, and sends them to the dashboard', async () => {
    auth.isAuthenticated = true;
    const { container } = mount();
    expect(painted(container)).toBe('');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not bounce for ever when the deploy has no landing document', async () => {
    sessionStorage.setItem('brandos:landing-bounced', '1');
    mount();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
