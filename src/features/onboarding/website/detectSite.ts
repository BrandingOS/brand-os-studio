/**
 * Which website the scan reads, and where the address came from.
 *
 * Two entry points, one answer:
 *
 *   - the dropzone pill — a link the user deliberately added. It WINS.
 *   - the description — an address that happens to be in what they typed. It
 *     is offered as a chip the user can dismiss, and it is only used when
 *     there is no pill.
 *
 * Social hosts are never the website; that rule already lives in
 * `linkKindOf`, so this reuses it rather than keeping a second host list.
 * Deterministic, no network.
 */
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { linkKindOf, websiteOf } from '../bridge/reviewWriteThrough';

/**
 * A bare domain or URL inside prose. Refuses email addresses (the `@` guard)
 * and anything glued to a preceding word character.
 */
const URL_RE = /(?<![\w@.])(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?::\d{2,5})?(?:\/[^\s)]*)?/gi;

/** A few endings that read like a domain but are almost never one in prose. */
const NOT_A_SITE = new Set(['e.g', 'i.e', 'etc']);

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** The first website address in the text, as a host, or null. */
export function detectSiteInText(text: string): string | null {
  for (const m of text.matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    if (NOT_A_SITE.has(host)) continue;
    const probe: OnboardingAsset = {
      id: 'probe',
      name: host,
      sub: '',
      kind: 'link',
      previewUrl: null,
      sourceUrl: `https://${host}`,
      uploadStatus: 'done',
      uploadProgress: 1,
    };
    if (linkKindOf(probe) === 'website') return host;
  }
  return null;
}

export interface ScanTarget {
  /** Fully qualified, https unless the pill said otherwise. */
  url: string;
  host: string;
  source: 'pill' | 'description';
}

/**
 * The one website the scan will read.
 *
 * The pill wins. A detected address is used only when there is no pill and
 * the user has not dismissed that exact host.
 */
export function scanTarget(
  items: readonly OnboardingAsset[],
  description: string,
  ignoredHost?: string | null,
): ScanTarget | null {
  const pill = websiteOf(items);
  if (pill) {
    const host = hostOf(pill);
    if (host) return { url: pill, host, source: 'pill' };
  }
  const detected = detectSiteInText(description);
  if (detected && detected !== ignoredHost) {
    return { url: `https://${detected}`, host: detected, source: 'description' };
  }
  return null;
}

/** The address found in the description that is NOT the pill's, if any. */
export function detectedBesidesPill(items: readonly OnboardingAsset[], description: string, ignoredHost?: string | null): string | null {
  const detected = detectSiteInText(description);
  if (!detected || detected === ignoredHost) return null;
  const pill = websiteOf(items);
  if (pill && hostOf(pill) === detected) return null;
  return detected;
}
