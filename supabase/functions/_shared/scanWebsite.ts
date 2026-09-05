// ============================================================================
// The website scan, orchestrated.
//
// Homepage first, alone. Then everything else CONCURRENTLY: robots, the key
// pages, the stylesheets, the manifest and the logo bytes — each under its own
// timeout and all under one deadline. Every phase that finishes reports an
// event the client can narrate; every phase that fails becomes a problem, not
// an exception. The result is a compact WebsiteEvidence and never raw HTML.
//
// Deterministic. Injectable fetch, so it runs in a unit test with no network.
// ============================================================================
import { safeFetch, type SafeFetchDeps, type SafeFetchResult } from './safeFetch.ts';
import { parseRobots, planKeyPages, robotsAllows, type PlannedPage } from './crawlPlan.ts';
import {
  LIMITS,
  colorsFromCss,
  contactFrom,
  fontsFromCss,
  logoCandidatesFrom,
  nameCandidates,
  organizationFromJsonLd,
  parseDocument,
  parseManifest,
  productCandidates,
  sentencesOf,
  socialLinks,
  taglineCandidate,
  type ColorEvidence,
  type LogoCandidate,
  type ManifestSignals,
  type PageEvidence,
  type PageRole,
  type ParsedDocument,
  type Problem,
  type WebsiteEvidence,
} from './websiteEvidence.ts';

export const BUDGET = {
  totalMs: 15_000,
  homepageMs: 8_000,
  pageMs: 8_000,
  assetMs: 5_000,
  robotsMs: 2_000,
  cssMs: 4_000,
  htmlBytes: 2 * 1024 * 1024,
  cssBytes: 512 * 1024,
  manifestBytes: 64 * 1024,
  robotsBytes: 64 * 1024,
  assetBytes: 512 * 1024,
  assetsTotalBytes: 2 * 1024 * 1024,
  maxStylesheets: 3,
  maxAssets: LIMITS.logoCandidates,
} as const;

export type ScanEvent =
  | { type: 'opened'; url: string; finalUrl: string; status: number; redirected: boolean; ms: number }
  | { type: 'signals'; name?: string; socials: number; hasStructuredData: boolean; ms: number }
  | { type: 'identity'; logos: number; colors: number; fonts: string[]; ms: number }
  | { type: 'pages'; read: number; attempted: number; failed: string[]; roles: PageRole[]; ms: number }
  | { type: 'done'; evidence: WebsiteEvidence }
  | { type: 'error'; code: string; message: string; fatal: boolean };

export interface ScanDeps {
  fetch: SafeFetchDeps;
  now?: () => number;
}

const IMAGE_TYPES = ['image/'] as const;
const HTML_TYPES = ['text/html', 'application/xhtml+xml'] as const;

function withDeadline<T>(p: Promise<T>, ms: number, onLate: () => T): Promise<T> {
  if (ms <= 0) return Promise.resolve(onLate());
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(onLate()), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch(() => {
      clearTimeout(t);
      resolve(onLate());
    });
  });
}

function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function stem(url: string): string {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'page';
  } catch {
    return 'page';
  }
}

/** Runs the whole scan. Resolves with the evidence; never throws. */
export async function scanWebsite(requestedUrl: string, emit: (e: ScanEvent) => void, deps: ScanDeps): Promise<WebsiteEvidence> {
  const now = deps.now ?? (() => Date.now());
  const t0 = now();
  const elapsed = () => now() - t0;
  const remaining = () => Math.max(0, BUDGET.totalMs - elapsed());
  const problems: Problem[] = [];
  let requests = 0;
  let bytes = 0;
  const fetchOne = async (url: string, limits: Parameters<typeof safeFetch>[1]): Promise<SafeFetchResult> => {
    requests += 1;
    const r = await safeFetch(url, { ...limits, timeoutMs: Math.min(limits.timeoutMs, Math.max(250, remaining())) }, deps.fetch);
    if (r.ok) bytes += r.bytes;
    return r;
  };
  const decode = (b: Uint8Array) => new TextDecoder('utf-8', { fatal: false }).decode(b);
  const fail = (evidence: WebsiteEvidence): WebsiteEvidence => {
    emit({ type: 'done', evidence });
    return evidence;
  };
  const empty = (status: WebsiteEvidence['crawl']['status'], extra: Partial<WebsiteEvidence['crawl']> = {}): WebsiteEvidence => ({
    crawl: {
      requestedUrl, startedAt: new Date(t0).toISOString(), finishedAt: new Date(now()).toISOString(),
      pagesAttempted: 1, pagesRead: 0, bytes, requests, status, budgetMs: BUDGET.totalMs, elapsedMs: elapsed(), ...extra,
    },
    pages: [], metadata: {}, business: { names: [], products: [], contact: {} }, links: [], logoCandidates: [], colors: [], typography: [],
    copy: { voiceSample: [], ctaLabels: [], navLabels: [] }, imagery: { imageCount: 0, altSample: [], hasHero: false }, problems,
    quality: { copyWords: 0, pagesRead: 0, hasAbout: false, hasStructuredData: false, nameCandidates: 0, languages: [] },
  });

  // ── 1. Homepage, alone ────────────────────────────────────────────────────
  const homeStart = elapsed();
  const home = await fetchOne(requestedUrl, { maxBytes: BUDGET.htmlBytes, timeoutMs: BUDGET.homepageMs, allow: HTML_TYPES, allowCrossOriginRedirect: true, maxRedirects: 3 });
  if (home.ok === false) {
    problems.push({ code: home.code, page: requestedUrl, message: home.message, fatal: true });
    emit({ type: 'error', code: home.code, message: home.message, fatal: true });
    return fail(empty('failed'));
  }
  emit({ type: 'opened', url: requestedUrl, finalUrl: home.finalUrl, status: home.status, redirected: home.finalUrl !== requestedUrl, ms: elapsed() - homeStart });

  const homeUrl = home.finalUrl;
  const origin = new URL(homeUrl).origin;
  const homeHtml = decode(home.body);
  const homeDoc = parseDocument(homeHtml, homeUrl);
  const org = organizationFromJsonLd(homeDoc.jsonLd);
  const names = nameCandidates(homeDoc, org, null);
  const homeSocials = socialLinks(homeDoc.anchors, org?.sameAs, homeUrl, homeUrl);
  emit({ type: 'signals', name: names[0]?.value, socials: homeSocials.length, hasStructuredData: Boolean(org), ms: elapsed() });

  // ── 2. Everything else, concurrently ──────────────────────────────────────
  const docs: Array<{ doc: ParsedDocument; url: string; role: PageRole; page: PageEvidence }> = [];
  const pageOf = (doc: ParsedDocument, url: string, role: PageRole, fetchedMs: number, truncated: boolean): PageEvidence => ({
    id: role === 'home' ? 'home' : `${role}-${stem(url)}`,
    url, role, title: doc.title, h1: doc.headings.find((h) => h.level === 1)?.text ?? null,
    headings: doc.headings.filter((h) => h.level > 1).map((h) => h.text), copy: doc.copy, wordCount: doc.wordCount, lang: doc.lang, fetchedMs, truncated,
  });
  docs.push({ doc: homeDoc, url: homeUrl, role: 'home', page: pageOf(homeDoc, homeUrl, 'home', elapsed() - homeStart, home.truncated) });

  const robotsAndPages = (async () => {
    const start = elapsed();
    const robots = await withDeadline(
      fetchOne(`${origin}/robots.txt`, { maxBytes: BUDGET.robotsBytes, timeoutMs: BUDGET.robotsMs, allow: ['text/plain', 'text/html'] }),
      BUDGET.robotsMs + 100,
      () => ({ ok: false, url: '', code: 'timeout', message: 'robots timed out' }) as SafeFetchResult,
    );
    const rules = robots.ok ? parseRobots(decode(robots.body)) : { disallow: [], allow: [] };
    const planned = planKeyPages(homeDoc.anchors, homeUrl);
    const allowed: PlannedPage[] = [];
    for (const p of planned) {
      if (robotsAllows(rules, new URL(p.url).pathname)) allowed.push(p);
      else problems.push({ code: 'robots_restricted', page: p.url, message: 'This page is closed to readers by robots.txt.', fatal: false });
    }
    const failed: string[] = [];
    await Promise.all(
      allowed.map(async (p) => {
        const s = elapsed();
        const r = await fetchOne(p.url, { maxBytes: BUDGET.htmlBytes, timeoutMs: BUDGET.pageMs, allow: HTML_TYPES, maxRedirects: 2 });
        if (r.ok === false) {
          failed.push(p.url);
          problems.push({ code: r.code, page: p.url, message: r.message, fatal: false });
          return;
        }
        const doc = parseDocument(decode(r.body), r.finalUrl);
        docs.push({ doc, url: r.finalUrl, role: p.role, page: pageOf(doc, r.finalUrl, p.role, elapsed() - s, r.truncated) });
      }),
    );
    const read = docs.filter((d) => d.role !== 'home');
    emit({ type: 'pages', read: read.length, attempted: allowed.length, failed, roles: read.map((d) => d.role), ms: elapsed() - start });
    return { attempted: allowed.length };
  })();

  const styles = (async () => {
    const hrefs = homeDoc.linkTags.filter((l) => l.rel.split(/\s+/).includes('stylesheet') && !/fonts\.googleapis/.test(l.href)).slice(0, BUDGET.maxStylesheets);
    const texts = await Promise.all(
      hrefs.map(async (l) => {
        const r = await fetchOne(l.href, { maxBytes: BUDGET.cssBytes, timeoutMs: BUDGET.cssMs, allow: ['text/css', 'text/plain'], maxRedirects: 2 });
        if (r.ok === false) {
          problems.push({ code: r.code, page: l.href, message: r.message, fatal: false });
          return '';
        }
        return decode(r.body);
      }),
    );
    return [homeDoc.inlineCss, ...texts].join('\n');
  })();

  const manifestAndAssets = (async () => {
    let manifest: ManifestSignals | null = null;
    const link = homeDoc.linkTags.find((l) => l.rel === 'manifest');
    if (link) {
      const r = await fetchOne(link.href, { maxBytes: BUDGET.manifestBytes, timeoutMs: BUDGET.cssMs, allow: ['application/manifest+json', 'application/json', 'text/plain', 'application/octet-stream'], maxRedirects: 2 });
      if (r.ok) manifest = parseManifest(decode(r.body));
    }
    const candidates = logoCandidatesFrom(homeDoc, homeUrl, org, manifest?.icons ?? []);
    let total = 0;
    const withBytes = await Promise.all(
      candidates.slice(0, BUDGET.maxAssets).map(async (c): Promise<LogoCandidate> => {
        if (c.inline) return { ...c, contentType: 'image/svg+xml', byteLength: c.inline.length };
        // Reserve the cap up front: six concurrent downloads must not each pass
        // the check before any of them has counted.
        if (total + BUDGET.assetBytes > BUDGET.assetsTotalBytes) return c;
        total += BUDGET.assetBytes;
        const r = await fetchOne(c.url, { maxBytes: BUDGET.assetBytes, timeoutMs: BUDGET.assetMs, allow: IMAGE_TYPES, maxRedirects: 2 });
        total -= BUDGET.assetBytes;
        if (r.ok === false) {
          problems.push({ code: r.code, page: c.url, message: r.message, fatal: false });
          return c;
        }
        if (r.truncated) {
          problems.push({ code: 'asset_too_large', page: c.url, message: 'The image is too large to read.', fatal: false });
          return c;
        }
        total += r.bytes;
        return { ...c, bytes: base64(r.body), contentType: r.contentType.split(';')[0].trim(), byteLength: r.bytes };
      }),
    );
    return { manifest, logos: withBytes };
  })();

  const [pagesResult, css, assets] = await Promise.all([
    withDeadline(robotsAndPages, remaining(), () => {
      problems.push({ code: 'budget', message: 'The scan ran out of time reading the key pages.', fatal: false });
      return { attempted: 0 };
    }),
    withDeadline(styles, remaining(), () => homeDoc.inlineCss),
    withDeadline(manifestAndAssets, remaining(), () => ({ manifest: null, logos: logoCandidatesFrom(homeDoc, homeUrl, org, []) })),
  ]);

  // ── 3. Assemble ──────────────────────────────────────────────────────────
  const google = homeDoc.linkTags.filter((l) => /fonts\.googleapis/.test(l.href)).map((l) => l.href);
  const typography = fontsFromCss(css, google);
  const colors: ColorEvidence[] = [];
  const pushColor = (c: ColorEvidence) => {
    const cur = colors.find((x) => x.hex === c.hex);
    if (cur) cur.count += c.count;
    else colors.push(c);
  };
  if (assets.manifest?.themeColor) {
    const hex = colorsFromCss(`--theme-color:${assets.manifest.themeColor}`)[0]?.hex;
    if (hex) pushColor({ hex, source: 'manifest', count: 30, name: 'theme_color' });
  }
  if (homeDoc.meta['theme-color']) {
    const hex = colorsFromCss(`--theme-color:${homeDoc.meta['theme-color']}`)[0]?.hex;
    if (hex) pushColor({ hex, source: 'meta', count: 20, name: 'theme-color' });
  }
  for (const c of colorsFromCss(css)) pushColor(c);
  colors.sort((a, b) => b.count - a.count);
  emit({ type: 'identity', logos: assets.logos.length, colors: Math.min(colors.length, LIMITS.colors), fonts: typography.slice(0, 2).map((f) => f.family), ms: elapsed() });

  const allNames = nameCandidates(homeDoc, org, assets.manifest);
  const about = docs.find((d) => d.role === 'about');
  const contactDoc = docs.find((d) => d.role === 'contact');
  const contact = [contactDoc, about, docs[0]].filter(Boolean).map((d) => contactFrom('', d!.doc.anchors, org, d!.url)).find((c) => c.email || c.phone || c.address) ?? contactFrom('', homeDoc.anchors, org, homeUrl);
  const links = (() => {
    const seen = new Set<string>();
    const out: WebsiteEvidence['links'] = [];
    for (const d of docs) {
      for (const l of socialLinks(d.doc.anchors, d.role === 'home' ? org?.sameAs : undefined, d.url, d.url)) {
        const key = `${l.platform}:${new URL(l.url).pathname.toLowerCase()}`;
        if (seen.has(key) || out.length >= LIMITS.socialLinks) continue;
        seen.add(key);
        out.push(l);
      }
    }
    return out;
  })();
  const voice = [
    ...sentencesOf(homeDoc.copy.split(' ').slice(0, 120).join(' '), 4),
    ...(about ? sentencesOf(about.doc.copy, 5) : []),
    ...sentencesOf(homeDoc.copy, LIMITS.voiceSentences),
  ];
  const voiceSample = [...new Set(voice)].slice(0, LIMITS.voiceSentences);
  const navLabels = [...new Set(homeDoc.anchors.filter((a) => a.inNav && a.text).map((a) => a.text))].slice(0, LIMITS.navLabels);
  const allImages = docs.flatMap((d) => d.doc.images);
  const foundedYear = org?.foundingDate ? parseInt(org.foundingDate.slice(0, 4), 10) || undefined : undefined;
  const totalWords = docs.reduce((n, d) => n + d.page.wordCount, 0);
  const pages = docs.map((d) => d.page);
  // Cap the total copy the evidence carries, homepage first.
  let budgetWords: number = LIMITS.copyWordsTotal;
  for (const p of pages) {
    const words = p.copy.split(' ');
    if (words.length > budgetWords) {
      p.copy = words.slice(0, budgetWords).join(' ');
      p.truncated = true;
    }
    budgetWords = Math.max(0, budgetWords - words.length);
  }

  const status: WebsiteEvidence['crawl']['status'] = problems.some((p) => !p.fatal) ? 'partial' : 'complete';
  const evidence: WebsiteEvidence = {
    crawl: {
      requestedUrl, finalUrl: homeUrl, origin, startedAt: new Date(t0).toISOString(), finishedAt: new Date(now()).toISOString(),
      pagesAttempted: 1 + pagesResult.attempted, pagesRead: pages.length, bytes, requests, status, budgetMs: BUDGET.totalMs, elapsedMs: elapsed(),
    },
    pages,
    metadata: {
      title: homeDoc.title ?? undefined, description: homeDoc.meta.description, ogTitle: homeDoc.meta['og:title'], ogDescription: homeDoc.meta['og:description'],
      ogImage: homeDoc.meta['og:image'], ogSiteName: homeDoc.meta['og:site_name'], canonical: homeDoc.linkTags.find((l) => l.rel === 'canonical')?.href,
      themeColor: homeDoc.meta['theme-color'], jsonLd: org,
      manifest: assets.manifest ? { name: assets.manifest.name, shortName: assets.manifest.shortName, themeColor: assets.manifest.themeColor, backgroundColor: assets.manifest.backgroundColor } : undefined,
    },
    business: {
      names: allNames,
      tagline: taglineCandidate(homeDoc, org, allNames, homeUrl),
      products: productCandidates(docs.map((d) => ({ doc: d.doc, url: d.url, role: d.role }))),
      contact,
      foundedYear,
    },
    links,
    logoCandidates: assets.logos,
    colors: colors.slice(0, LIMITS.colors),
    typography,
    copy: { voiceSample, ctaLabels: [...new Set(docs.flatMap((d) => d.doc.buttons))].slice(0, 12), navLabels },
    imagery: {
      imageCount: allImages.length,
      altSample: [...new Set(allImages.map((i) => i.alt).filter((a) => a && a.length > 8))].slice(0, LIMITS.altSample),
      hasHero: homeDoc.images.some((i) => (i.width ?? 0) >= 900 || /hero|banner|cover/i.test(`${i.className} ${i.src}`)),
    },
    problems,
    quality: {
      copyWords: totalWords,
      pagesRead: pages.length,
      hasAbout: Boolean(about),
      hasStructuredData: Boolean(org),
      nameCandidates: allNames.length,
      languages: [...new Set(docs.map((d) => (d.doc.lang ?? '').split('-')[0].toLowerCase()).filter(Boolean))],
    },
  };
  emit({ type: 'done', evidence });
  return evidence;
}
