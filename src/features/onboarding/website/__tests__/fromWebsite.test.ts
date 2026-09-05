import { describe, expect, it } from 'vitest';
import { fromWebsite, pageLabel } from '../fromWebsite';
import { RANK, mergeCandidates } from '../../understanding/sources';
import type { WebsiteEvidence } from '../evidence';

export const EVIDENCE: WebsiteEvidence = {
  crawl: { requestedUrl: 'https://northwind.studio', finalUrl: 'https://northwind.studio/', origin: 'https://northwind.studio', startedAt: '', finishedAt: '', pagesAttempted: 4, pagesRead: 4, bytes: 1, requests: 8, status: 'complete', budgetMs: 15000, elapsedMs: 800 },
  pages: [
    { id: 'home', url: 'https://northwind.studio/', role: 'home', title: 'Northwind', h1: 'Calm homes', headings: [], copy: 'Northwind Studio is an architecture practice in Copenhagen.', wordCount: 8, lang: 'en', fetchedMs: 100, truncated: false },
    { id: 'about', url: 'https://northwind.studio/about', role: 'about', title: 'About', h1: 'About', headings: [], copy: 'Founded in 2014.', wordCount: 3, lang: 'en', fetchedMs: 100, truncated: false },
  ],
  metadata: { title: 'Northwind', description: 'Architecture and interiors.' },
  business: {
    names: [{ value: 'Northwind Studio', source: 'structured data' }],
    tagline: { value: 'Spaces that feel like they were always there.', page: 'https://northwind.studio/', source: 'page title' },
    products: [{ value: 'Residential architecture', page: 'https://northwind.studio/services' }, { value: 'Interior design', page: 'https://northwind.studio/services' }],
    contact: { email: 'hello@northwind.studio', page: 'https://northwind.studio/contact' },
  },
  links: [{ url: 'https://www.instagram.com/northwind.studio', platform: 'instagram', page: 'https://northwind.studio/' }, { url: 'https://www.pinterest.com/northwindstudio', platform: 'pinterest', page: 'https://northwind.studio/' }],
  logoCandidates: [],
  colors: [{ hex: '#1F3A2E', source: 'css-var', count: 40, name: '--brand-primary' }, { hex: '#E4D9C3', source: 'css', count: 6 }, { hex: '#C8553D', source: 'css-var', count: 25, name: '--accent' }],
  typography: [{ family: 'Inter', source: 'google-fonts', weights: ['400'], role: 'body' }, { family: 'Playfair Display', source: 'google-fonts', weights: ['600'], role: 'heading' }],
  copy: { voiceSample: ['Northwind Studio is an architecture practice in Copenhagen.'], ctaLabels: ['Start a project'], navLabels: ['About', 'Services'] },
  imagery: { imageCount: 4, altSample: ['A daylit living room'], hasHero: true },
  problems: [],
  quality: { copyWords: 11, pagesRead: 2, hasAbout: true, hasStructuredData: true, nameCandidates: 1, languages: ['en'] },
};

describe('what the website proposes', () => {
  const reading = fromWebsite(EVIDENCE);
  const by = (path: string) => reading.candidates.find((c) => c.corePath === path);

  it('colours in the site\'s own order: primary, secondary, the rest as neutrals', () => {
    expect(by('colors.primary')?.value).toEqual({ hex: '#1F3A2E' });
    expect(by('colors.secondary')?.value).toEqual({ hex: '#E4D9C3' });
    expect(by('colors.neutrals')?.value).toEqual([{ hex: '#C8553D' }]);
  });

  it('the heading face is the primary typeface even when it was listed second', () => {
    expect(by('typography.primary')?.value).toEqual({ family: 'Playfair Display' });
    expect(by('typography.secondary')?.value).toEqual({ family: 'Inter' });
  });

  it('every candidate is extracted: website rank, imported provenance, named evidence', () => {
    for (const c of reading.candidates) {
      expect(c.rank).toBe(RANK.website);
      expect(c.provenance).toBe('imported');
      expect(c.evidence).toBe('your website');
    }
  });

  it('business facts: tagline, products as a list, contact, and the site itself', () => {
    expect(reading.business.tagline).toBe('Spaces that feel like they were always there.');
    expect(reading.business.description).toBe('Residential architecture, Interior design');
    expect(reading.business.contact).toEqual({ email: 'hello@northwind.studio' });
    expect(reading.business.website).toBe('https://northwind.studio');
    expect(reading.business.industry).toBeUndefined();
  });

  it('names the page each value came from', () => {
    expect(reading.origins['business.description']).toBe('northwind.studio/services');
    expect(reading.origins['business.contact']).toBe('northwind.studio/contact');
    expect(reading.origins['colors.primary']).toBe('northwind.studio');
  });

  it('maps social profiles onto Business Info link kinds, keeping unknown platforms as labelled links', () => {
    expect(reading.links).toEqual([
      { kind: 'instagram', url: 'https://www.instagram.com/northwind.studio' },
      { kind: 'other', url: 'https://www.pinterest.com/northwindstudio', label: 'pinterest' },
    ]);
  });

  it('never proposes strategy or a summary — those need interpretation', () => {
    expect(reading.candidates.some((c) => c.corePath.startsWith('strategy.') || c.corePath.startsWith('voice.'))).toBe(false);
  });

  it('a colour read from an uploaded logo outranks a colour read from the site\'s CSS', () => {
    const merged = mergeCandidates([
      ...reading.candidates,
      { corePath: 'colors.primary', value: { hex: '#C8102E' }, rank: RANK.uploaded, provenance: 'inferred', evidence: 'your artwork' },
    ]);
    expect(merged.find((p) => p.corePath === 'colors.primary')?.value).toEqual({ hex: '#C8102E' });
  });

  it('an empty scan proposes nothing', () => {
    const r = fromWebsite({ ...EVIDENCE, colors: [], typography: [], business: { names: [], products: [], contact: {} }, links: [], crawl: { ...EVIDENCE.crawl, finalUrl: undefined } });
    expect(r.candidates).toEqual([]);
    expect(r.business).toEqual({});
  });

  it('labels a page the way a person says it', () => {
    expect(pageLabel('https://www.northwind.studio/about/')).toBe('northwind.studio/about');
    expect(pageLabel('https://northwind.studio/')).toBe('northwind.studio');
  });
});
