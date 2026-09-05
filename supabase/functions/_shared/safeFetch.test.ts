import { describe, expect, it, vi } from 'vitest';
import { checkUrl, isPrivateAddress, safeFetch, type SafeFetchDeps } from './safeFetch.ts';

const html = (body: string, init: ResponseInit = {}) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, ...init });

function deps(over: Partial<SafeFetchDeps> = {}): SafeFetchDeps {
  return {
    fetch: vi.fn(async () => html('<html><title>ok</title></html>')),
    resolve: vi.fn(async () => ['93.184.216.34']),
    ...over,
  };
}

const LIMITS = { maxBytes: 1024, timeoutMs: 1000, allow: ['text/html'] as const };

describe('addresses a scan must never connect to', () => {
  it.each([
    ['10.0.0.1'], ['10.255.255.255'], ['172.16.0.1'], ['172.31.255.255'], ['192.168.1.1'],
    ['127.0.0.1'], ['127.9.9.9'], ['0.0.0.0'], ['0.1.2.3'], ['169.254.169.254'], ['169.254.1.1'],
    ['100.64.0.1'], ['100.127.255.255'], ['192.0.0.1'], ['198.18.0.1'], ['224.0.0.1'], ['240.0.0.1'], ['255.255.255.255'],
  ])('IPv4 %s is private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    ['::1'], ['::'], ['fc00::1'], ['fd12:3456::1'], ['fe80::1'], ['ff02::1'], ['2001:db8::1'],
    ['::ffff:127.0.0.1'], ['::ffff:10.0.0.1'], ['::ffff:169.254.169.254'], ['::ffff:7f00:1'],
    ['64:ff9b::7f00:1'], ['2002:0a00:0001::'], ['[::1]'], ['fe80::1%eth0'], ['fec0::1'], ['64:ff9b:1::1'], ['2001:0:1::1'],
  ])('IPv6 %s is private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([['93.184.216.34'], ['8.8.8.8'], ['172.15.0.1'], ['172.32.0.1'], ['2606:4700::6810:84e5'], ['::ffff:93.184.216.34']])(
    '%s is public',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    },
  );

  it('an unparseable address counts as private', () => {
    expect(isPrivateAddress('not-an-ip')).toBe(true);
  });
});

describe('the address policy', () => {
  it('accepts an ordinary site and drops the fragment', () => {
    const r = checkUrl('https://Northwind.studio/about#team');
    expect(r.ok && r.url.toString()).toBe('https://northwind.studio/about');
  });

  it.each([['ftp://x.com'], ['file:///etc/passwd'], ['javascript:alert(1)'], ['gopher://x']])('refuses scheme %s', (u) => {
    expect(checkUrl(u)).toMatchObject({ ok: false, code: 'disallowed_scheme' });
  });

  it('refuses non-standard ports', () => {
    expect(checkUrl('http://x.com:8080')).toMatchObject({ ok: false, code: 'disallowed_port' });
    expect(checkUrl('https://x.com:443/a')).toMatchObject({ ok: true });
    expect(checkUrl('http://x.com:443/a')).toMatchObject({ ok: false, code: 'disallowed_port' });
    expect(checkUrl('https://x.com:80/a')).toMatchObject({ ok: false, code: 'disallowed_port' });
  });

  it('refuses credentials in the address', () => {
    expect(checkUrl('https://user:pw@x.com')).toMatchObject({ ok: false, code: 'invalid_url' });
  });

  it.each([
    ['http://localhost'], ['http://foo.localhost'], ['http://metadata.google.internal/computeMetadata'],
    ['http://127.0.0.1'], ['http://[::1]/'], ['http://169.254.169.254/latest/meta-data'],
    ['http://2130706433/'], ['http://0x7f000001/'], ['http://0177.0.0.1/'], ['http://127.1/'], ['http://[::ffff:127.0.0.1]/'],
    ['http://10.0.0.1'], ['http://printer.local'],
  ])('refuses %s before any connection', (u) => {
    expect(checkUrl(u)).toMatchObject({ ok: false, code: 'private_address' });
  });

  it('a public hostname passes the static check and is resolved later', () => {
    expect(checkUrl('https://example.com')).toMatchObject({ ok: true });
  });
});

describe('fetching under the policy', () => {
  it('resolves the host first and refuses one that resolves to a private address', async () => {
    const d = deps({ resolve: vi.fn(async () => ['93.184.216.34', '10.0.0.5']) });
    const r = await safeFetch('https://evil.example', LIMITS, d);
    expect(r).toMatchObject({ ok: false, code: 'private_address' });
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it('reports a host that does not resolve', async () => {
    const d = deps({ resolve: vi.fn(async () => []) });
    expect(await safeFetch('https://nope.example', LIMITS, d)).toMatchObject({ ok: false, code: 'dns_failed' });
  });

  it('re-validates every redirect hop and refuses a hop into a private address', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url === 'https://public.example/') return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } });
      return html('should never be fetched');
    });
    const r = await safeFetch('https://public.example', { ...LIMITS, allowCrossOriginRedirect: true }, deps({ fetch }));
    expect(r).toMatchObject({ ok: false, code: 'private_address' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('resolves the redirect target again — DNS is checked per hop', async () => {
    const resolve = vi.fn(async (host: string) => (host === 'public.example' ? ['93.184.216.34'] : ['10.1.1.1']));
    const fetch = vi.fn(async (url: string) =>
      url === 'https://public.example/'
        ? new Response(null, { status: 301, headers: { location: 'https://internal.example/' } })
        : html('secret'),
    );
    const r = await safeFetch('https://public.example', { ...LIMITS, allowCrossOriginRedirect: true }, deps({ fetch, resolve }));
    expect(r).toMatchObject({ ok: false, code: 'private_address' });
    expect(resolve).toHaveBeenCalledWith('internal.example');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('follows a same-origin redirect and reports the final url', async () => {
    const fetch = vi.fn(async (url: string) =>
      url === 'https://x.example/old' ? new Response(null, { status: 308, headers: { location: '/new' } }) : html('<p>new</p>'),
    );
    const r = await safeFetch('https://x.example/old', LIMITS, deps({ fetch }));
    expect(r).toMatchObject({ ok: true, finalUrl: 'https://x.example/new' });
  });

  it('a key page may not redirect off the site; the homepage may', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.startsWith('https://x.example') ? new Response(null, { status: 302, headers: { location: 'https://www.x.example/' } }) : html('home'),
    );
    expect(await safeFetch('https://x.example/about', LIMITS, deps({ fetch }))).toMatchObject({ ok: false, code: 'redirect_disallowed' });
    expect(await safeFetch('https://x.example/', { ...LIMITS, allowCrossOriginRedirect: true }, deps({ fetch }))).toMatchObject({ ok: true });
  });

  it('refuses a downgrade from https to http', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://x.example/' } }));
    expect(await safeFetch('https://x.example/', { ...LIMITS, allowCrossOriginRedirect: true }, deps({ fetch }))).toMatchObject({ ok: false, code: 'redirect_disallowed' });
  });

  it('stops after the redirect cap', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: '/again' } }));
    const r = await safeFetch('https://x.example/', LIMITS, deps({ fetch }));
    expect(r).toMatchObject({ ok: false, code: 'too_many_redirects' });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('drops a document of the wrong content type without reading it', async () => {
    const fetch = vi.fn(async () => new Response('%PDF-1.4', { status: 200, headers: { 'content-type': 'application/pdf' } }));
    expect(await safeFetch('https://x.example/brochure', LIMITS, deps({ fetch }))).toMatchObject({ ok: false, code: 'content_type' });
  });

  it('caps the body while streaming and marks it truncated', async () => {
    const big = 'x'.repeat(5000);
    const fetch = vi.fn(async () => html(big));
    const r = await safeFetch('https://x.example/', LIMITS, deps({ fetch }));
    expect(r.ok && r.bytes).toBe(1024);
    expect(r.ok && r.truncated).toBe(true);
  });

  it('names a bot wall as blocked, not as a generic error', async () => {
    const fetch = vi.fn(async () => html('<title>Just a moment...</title><div id="cf-challenge">', { status: 403 }));
    expect(await safeFetch('https://x.example/', LIMITS, deps({ fetch }))).toMatchObject({ ok: false, code: 'blocked', status: 403 });
  });

  it('reports a timeout as a timeout', async () => {
    const fetch = vi.fn(async () => {
      const e = new Error('timed out');
      e.name = 'TimeoutError';
      throw e;
    });
    expect(await safeFetch('https://x.example/', LIMITS, deps({ fetch }))).toMatchObject({ ok: false, code: 'timeout' });
  });

  it('identifies itself and never lets the platform follow redirects on its own', async () => {
    const fetch = vi.fn(async () => html('ok'));
    await safeFetch('https://x.example/', LIMITS, deps({ fetch }));
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.redirect).toBe('manual');
    expect((init.headers as Record<string, string>)['User-Agent']).toContain('BrandingOSBot');
  });
});
