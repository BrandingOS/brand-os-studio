import { describe, expect, it, vi } from 'vitest';
import { scanWebsite, type ScanEvent } from './scanWebsite.ts';
import type { SafeFetchDeps } from './safeFetch.ts';

const page = (body: string, type = 'text/html') => new Response(body, { status: 200, headers: { 'content-type': type } });
const HOME = `<html lang="en"><head><title>Northwind Studio | Spaces that feel like they were always there</title>
<meta name="description" content="Architecture and interiors in Copenhagen."><meta name="theme-color" content="#1F3A2E">
<link rel="stylesheet" href="/main.css"><link rel="manifest" href="/site.webmanifest"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">{"@type":"Organization","name":"Northwind Studio","sameAs":["https://instagram.com/northwind.studio"],"email":"hello@northwind.studio"}</script>
</head><body><header><a href="/"><img src="/logo.svg" alt="Northwind Studio" class="logo"></a><nav><a href="/about">About</a><a href="/services">Services</a><a href="/contact">Contact</a><a href="/projects">Projects</a></nav></header>
<main><h1>Calm, durable homes for people who stay.</h1><p>Northwind Studio is an architecture and interiors practice in Copenhagen that designs homes which age well and are planned around daylight.</p></main></body></html>`;
const ABOUT = `<html><body><main><h1>About</h1><p>Founded in 2014, Northwind Studio designs homes that age well, built from honest materials and planned around daylight for families who stay.</p></main></body></html>`;
const SERVICES = `<html><body><main><h1>Services</h1><h2>Residential architecture</h2><h2>Interior design</h2><h2>Renovation consulting</h2></main></body></html>`;

function site(over: Record<string, () => Response | Promise<Response>> = {}): SafeFetchDeps {
  const routes: Record<string, () => Response | Promise<Response>> = {
    'https://northwind.studio/': () => page(HOME),
    'https://northwind.studio/robots.txt': () => page('User-agent: *\nDisallow: /private/', 'text/plain'),
    'https://northwind.studio/about': () => page(ABOUT),
    'https://northwind.studio/services': () => page(SERVICES),
    'https://northwind.studio/contact': () => page('<html><body><main><a href="tel:+4531123456">Call</a></main></body></html>'),
    'https://northwind.studio/projects': () => page('<html><body><main><p>Projects</p></main></body></html>'),
    'https://northwind.studio/main.css': () => page(':root{--brand-primary:#1F3A2E;--accent:#C8553D}h1{font-family:"Playfair Display"}body{font-family:Inter}', 'text/css'),
    'https://northwind.studio/site.webmanifest': () => page('{"name":"Northwind","theme_color":"#1F3A2E","icons":[{"src":"/icon-192.png","sizes":"192x192"}]}', 'application/manifest+json'),
    'https://northwind.studio/logo.svg': () => page('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'image/svg+xml'),
    'https://northwind.studio/icon-192.png': () => new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'content-type': 'image/png' } }),
    'https://northwind.studio/favicon.svg': () => page('<svg xmlns="http://www.w3.org/2000/svg"/>', 'image/svg+xml'),
    ...over,
  };
  return {
    fetch: vi.fn(async (url: string) => (routes[url] ? routes[url]() : new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } }))),
    resolve: vi.fn(async () => ['93.184.216.34']),
  };
}

async function run(deps: SafeFetchDeps, url = 'https://northwind.studio') {
  const events: ScanEvent[] = [];
  const evidence = await scanWebsite(url, (e) => events.push(e), { fetch: deps });
  return { events, evidence };
}

describe('a complete scan', () => {
  it('emits opened → signals → (identity | pages) → done, in that order, with real counts', async () => {
    const { events, evidence } = await run(site());
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('opened');
    expect(types[1]).toBe('signals');
    expect(types.slice(2, 4).sort()).toEqual(['identity', 'pages']);
    expect(types[types.length - 1]).toBe('done');
    const signals = events[1] as Extract<ScanEvent, { type: 'signals' }>;
    expect(signals).toMatchObject({ name: 'Northwind Studio', socials: 1, hasStructuredData: true });
    const pages = events.find((e) => e.type === 'pages') as Extract<ScanEvent, { type: 'pages' }>;
    expect(pages).toMatchObject({ read: 4, attempted: 4, failed: [] });
    const identity = events.find((e) => e.type === 'identity') as Extract<ScanEvent, { type: 'identity' }>;
    expect(identity.logos).toBeGreaterThanOrEqual(2);
    expect(identity.fonts).toEqual(['Playfair Display', 'Inter']);
    expect(evidence.crawl.status).toBe('complete');
  });

  it('assembles compact evidence: facts, links, colours, fonts, logos with bytes, and no raw html', async () => {
    const { evidence } = await run(site());
    expect(evidence.business.names[0].value).toBe('Northwind Studio');
    expect(evidence.business.tagline?.value).toBe('Spaces that feel like they were always there');
    expect(evidence.business.products.map((p) => p.value)).toEqual(['Residential architecture', 'Interior design', 'Renovation consulting']);
    expect(evidence.business.contact.email).toBe('hello@northwind.studio');
    expect(evidence.business.contact.phone).toBe('+4531123456');
    expect(evidence.links.map((l) => l.platform)).toEqual(['instagram']);
    expect(evidence.colors[0]).toMatchObject({ hex: '#1F3A2E' });
    expect(evidence.colors.map((c) => c.hex)).toContain('#C8553D');
    expect(evidence.typography.map((f) => f.family)).toEqual(['Playfair Display', 'Inter']);
    const logo = evidence.logoCandidates[0];
    expect(logo.source).toBe('header-img');
    expect(logo.bytes).toBeTruthy();
    expect(logo.contentType).toBe('image/svg+xml');
    expect(evidence.pages.map((p) => p.role)).toEqual(expect.arrayContaining(['home', 'about', 'services', 'contact']));
    expect(evidence.quality).toMatchObject({ hasAbout: true, hasStructuredData: true, pagesRead: 5 });
    expect(JSON.stringify(evidence)).not.toContain('<html');
  });

  it('respects robots.txt for key pages but always reads the homepage', async () => {
    const { evidence } = await run(site({ 'https://northwind.studio/robots.txt': () => page('User-agent: *\nDisallow: /about', 'text/plain') }));
    expect(evidence.pages.map((p) => p.role)).not.toContain('about');
    expect(evidence.problems.map((p) => p.code)).toContain('robots_restricted');
    expect(evidence.crawl.status).toBe('partial');
  });

  it('stays within the request cap', async () => {
    const deps = site();
    await run(deps);
    expect((deps.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(17);
  });
});

describe('partial success', () => {
  it('a failed key page keeps everything else and names the problem', async () => {
    const { events, evidence } = await run(site({ 'https://northwind.studio/about': () => new Response('boom', { status: 500, headers: { 'content-type': 'text/html' } }) }));
    const pages = events.find((e) => e.type === 'pages') as Extract<ScanEvent, { type: 'pages' }>;
    expect(pages.read).toBe(3);
    expect(pages.failed).toEqual(['https://northwind.studio/about']);
    expect(evidence.crawl.status).toBe('partial');
    expect(evidence.logoCandidates.length).toBeGreaterThan(0);
    expect(evidence.colors.length).toBeGreaterThan(0);
    expect(evidence.links.length).toBe(1);
    expect(evidence.problems.find((p) => p.page?.endsWith('/about'))).toMatchObject({ fatal: false, code: 'http_error' });
  });

  it('a stylesheet that will not load costs only the stylesheet', async () => {
    const { evidence } = await run(site({ 'https://northwind.studio/main.css': () => new Response('x', { status: 404, headers: { 'content-type': 'text/css' } }) }));
    expect(evidence.crawl.status).toBe('partial');
    expect(evidence.colors[0].hex).toBe('#1F3A2E'); // theme-color survives
    expect(evidence.pages.length).toBe(5);
  });
});

describe('an unreachable homepage', () => {
  it('reports a fatal error and a failed scan with nothing invented', async () => {
    const deps: SafeFetchDeps = { fetch: vi.fn(async () => new Response('', { status: 503, headers: { 'content-type': 'text/html' } })), resolve: vi.fn(async () => ['93.184.216.34']) };
    const { events, evidence } = await run(deps);
    expect(events.map((e) => e.type)).toEqual(['error', 'done']);
    expect(events[0]).toMatchObject({ fatal: true, code: 'http_error' });
    expect(evidence.crawl.status).toBe('failed');
    expect(evidence.pages).toEqual([]);
    expect(evidence.logoCandidates).toEqual([]);
  });

  it('never connects to a private address', async () => {
    const deps: SafeFetchDeps = { fetch: vi.fn(async () => page(HOME)), resolve: vi.fn(async () => ['10.0.0.8']) };
    const { evidence } = await run(deps);
    expect(evidence.crawl.status).toBe('failed');
    expect(evidence.problems[0].code).toBe('private_address');
    expect(deps.fetch).not.toHaveBeenCalled();
  });
});
