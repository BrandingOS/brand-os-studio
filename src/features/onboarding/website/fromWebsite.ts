/**
 * WebsiteEvidence → candidates for the existing understanding merge.
 *
 * Everything here is EXTRACTED: it was found on the site, so it ranks
 * `website` (above the AI-written brief, below the user's own material) and
 * records provenance `imported`. Nothing is inferred here — that is the
 * enrichment call's job, and it ranks lower.
 *
 * Pure: no service, no store, no React. `mergeCandidates` stays the only
 * constructor of a Proposal.
 */
import type { BusinessInfo } from '@/domain/brand/identity';
import { RANK, type Candidate } from '../understanding/sources';
import type { BusinessFacts } from '../understanding/proposals';
import type { WebsiteEvidence } from './evidence';

export const WEBSITE_EVIDENCE = 'your website';

/** "northwind.studio/about" — the page, as a person would name it. */
export function pageLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.hostname.replace(/^www\./, '')}${path === '' ? '' : path}`;
  } catch {
    return url;
  }
}

export interface WebsiteReading {
  candidates: Candidate[];
  business: BusinessFacts;
  /** Where each value came from, keyed by Core path or `business.<field>`, for the review's origin line. */
  origins: Record<string, string>;
  /** Social profiles the site links to, in Business Info's shape. Items for the review are made separately. */
  links: NonNullable<BusinessInfo['links']>;
}

const LINK_KIND: Record<string, NonNullable<BusinessInfo['links']>[number]['kind']> = {
  website: 'website', linkedin: 'linkedin', instagram: 'instagram', x: 'x', facebook: 'facebook', youtube: 'youtube', tiktok: 'tiktok',
};

export function fromWebsite(ev: WebsiteEvidence): WebsiteReading {
  const candidates: Candidate[] = [];
  const origins: Record<string, string> = {};
  const home = ev.crawl.finalUrl ?? ev.crawl.requestedUrl;
  const add = (corePath: Candidate['corePath'], value: unknown, page = home) => {
    candidates.push({ corePath, value, rank: RANK.website, provenance: 'imported', evidence: WEBSITE_EVIDENCE });
    origins[corePath] = pageLabel(page);
  };

  // Colours: the site's own, most deliberate first. Past the second they are
  // filed as neutrals, exactly as an uploaded palette is — a third swatch is
  // a colour the brand uses, not necessarily "the accent".
  const hexes = ev.colors.slice(0, 5).map((c) => c.hex.toUpperCase());
  if (hexes[0]) add('colors.primary', { hex: hexes[0] });
  if (hexes[1]) add('colors.secondary', { hex: hexes[1] });
  if (hexes.length > 2) add('colors.neutrals', hexes.slice(2).map((hex) => ({ hex })));

  // Typefaces: the heading face is the primary, the body face the secondary.
  const heading = ev.typography.find((f) => f.role === 'heading') ?? ev.typography[0];
  const body = ev.typography.find((f) => f.role === 'body' && f !== heading) ?? ev.typography.find((f) => f !== heading);
  if (heading) add('typography.primary', { family: heading.family });
  if (body) add('typography.secondary', { family: body.family });

  const business: BusinessFacts = {};
  if (ev.business.tagline) {
    business.tagline = ev.business.tagline.value;
    origins['business.tagline'] = pageLabel(ev.business.tagline.page);
  }
  if (ev.business.products.length) {
    business.description = ev.business.products.map((p) => p.value).join(', ');
    origins['business.description'] = pageLabel(ev.business.products[0].page);
  }
  const c = ev.business.contact;
  if (c.email || c.phone || c.address) {
    business.contact = { ...(c.email ? { email: c.email } : {}), ...(c.phone ? { phone: c.phone } : {}), ...(c.address ? { address: c.address } : {}) };
    if (c.page) origins['business.contact'] = pageLabel(c.page);
  }
  if (ev.crawl.finalUrl) {
    try {
      business.website = new URL(ev.crawl.finalUrl).origin;
    } catch {
      /* the typed address stands */
    }
  }

  const links: WebsiteReading['links'] = [];
  for (const l of ev.links) {
    links.push({ kind: LINK_KIND[l.platform] ?? 'other', url: l.url, ...(LINK_KIND[l.platform] ? {} : { label: l.platform }) });
  }

  return { candidates, business, origins, links };
}
