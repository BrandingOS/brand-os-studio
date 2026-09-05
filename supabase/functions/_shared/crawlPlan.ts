// ============================================================================
// Which pages a scan reads after the homepage, and what robots.txt allows.
//
// Homepage + at most four: About, Services/Products, Contact, plus one more by
// nav prominence. Same origin only. Legal, auth, commerce and content-index
// pages are never key pages. Pure.
// ============================================================================
import type { Anchor, PageRole } from './websiteEvidence.ts';

export const MAX_KEY_PAGES = 4;

export interface PlannedPage {
  url: string;
  role: PageRole;
  score: number;
}

const ROLE_TOKENS: Array<{ role: PageRole; re: RegExp }> = [
  { role: 'about', re: /\babout(-| )?(us|the-studio|company)?\b|\bcompany\b|\bour-?story\b|\bwho-?we-?are\b|\bstory\b|\bteam\b|\bstudio\b/i },
  { role: 'services', re: /\bservices?\b|\bproducts?\b|\bsolutions?\b|\bwhat-?we-?do\b|\bmenu\b|\bshop\b|\bofferings?\b|\bexpertise\b|\bpractice\b|\bcollections?\b/i },
  { role: 'contact', re: /\bcontact(-| )?(us)?\b|\breach-?us\b|\bget-?in-?touch\b|\bvisit\b/i },
];

const EXCLUDED = /\b(login|log-?in|sign-?in|sign-?up|register|account|cart|checkout|basket|privacy|terms|cookie|legal|imprint|impressum|careers?|jobs?|blog|news|press|faq|search|sitemap|feed|rss|wp-admin|wp-login|tag|category|author|page\/\d+)\b/i;
const FILE_LIKE = /\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|mp3|docx?|xlsx?|pptx?)(\?|$)/i;
const LANG_PREFIX = /^\/([a-z]{2})(?:-[a-z]{2})?(?=\/|$)/i;

export function normalizePageUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|mc_)/i.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.toLowerCase();
    let path = u.pathname.replace(/\/+$/, '') || '/';
    if (/\/index\.(html?|php)$/i.test(path)) path = path.replace(/\/index\.(html?|php)$/i, '') || '/';
    u.pathname = path;
    return u.toString();
  } catch {
    return null;
  }
}

function sameSite(a: URL, origin: URL): boolean {
  const strip = (h: string) => h.replace(/^www\./, '');
  return strip(a.hostname) === strip(origin.hostname);
}

/** Path with a leading language segment removed, for duplicate detection. */
function langFree(path: string): string {
  return path.replace(LANG_PREFIX, '') || '/';
}

/**
 * Picks the key pages from a homepage's anchors.
 *
 * Every anchor is scored by role words in its path and its label; nav anchors
 * get a bonus. One page per role wins, then the best remaining nav page fills
 * the fourth slot.
 */
export function planKeyPages(anchors: Anchor[], homepageUrl: string, isAllowed: (path: string) => boolean = () => true): PlannedPage[] {
  const origin = new URL(homepageUrl);
  const home = normalizePageUrl(homepageUrl, homepageUrl);
  const byUrl = new Map<string, { url: string; role: PageRole; score: number; nav: boolean }>();

  for (const a of anchors) {
    const url = normalizePageUrl(a.href, homepageUrl);
    if (!url || url === home) continue;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      continue;
    }
    if (!sameSite(u, origin)) continue;
    const path = u.pathname;
    if (path === '/' || FILE_LIKE.test(path) || EXCLUDED.test(path) || EXCLUDED.test(a.text)) continue;
    if (!isAllowed(path)) continue;
    const haystack = `${langFree(path)} ${a.text}`;
    let role: PageRole = 'other';
    let score = a.inNav ? 10 : 0;
    for (const r of ROLE_TOKENS) {
      if (r.re.test(langFree(path))) {
        role = r.role;
        score += 60;
        break;
      }
      if (r.re.test(a.text)) {
        role = r.role;
        score += 45;
        break;
      }
    }
    // Shallow paths are more likely to be the page itself than a post inside it.
    score -= Math.max(0, path.split('/').filter(Boolean).length - 1) * 8;
    if (/\d{4}/.test(haystack)) score -= 20;
    const cur = byUrl.get(url);
    if (!cur || cur.score < score) byUrl.set(url, { url, role, score, nav: a.inNav || cur?.nav === true });
  }

  const all = [...byUrl.values()].sort((a, b) => b.score - a.score);
  const chosen: PlannedPage[] = [];
  const takenPaths = new Set<string>();
  const take = (c: { url: string; role: PageRole; score: number }) => {
    const key = langFree(new URL(c.url).pathname).toLowerCase();
    if (takenPaths.has(key)) return false;
    takenPaths.add(key);
    chosen.push({ url: c.url, role: c.role, score: c.score });
    return true;
  };
  for (const role of ['about', 'services', 'contact'] as const) {
    const best = all.find((c) => c.role === role && !chosen.some((x) => x.url === c.url));
    if (best) take(best);
  }
  for (const c of all) {
    if (chosen.length >= MAX_KEY_PAGES) break;
    if (chosen.some((x) => x.url === c.url)) continue;
    if (!c.nav && c.role === 'other') continue;
    take(c);
  }
  return chosen.slice(0, MAX_KEY_PAGES);
}

// ─── robots.txt ────────────────────────────────────────────────────────────

export interface RobotsRules {
  disallow: string[];
  allow: string[];
}

/** The rules that apply to our agent (its own group first, else `*`). */
export function parseRobots(text: string, agent = 'brandingosbot'): RobotsRules {
  const groups: Array<{ agents: string[]; disallow: string[]; allow: string[] }> = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], disallow: [], allow: [] };
        groups.push(cur);
      }
      cur.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'disallow' && value) cur.disallow.push(value);
    if (key === 'allow' && value) cur.allow.push(value);
  }
  const own = groups.find((g) => g.agents.some((a) => a === agent || agent.startsWith(a)));
  const any = groups.find((g) => g.agents.includes('*'));
  const g = own ?? any;
  return g ? { disallow: g.disallow, allow: g.allow } : { disallow: [], allow: [] };
}

function ruleMatches(rule: string, path: string): boolean {
  // A trailing `$` anchors the rule to the end of the path, as the standard says.
  const anchored = rule.endsWith('$');
  const body = anchored ? rule.slice(0, -1) : rule;
  const re = new RegExp('^' + body.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''));
  return re.test(path);
}

/** Longest matching rule wins, as the standard says; allow beats disallow on a tie. */
export function robotsAllows(rules: RobotsRules, path: string): boolean {
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules.disallow) if (ruleMatches(r, path) && (!best || r.length > best.len)) best = { allow: false, len: r.length };
  for (const r of rules.allow) if (ruleMatches(r, path) && (!best || r.length >= best.len)) best = { allow: true, len: r.length };
  return best ? best.allow : true;
}
