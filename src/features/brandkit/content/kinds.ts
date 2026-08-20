/**
 * What a Brand Kit deliverable CONTAINS.
 *
 * Before this module there was no answer to that question. There was
 * `TemplateOverrides` — a flat bag of about fifteen scalar strings shared
 * by every deliverable in the kit — and a set of React designs with their
 * literals baked in. An invoice's line items could not be expressed in
 * that bag at all, which is why the Invoice editor offered two text
 * fields, and why its "Total · $8,715" was a string that had nothing to
 * do with the four prices printed above it.
 *
 * A content kind is the model of one sort of artifact. It is the source
 * of truth: the renderer paints from it, the panel edits it, and it is
 * what gets saved. Nothing here is derived from the rendered DOM and
 * nothing here is written by string substitution.
 *
 * Kinds are deliberately fewer than deliverables. Business Card and Email
 * Signature are both `person` — the email-signature designs hardcode the
 * identical five fields — so one kind serves both and neither has a
 * private copy of "what a person is".
 */

/** The five things a person's identity block says. */
export type PersonContent = {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
};

/** A letter's header, addressing and body. */
export type LetterContent = {
  senderName: string;
  senderAddress: string;
  website: string;
  phone: string;
  date: string;
  recipient: string;
  subject: string;
  /**
   * The letter itself. Empty means "show the design's placeholder rules"
   * — the letterhead designs draw grey bars where body copy goes, and a
   * blank body should keep looking like a blank letterhead rather than a
   * hole. Typing replaces the bars with real text.
   */
  body: string;
};

export type InvoiceLineItem = {
  /** Stable across reorder and re-render. Persisted with the item. */
  id: string;
  label: string;
  qty: number;
  unitPrice: number;
};

export type InvoiceContent = {
  issuerName: string;
  issuerAddress: string;
  clientName: string;
  clientAddress: string;
  number: string;
  issueDate: string;
  dueDate: string;
  /** ISO 4217-ish code; only used to pick a symbol for display. */
  currency: string;
  lineItems: InvoiceLineItem[];
  /** Percent. Applied to the subtotal before tax. */
  discountRate: number;
  /** Percent. Applied to the discounted subtotal. */
  taxRate: number;
  notes: string;
};

export type ContentKind = 'person' | 'letter' | 'invoice';

export type DeliverableContent =
  | ({ kind: 'person' } & PersonContent)
  | ({ kind: 'letter' } & LetterContent)
  | ({ kind: 'invoice' } & InvoiceContent);

/** Narrowing helpers — cheaper to read than repeating the discriminant. */
export const isPerson = (c: DeliverableContent): c is { kind: 'person' } & PersonContent =>
  c.kind === 'person';
export const isLetter = (c: DeliverableContent): c is { kind: 'letter' } & LetterContent =>
  c.kind === 'letter';
export const isInvoice = (c: DeliverableContent): c is { kind: 'invoice' } & InvoiceContent =>
  c.kind === 'invoice';

/* ── Which deliverables have a content kind ───────────────────────── */

/**
 * Template TYPE → content kind.
 *
 * Keyed by template type because that is what the renderer dispatcher
 * already routes on, so a kind reaches every design in a family at once.
 * A type absent from this map has no content model yet and keeps working
 * exactly as it does today — that is what makes the retrofit progressive
 * rather than a flag day.
 */
const KIND_BY_TEMPLATE_TYPE: Record<string, ContentKind> = {
  'business-cards': 'person',
  'email-sig': 'person',
  'web-email-signature': 'person',
  letterhead: 'letter',
  invoices: 'invoice',
};

export function contentKindForTemplateType(templateType: string): ContentKind | null {
  return KIND_BY_TEMPLATE_TYPE[templateType] ?? null;
}

/* ── Defaults ─────────────────────────────────────────────────────── */

type BrandLike = { name: string };

function brandSlug(brand: BrandLike): string {
  return (brand.name || 'brand').toLowerCase().replace(/\s+/g, '-');
}

/**
 * Line-item ids.
 *
 * Monotonic within a session and never random, so a default invoice is
 * identical on every render — a test can assert it, and two tabs opening
 * the same unsaved invoice agree. Ids only have to be unique within one
 * invoice, and `nextLineItemId` derives from the items already present so
 * an id is never reused after a delete.
 */
export function nextLineItemId(items: ReadonlyArray<InvoiceLineItem>): string {
  let max = 0;
  for (const item of items) {
    const m = /^li-(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `li-${max + 1}`;
}

export function defaultPersonContent(brand: BrandLike): PersonContent {
  const slug = brandSlug(brand);
  return {
    fullName: 'Jane Smith',
    jobTitle: 'Vice President',
    email: `jane@${slug}.com`,
    phone: '+1 234 56789',
    website: `${slug}.com`,
  };
}

export function defaultLetterContent(brand: BrandLike): LetterContent {
  const slug = brandSlug(brand);
  return {
    senderName: brand.name,
    senderAddress: '1234 Studio · NY',
    website: `${slug}.com`,
    phone: '+1 234 56789',
    date: '',
    recipient: '',
    subject: '',
    body: '',
  };
}

export function defaultInvoiceContent(brand: BrandLike): InvoiceContent {
  return {
    issuerName: brand.name,
    issuerAddress: '1234 Studio · NY',
    clientName: 'Acme Co.',
    clientAddress: '587 Recipient Ave',
    number: '0014',
    issueDate: '',
    dueDate: '',
    currency: 'USD',
    // The same four services the designs were authored around, so a brand
    // that has never opened the editor sees exactly what it sees today.
    lineItems: [
      { id: 'li-1', label: 'Brand Strategy', qty: 1, unitPrice: 2400 },
      { id: 'li-2', label: 'Identity System', qty: 1, unitPrice: 3800 },
      { id: 'li-3', label: 'Guidelines Doc', qty: 1, unitPrice: 1200 },
      { id: 'li-4', label: 'Asset Library', qty: 1, unitPrice: 900 },
    ],
    discountRate: 0,
    taxRate: 5,
    notes: 'Payment due within 30 days.',
  };
}

export function defaultContentFor(kind: ContentKind, brand: BrandLike): DeliverableContent {
  switch (kind) {
    case 'person':
      return { kind: 'person', ...defaultPersonContent(brand) };
    case 'letter':
      return { kind: 'letter', ...defaultLetterContent(brand) };
    case 'invoice':
      return { kind: 'invoice', ...defaultInvoiceContent(brand) };
  }
}

/**
 * Fill a partial (or stale) stored value out to a complete content object.
 *
 * Storage is forward-compatible by construction: a saved invoice from
 * before a field existed still loads, because every field falls back to
 * the default. Empty strings are kept as the user's answer — only
 * genuinely absent keys are filled — except where the design cannot paint
 * a blank, which is what the renderers' own fallbacks handle.
 */
export function hydrateContent(
  kind: ContentKind,
  brand: BrandLike,
  stored: unknown,
): DeliverableContent {
  const base = defaultContentFor(kind, brand);
  if (!stored || typeof stored !== 'object') return base;
  const s = stored as Record<string, unknown>;
  // A stored value for a different kind is not this deliverable's content.
  if (typeof s.kind === 'string' && s.kind !== kind) return base;

  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    if (key === 'kind') continue;
    if (s[key] !== undefined) merged[key] = s[key];
  }

  if (kind === 'invoice') {
    const baseInvoice = base as { kind: 'invoice' } & InvoiceContent;
    const raw = Array.isArray(s.lineItems) ? s.lineItems : null;
    merged.lineItems = raw
      ? raw.map((item, i) => hydrateLineItem(item, i))
      : baseInvoice.lineItems;
    // Fall back to the DEFAULT rate, not to zero. A stored invoice from
    // before these fields existed should keep charging the default tax,
    // not silently become tax-free.
    merged.taxRate = finiteOr(s.taxRate, baseInvoice.taxRate);
    merged.discountRate = finiteOr(s.discountRate, baseInvoice.discountRate);
  }
  return merged as DeliverableContent;
}

function hydrateLineItem(raw: unknown, index: number): InvoiceLineItem {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `li-${index + 1}`,
    label: typeof r.label === 'string' ? r.label : '',
    qty: finiteOr(r.qty, 1),
    unitPrice: finiteOr(r.unitPrice, 0),
  };
}

function finiteOr(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
