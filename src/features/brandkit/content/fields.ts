/**
 * What the panel shows, per content kind.
 *
 * The panel used to be the same four rails for everything — Image,
 * Colors, Logos, Typography — whether you were editing a favicon or an
 * invoice. This is the replacement: each kind declares its own fields, in
 * its own groups, and the panel is a renderer for that declaration.
 *
 * Every field addresses a `path` in the content model, and that is the
 * same vocabulary a `<Bind>` on the artifact uses. Clicking a region and
 * finding its control is therefore a lookup, not a mapping table someone
 * has to keep in sync.
 *
 * Adding a kind is adding a declaration here. There is deliberately no
 * per-kind code in `ContentPanel` — a nested list of deck slides, each
 * with its own list of bullets, is expressed as data below and rendered
 * by the same recursion that renders an invoice's line items.
 */
import type { ContentKind } from './kinds';
import { DECK_SLIDE_KINDS, type DeckSlide, type InvoiceLineItem, type WebHeroStat } from './kinds';

export type FieldSpec =
  | { type: 'text'; path: string; label: string; placeholder?: string; multiline?: boolean }
  /** Multi-line prose. `text` + `multiline` still works; this is the name. */
  | { type: 'textarea'; path: string; label: string; placeholder?: string; rows?: number }
  | { type: 'number'; path: string; label: string; suffix?: string; step?: number }
  | { type: 'money'; path: string; label: string }
  | { type: 'date'; path: string; label: string; placeholder?: string }
  | { type: 'select'; path: string; label: string; options: ReadonlyArray<string> }
  | { type: 'boolean'; path: string; label: string; hint?: string }
  /**
   * A hex the artifact paints with, edited through the shared HSV picker.
   *
   * Like every other field, its `path` must already EXIST in the kind's
   * defaults: writes never invent structure (see `paths.ts`), which is
   * what stops a stale `<Bind>` corrupting content. A kind that gains a
   * colour or an image gains a default for it in the same commit.
   */
  | { type: 'color'; path: string; label: string }
  /**
   * An image the artifact places — picked through the canonical
   * `AssetSourcePopover`, so a brand asset and a fresh upload are the
   * same gesture. The stored value is a url.
   */
  | { type: 'image'; path: string; label: string; hint?: string }
  /** A list of plain strings — address lines, nav items, bullets. */
  | { type: 'stringList'; path: string; label: string; itemLabel: string; placeholder?: string }
  /** An editable collection of records. `itemFields` paths are RELATIVE to the item. */
  | {
      type: 'list';
      path: string;
      label: string;
      itemLabel: string;
      itemFields: FieldSpec[];
      /** Prefix for a new row's id, e.g. `li` → `li-5`. */
      idPrefix?: string;
      /** The row Add creates. Ids are assigned by the panel. */
      itemDefaults?: Record<string, unknown>;
    };

export type FieldGroup = {
  id: string;
  title: string;
  /** One line under the title. Omitted where the title is self-evident. */
  hint?: string;
  fields: FieldSpec[];
};

/* ── person ───────────────────────────────────────────────────────── */

const PERSON_GROUPS: FieldGroup[] = [
  {
    id: 'identity',
    title: 'Identity',
    fields: [
      { type: 'text', path: 'fullName', label: 'Full name', placeholder: 'Your name' },
      { type: 'text', path: 'jobTitle', label: 'Job title', placeholder: 'Your role' },
      { type: 'text', path: 'pronouns', label: 'Pronouns', placeholder: 'Optional' },
    ],
  },
  {
    id: 'company',
    title: 'Company',
    hint: 'Filled in once — every card, letter and signature follows.',
    fields: [
      { type: 'text', path: 'company', label: 'Company', placeholder: 'Your brand' },
      { type: 'text', path: 'tagline', label: 'Tagline', placeholder: 'Your tagline' },
      { type: 'text', path: 'address', label: 'Address', placeholder: 'Your address' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    fields: [
      { type: 'text', path: 'email', label: 'Email', placeholder: 'hello@yourbrand.com' },
      { type: 'text', path: 'phone', label: 'Phone', placeholder: 'Your phone' },
      { type: 'text', path: 'website', label: 'Website', placeholder: 'yourbrand.com' },
      { type: 'text', path: 'socialHandle', label: 'Social', placeholder: '@yourbrand' },
    ],
  },
];

/* ── letter ───────────────────────────────────────────────────────── */

const LETTER_GROUPS: FieldGroup[] = [
  {
    id: 'sender',
    title: 'From',
    fields: [
      { type: 'text', path: 'senderName', label: 'Sender', placeholder: 'Your company' },
      { type: 'text', path: 'senderAddress', label: 'Address', placeholder: 'Your address' },
    ],
  },
  {
    id: 'letter',
    title: 'Letter',
    fields: [
      { type: 'text', path: 'recipient', label: 'To', placeholder: 'Recipient name' },
      { type: 'date', path: 'date', label: 'Date', placeholder: '12 March 2026' },
      { type: 'text', path: 'subject', label: 'Subject', placeholder: 'Project proposal' },
      { type: 'textarea', path: 'body', label: 'Body', rows: 6, placeholder: 'Dear…' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    fields: [
      { type: 'text', path: 'website', label: 'Website', placeholder: 'yourbrand.com' },
      { type: 'text', path: 'phone', label: 'Phone', placeholder: 'Your phone' },
    ],
  },
];

/* ── invoice ──────────────────────────────────────────────────────── */

export const INVOICE_CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'JPY'] as const;

const NEW_LINE_ITEM: Omit<InvoiceLineItem, 'id'> = { label: '', qty: 1, unitPrice: 0 };

const INVOICE_GROUPS: FieldGroup[] = [
  {
    id: 'parties',
    title: 'Bill from · Bill to',
    fields: [
      { type: 'text', path: 'issuerName', label: 'From', placeholder: 'Your company' },
      { type: 'text', path: 'issuerAddress', label: 'From address', placeholder: 'Your address' },
      { type: 'text', path: 'clientName', label: 'To', placeholder: 'Client name' },
      { type: 'text', path: 'clientAddress', label: 'To address', placeholder: 'Client address' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    fields: [
      { type: 'text', path: 'number', label: 'Invoice №', placeholder: '0001' },
      { type: 'date', path: 'issueDate', label: 'Issued', placeholder: '12 March 2026' },
      { type: 'date', path: 'dueDate', label: 'Due', placeholder: '11 April 2026' },
      { type: 'select', path: 'currency', label: 'Currency', options: INVOICE_CURRENCIES },
    ],
  },
  {
    id: 'items',
    title: 'Line items',
    hint: 'Totals are worked out from these.',
    fields: [
      {
        type: 'list',
        path: 'lineItems',
        label: 'Line items',
        itemLabel: 'Item',
        idPrefix: 'li',
        itemDefaults: NEW_LINE_ITEM,
        itemFields: [
          { type: 'text', path: 'label', label: 'Description', placeholder: 'Brand strategy' },
          { type: 'number', path: 'qty', label: 'Qty', step: 1 },
          { type: 'money', path: 'unitPrice', label: 'Unit price' },
        ],
      },
    ],
  },
  {
    id: 'totals',
    title: 'Adjustments',
    fields: [
      { type: 'number', path: 'discountRate', label: 'Discount', suffix: '%', step: 0.5 },
      { type: 'number', path: 'taxRate', label: 'Tax', suffix: '%', step: 0.5 },
    ],
  },
  {
    id: 'notes',
    title: 'Notes',
    fields: [
      { type: 'textarea', path: 'notes', label: 'Notes', placeholder: 'Payment terms…' },
    ],
  },
];

/* ── address (envelope) ───────────────────────────────────────────── */

const ADDRESS_GROUPS: FieldGroup[] = [
  {
    id: 'sender',
    title: 'From',
    fields: [
      { type: 'text', path: 'sender.name', label: 'Sender', placeholder: 'Your company' },
      {
        type: 'stringList',
        path: 'sender.lines',
        label: 'Address lines',
        itemLabel: 'Line',
        placeholder: 'Street, city, postcode',
      },
    ],
  },
  {
    id: 'recipient',
    title: 'To',
    fields: [
      { type: 'text', path: 'recipient.name', label: 'Recipient', placeholder: 'Recipient name' },
      {
        type: 'stringList',
        path: 'recipient.lines',
        label: 'Address lines',
        itemLabel: 'Line',
        placeholder: 'Street, city, postcode',
      },
    ],
  },
  {
    id: 'postage',
    title: 'Postage',
    fields: [
      {
        type: 'text',
        path: 'postageLabel',
        label: 'Postage label',
        placeholder: 'Postage paid · optional',
      },
    ],
  },
];

/* ── note (notecard) ──────────────────────────────────────────────── */

const NOTE_GROUPS: FieldGroup[] = [
  {
    id: 'note',
    title: 'Note',
    fields: [
      { type: 'text', path: 'greeting', label: 'Greeting', placeholder: 'Hello,' },
      { type: 'textarea', path: 'message', label: 'Message', rows: 5, placeholder: 'Thank you…' },
      { type: 'text', path: 'signOff', label: 'Sign-off', placeholder: '— Your brand' },
    ],
  },
];

/* ── socialPost ───────────────────────────────────────────────────── */

const SOCIAL_POST_GROUPS: FieldGroup[] = [
  {
    id: 'message',
    title: 'Message',
    fields: [
      { type: 'text', path: 'headline', label: 'Headline', placeholder: 'The line that lands' },
      { type: 'text', path: 'subline', label: 'Subline', placeholder: 'The second line' },
      { type: 'textarea', path: 'body', label: 'Body', rows: 4, placeholder: 'The caption…' },
      { type: 'text', path: 'cta', label: 'Call to action', placeholder: 'Learn more' },
    ],
  },
  {
    id: 'attribution',
    title: 'Attribution',
    fields: [
      { type: 'text', path: 'handle', label: 'Handle', placeholder: '@yourbrand' },
      { type: 'date', path: 'date', label: 'Date', placeholder: '12.03.26' },
      { type: 'text', path: 'tag', label: 'Tag', placeholder: '#yourbrand' },
    ],
  },
];

/* ── profile (profile icon · favicon) ─────────────────────────────── */

const PROFILE_GROUPS: FieldGroup[] = [
  {
    id: 'glyph',
    title: 'Mark',
    hint: 'What sits inside the frame.',
    fields: [
      { type: 'select', path: 'glyph', label: 'Glyph', options: ['logo', 'initial', 'custom'] },
      { type: 'text', path: 'text', label: 'Letters', placeholder: 'Up to 3 characters' },
    ],
  },
  {
    id: 'browser',
    title: 'Browser',
    fields: [
      { type: 'text', path: 'tabTitle', label: 'Tab title', placeholder: 'Your brand' },
      { type: 'text', path: 'url', label: 'URL', placeholder: 'yourbrand.com' },
    ],
  },
];

/* ── webHero (website · landing) ──────────────────────────────────── */

const WEB_HERO_GROUPS: FieldGroup[] = [
  {
    id: 'nav',
    title: 'Navigation',
    fields: [
      { type: 'stringList', path: 'nav', label: 'Links', itemLabel: 'Link', placeholder: 'Work' },
      { type: 'text', path: 'url', label: 'URL', placeholder: 'yourbrand.com' },
    ],
  },
  {
    id: 'hero',
    title: 'Hero',
    fields: [
      { type: 'text', path: 'eyebrow', label: 'Eyebrow', placeholder: 'Your industry' },
      { type: 'text', path: 'headline', label: 'Headline', placeholder: 'The line that lands' },
      { type: 'textarea', path: 'subhead', label: 'Subhead', rows: 3, placeholder: 'One more line' },
      { type: 'text', path: 'primaryCta', label: 'Primary button', placeholder: 'Get in touch' },
      { type: 'text', path: 'secondaryCta', label: 'Secondary button', placeholder: 'See the work' },
    ],
  },
  {
    id: 'stats',
    title: 'Stats',
    hint: 'Empty by default — a number nobody supplied is a claim nobody made.',
    fields: [
      {
        type: 'list',
        path: 'stats',
        label: 'Stats',
        itemLabel: 'Stat',
        idPrefix: 'st',
        itemDefaults: { value: '', label: '' } satisfies Omit<WebHeroStat, 'id'>,
        itemFields: [
          { type: 'text', path: 'value', label: 'Value', placeholder: '12' },
          { type: 'text', path: 'label', label: 'Label', placeholder: 'Years' },
        ],
      },
    ],
  },
];

/* ── deck ─────────────────────────────────────────────────────────── */

const NEW_SLIDE: Omit<DeckSlide, 'id'> = {
  kind: 'content',
  heading: '',
  body: '',
  bullets: [],
  stat: { value: '', label: '' },
  quote: { text: '', by: '' },
};

const DECK_GROUPS: FieldGroup[] = [
  {
    id: 'cover',
    title: 'Cover',
    fields: [
      { type: 'text', path: 'title', label: 'Title', placeholder: 'Your brand' },
      { type: 'text', path: 'subtitle', label: 'Subtitle', placeholder: 'Your tagline' },
      { type: 'text', path: 'presenter', label: 'Presented by', placeholder: 'Your name' },
      { type: 'date', path: 'date', label: 'Date', placeholder: '12 March 2026' },
    ],
  },
  {
    id: 'slides',
    title: 'Slides',
    hint: 'Each slide shows only what its kind needs.',
    fields: [
      {
        type: 'list',
        path: 'slides',
        label: 'Slides',
        itemLabel: 'Slide',
        idPrefix: 'sl',
        itemDefaults: NEW_SLIDE,
        itemFields: [
          { type: 'select', path: 'kind', label: 'Kind', options: DECK_SLIDE_KINDS },
          { type: 'text', path: 'heading', label: 'Heading', placeholder: 'Why we exist' },
          { type: 'textarea', path: 'body', label: 'Body', rows: 3, placeholder: 'One paragraph' },
          {
            type: 'stringList',
            path: 'bullets',
            label: 'Bullets',
            itemLabel: 'Bullet',
            placeholder: 'One point',
          },
          { type: 'text', path: 'stat.value', label: 'Stat', placeholder: '12' },
          { type: 'text', path: 'stat.label', label: 'Stat label', placeholder: 'Years' },
          { type: 'textarea', path: 'quote.text', label: 'Quote', rows: 2, placeholder: 'Say it' },
          { type: 'text', path: 'quote.by', label: 'Quoted', placeholder: 'Who said it' },
        ],
      },
    ],
  },
];

/* ── mockupLabel ──────────────────────────────────────────────────── */

const MOCKUP_LABEL_GROUPS: FieldGroup[] = [
  {
    id: 'label',
    title: 'Artwork',
    fields: [
      { type: 'text', path: 'primaryText', label: 'Primary', placeholder: 'Your brand' },
      { type: 'text', path: 'secondaryText', label: 'Secondary', placeholder: 'Your tagline' },
      { type: 'text', path: 'badge', label: 'Badge', placeholder: 'Optional' },
      { type: 'text', path: 'url', label: 'URL', placeholder: 'yourbrand.com' },
    ],
  },
];

/* ── motion ───────────────────────────────────────────────────────── */

const MOTION_GROUPS: FieldGroup[] = [
  {
    id: 'motion',
    title: 'Animation',
    fields: [
      { type: 'text', path: 'text', label: 'Text', placeholder: 'Your brand' },
      { type: 'number', path: 'durationMs', label: 'Duration', suffix: 'ms', step: 100 },
      { type: 'boolean', path: 'loop', label: 'Loop', hint: 'Play again when it ends.' },
    ],
  },
];

/* ── qr ───────────────────────────────────────────────────────────── */

const QR_GROUPS: FieldGroup[] = [
  {
    id: 'qr',
    title: 'QR code',
    hint: 'What the code actually resolves to.',
    fields: [
      { type: 'text', path: 'payload', label: 'Payload', placeholder: 'https://yourbrand.com' },
      { type: 'text', path: 'label', label: 'Label', placeholder: 'yourbrand.com' },
    ],
  },
];

const GROUPS_BY_KIND: Record<ContentKind, FieldGroup[]> = {
  person: PERSON_GROUPS,
  letter: LETTER_GROUPS,
  invoice: INVOICE_GROUPS,
  address: ADDRESS_GROUPS,
  note: NOTE_GROUPS,
  socialPost: SOCIAL_POST_GROUPS,
  profile: PROFILE_GROUPS,
  webHero: WEB_HERO_GROUPS,
  deck: DECK_GROUPS,
  mockupLabel: MOCKUP_LABEL_GROUPS,
  motion: MOTION_GROUPS,
  qr: QR_GROUPS,
};

export function fieldGroupsFor(kind: ContentKind): FieldGroup[] {
  return GROUPS_BY_KIND[kind] ?? [];
}

/**
 * The field that owns a path, including inside a list.
 *
 * Selecting a bound region on the artifact resolves through here, so the
 * panel can show the control for whatever was clicked. A list item's path
 * (`lineItems.2.unitPrice`, `slides.3.quote.text`) resolves to its item
 * field with the concrete index restored, because the spec stores item
 * paths relative to the item.
 */
export function findFieldForPath(
  kind: ContentKind,
  path: string,
): { field: FieldSpec; group: FieldGroup; absolutePath: string } | null {
  for (const group of fieldGroupsFor(kind)) {
    for (const field of group.fields) {
      if (field.type === 'list') {
        if (!path.startsWith(`${field.path}.`)) continue;
        const rest = path.slice(field.path.length + 1);
        const dot = rest.indexOf('.');
        if (dot < 0) continue;
        const index = rest.slice(0, dot);
        const leaf = rest.slice(dot + 1);
        // A nested string list addresses ONE of its strings
        // (`slides.2.bullets.1`); the control is the list itself, so the
        // trailing row index is dropped before matching.
        const leafField = leaf.replace(/\.\d+$/, '');
        const itemField =
          field.itemFields.find((f) => f.path === leaf) ??
          field.itemFields.find((f) => f.path === leafField && f.type === 'stringList');
        if (itemField) {
          return {
            field: itemField,
            group,
            absolutePath: `${field.path}.${index}.${itemField.path}`,
          };
        }
        continue;
      }
      if (field.type === 'stringList') {
        // `nav.2` — one string in the list. The control is the list's own
        // row, so the list is what the panel is asked to show.
        if (field.path === path) return { field, group, absolutePath: path };
        if (/^\d+$/.test(path.slice(field.path.length + 1)) && path.startsWith(`${field.path}.`)) {
          return { field, group, absolutePath: path };
        }
        continue;
      }
      if (field.path === path) return { field, group, absolutePath: path };
    }
  }
  return null;
}
