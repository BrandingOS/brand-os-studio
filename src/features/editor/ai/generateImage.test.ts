// Unit tests for the generateImage wrapper — Phase 4.3.
// Mocks the supabase client + injects a custom fetch impl. Covers
// the happy path, the auth-header branch, the error path, and the
// anon-session-id persistence path.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateImage } from './generateImage';

const getSessionMock = vi.fn(async () => ({ data: { session: null as unknown } }));
const getUserMock = vi.fn(async () => ({ data: { user: null as unknown } }));

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'anon-key',
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
      getUser: () => getUserMock(),
    },
  },
}));

beforeEach(() => {
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({ data: { session: null } });
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: null } });
  localStorage.clear();
});

describe('generateImage', () => {
  it('posts the prompt + dimensions and returns the parsed result', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ imageUrl: 'data:image/svg+xml;base64,abc', mock: true, prompt: 'cat' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateImage(
      { prompt: 'cat', width: 512, height: 256 },
      { fetchImpl, endpoint: 'https://x/test' },
    );

    expect(result).toMatchObject({
      imageUrl: 'data:image/svg+xml;base64,abc',
      images: [{ imageUrl: 'data:image/svg+xml;base64,abc' }],
      mock: true,
      prompt: 'cat',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://x/test');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.prompt).toBe('cat');
    expect(body.width).toBe(512);
    expect(body.height).toBe(256);
    expect(typeof body.sessionId).toBe('string');
    expect(body.sessionId.length).toBeGreaterThan(0);
  });

  it('attaches a Bearer token when supabase has a live session', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ imageUrl: 'x', mock: true, prompt: '' }), { status: 200 }),
    );

    await generateImage({ prompt: 'p' }, { fetchImpl, endpoint: 'https://x' });

    const headers = fetchImpl.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-123');
  });

  it('omits Authorization when there is no session', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ imageUrl: 'x', mock: true, prompt: '' }), { status: 200 }),
    );

    await generateImage({ prompt: 'p' }, { fetchImpl, endpoint: 'https://x' });

    const headers = fetchImpl.mock.calls[0][1]?.headers as Record<string, string>;
    // No session → the anon key is the bearer (the gateway verifies JWTs).
    expect(headers.Authorization).toBe('Bearer anon-key');
    expect(headers.apikey).toBe('anon-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws with the status code when the service returns non-OK', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response('boom', { status: 502, headers: { 'Content-Type': 'text/plain' } }),
    );

    await expect(
      generateImage({ prompt: 'p' }, { fetchImpl, endpoint: 'https://x' }),
    ).rejects.toThrow(/AI image service 502/);
  });

  it('reuses the persisted anon session id across calls when no auth user', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ imageUrl: 'x', mock: true, prompt: '' }), { status: 200 }),
    );

    await generateImage({ prompt: 'a' }, { fetchImpl, endpoint: 'https://x' });
    await generateImage({ prompt: 'b' }, { fetchImpl, endpoint: 'https://x' });

    const idA = JSON.parse(fetchImpl.mock.calls[0][1]?.body as string).sessionId;
    const idB = JSON.parse(fetchImpl.mock.calls[1][1]?.body as string).sessionId;
    expect(idA).toBe(idB);
    expect(idA.startsWith('anon-')).toBe(true);
  });

  it('uses the supabase user id as the session id when authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-xyz' } } });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ imageUrl: 'x', mock: true, prompt: '' }), { status: 200 }),
    );

    await generateImage({ prompt: 'p' }, { fetchImpl, endpoint: 'https://x' });

    const body = JSON.parse(fetchImpl.mock.calls[0][1]?.body as string);
    expect(body.sessionId).toBe('user-xyz');
  });
});
