/**
 * What the scan brought back, as ordinary onboarding items.
 *
 * A scraped logo becomes an `OnboardingAsset` holding a real `File`, exactly
 * as an upload does — so the logo detector, the colour extractor, the logo
 * board and the Library writer all run on it unchanged. A social link becomes
 * a link item the review lists and the write-through persists. Nothing here
 * is a second ingestion path; it is the first one, fed from a new source.
 *
 * Scraped items are appended AFTER the user's own, so wherever the classifier
 * picks "the first one you brought", the user's upload is the one it picks.
 */
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import type { LogoCandidate, WebsiteEvidence } from './evidence';

export const SCRAPED_SUB = 'From your website';

const MAX_LOGOS = 4;

const USABLE_TYPES = new Set(['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg', 'image/gif']);
const EXT: Record<string, string> = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/gif': 'gif' };

/** V4's social ids differ from the scan's in one place: the site formerly known as Twitter. */
const PLATFORM_ID: Record<string, OnboardingAsset['socialPlatform']> = {
  instagram: 'instagram', x: 'twitter', linkedin: 'linkedin', youtube: 'youtube', facebook: 'facebook', tiktok: 'tiktok',
  threads: 'threads', github: 'github', behance: 'behance', dribbble: 'dribbble', pinterest: 'pinterest',
};

function bytesOf(c: LogoCandidate): { blob: Blob; type: string } | null {
  if (c.inline) return { blob: new Blob([c.inline], { type: 'image/svg+xml' }), type: 'image/svg+xml' };
  if (!c.bytes || !c.contentType) return null;
  const type = c.contentType.toLowerCase();
  if (!USABLE_TYPES.has(type)) return null;
  try {
    const bin = atob(c.bytes);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return { blob: new Blob([arr], { type }), type };
  } catch {
    return null;
  }
}

function nameOf(c: LogoCandidate, type: string, index: number): string {
  const ext = EXT[type] ?? 'img';
  if (c.inline) return `logo-${index + 1}.${ext}`;
  try {
    const last = new URL(c.url).pathname.split('/').filter(Boolean).pop() ?? '';
    const stem = last.replace(/\.[a-z0-9]+$/i, '') || `logo-${index + 1}`;
    return `${stem}.${ext}`;
  } catch {
    return `logo-${index + 1}.${ext}`;
  }
}

function previewOf(file: File): string | null {
  try {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
  } catch {
    return null;
  }
}

function handleOf(url: string): string | undefined {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean);
    const last = seg[seg.length - 1];
    return last ? (seg[0] === 'company' || seg[0] === 'in' || seg[0] === 'channel' ? last : `@${last}`) : undefined;
  } catch {
    return undefined;
  }
}

function pathKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export interface ScrapedItems {
  logos: OnboardingAsset[];
  links: OnboardingAsset[];
}

/** Builds the items. `existing` is what the user already brought; nothing here duplicates it. */
export function scrapedItems(ev: WebsiteEvidence, existing: readonly OnboardingAsset[], genId: () => string): ScrapedItems {
  const logos: OnboardingAsset[] = [];
  // A rescan must not bring the same picture twice: by address, or by size
  // for artwork drawn inline in the page.
  const seenBytes = new Set<string>(existing.filter((a) => a.kind === 'image' && a.sourceUrl).map((a) => a.sourceUrl as string));
  const inlineSizes = new Set(existing.filter((a) => a.kind === 'image' && a.origin === 'website' && !a.sourceUrl && a._file).map((a) => `inline:${a._file?.size}`));
  for (const c of ev.logoCandidates) {
    if (logos.length >= MAX_LOGOS) break;
    if (c.source === 'og-image') continue;
    const b = bytesOf(c);
    if (!b) continue;
    const key = c.inline ? `inline:${new Blob([c.inline]).size}` : `${c.url}`;
    if (seenBytes.has(key) || inlineSizes.has(key)) continue;
    seenBytes.add(key);
    const name = nameOf(c, b.type, logos.length);
    const file = new File([b.blob], name, { type: b.type });
    logos.push({
      id: genId(),
      name,
      sub: SCRAPED_SUB,
      kind: 'image',
      previewUrl: previewOf(file),
      sourceUrl: c.inline ? undefined : c.url,
      uploadStatus: 'done',
      uploadProgress: 1,
      // The detector decides the ROLE from the pixels, as it does for uploads;
      // the source only says this is worth looking at as a logo.
      isLogo: c.source !== 'favicon' && c.source !== 'apple-touch-icon' && c.source !== 'manifest-icon',
      origin: 'website',
      _file: file,
    });
  }

  const present = new Set(existing.filter((a) => a.kind === 'link' && a.sourceUrl).map((a) => pathKey(a.sourceUrl as string)));
  const links: OnboardingAsset[] = [];
  for (const l of ev.links) {
    const key = pathKey(l.url);
    if (present.has(key)) continue;
    present.add(key);
    const handle = handleOf(l.url);
    links.push({
      id: genId(),
      name: handle ?? pathKey(l.url),
      sub: SCRAPED_SUB,
      kind: 'link',
      previewUrl: null,
      sourceUrl: l.url,
      uploadStatus: 'done',
      uploadProgress: 1,
      socialPlatform: PLATFORM_ID[l.platform],
      ...(handle ? { handle } : {}),
      origin: 'website',
    });
  }
  return { logos, links };
}
