// ============================================================================
// SSRF-safe fetch for user-supplied addresses.
//
// A website scan fetches whatever URL a signed-in user typed. Every rule here
// exists because the naive version is a request from inside our network to
// wherever the caller points it (threat class: read-SSRF):
//
//   - http/https only, default ports only
//   - the host is RESOLVED before every connection and every address it
//     resolves to must be public — IPv4, IPv6, and the mapped/embedded forms
//   - redirects are followed by hand (max 3) and every hop is re-validated
//   - the content-type must be one the caller asked for
//   - the body is read up to a cap while streaming, never after
//   - every request has its own timeout
//
// Dependencies (fetch, DNS) are injected so the whole policy is unit-testable
// without a network and without Deno. `denoDeps()` wires the real ones.
// ============================================================================

export type FetchProblemCode =
  | 'invalid_url'
  | 'disallowed_scheme'
  | 'disallowed_port'
  | 'private_address'
  | 'dns_failed'
  | 'too_many_redirects'
  | 'redirect_disallowed'
  | 'timeout'
  | 'http_error'
  | 'blocked'
  | 'content_type'
  | 'network';

export interface SafeFetchDeps {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  /** All A and AAAA records for a host. Throws or returns [] when it cannot resolve. */
  resolve: (host: string) => Promise<string[]>;
}

export interface FetchLimits {
  /** Body cap in bytes; anything past it is dropped and `truncated` is set. */
  maxBytes: number;
  timeoutMs: number;
  /** Content-type prefixes accepted, e.g. ['text/html'] or ['image/']. */
  allow: readonly string[];
  maxRedirects?: number;
  /** Only the homepage may leave its origin on a redirect (www → apex, http → https). */
  allowCrossOriginRedirect?: boolean;
  userAgent?: string;
}

export type SafeFetchResult =
  | {
      ok: true;
      url: string;
      finalUrl: string;
      status: number;
      contentType: string;
      body: Uint8Array;
      truncated: boolean;
      bytes: number;
    }
  | { ok: false; url: string; code: FetchProblemCode; message: string; status?: number };

export const USER_AGENT = 'Mozilla/5.0 (compatible; BrandingOSBot/1.0; +https://brandingos.ai/bot)';

const BLOCKED_NAMES = new Set(['localhost', 'metadata.google.internal', 'metadata', 'instance-data']);

// ─── Address classification ────────────────────────────────────────────────

function parseIpv4(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((n) => n >= 0 && n <= 255) ? o : null;
}

function privateIpv4(o: number[]): boolean {
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127) return true; // this-net, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && o[2] === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

/** Expands an IPv6 literal to eight 16-bit groups, or null when malformed. */
function parseIpv6(raw: string): number[] | null {
  let s = raw.trim().toLowerCase();
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  const zone = s.indexOf('%');
  if (zone >= 0) s = s.slice(0, zone);
  // Embedded dotted IPv4 tail (::ffff:1.2.3.4)
  const tail = /:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
  if (tail) {
    const v4 = parseIpv4(tail[1]);
    if (!v4) return null;
    s = s.slice(0, s.length - tail[1].length) + ((v4[0] << 8) | v4[1]).toString(16) + ':' + ((v4[2] << 8) | v4[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (halves.length === 1 && head.length !== 8) return null;
  const fill = 8 - head.length - rest.length;
  if (fill < 0) return null;
  const groups = [...head, ...(halves.length === 2 ? Array(fill).fill('0') : []), ...rest];
  if (groups.length !== 8) return null;
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out;
}

function privateIpv6(g: number[]): boolean {
  const allZero = g.every((x) => x === 0);
  if (allZero) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 deprecated site-local
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return privateIpv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  // NAT64 64:ff9b::/96 and 6to4 2002::/16 carry an IPv4 address inside
  if (g[0] === 0x0064 && g[1] === 0xff9b) {
    if (g[2] === 1) return true; // 64:ff9b:1::/48 local-use NAT64
    return privateIpv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  if (g[0] === 0x2001 && g[1] === 0x0000) return true; // 2001::/32 Teredo (embedded addresses)
  if (g[0] === 0x2002) return privateIpv4([g[1] >> 8, g[1] & 0xff, g[2] >> 8, g[2] & 0xff]);
  return false;
}

/** True for any address a scan must never connect to. Unparseable counts as private. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = parseIpv4(ip);
  if (v4) return privateIpv4(v4);
  const v6 = parseIpv6(ip);
  if (v6) return privateIpv6(v6);
  return true;
}

function isIpLiteral(host: string): boolean {
  return parseIpv4(host) !== null || parseIpv6(host) !== null || host.startsWith('[');
}

// ─── URL policy ────────────────────────────────────────────────────────────

export type UrlCheck = { ok: true; url: URL } | { ok: false; code: FetchProblemCode; message: string };

/**
 * Scheme, port and host-name policy. The URL parser already canonicalises the
 * exotic IPv4 spellings (decimal, octal, hex, shortened) into dotted form, so
 * a numeric host is checked as the address it really is.
 */
export function checkUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, code: 'invalid_url', message: 'That is not a web address.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, code: 'disallowed_scheme', message: 'Only http and https addresses can be read.' };
  }
  // Only the scheme's own default port: http on 443 or https on 80 is an
  // alternate listener, not a website.
  if (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) {
    return { ok: false, code: 'disallowed_port', message: 'Only the standard web ports can be read.' };
  }
  if (url.username || url.password) {
    return { ok: false, code: 'invalid_url', message: 'Credentials in the address are not allowed.' };
  }
  const host = url.hostname.toLowerCase();
  const bare = host.replace(/^\[|\]$/g, '');
  if (BLOCKED_NAMES.has(bare) || bare.endsWith('.localhost') || bare.endsWith('.internal') || bare.endsWith('.local')) {
    return { ok: false, code: 'private_address', message: 'That address is not reachable from here.' };
  }
  if (isIpLiteral(bare) && isPrivateAddress(bare)) {
    return { ok: false, code: 'private_address', message: 'That address is not reachable from here.' };
  }
  url.hash = '';
  return { ok: true, url };
}

/** Resolves and refuses hosts that resolve to ANY private address. */
export async function checkResolves(url: URL, resolve: SafeFetchDeps['resolve']): Promise<UrlCheck> {
  const bare = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  if (isIpLiteral(bare)) {
    addresses = [bare];
  } else {
    try {
      addresses = await resolve(bare);
    } catch {
      return { ok: false, code: 'dns_failed', message: `We couldn't find ${bare}.` };
    }
    if (!addresses.length) return { ok: false, code: 'dns_failed', message: `We couldn't find ${bare}.` };
  }
  if (addresses.some(isPrivateAddress)) {
    return { ok: false, code: 'private_address', message: 'That address is not reachable from here.' };
  }
  return { ok: true, url };
}

// ─── The fetch ─────────────────────────────────────────────────────────────

function typeAllowed(contentType: string, allow: readonly string[]): boolean {
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (!ct) return false;
  return allow.some((a) => (a.endsWith('/') ? ct.startsWith(a) : ct === a));
}

/** Cloudflare / bot-wall challenge pages answer 403 or 503 with a recognisable body. */
function looksBlocked(status: number, text: string): boolean {
  if (status !== 403 && status !== 503 && status !== 429) return false;
  return /cf-challenge|challenge-platform|just a moment|attention required|captcha|access denied/i.test(text);
}

async function readCapped(res: Response, maxBytes: number): Promise<{ body: Uint8Array; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { body: new Uint8Array(0), truncated: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (total + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - total));
      total = maxBytes;
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        /* the stream is being abandoned either way */
      }
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.byteLength;
  }
  return { body, truncated };
}

/**
 * Fetches one address under the policy above. Never throws.
 */
export async function safeFetch(raw: string, limits: FetchLimits, deps: SafeFetchDeps): Promise<SafeFetchResult> {
  const first = checkUrl(raw);
  if (first.ok === false) return { ok: false, url: raw, code: first.code, message: first.message };
  let current = first.url;
  const origin = current.origin;
  const maxRedirects = limits.maxRedirects ?? 3;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const resolved = await checkResolves(current, deps.resolve);
    if (resolved.ok === false) return { ok: false, url: current.toString(), code: resolved.code, message: resolved.message };

    let res: Response;
    try {
      res = await deps.fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': limits.userAgent ?? USER_AGENT,
          Accept: limits.allow.includes('text/html') ? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' : '*/*',
          'Accept-Language': 'en,*;q=0.5',
        },
        signal: AbortSignal.timeout(limits.timeoutMs),
      });
    } catch (err) {
      const name = (err as { name?: string })?.name ?? '';
      const timeout = name === 'TimeoutError' || name === 'AbortError';
      return {
        ok: false,
        url: current.toString(),
        code: timeout ? 'timeout' : 'network',
        message: timeout ? 'The site took too long to answer.' : 'The site could not be reached.',
      };
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      try {
        await res.body?.cancel();
      } catch {
        /* nothing to read */
      }
      if (!location) return { ok: false, url: current.toString(), code: 'http_error', message: 'The site redirected nowhere.', status: res.status };
      if (hop === maxRedirects) return { ok: false, url: current.toString(), code: 'too_many_redirects', message: 'The site redirected too many times.' };
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return { ok: false, url: current.toString(), code: 'invalid_url', message: 'The site redirected to an invalid address.' };
      }
      const check = checkUrl(next.toString());
      if (check.ok === false) return { ok: false, url: next.toString(), code: check.code, message: check.message };
      if (check.url.protocol === 'http:' && current.protocol === 'https:') {
        return { ok: false, url: next.toString(), code: 'redirect_disallowed', message: 'The site redirected to an insecure address.' };
      }
      if (!limits.allowCrossOriginRedirect && check.url.origin !== origin) {
        return { ok: false, url: next.toString(), code: 'redirect_disallowed', message: 'The page redirected off the site.' };
      }
      current = check.url;
      continue;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok) {
      let text = '';
      try {
        const peek = await readCapped(res, 64 * 1024);
        text = new TextDecoder().decode(peek.body);
      } catch {
        /* the status is enough */
      }
      return {
        ok: false,
        url: current.toString(),
        code: looksBlocked(res.status, text) ? 'blocked' : 'http_error',
        message: looksBlocked(res.status, text) ? 'The site blocked automated reading.' : `The site answered ${res.status}.`,
        status: res.status,
      };
    }
    if (!typeAllowed(contentType, limits.allow)) {
      try {
        await res.body?.cancel();
      } catch {
        /* not reading it */
      }
      return { ok: false, url: current.toString(), code: 'content_type', message: `Not a readable document (${contentType.split(';')[0] || 'unknown type'}).`, status: res.status };
    }

    let read: { body: Uint8Array; truncated: boolean };
    try {
      read = await readCapped(res, limits.maxBytes);
    } catch (err) {
      const name = (err as { name?: string })?.name ?? '';
      const timeout = name === 'TimeoutError' || name === 'AbortError';
      return { ok: false, url: current.toString(), code: timeout ? 'timeout' : 'network', message: timeout ? 'The site took too long to answer.' : 'The site could not be read.' };
    }
    return {
      ok: true,
      url: raw,
      finalUrl: current.toString(),
      status: res.status,
      contentType,
      body: read.body,
      truncated: read.truncated,
      bytes: read.body.byteLength,
    };
  }
  return { ok: false, url: current.toString(), code: 'too_many_redirects', message: 'The site redirected too many times.' };
}

/** The real dependencies, for the Edge Function. */
export function denoDeps(): SafeFetchDeps {
  const D = (globalThis as { Deno?: { resolveDns(q: string, t: 'A' | 'AAAA'): Promise<string[]> } }).Deno;
  return {
    fetch: (url, init) => fetch(url, init),
    resolve: async (host) => {
      if (!D) throw new Error('no resolver');
      const [a, aaaa] = await Promise.all([
        D.resolveDns(host, 'A').catch(() => [] as string[]),
        D.resolveDns(host, 'AAAA').catch(() => [] as string[]),
      ]);
      return [...a, ...aaaa];
    },
  };
}
