// ============================================================================
// WebsiteEvidence — what a website says about a brand, read deterministically.
//
// No DOM library and no script execution: a small tag scanner over the raw
// HTML is enough for the structured parts a brand needs (metadata, JSON-LD,
// headings, anchors, images, icons, stylesheets) and is safe to run inside an
// Edge Function's CPU budget. Everything here is EXTRACTED by definition —
// nothing is inferred, and the copy is data for a later reader, never
// instructions.
//
// The client mirrors these types in `src/features/onboarding/website/evidence.ts`;
// a test keeps the two in step.
// ============================================================================

export type PageRole = 'home' | 'about' | 'services' | 'contact' | 'other';

export interface PageEvidence {
  id: string;
  url: string;
  role: PageRole;
  title: string | null;
  h1: string | null;
  headings: string[];
  /** Main copy, noise stripped, capped. */
  copy: string;
  wordCount: number;
  lang: string | null;
  fetchedMs: number;
  truncated: boolean;
}

export interface JsonLdOrg {
  type?: string;
  name?: string;
  legalName?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  slogan?: string;
  foundingDate?: string;
}

export interface MetadataEvidence {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  canonical?: string;
  themeColor?: string;
  jsonLd?: JsonLdOrg;
  manifest?: { name?: string; shortName?: string; themeColor?: string; backgroundColor?: string };
}

export interface BusinessEvidence {
  names: Array<{ value: string; source: string }>;
  tagline?: { value: string; page: string; source: string };
  products: Array<{ value: string; page: string }>;
  contact: { email?: string; phone?: string; address?: string; page?: string };
  foundedYear?: number;
}

export interface LinkEvidence {
  url: string;
  platform: string;
  page: string;
}

export type LogoSource = 'svg-inline' | 'header-img' | 'json-ld-logo' | 'manifest-icon' | 'apple-touch-icon' | 'favicon' | 'og-image';

export interface LogoCandidate {
  url: string;
  source: LogoSource;
  score: number;
  alt?: string;
  width?: number;
  height?: number;
  /** Inline SVG markup, when the candidate was drawn in the page itself. */
  inline?: string;
  /** Downloaded bytes, base64, when the scan fetched the file. */
  bytes?: string;
  contentType?: string;
  byteLength?: number;
}

export interface ColorEvidence {
  hex: string;
  source: 'css-var' | 'manifest' | 'meta' | 'css';
  count: number;
  /** The custom property or manifest field it came from. */
  name?: string;
}

export interface FontEvidence {
  family: string;
  source: 'google-fonts' | 'font-face' | 'css';
  weights: string[];
  role?: 'heading' | 'body';
}

export interface CopyEvidence {
  voiceSample: string[];
  ctaLabels: string[];
  navLabels: string[];
}

export interface ImageryEvidence {
  imageCount: number;
  altSample: string[];
  hasHero: boolean;
}

export interface Problem {
  code: string;
  page?: string;
  message: string;
  fatal: boolean;
}

export interface QualityEvidence {
  copyWords: number;
  pagesRead: number;
  hasAbout: boolean;
  hasStructuredData: boolean;
  nameCandidates: number;
  languages: string[];
}

export interface CrawlSummary {
  requestedUrl: string;
  finalUrl?: string;
  origin?: string;
  startedAt: string;
  finishedAt: string;
  pagesAttempted: number;
  pagesRead: number;
  bytes: number;
  requests: number;
  status: 'complete' | 'partial' | 'failed';
  budgetMs: number;
  elapsedMs: number;
}

export interface WebsiteEvidence {
  crawl: CrawlSummary;
  pages: PageEvidence[];
  metadata: MetadataEvidence;
  business: BusinessEvidence;
  links: LinkEvidence[];
  logoCandidates: LogoCandidate[];
  colors: ColorEvidence[];
  typography: FontEvidence[];
  copy: CopyEvidence;
  imagery: ImageryEvidence;
  problems: Problem[];
  quality: QualityEvidence;
}

// ─── Limits ────────────────────────────────────────────────────────────────

export const LIMITS = {
  copyWordsPerPage: 700,
  copyWordsTotal: 2500,
  headingsPerPage: 12,
  anchorsPerPage: 200,
  voiceSentences: 12,
  navLabels: 40,
  altSample: 20,
  products: 8,
  colors: 8,
  logoCandidates: 6,
  socialLinks: 10,
} as const;

// ─── Tag scanning ──────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', copy: '©', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function codePoint(n: number): string {
  // An out-of-range reference on a hostile page must not abort the scan.
  return Number.isFinite(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d{1,9});/g, (_, d) => codePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** How much of a document the tag scanner reads. The body cap is 2 MB; the scan is bounded tighter. */
export const PARSE_BYTES = 1_000_000;
const CAPS = { meta: 200, link: 150, img: 300, button: 100, jsonLd: 20 } as const;

/** Attributes of one tag, lower-cased names, entity-decoded values. */
export function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  const body = tag.replace(/^<\s*[a-zA-Z][^\s/>]*/, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(re)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function removeBlocks(html: string, tags: string[]): string {
  let out = html;
  for (const t of tags) out = out.replace(new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?<\\/${t}\\s*>`, 'gi'), ' ');
  return out;
}

function firstBlock(html: string, tag: string): string | null {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i').exec(html);
  return m ? m[1] : null;
}

export interface Anchor {
  href: string;
  text: string;
  inNav: boolean;
  className: string;
}

export interface ImageTag {
  src: string;
  alt: string;
  className: string;
  id: string;
  width?: number;
  height?: number;
  inHeader: boolean;
}

export interface LinkTag {
  rel: string;
  href: string;
  sizes?: string;
  type?: string;
}

export interface ParsedDocument {
  title: string | null;
  lang: string | null;
  meta: Record<string, string>;
  linkTags: LinkTag[];
  anchors: Anchor[];
  images: ImageTag[];
  headings: Array<{ level: number; text: string }>;
  jsonLd: unknown[];
  inlineSvgs: string[];
  inlineCss: string;
  copy: string;
  buttons: string[];
  wordCount: number;
}

function resolveHref(href: string, base: string): string | null {
  try {
    const u = new URL(href.trim(), base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

/** Scans one HTML document. Pure. */
export function parseDocument(input: string, baseUrl: string): ParsedDocument {
  const html = input.length > PARSE_BYTES ? input.slice(0, PARSE_BYTES) : input;
  const noScripts = removeBlocks(html, ['script', 'style', 'noscript', 'template', 'iframe']);
  const headerRegion = firstBlock(noScripts, 'header') ?? noScripts.slice(0, 4000);
  const navRegion = [firstBlock(noScripts, 'nav') ?? '', headerRegion].join(' ');

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const lang = /<html[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i.exec(html)?.[1] ?? null;

  const meta: Record<string, string> = {};
  let metaSeen = 0;
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (++metaSeen > CAPS.meta) break;
    const a = attrs(m[0]);
    const key = (a.property ?? a.name ?? a['http-equiv'] ?? '').toLowerCase();
    if (key && a.content !== undefined && !(key in meta)) meta[key] = a.content.trim();
  }

  const linkTags: LinkTag[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (linkTags.length >= CAPS.link) break;
    const a = attrs(m[0]);
    if (!a.rel || !a.href) continue;
    const href = resolveHref(a.href, baseUrl);
    if (!href) continue;
    linkTags.push({ rel: a.rel.toLowerCase(), href, sizes: a.sizes, type: a.type });
  }

  // An anchor is "in the nav" by its own identity (href + label), not by href
  // alone — a hero button linking to /contact is not the Contact nav entry.
  const navKeys = new Set<string>();
  for (const m of navRegion.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const a = attrs(`<a ${m[1]}>`);
    if (a.href) navKeys.add(`${a.href}|${stripTags(m[2]).slice(0, 80)}`);
  }
  const anchors: Anchor[] = [];
  for (const m of noScripts.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (anchors.length >= LIMITS.anchorsPerPage) break;
    const a = attrs(`<a ${m[1]}>`);
    if (!a.href) continue;
    const href = a.href.trim();
    const text = stripTags(m[2]).slice(0, 80);
    anchors.push({ href, text, inNav: navKeys.has(`${a.href}|${text}`), className: `${a.class ?? ''} ${a.id ?? ''} ${a.role ?? ''}`.trim() });
  }

  const images: ImageTag[] = [];
  const headerImgSrcs = new Set<string>();
  for (const m of headerRegion.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (a.src || a['data-src']) headerImgSrcs.add(a.src ?? a['data-src']);
  }
  for (const m of noScripts.matchAll(/<img\b[^>]*>/gi)) {
    if (images.length >= CAPS.img) break;
    const a = attrs(m[0]);
    const src = a.src ?? a['data-src'] ?? '';
    if (!src) continue;
    images.push({
      src,
      alt: a.alt ?? '',
      className: a.class ?? '',
      id: a.id ?? '',
      width: a.width ? parseInt(a.width, 10) || undefined : undefined,
      height: a.height ? parseInt(a.height, 10) || undefined : undefined,
      inHeader: headerImgSrcs.has(src),
    });
  }

  const headings: Array<{ level: number; text: string }> = [];
  for (const m of noScripts.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripTags(m[2]);
    if (text) headings.push({ level: Number(m[1]), text: text.slice(0, 140) });
    if (headings.length >= LIMITS.headingsPerPage) break;
  }

  const jsonLd: unknown[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    if (jsonLd.length >= CAPS.jsonLd) break;
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown;
      const graph = parsed && typeof parsed === 'object' ? (parsed as { '@graph'?: unknown })['@graph'] : undefined;
      const items: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(graph) ? graph : [parsed];
      jsonLd.push(...items);
    } catch {
      /* malformed structured data is not evidence */
    }
  }

  const inlineSvgs: string[] = [];
  for (const m of headerRegion.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) {
    if (m[0].length <= 20_000) inlineSvgs.push(m[0]);
    if (inlineSvgs.length >= 2) break;
  }

  const inlineCss = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');

  const buttons: string[] = [];
  for (const m of noScripts.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    if (buttons.length >= CAPS.button) break;
    const t = stripTags(m[1]);
    if (t && t.length <= 40) buttons.push(t);
  }
  for (const a of anchors) {
    if (/\b(btn|button|cta)\b/i.test(a.className) && a.text && a.text.length <= 40) buttons.push(a.text);
  }

  const bodyHtml = firstBlock(noScripts, 'body') ?? noScripts;
  const mainHtml = firstBlock(bodyHtml, 'main') ?? removeBlocks(bodyHtml, ['nav', 'footer', 'header', 'aside', 'form', 'svg']);
  const words = stripTags(mainHtml).split(' ').filter(Boolean);
  const copy = words.slice(0, LIMITS.copyWordsPerPage).join(' ');

  return {
    title: title ? stripTags(title).slice(0, 200) : null,
    lang,
    meta,
    linkTags,
    anchors,
    images,
    headings,
    jsonLd,
    inlineSvgs,
    inlineCss,
    copy,
    buttons: [...new Set(buttons)].slice(0, 20),
    wordCount: words.length,
  };
}

// ─── Structured data ───────────────────────────────────────────────────────

const ORG_TYPES = /organization|localbusiness|corporation|store|restaurant|hotel|agency|company|brand|professionalservice|medical|dental|realestate|lawfirm|school|studio/i;

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined;
  if (v && typeof v === 'object' && typeof (v as { '@value'?: unknown })['@value'] === 'string') return (v as { '@value': string })['@value'];
  return undefined;
}

function addressString(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined;
  if (!v || typeof v !== 'object') return undefined;
  const a = v as Record<string, unknown>;
  const parts = ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry'].map((k) => asString(a[k])).filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

/** The Organization (or business) node, flattened. */
export function organizationFromJsonLd(nodes: unknown[]): JsonLdOrg | undefined {
  for (const raw of nodes) {
    if (!raw || typeof raw !== 'object') continue;
    const n = raw as Record<string, unknown>;
    const type = Array.isArray(n['@type']) ? (n['@type'] as unknown[]).map(String).join(',') : String(n['@type'] ?? '');
    if (!ORG_TYPES.test(type)) continue;
    const logo = n.logo && typeof n.logo === 'object' ? asString((n.logo as Record<string, unknown>).url) : asString(n.logo);
    const contact = n.contactPoint && typeof n.contactPoint === 'object' ? (Array.isArray(n.contactPoint) ? n.contactPoint[0] : n.contactPoint) as Record<string, unknown> : undefined;
    return {
      type,
      name: asString(n.name),
      legalName: asString(n.legalName),
      url: asString(n.url),
      logo,
      sameAs: Array.isArray(n.sameAs) ? (n.sameAs as unknown[]).map(String).filter((s) => /^https?:/.test(s)) : undefined,
      description: asString(n.description),
      email: asString(n.email) ?? (contact ? asString(contact.email) : undefined),
      telephone: asString(n.telephone) ?? (contact ? asString(contact.telephone) : undefined),
      address: addressString(n.address),
      slogan: asString(n.slogan),
      foundingDate: asString(n.foundingDate),
    };
  }
  return undefined;
}

// ─── Links ─────────────────────────────────────────────────────────────────

const SOCIAL_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(twitter|x)\.com$/, 'x'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)facebook\.com$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)threads\.net$/, 'threads'],
  [/(^|\.)github\.com$/, 'github'],
  [/(^|\.)behance\.net$/, 'behance'],
  [/(^|\.)dribbble\.com$/, 'dribbble'],
  [/(^|\.)pinterest\.(com|co\.uk|de|fr)$/, 'pinterest'],
  [/(^|\.)vimeo\.com$/, 'vimeo'],
];

/** Social-profile links only, deduped by platform + path, capped. */
export function socialLinks(anchors: Anchor[], sameAs: string[] | undefined, baseUrl: string, page: string): LinkEvidence[] {
  const out: LinkEvidence[] = [];
  const seen = new Set<string>();
  const consider = (raw: string) => {
    const url = resolveHref(raw, baseUrl);
    if (!url) return;
    let host: string;
    let path: string;
    try {
      const u = new URL(url);
      host = u.hostname.replace(/^www\./, '').toLowerCase();
      path = u.pathname.replace(/\/+$/, '');
    } catch {
      return;
    }
    const hit = SOCIAL_HOSTS.find(([re]) => re.test(host));
    if (!hit) return;
    // A share button links to the platform, not to a profile.
    if (!path || /\/(share|sharer|intent|login|signup|hashtag|explore|search)\b/.test(path)) return;
    const key = `${hit[1]}:${path.toLowerCase()}`;
    if (seen.has(key) || out.length >= LIMITS.socialLinks) return;
    // A site links its GitHub org, then six repositories: two per platform is
    // the profile and one more, not a catalogue.
    if (out.filter((l) => l.platform === hit[1]).length >= 2) return;
    seen.add(key);
    out.push({ url, platform: hit[1], page });
  };
  for (const a of anchors) consider(a.href);
  for (const s of sameAs ?? []) consider(s);
  return out;
}

// ─── Contact ───────────────────────────────────────────────────────────────

export function contactFrom(html: string, anchors: Anchor[], org: JsonLdOrg | undefined, page: string): BusinessEvidence['contact'] {
  const out: BusinessEvidence['contact'] = {};
  const mailto = anchors.find((a) => /^mailto:/i.test(a.href));
  const tel = anchors.find((a) => /^tel:/i.test(a.href));
  const email = org?.email ?? mailto?.href.replace(/^mailto:/i, '').split('?')[0].trim();
  const phone = org?.telephone ?? tel?.href.replace(/^tel:/i, '').trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.email = email;
  if (phone && /\d{5,}/.test(phone.replace(/\D/g, ''))) out.phone = phone;
  if (org?.address) out.address = org.address;
  else {
    const addr = /<address\b[^>]*>([\s\S]*?)<\/address>/i.exec(html);
    if (addr) {
      const text = stripTags(addr[1]).slice(0, 160);
      if (text) out.address = text;
    }
  }
  if (out.email || out.phone || out.address) out.page = page;
  return out;
}

// ─── Colours ───────────────────────────────────────────────────────────────

export function normalizeHex(raw: string): string | null {
  const s = raw.trim();
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 4) h = h.slice(0, 3);
    if (h.length === 8) h = h.slice(0, 6);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return `#${h.toUpperCase()}`;
  }
  const rgb = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(s);
  if (rgb) {
    const to = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
    return `#${to(rgb[1])}${to(rgb[2])}${to(rgb[3])}`.toUpperCase();
  }
  return null;
}

/** Greys and near-black/near-white are the page's ground, not the brand's colour. */
export function isNeutral(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 510;
  const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1)) / 255;
  // Low chroma is grey whatever its lightness: Tailwind's #E5E7EB and #9CA3AF
  // are page furniture, not a palette. Measured on a real landing page.
  return sat < 0.1 || l > 0.95 || l < 0.06 || max - min < 24;
}

const COLOR_PROPS = /(?:^|[;{\s])(?:--[\w-]*(?:colou?r|brand|primary|secondary|accent|theme)[\w-]*|color|background(?:-color)?|border(?:-[a-z]+)?-color|fill|stroke)\s*:\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\))/gi;

/** Colour signals from CSS text, ranked by how deliberately they were named. */
export function colorsFromCss(css: string): ColorEvidence[] {
  const tally = new Map<string, ColorEvidence>();
  for (const m of css.matchAll(COLOR_PROPS)) {
    const hex = normalizeHex(m[1]);
    if (!hex || isNeutral(hex)) continue;
    const decl = m[0].replace(/^[;{\s]+/, '').trim();
    const varName = /^--[\w-]+/.exec(decl)?.[0];
    const weight = varName ? (/primary|brand|main/i.test(varName) ? 40 : /secondary|accent/i.test(varName) ? 25 : 12) : 1;
    const cur = tally.get(hex) ?? { hex, source: varName ? 'css-var' : 'css', count: 0, ...(varName ? { name: varName } : {}) };
    cur.count += weight;
    if (varName && cur.source !== 'css-var') {
      cur.source = 'css-var';
      cur.name = varName;
    }
    tally.set(hex, cur);
  }
  return [...tally.values()].sort((a, b) => b.count - a.count);
}

// ─── Typography ────────────────────────────────────────────────────────────

const GENERIC = new Set(['inherit', 'initial', 'unset', 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica neue', 'helvetica', 'arial', 'noto sans', 'apple color emoji', 'segoe ui emoji', 'sans', 'var']);

function firstFamily(value: string): string | null {
  for (const part of value.split(',')) {
    const name = part.trim().replace(/^["']|["']$/g, '').replace(/\s*!important$/, '').trim();
    if (!name || name.startsWith('var(') || GENERIC.has(name.toLowerCase())) continue;
    // Size-adjusted fallback faces ("md-io-fallback", "Inter Fallback") are
    // plumbing for the real face, never a typeface the brand chose.
    if (/fallback/i.test(name)) continue;
    return name;
  }
  return null;
}

export function fontsFromCss(css: string, googleFontLinks: string[]): FontEvidence[] {
  const out = new Map<string, FontEvidence>();
  const add = (family: string, source: FontEvidence['source'], weight?: string, role?: FontEvidence['role']) => {
    const key = family.toLowerCase();
    const cur = out.get(key) ?? { family, source, weights: [] };
    if (weight && !cur.weights.includes(weight)) cur.weights.push(weight);
    if (role && !cur.role) cur.role = role;
    if (source === 'google-fonts') cur.source = 'google-fonts';
    else if (source === 'font-face' && cur.source === 'css') cur.source = 'font-face';
    out.set(key, cur);
  };
  for (const link of googleFontLinks) {
    const q = link.split('?')[1] ?? '';
    for (const fam of q.split('&').filter((p) => p.startsWith('family='))) {
      for (const one of safeDecodeURIComponent(fam.slice(7)).split('|')) {
        const [name, spec] = one.split(':');
        const family = name.replace(/\+/g, ' ').trim();
        if (!family) continue;
        const weights = spec ? [...spec.matchAll(/(\d{3})/g)].map((m) => m[1]) : [];
        add(family, 'google-fonts');
        for (const w of weights) add(family, 'google-fonts', w);
      }
    }
  }
  for (const m of css.matchAll(/@font-face\s*{([^}]*)}/gi)) {
    const fam = /font-family\s*:\s*([^;]+)/i.exec(m[1])?.[1];
    const weight = /font-weight\s*:\s*([^;]+)/i.exec(m[1])?.[1]?.trim();
    const family = fam ? firstFamily(fam) : null;
    if (family) add(family, 'font-face', weight);
  }
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = m[1].trim();
    const fam = /font-family\s*:\s*([^;]+)/i.exec(m[2])?.[1];
    if (!fam) continue;
    const family = firstFamily(fam);
    if (!family) continue;
    const role = /(^|[\s,])h[1-3]\b|\.(?:heading|title|display|hero)/i.test(selector) ? 'heading' : /(^|[\s,])(body|html|p)\b/i.test(selector) ? 'body' : undefined;
    add(family, 'css', undefined, role);
  }
  return [...out.values()];
}

// ─── Logo candidates ───────────────────────────────────────────────────────

const LOGO_WORD = /\blogo\b|brand-?mark|wordmark|site-?logo|navbar-brand/i;

export function logoCandidatesFrom(doc: ParsedDocument, baseUrl: string, org: JsonLdOrg | undefined, manifestIcons: Array<{ src: string; sizes?: string }> = []): LogoCandidate[] {
  const out: LogoCandidate[] = [];
  const seen = new Set<string>();
  const push = (c: LogoCandidate) => {
    const key = c.inline ? `inline:${c.inline.length}:${c.inline.slice(0, 60)}` : c.url;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  for (const svg of doc.inlineSvgs) {
    const named = LOGO_WORD.test(svg.slice(0, 400));
    push({ url: `${baseUrl}#inline-svg-${out.length}`, source: 'svg-inline', inline: svg, score: named ? 95 : 70 });
  }
  for (const img of doc.images) {
    const url = resolveHref(img.src, baseUrl);
    if (!url) continue;
    const named = LOGO_WORD.test(`${img.src} ${img.alt} ${img.className} ${img.id}`);
    if (!named && !img.inHeader) continue;
    if (!named && img.width && img.height && (img.width > 600 || img.height > 300)) continue;
    push({ url, source: 'header-img', score: named ? (img.inHeader ? 100 : 80) : 55, alt: img.alt || undefined, width: img.width, height: img.height });
  }
  if (org?.logo) {
    const url = resolveHref(org.logo, baseUrl);
    if (url) push({ url, source: 'json-ld-logo', score: 85 });
  }
  for (const icon of manifestIcons) {
    const url = resolveHref(icon.src, baseUrl);
    if (!url) continue;
    const size = parseInt((icon.sizes ?? '').split('x')[0], 10) || 0;
    push({ url, source: 'manifest-icon', score: 50 + Math.min(size, 512) / 32, width: size || undefined, height: size || undefined });
  }
  for (const l of doc.linkTags) {
    if (/apple-touch-icon/.test(l.rel)) push({ url: l.href, source: 'apple-touch-icon', score: 45 });
    else if (/\bicon\b|mask-icon/.test(l.rel)) {
      const svg = /svg/i.test(l.type ?? '') || /\.svg(\?|$)/i.test(l.href);
      push({ url: l.href, source: 'favicon', score: svg ? 40 : 20 });
    }
  }
  if (!out.length && doc.meta['og:image']) {
    const url = resolveHref(doc.meta['og:image'], baseUrl);
    if (url) push({ url, source: 'og-image', score: 10 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, LIMITS.logoCandidates);
}

// ─── Copy ──────────────────────────────────────────────────────────────────

export function sentencesOf(text: string, max: number): string[] {
  const out: string[] = [];
  for (const raw of text.split(/(?<=[.!?])\s+/)) {
    const s = raw.trim();
    if (s.length < 40 || s.length > 180) continue;
    if (/cookie|privacy|©|all rights reserved|subscribe|newsletter/i.test(s)) continue;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

// ─── Manifest ──────────────────────────────────────────────────────────────

export interface ManifestSignals {
  name?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  icons: Array<{ src: string; sizes?: string }>;
}

export function parseManifest(json: string): ManifestSignals | null {
  try {
    const m = JSON.parse(json) as Record<string, unknown>;
    if (!m || typeof m !== 'object') return null;
    const icons = Array.isArray(m.icons) ? (m.icons as Array<Record<string, unknown>>).filter((i) => typeof i.src === 'string').map((i) => ({ src: String(i.src), sizes: typeof i.sizes === 'string' ? i.sizes : undefined })) : [];
    return {
      name: asString(m.name),
      shortName: asString(m.short_name),
      themeColor: asString(m.theme_color),
      backgroundColor: asString(m.background_color),
      icons,
    };
  } catch {
    return null;
  }
}

// ─── Names, tagline, products ──────────────────────────────────────────────

export function nameCandidates(doc: ParsedDocument, org: JsonLdOrg | undefined, manifest: ManifestSignals | null): BusinessEvidence['names'] {
  const out: BusinessEvidence['names'] = [];
  const add = (value: string | undefined, source: string) => {
    const v = value?.trim();
    if (!v || v.length > 60) return;
    if (out.some((n) => n.value.toLowerCase() === v.toLowerCase())) return;
    out.push({ value: v, source });
  };
  add(org?.name, 'structured data');
  add(doc.meta['og:site_name'], 'page metadata');
  add(manifest?.name ?? manifest?.shortName, 'web app manifest');
  if (doc.title) {
    // A title is "Name | Tagline" or "Tagline | Name": the name is the short
    // part. A part that reads as a sentence is the tagline, not the name.
    const parts = doc.title.split(/\s+[|–—\-·•:]\s+/).map((p) => p.trim()).filter(Boolean);
    const short = [...parts].sort((x, y) => x.split(' ').length - y.split(' ').length)[0];
    if (short && short.split(' ').length <= 4) add(short, 'page title');
  }
  const logoAlt = doc.images.find((i) => LOGO_WORD.test(`${i.alt} ${i.className} ${i.id} ${i.src}`) && i.alt && !/logo/i.test(i.alt))?.alt;
  add(logoAlt, 'logo');
  return out.slice(0, 4);
}

export function taglineCandidate(doc: ParsedDocument, org: JsonLdOrg | undefined, names: BusinessEvidence['names'], page: string): BusinessEvidence['tagline'] | undefined {
  if (org?.slogan) return { value: org.slogan.slice(0, 120), page, source: 'structured data' };
  const known = names.map((n) => n.value.toLowerCase());
  const ogTitle = doc.meta['og:title'] ?? doc.title;
  if (ogTitle) {
    const parts = ogTitle.split(/\s+[|–—\-·•:]\s+/).map((p) => p.trim()).filter((p) => p && !known.includes(p.toLowerCase()));
    const cand = parts.find((p) => p.length >= 12 && p.length <= 120 && p.split(' ').length >= 3);
    if (cand) return { value: cand, page, source: 'page title' };
  }
  const h1 = doc.headings.find((h) => h.level === 1)?.text;
  if (h1 && h1.length >= 12 && h1.length <= 120 && !known.includes(h1.toLowerCase()) && h1.split(' ').length >= 3) {
    return { value: h1, page, source: 'headline' };
  }
  return undefined;
}

const SERVICE_PATH = /service|product|solution|what-we-do|offer|menu|shop|collection|practice|expertise/i;
const NOT_A_PRODUCT = /^(home|about|contact|blog|news|careers?|login|sign ?in|sign ?up|cart|search|faq|privacy|terms|read more|learn more|get started|book|all|view all|our|more)$/i;

export function productCandidates(docs: Array<{ doc: ParsedDocument; url: string; role: PageRole }>): BusinessEvidence['products'] {
  const out: BusinessEvidence['products'] = [];
  const seen = new Set<string>();
  const add = (value: string, page: string) => {
    const v = value.replace(/\s+/g, ' ').trim();
    if (v.length < 3 || v.length > 48 || NOT_A_PRODUCT.test(v) || /\d{3,}/.test(v)) return;
    const key = v.toLowerCase();
    if (seen.has(key) || out.length >= LIMITS.products) return;
    seen.add(key);
    out.push({ value: v, page });
  };
  // A services page's own headings describe the offer directly.
  for (const { doc, url, role } of docs) {
    if (role !== 'services') continue;
    for (const h of doc.headings) if (h.level >= 2) add(h.text, url);
  }
  // Nav entries that sit under a services/products path.
  for (const { doc, url } of docs) {
    for (const a of doc.anchors) {
      if (!a.inNav || !a.text) continue;
      if (SERVICE_PATH.test(a.href) && !SERVICE_PATH.test(a.text)) add(a.text, url);
    }
  }
  return out;
}
