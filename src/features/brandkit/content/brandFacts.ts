/**
 * What a default can honestly say about a brand.
 *
 * Every content kind needs defaults, and a default is read by a customer
 * before they have typed anything. The old ones were literals — "Jane
 * Smith", "Vice President", "Acme Co.", "+1 234 56789" — which meant the
 * kit shipped somebody else's identity on the first paint and a customer
 * who never opened the editor exported it.
 *
 * The rule this module exists to enforce is narrow: a default is either a
 * FACT about the brand, or an honest placeholder that reads as a prompt
 * ("Your name", "Client name"). It is never a plausible-looking invention.
 *
 * The brand shape is duck-typed on purpose. Callers hand us anything from
 * a whole `MockBrand` down to `{ name: 'SKAM' }` — the template-instance
 * properties panel genuinely only has a name — so every field beyond the
 * name is optional and every read is defensive.
 */

/**
 * Whatever the caller has. Only `name` is ever guaranteed.
 *
 * Every other field is `unknown` ON PURPOSE. Callers hand us a
 * `MockBrand`, a canonical `Brand`, or `{ name: 'SKAM' }` — three shapes
 * that disagree about what `strategy`, `websites` and `links` are — and a
 * declared shape here would make passing one of them a type ERROR rather
 * than a widening. The readers below narrow at runtime, which is the only
 * place the difference is real.
 */
export type BrandLike = {
  name: string;
  websites?: unknown;
  links?: unknown;
  strategy?: unknown;
  businessInfo?: unknown;
  contact?: unknown;
};

/* ── Small, defensive readers ─────────────────────────────────────── */

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * First non-empty string among several candidate paths into the brand's
 * contact bag. `businessInfo.contact.email`, `businessInfo.email` and a
 * top-level `contact.email` all mean the same thing to a letterhead.
 */
function contactField(brand: BrandLike, key: string): string {
  const bags: Array<Record<string, unknown> | null> = [
    record(record(brand.businessInfo)?.contact),
    record(brand.businessInfo),
    record(record(brand.contact)?.contact),
    record(brand.contact),
  ];
  for (const bag of bags) {
    if (!bag) continue;
    const value = str(bag[key]);
    if (value) return value;
  }
  return '';
}

/* ── Identity ─────────────────────────────────────────────────────── */

export function brandName(brand: BrandLike): string {
  return str(brand?.name) || 'Your brand';
}

export function brandSlug(brand: BrandLike): string {
  return brandName(brand).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
}

/** Up to three letters — what a favicon or an avatar can actually hold. */
export function brandInitials(brand: BrandLike): string {
  const words = brandName(brand)
    .split(/[\s·—–-]+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return 'B';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
}

/* ── Where the brand lives ────────────────────────────────────────── */

/** `raqm.com` — host only, no scheme, no `www.`, no trailing slash. */
export function brandDomain(brand: BrandLike): string {
  const candidates: string[] = [];
  const listed = Array.isArray(brand?.websites) ? brand.websites : [];
  for (const site of listed) {
    const url = str(record(site)?.url);
    if (url) candidates.push(url);
  }
  const fromContact = contactField(brand, 'website');
  if (fromContact) candidates.push(fromContact);

  for (const raw of candidates) {
    const host = raw
      .replace(/^[a-z]+:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[/?#]/)[0]
      .trim();
    if (host) return host.toLowerCase();
  }
  // Derived from the brand's own name — a guess the customer can see is a
  // guess, not an invented third party's address.
  return `${brandSlug(brand)}.com`;
}

export function brandUrl(brand: BrandLike): string {
  return `https://${brandDomain(brand)}`;
}

export function brandEmail(brand: BrandLike): string {
  return contactField(brand, 'email') || `hello@${brandDomain(brand)}`;
}

/** The brand's phone, or a prompt. Never an invented number. */
export function brandPhone(brand: BrandLike): string {
  return contactField(brand, 'phone') || 'Your phone';
}

export function brandAddress(brand: BrandLike): string {
  return (
    contactField(brand, 'address') ||
    str(record(brand.businessInfo)?.location) ||
    'Your address'
  );
}

/** `@raqm` — the brand's own handle if it has one, else its slug. */
export function brandHandle(brand: BrandLike): string {
  const links = Array.isArray(brand?.links) ? brand.links : [];
  for (const raw of links) {
    const link = record(raw);
    if (!link) continue;
    const label = str(link.label);
    if (label.startsWith('@')) return label;
    const url = str(link.url);
    const tail = url.replace(/\/+$/, '').split('/').pop() ?? '';
    if (url && tail && !tail.includes('.') && str(link.kind) !== 'website') return `@${tail}`;
  }
  return `@${brandSlug(brand).replace(/-/g, '')}`;
}

/* ── What the brand says about itself ─────────────────────────────── */

function strategy(brand: BrandLike): Record<string, unknown> {
  return record(brand?.strategy) ?? {};
}

export function strategyText(brand: BrandLike, key: string): string {
  return str(strategy(brand)[key]);
}

export function strategyList(brand: BrandLike, key: string): string[] {
  const raw = strategy(brand)[key];
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => str(v)).filter(Boolean);
}

/** The first sentence of a paragraph — a headline's worth of it. */
export function firstSentence(text: string): string {
  const trimmed = str(text);
  if (!trimmed) return '';
  const match = /^(.+?[.!?])(\s|$)/.exec(trimmed);
  return (match ? match[1] : trimmed).trim();
}

/**
 * The brand's own line, if it has one.
 *
 * Slogan first — it was written to be a line — then the opening sentence
 * of the summary. Empty when the brand has said neither; every caller
 * decides its own honest fallback rather than sharing one invented line.
 */
export function brandTagline(brand: BrandLike): string {
  return strategyText(brand, 'slogan') || firstSentence(strategyText(brand, 'summary'));
}

/**
 * The things the brand sells, as separate items.
 *
 * `strategy.products` is one free-text answer ("Brand strategy, identity
 * systems, guidelines"), so an invoice or a deck that wants a LIST has to
 * split it. Commas and newlines are how people write such an answer;
 * anything longer than a short phrase is prose, not a list.
 */
export function brandOfferings(brand: BrandLike, cap = 4): string[] {
  const raw = strategyText(brand, 'products');
  if (!raw) return [];
  const parts = raw
    .split(/[\n\r·;,]+|\s+\/\s+/)
    .map((p) => p.trim().replace(/^[-•*]\s*/, ''))
    .filter((p) => p.length > 1 && p.length <= 60);
  return parts.slice(0, cap);
}

/* ── Generic-but-branded copy ─────────────────────────────────────── */
/*
 * Used only where a design cannot paint a blank and the brand has not
 * answered. Every line names the brand, so what a customer reads on an
 * untouched card is about THEM — a starting point to edit, never another
 * company's details standing in for their own.
 */

export function summaryLine(brand: BrandLike): string {
  return (
    strategyText(brand, 'summary') ||
    `${brandName(brand)} is a brand with a clear point of view and a system to match.`
  );
}

export function missionLine(brand: BrandLike): string {
  return (
    strategyText(brand, 'mission') ||
    `${brandName(brand)} exists to make its work unmistakable — and to keep it that way.`
  );
}

export function audienceLine(brand: BrandLike): string {
  return (
    strategyText(brand, 'audience') ||
    `The people ${brandName(brand)} is built for — describe them here.`
  );
}

export function positioningLine(brand: BrandLike): string {
  return (
    strategyText(brand, 'positioning') ||
    `Where ${brandName(brand)} stands against everything else on the shelf.`
  );
}

export function offeringLines(brand: BrandLike, cap = 4): string[] {
  const offerings = brandOfferings(brand, cap);
  if (offerings.length) return offerings;
  return ['What you make', 'What you offer', 'What you deliver'].slice(0, cap);
}

export function valueLines(brand: BrandLike, cap = 4): string[] {
  const values = strategyList(brand, 'values');
  if (values.length) return values.slice(0, cap);
  const personality = strategyList(brand, 'personality');
  if (personality.length) return personality.slice(0, cap);
  return ['What you stand for', 'What you refuse', 'What you protect'].slice(0, cap);
}

/* ── Dates ────────────────────────────────────────────────────────── */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * `29 August 2026`.
 *
 * Formatted here rather than through `toLocaleDateString` because the
 * same brand kit is rendered in a browser, in a test runner and in an
 * offscreen export canvas, and a date that changes shape with the host's
 * locale is a date that changes the artwork.
 */
export function formatLongDate(date: Date = new Date()): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** `29.08.26` — the compact form the small designs were drawn around. */
export function formatShortDate(date: Date = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}
