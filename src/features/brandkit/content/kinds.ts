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
 * private copy of "what a person is". A poster, a story and a cover are
 * all `socialPost`; five deck families are all `deck`.
 *
 * DEFAULTS COME FROM THE BRAND. See `brandFacts.ts` for the rule and the
 * readers; the short version is that a default is a fact about the brand
 * or an honest placeholder, and never a plausible invention. The literals
 * this model was born with — "Jane Smith", "Acme Co.", "+1 234 56789" —
 * are banned, and a test scans for them.
 */
import type { TemplateDesignPicks } from './schema';
import {
  addDays,
  audienceLine,
  brandAddress,
  brandOfferings,
  brandDomain,
  brandEmail,
  brandHandle,
  brandInitials,
  brandName,
  brandPhone,
  brandTagline,
  brandUrl,
  formatLongDate,
  formatShortDate,
  missionLine,
  offeringLines,
  positioningLine,
  strategyText,
  summaryLine,
  valueLines,
  type BrandLike,
} from './brandFacts';

export type { BrandLike };

/* ── The kinds ────────────────────────────────────────────────────── */

/**
 * A person's identity block — the whole of a business card, and the whole
 * of an email signature.
 *
 * The five original fields are the ones every design already painted; the
 * rest arrived with the reference audit's "Edit Info" (company, address,
 * tagline, pronouns, social handle), which is one place a customer fills
 * in once so every stationery template follows.
 */
export type PersonContent = {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  company: string;
  address: string;
  tagline: string;
  /** Optional by intent — a blank line is better than a wrong one. */
  pronouns?: string;
  socialHandle?: string;
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
   * The letter itself. Defaults to a short branded paragraph rather than
   * an empty string: the letterhead designs draw grey rules where body
   * copy goes, so a blank default shipped a page of grey bars as the
   * finished artifact.
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

/** One side of an envelope: who, then however many lines they need. */
export type AddressBlock = {
  name: string;
  lines: string[];
};

export type AddressContent = {
  sender: AddressBlock;
  recipient: AddressBlock;
  /** "Postage paid", a permit number, a stamp caption — often nothing. */
  postageLabel?: string;
};

export type NoteContent = {
  greeting: string;
  message: string;
  signOff: string;
};

export type SocialPostContent = {
  headline: string;
  subline: string;
  body: string;
  cta: string;
  handle: string;
  date: string;
  tag: string;
};

/** What a profile icon or a favicon draws in its frame. */
export type ProfileGlyph = 'logo' | 'initial' | 'custom';

export type ProfileContent = {
  glyph: ProfileGlyph;
  /** At most three characters — anything longer is unreadable at 32px. */
  text: string;
  tabTitle: string;
  url: string;
};

export type WebHeroStat = {
  id: string;
  value: string;
  label: string;
};

export type WebHeroContent = {
  nav: string[];
  eyebrow: string;
  headline: string;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
  /**
   * Empty by default, and deliberately. A hero's stats are the one part
   * of it that is a CLAIM ("trusted by 1k+ brands"), and a claim nobody
   * made is the exact defect this model exists to remove.
   */
  stats: WebHeroStat[];
  url: string;
};

export type DeckSlideKind = 'title' | 'section' | 'content' | 'stat' | 'quote' | 'closing';

export const DECK_SLIDE_KINDS: ReadonlyArray<DeckSlideKind> = [
  'title',
  'section',
  'content',
  'stat',
  'quote',
  'closing',
];

/**
 * One slide.
 *
 * Every field exists on every slide whatever its kind, so a path resolves
 * and a kind change is a re-render rather than a data migration: turning
 * a content slide into a quote must not throw away the heading you would
 * get back by turning it round again.
 */
export type DeckSlide = {
  id: string;
  kind: DeckSlideKind;
  heading: string;
  body: string;
  bullets: string[];
  stat: { value: string; label: string };
  quote: { text: string; by: string };
};

export type DeckContent = {
  title: string;
  subtitle: string;
  presenter: string;
  date: string;
  slides: DeckSlide[];
};

export type MockupLabelContent = {
  primaryText: string;
  secondaryText: string;
  badge: string;
  url: string;
};

export type MotionContent = {
  text: string;
  durationMs: number;
  loop: boolean;
};

export type QrContent = {
  payload: string;
  label: string;
};

export type ContentKind =
  | 'person'
  | 'letter'
  | 'invoice'
  | 'address'
  | 'note'
  | 'socialPost'
  | 'profile'
  | 'webHero'
  | 'deck'
  | 'mockupLabel'
  | 'motion'
  | 'qr';

export const CONTENT_KINDS: ReadonlyArray<ContentKind> = [
  'person',
  'letter',
  'invoice',
  'address',
  'note',
  'socialPost',
  'profile',
  'webHero',
  'deck',
  'mockupLabel',
  'motion',
  'qr',
];

/**
 * The design choices that travel WITH the content.
 *
 * Content and picks are one saved object, because they are one artifact:
 * a card whose text you edited and whose accent you changed is a single
 * thing a customer saved, and splitting it across two records is how the
 * kit ended up able to lose half of it. Optional throughout — an
 * unanswered pick means "use the brand's own".
 */
export type { TemplateDesignPicks };
export type WithPicks = { picks?: TemplateDesignPicks };

export type DeliverableContent =
  | ({ kind: 'person' } & PersonContent & WithPicks)
  | ({ kind: 'letter' } & LetterContent & WithPicks)
  | ({ kind: 'invoice' } & InvoiceContent & WithPicks)
  | ({ kind: 'address' } & AddressContent & WithPicks)
  | ({ kind: 'note' } & NoteContent & WithPicks)
  | ({ kind: 'socialPost' } & SocialPostContent & WithPicks)
  | ({ kind: 'profile' } & ProfileContent & WithPicks)
  | ({ kind: 'webHero' } & WebHeroContent & WithPicks)
  | ({ kind: 'deck' } & DeckContent & WithPicks)
  | ({ kind: 'mockupLabel' } & MockupLabelContent & WithPicks)
  | ({ kind: 'motion' } & MotionContent & WithPicks)
  | ({ kind: 'qr' } & QrContent & WithPicks);

/** Narrowing helpers — cheaper to read than repeating the discriminant. */
export const isPerson = (c: DeliverableContent): c is { kind: 'person' } & PersonContent & WithPicks =>
  c.kind === 'person';
export const isLetter = (c: DeliverableContent): c is { kind: 'letter' } & LetterContent & WithPicks =>
  c.kind === 'letter';
export const isInvoice = (c: DeliverableContent): c is { kind: 'invoice' } & InvoiceContent & WithPicks =>
  c.kind === 'invoice';
export const isDeck = (c: DeliverableContent): c is { kind: 'deck' } & DeckContent & WithPicks =>
  c.kind === 'deck';

/* ── Which deliverables have a content kind ───────────────────────── */

/**
 * Every template type the kit renders that says anything at all.
 *
 * Listed explicitly, and the map below is typed as a TOTAL record over
 * it, so adding a family without giving it a content kind is a COMPILE
 * error rather than a card whose Quick Edit panel silently offers
 * nothing. A type absent from this list has no content model — the brand
 * assets (logos, colours, type, icons) and the hidden guide pages, whose
 * every value is the brand's own and belongs in Setup, not in a per-card
 * text field.
 */
export const ALL_TEMPLATE_TYPES = [
  // Stationery
  'business-cards',
  'letterhead',
  'envelope',
  'notecard',
  'invoices',
  // Signature (two ids for the same family — legacy and cosmos)
  'email-sig',
  'web-email-signature',
  // Social
  'instagram-posts',
  'instagram-stories',
  'facebook-covers',
  'profile-icons',
  // Web
  'favicon',
  'website',
  'landing',
  // Presentations
  'pres-pitch',
  'pres-plan',
  'pres-proposal',
  'pres-case',
  'pres-portfolio',
  // Mockups
  'mockups',
  'mockup-mug',
  'mockup-tshirt',
  'mockup-billboard',
  'mockup-tote',
  'mockup-sticker',
  // Animations
  'anim-reveal',
  'anim-slide',
  'anim-fade',
  'anim-rotate',
  // QR
  'qr-branded',
  'qr-minimal',
  'qr-rounded',
  'qr-square',
] as const;

export type ContentTemplateType = (typeof ALL_TEMPLATE_TYPES)[number];

/**
 * Template TYPE → content kind.
 *
 * Keyed by template type because that is what the renderer dispatcher
 * already routes on, so a kind reaches every design in a family at once.
 */
const KIND_BY_TEMPLATE_TYPE: Record<ContentTemplateType, ContentKind> = {
  'business-cards': 'person',
  'email-sig': 'person',
  'web-email-signature': 'person',
  letterhead: 'letter',
  invoices: 'invoice',
  envelope: 'address',
  notecard: 'note',
  'instagram-posts': 'socialPost',
  'instagram-stories': 'socialPost',
  'facebook-covers': 'socialPost',
  'profile-icons': 'profile',
  favicon: 'profile',
  website: 'webHero',
  landing: 'webHero',
  'pres-pitch': 'deck',
  'pres-plan': 'deck',
  'pres-proposal': 'deck',
  'pres-case': 'deck',
  'pres-portfolio': 'deck',
  mockups: 'mockupLabel',
  'mockup-mug': 'mockupLabel',
  'mockup-tshirt': 'mockupLabel',
  'mockup-billboard': 'mockupLabel',
  'mockup-tote': 'mockupLabel',
  'mockup-sticker': 'mockupLabel',
  'anim-reveal': 'motion',
  'anim-slide': 'motion',
  'anim-fade': 'motion',
  'anim-rotate': 'motion',
  'qr-branded': 'qr',
  'qr-minimal': 'qr',
  'qr-rounded': 'qr',
  'qr-square': 'qr',
};

export function contentKindForTemplateType(templateType: string): ContentKind | null {
  return KIND_BY_TEMPLATE_TYPE[templateType as ContentTemplateType] ?? null;
}

/* ── Ids ──────────────────────────────────────────────────────────── */

/**
 * The next id in a `<prefix>-N` series.
 *
 * Monotonic within a session and never random, so a default is identical
 * on every render — a test can assert it, and two tabs opening the same
 * unsaved deliverable agree. Ids only have to be unique within one list,
 * and the next one derives from the items already present so an id is
 * never reused after a delete.
 */
export function nextItemId(items: ReadonlyArray<{ id?: string }>, prefix: string): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const item of items) {
    const m = pattern.exec(item?.id ?? '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}`;
}

export function nextLineItemId(items: ReadonlyArray<InvoiceLineItem>): string {
  return nextItemId(items, 'li');
}

/* ── Defaults ─────────────────────────────────────────────────────── */

export function defaultPersonContent(brand: BrandLike): PersonContent {
  return {
    // An honest prompt. The brand knows its own name; it does not know
    // whose card this is, and inventing a person was the original sin.
    fullName: 'Your name',
    jobTitle: 'Your role',
    email: brandEmail(brand),
    phone: brandPhone(brand),
    website: brandDomain(brand),
    company: brandName(brand),
    address: brandAddress(brand),
    tagline: brandTagline(brand) || 'Your tagline',
    pronouns: '',
    socialHandle: brandHandle(brand),
  };
}

export function defaultLetterContent(brand: BrandLike, today: Date = new Date()): LetterContent {
  const name = brandName(brand);
  return {
    senderName: name,
    senderAddress: brandAddress(brand),
    website: brandDomain(brand),
    phone: brandPhone(brand),
    date: formatLongDate(today),
    recipient: 'Recipient name',
    subject: `Working with ${name}`,
    // Short, branded and real. The old default was an empty string, which
    // the designs painted as a page of grey rules — a finished-looking
    // artifact that said nothing.
    body:
      `Thank you for your interest in ${name}. ` +
      `${summaryLine(brand)} ` +
      `This letter is yours to rewrite — replace it with what you actually want to say, ` +
      `and the letterhead around it stays exactly as it is.`,
  };
}

export function defaultInvoiceContent(brand: BrandLike, today: Date = new Date()): InvoiceContent {
  // The brand's OWN services when it has said what they are; a generic
  // branded set otherwise. Prices are a starting ladder, not a claim —
  // deliberately not the old "$8,300" the designs printed as fact.
  const offerings = brandOfferings(brand, 4);
  const labels = offerings.length
    ? offerings
    : ['Brand strategy', 'Identity system', 'Brand guidelines', 'Asset library'];
  const ladder = [2500, 1800, 1200, 900];
  return {
    issuerName: brandName(brand),
    issuerAddress: brandAddress(brand),
    clientName: 'Client name',
    clientAddress: 'Client address',
    number: '0001',
    issueDate: formatLongDate(today),
    dueDate: formatLongDate(addDays(today, 30)),
    currency: 'USD',
    lineItems: labels.map((label, i) => ({
      id: `li-${i + 1}`,
      label,
      qty: 1,
      unitPrice: ladder[i] ?? 500,
    })),
    discountRate: 0,
    taxRate: 5,
    notes: 'Payment due within 30 days.',
  };
}

export function defaultAddressContent(brand: BrandLike): AddressContent {
  return {
    sender: {
      name: brandName(brand),
      lines: [brandAddress(brand), brandDomain(brand)],
    },
    recipient: {
      name: 'Recipient name',
      lines: ['Street address', 'City, Postcode'],
    },
    postageLabel: '',
  };
}

export function defaultNoteContent(brand: BrandLike): NoteContent {
  const name = brandName(brand);
  return {
    greeting: 'Hello,',
    message:
      `Thank you — from everyone at ${name}. ` +
      `Write the note you would actually send; this card is the frame, not the words.`,
    signOff: `— ${name}`,
  };
}

export function defaultSocialPostContent(
  brand: BrandLike,
  today: Date = new Date(),
): SocialPostContent {
  const name = brandName(brand);
  const tagline = brandTagline(brand);
  return {
    headline: tagline || name,
    subline: tagline ? name : strategyText(brand, 'industry') || 'Say it in one line',
    body: summaryLine(brand),
    cta: 'Learn more',
    handle: brandHandle(brand),
    date: formatShortDate(today),
    tag: `#${brandName(brand).toLowerCase().replace(/[^a-z0-9]/g, '')}`,
  };
}

export function defaultProfileContent(brand: BrandLike): ProfileContent {
  return {
    glyph: 'logo',
    text: brandInitials(brand).slice(0, 3),
    tabTitle: brandName(brand),
    url: brandDomain(brand),
  };
}

export function defaultWebHeroContent(brand: BrandLike): WebHeroContent {
  const tagline = brandTagline(brand);
  return {
    nav: ['Work', 'Services', 'About', 'Contact'],
    eyebrow: strategyText(brand, 'industry') || brandName(brand),
    headline: tagline || summaryLine(brand),
    subhead: tagline ? summaryLine(brand) : missionLine(brand),
    primaryCta: 'Get in touch',
    secondaryCta: 'See the work',
    // See WebHeroContent.stats — a hero statistic nobody supplied is a
    // claim nobody made.
    stats: [],
    url: brandDomain(brand),
  };
}

function slide(
  id: string,
  kind: DeckSlideKind,
  parts: Partial<Omit<DeckSlide, 'id' | 'kind'>> = {},
): DeckSlide {
  return {
    id,
    kind,
    heading: parts.heading ?? '',
    body: parts.body ?? '',
    bullets: parts.bullets ?? [],
    stat: parts.stat ?? { value: '', label: '' },
    quote: parts.quote ?? { text: '', by: '' },
  };
}

/**
 * The five deck families, as documents rather than as one document.
 *
 * A pitch, a business plan, a proposal, a case study and a portfolio are
 * not the same ten slides wearing five colour schemes — they answer
 * different questions in a different order, and `curation/presentations.ts`
 * has ALWAYS named them that way ("Executive summary", "Scope of work",
 * "The client in one line"). What was missing was the content behind those
 * names: every family hydrated the SAME ten slides, so the four deck PPTX
 * files in a kit export came out byte-identical (QA Q10). A tile promising
 * "Scope of work" showed "What we make".
 *
 * So a family is a table of ten SLOTS. The shape is shared — the slot list
 * in `curation/presentations.ts` is `Cover · Divider · Statement ·
 * Statement · Divider · List · Statement · Statement · List · Closing`, and
 * the kinds below are exactly that, in that order — while the heading and
 * the brand fact that fills it belong to the document.
 *
 * Nothing here invents a fact. Every line is either the brand's own answer
 * from Setup's Brand Strategy or a branded prompt naming the brand, which
 * is what the previous single outline established after the families
 * shipped a fictional start-up's "$1.4M seed round".
 */
export type DeckVariant = 'pitch' | 'plan' | 'proposal' | 'case' | 'portfolio';

export const DECK_VARIANTS: ReadonlyArray<DeckVariant> = [
  'pitch',
  'plan',
  'proposal',
  'case',
  'portfolio',
];

/** `pres-plan` → `plan`. Any other template type is not a deck. */
export function deckVariantForTemplateType(templateType: string | undefined): DeckVariant | null {
  if (!templateType) return null;
  const m = /^pres-(pitch|plan|proposal|case|portfolio)$/.exec(templateType);
  return m ? (m[1] as DeckVariant) : null;
}

/** What the document calls itself, on its own cover. */
const DECK_LABEL: Record<DeckVariant, string> = {
  pitch: 'Pitch deck',
  plan: 'Business plan',
  proposal: 'Proposal',
  case: 'Case study',
  portfolio: 'Portfolio',
};

/**
 * The ten headings, per family, in slot order.
 *
 * Read alongside `NAMES` in `curation/presentations.ts`: that file names
 * the SLOT a customer picks between, this one writes what the slide says.
 * They are two halves of one outline and must stay in the same order.
 */
const DECK_HEADINGS: Record<DeckVariant, string[]> = {
  pitch: [
    '', 'Who we are', 'In one line', 'Why we exist', 'What we do',
    'What we make', "Who it's for", 'Where we stand', 'What we value', 'Thank you',
  ],
  plan: [
    '', 'Summary', 'Executive summary', 'Mission', 'How we operate',
    'Products and services', 'Market and audience', 'Positioning', 'Operating principles', 'Prepared by',
  ],
  proposal: [
    '', 'Introduction', 'The brief', 'Why us', 'Scope',
    'Scope of work', 'Who it serves', 'Our approach', 'How we work', 'Sign-off',
  ],
  case: [
    '', 'Context', 'The client', 'Why it mattered', 'The work',
    'What we made', 'Who it reached', 'The position it won', 'What we held to', 'More work',
  ],
  portfolio: [
    '', 'The studio', 'The studio in one line', 'Why we make', 'Selected work',
    'Selected work', 'Who we work with', 'Where we sit', 'What we value', 'Get in touch',
  ],
};

/**
 * The third slide is the one place the families genuinely disagree about
 * WHOSE line it is: a plan and a portfolio open on the brand's own
 * summary, while a proposal and a case study open on the client's brief —
 * which nobody but the customer can write, so it is a prompt naming them.
 */
function openingLine(variant: DeckVariant, brand: BrandLike): string {
  const name = brandName(brand);
  if (variant === 'proposal') return `What the client asked ${name} for — in one line.`;
  if (variant === 'case') return `The client ${name} did this work for — in one line.`;
  return summaryLine(brand);
}

/** Slide four: why this document exists at all. */
function reasonLine(variant: DeckVariant, brand: BrandLike): string {
  if (variant === 'proposal') return positioningLine(brand);
  if (variant === 'case') return `What was at stake for the client, and why this work mattered.`;
  return missionLine(brand);
}

/** Slide eight: where the brand stands. A proposal states its approach. */
function standLine(variant: DeckVariant, brand: BrandLike): string {
  if (variant === 'proposal') {
    return `How ${brandName(brand)} works, and what makes that different. ${positioningLine(brand)}`.trim();
  }
  return positioningLine(brand);
}

/**
 * One family's ten slides.
 *
 * `variant` defaults to `pitch` so every existing caller — the bind sweep,
 * a preview with no template in hand — keeps the deck it already had.
 */
export function defaultDeckSlides(brand: BrandLike, variant: DeckVariant = 'pitch'): DeckSlide[] {
  const name = brandName(brand);
  const tagline = brandTagline(brand);
  const headings = DECK_HEADINGS[variant];
  const closingQuote =
    variant === 'plan' || variant === 'case' ? { text: '', by: '' } : { text: tagline, by: name };
  return [
    slide('sl-1', 'title', { heading: name, body: tagline || summaryLine(brand) }),
    slide('sl-2', 'section', { heading: headings[1], body: name }),
    slide('sl-3', 'content', { heading: headings[2], body: openingLine(variant, brand) }),
    slide('sl-4', 'content', { heading: headings[3], body: reasonLine(variant, brand) }),
    slide('sl-5', 'section', { heading: headings[4], body: name }),
    slide('sl-6', 'content', { heading: headings[5], bullets: offeringLines(brand, 4) }),
    slide('sl-7', 'content', { heading: headings[6], body: audienceLine(brand) }),
    slide('sl-8', 'content', { heading: headings[7], body: standLine(variant, brand) }),
    slide('sl-9', 'content', { heading: headings[8], bullets: valueLines(brand, 4) }),
    slide('sl-10', 'closing', {
      heading: headings[9],
      body: variant === 'plan' ? `${name}  ·  ${brandDomain(brand)}` : brandDomain(brand),
      quote: closingQuote,
    }),
  ];
}

export function defaultDeckContent(
  brand: BrandLike,
  today: Date = new Date(),
  variant: DeckVariant = 'pitch',
): DeckContent {
  const name = brandName(brand);
  const tagline = brandTagline(brand);
  const label = DECK_LABEL[variant];
  return {
    title: name,
    // The document names ITSELF on its own cover. Before this every deck's
    // subtitle was the brand's tagline, so five different documents opened
    // with the same two lines and the export had nothing to tell them
    // apart by.
    subtitle: tagline ? `${label}  ·  ${tagline}` : label,
    presenter: name,
    date: formatLongDate(today),
    slides: defaultDeckSlides(brand, variant),
  };
}

export function defaultMockupLabelContent(brand: BrandLike): MockupLabelContent {
  return {
    primaryText: brandName(brand),
    secondaryText: brandTagline(brand) || strategyText(brand, 'industry') || 'Your tagline',
    badge: '',
    url: brandDomain(brand),
  };
}

export function defaultMotionContent(brand: BrandLike): MotionContent {
  return {
    text: brandName(brand),
    durationMs: 1600,
    loop: true,
  };
}

export function defaultQrContent(brand: BrandLike): QrContent {
  return {
    payload: brandUrl(brand),
    label: brandDomain(brand),
  };
}

/**
 * The variant a default is written for — a TEMPLATE TYPE (`pres-plan`).
 *
 * Optional everywhere and ignored by every kind but `deck`, because the
 * deck is the only family whose five members are five different documents
 * rather than five treatments of one. A caller that has a template in hand
 * passes its type; one that does not gets the family's first reading.
 */
export type ContentVariant = string;

export function defaultContentFor(
  kind: ContentKind,
  brand: BrandLike,
  variant?: ContentVariant,
): DeliverableContent {
  switch (kind) {
    case 'person':
      return { kind: 'person', ...defaultPersonContent(brand) };
    case 'letter':
      return { kind: 'letter', ...defaultLetterContent(brand) };
    case 'invoice':
      return { kind: 'invoice', ...defaultInvoiceContent(brand) };
    case 'address':
      return { kind: 'address', ...defaultAddressContent(brand) };
    case 'note':
      return { kind: 'note', ...defaultNoteContent(brand) };
    case 'socialPost':
      return { kind: 'socialPost', ...defaultSocialPostContent(brand) };
    case 'profile':
      return { kind: 'profile', ...defaultProfileContent(brand) };
    case 'webHero':
      return { kind: 'webHero', ...defaultWebHeroContent(brand) };
    case 'deck':
      return {
        kind: 'deck',
        ...defaultDeckContent(brand, new Date(), deckVariantForTemplateType(variant) ?? 'pitch'),
      };
    case 'mockupLabel':
      return { kind: 'mockupLabel', ...defaultMockupLabelContent(brand) };
    case 'motion':
      return { kind: 'motion', ...defaultMotionContent(brand) };
    case 'qr':
      return { kind: 'qr', ...defaultQrContent(brand) };
  }
}

/* ── Hydration ────────────────────────────────────────────────────── */

/**
 * Fill a partial (or stale) stored value out to a complete content object.
 *
 * Storage is forward-compatible by construction: a saved invoice from
 * before a field existed still loads, because every field falls back to
 * the default. Empty strings are kept as the user's answer — only
 * genuinely absent keys are filled.
 *
 * The merge is DEEP for plain objects, which the nested kinds made
 * necessary: an envelope stored as `{ sender: { name: 'X' } }` must not
 * lose `sender.lines`, and a shallow assign is exactly how it would.
 */
export function hydrateContent(
  kind: ContentKind,
  brand: BrandLike,
  stored: unknown,
  variant?: ContentVariant,
): DeliverableContent {
  const base = defaultContentFor(kind, brand, variant);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return base;
  const s = stored as Record<string, unknown>;
  // A stored value for a different kind is not this deliverable's content.
  if (typeof s.kind === 'string' && s.kind !== kind) return base;

  const merged = mergeInto(base as unknown as Record<string, unknown>, s);

  switch (kind) {
    case 'invoice': {
      const baseInvoice = base as { kind: 'invoice' } & InvoiceContent;
      merged.lineItems = Array.isArray(s.lineItems)
        ? s.lineItems.map((item, i) => hydrateLineItem(item, i))
        : baseInvoice.lineItems;
      // Fall back to the DEFAULT rate, not to zero. A stored invoice from
      // before these fields existed should keep charging the default tax,
      // not silently become tax-free.
      merged.taxRate = finiteOr(s.taxRate, baseInvoice.taxRate);
      merged.discountRate = finiteOr(s.discountRate, baseInvoice.discountRate);
      break;
    }
    case 'address': {
      const baseAddress = base as { kind: 'address' } & AddressContent;
      merged.sender = hydrateAddressBlock(s.sender, baseAddress.sender);
      merged.recipient = hydrateAddressBlock(s.recipient, baseAddress.recipient);
      break;
    }
    case 'webHero': {
      const baseHero = base as { kind: 'webHero' } & WebHeroContent;
      merged.nav = hydrateStringList(s.nav, baseHero.nav);
      merged.stats = Array.isArray(s.stats)
        ? s.stats.map((row, i) => hydrateStat(row, i))
        : baseHero.stats;
      break;
    }
    case 'deck': {
      const baseDeck = base as { kind: 'deck' } & DeckContent;
      merged.slides = Array.isArray(s.slides)
        ? s.slides.map((row, i) => hydrateSlide(row, i))
        : baseDeck.slides;
      break;
    }
    default:
      break;
  }

  const picks = hydratePicks(s.picks);
  if (picks) merged.picks = picks;

  return merged as DeliverableContent;
}

/**
 * Copy stored values over the defaults, key by key.
 *
 * Only keys the DEFAULT has are considered — an unknown key in storage is
 * not this model's — and a stored value whose type disagrees with the
 * default's is dropped rather than rendered, because a number field
 * holding a string paints `NaN` and a boolean holding `"true"` is always
 * truthy. Plain objects recurse; arrays are left to the per-kind repairs
 * above, which know what their rows are.
 */
function mergeInto(
  base: Record<string, unknown>,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    if (key === 'kind') continue;
    const value = stored[key];
    if (value === undefined) continue;
    const fallback = base[key];
    if (isPlainObject(fallback)) {
      if (isPlainObject(value)) out[key] = mergeInto(fallback, value);
      continue;
    }
    if (Array.isArray(fallback)) continue; // per-kind repair owns these
    if (typeof fallback === 'number') {
      out[key] = finiteOr(value, fallback);
      continue;
    }
    if (typeof fallback === 'boolean') {
      out[key] = typeof value === 'boolean' ? value : fallback;
      continue;
    }
    out[key] = typeof value === 'string' ? value : fallback;
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(raw: unknown): Record<string, unknown> {
  return isPlainObject(raw) ? raw : {};
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function hydrateStringList(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((v) => typeof v === 'string') as string[];
}

function hydrateAddressBlock(raw: unknown, fallback: AddressBlock): AddressBlock {
  if (!isPlainObject(raw)) return fallback;
  const r = raw;
  return {
    name: stringOr(r.name, fallback.name),
    lines: hydrateStringList(r.lines, fallback.lines),
  };
}

function hydrateLineItem(raw: unknown, index: number): InvoiceLineItem {
  const r = asRecord(raw);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `li-${index + 1}`,
    label: stringOr(r.label, ''),
    qty: finiteOr(r.qty, 1),
    unitPrice: finiteOr(r.unitPrice, 0),
  };
}

function hydrateStat(raw: unknown, index: number): WebHeroStat {
  const r = asRecord(raw);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `st-${index + 1}`,
    value: stringOr(r.value, ''),
    label: stringOr(r.label, ''),
  };
}

function hydrateSlide(raw: unknown, index: number): DeckSlide {
  const r = asRecord(raw);
  const kind = DECK_SLIDE_KINDS.includes(r.kind as DeckSlideKind)
    ? (r.kind as DeckSlideKind)
    : 'content';
  const stat = asRecord(r.stat);
  const quote = asRecord(r.quote);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `sl-${index + 1}`,
    kind,
    heading: stringOr(r.heading, ''),
    body: stringOr(r.body, ''),
    bullets: hydrateStringList(r.bullets, []),
    stat: { value: stringOr(stat.value, ''), label: stringOr(stat.label, '') },
    quote: { text: stringOr(quote.text, ''), by: stringOr(quote.by, '') },
  };
}

/**
 * Design picks survive the round trip.
 *
 * They are not content, but they are part of the same saved object, so
 * hydration has to carry them across or every reload repaints the card in
 * the brand's defaults and the customer's choice is gone. Unknown keys
 * are dropped and every value is type-checked, because these reach a
 * renderer as a colour and a font id.
 */
function hydratePicks(raw: unknown): TemplateDesignPicks | undefined {
  if (!isPlainObject(raw)) return undefined;
  const out: TemplateDesignPicks = {};
  for (const key of ['primaryColor', 'secondaryColor', 'logoId', 'logoColor', 'fontId'] as const) {
    if (typeof raw[key] === 'string') out[key] = raw[key] as string;
  }
  if (typeof raw.showLogo === 'boolean') out.showLogo = raw.showLogo;
  return Object.keys(out).length ? out : undefined;
}

function finiteOr(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
