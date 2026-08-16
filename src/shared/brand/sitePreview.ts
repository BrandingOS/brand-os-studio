/**
 * What a link looks like, before you open it.
 *
 * Open Graph is the whole answer here: the site itself declares a title, a
 * description and an image for exactly this purpose. Reading them turns a bare
 * url into something a person recognises at a glance, which is the difference
 * between a link section that reads as the brand's presence and one that reads
 * as a list of strings.
 *
 * Lifted out of `SetupPage` so the review and Setup ask the same question and
 * get the same answer, and given a small in-memory cache: the same link is
 * rendered by several surfaces and re-fetching it per mount is both slow and
 * rude to the service.
 */

export interface SitePreview {
  url: string;
  /** The registrable host, without `www.` — what a person reads as "the site". */
  domain: string;
  title: string | null;
  description: string | null;
  /** OG image, or a screenshot when the site declares none. */
  image: string | null;
  favicon: string | null;
}

/** The host as a person says it. Falls back to the raw string. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/** A link, tidied for display: no scheme, no trailing slash. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const cache = new Map<string, SitePreview | null>();
const inFlight = new Map<string, Promise<SitePreview | null>>();

/**
 * Reads a site's card metadata.
 *
 * Resolves to `null` when the site cannot be read at all — no metadata is a
 * NORMAL outcome (an intranet, a brand-new domain, a service that blocks
 * scrapers) and callers render the domain on its own rather than an error.
 *
 * `waitFor` gives single-page apps a moment to paint past a preloader before
 * the screenshot is taken; the screenshot is only a fallback for a site that
 * declares no `og:image` of its own.
 */
export async function fetchSitePreview(url: string): Promise<SitePreview | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  const pending = inFlight.get(url);
  if (pending) return pending;

  const run = (async (): Promise<SitePreview | null> => {
    try {
      const api = `https://api.microlink.io/?url=${encodeURIComponent(
        url,
      )}&screenshot=true&meta=true&waitFor=3000`;
      const res = await fetch(api);
      if (!res.ok) return null;
      const json = (await res.json()) as {
        status?: string;
        data?: {
          title?: string | null;
          description?: string | null;
          image?: { url?: string | null } | null;
          logo?: { url?: string | null } | null;
          screenshot?: { url?: string | null } | null;
        };
      };
      if (json.status !== 'success' || !json.data) return null;
      const d = json.data;
      return {
        url,
        domain: domainOf(url),
        title: d.title ?? null,
        description: d.description ?? null,
        image: d.image?.url ?? d.screenshot?.url ?? null,
        favicon: d.logo?.url ?? null,
      };
    } catch {
      return null;
    }
  })();

  inFlight.set(url, run);
  const result = await run;
  inFlight.delete(url);
  cache.set(url, result);
  return result;
}

/** Test seam — drops what has been read so a fresh fetch happens. */
export function clearSitePreviewCache(): void {
  cache.clear();
  inFlight.clear();
}
