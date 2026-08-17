/** Only same-origin paths may be a post-login target — never an absolute URL. */
export function safeNext(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://') || raw.startsWith('/\\')) return fallback;
  return raw;
}
