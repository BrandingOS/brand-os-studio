import { describe, it, expect } from 'vitest';
import {
  ALL_TEMPLATE_TYPES,
  CONTENT_KINDS,
  contentKindForTemplateType,
  defaultContentFor,
  defaultInvoiceContent,
  defaultLetterContent,
  defaultPersonContent,
  hydrateContent,
  nextItemId,
  nextLineItemId,
  type ContentKind,
  type DeckContent,
  type InvoiceContent,
} from './kinds';
import {
  brandDomain,
  brandInitials,
  brandOfferings,
  formatLongDate,
  formatShortDate,
} from './brandFacts';
import { getAtPath, getStringAtPath, setAtPath, coerceToPathType, indexInPath } from './paths';
import { invoiceTotals, lineItemTotal, formatMoney, formatPercent } from './compute';
import { fieldGroupsFor, findFieldForPath, type FieldSpec } from './fields';

const brand = { name: 'Raqm' };

/** A brand that has actually answered Setup's questions. */
const answered = {
  name: 'Raqm',
  websites: [{ url: 'https://www.raqm.studio/work' }],
  links: [{ kind: 'instagram', url: 'https://instagram.com/raqmstudio' }],
  businessInfo: { contact: { email: 'studio@raqm.studio', phone: '+20 100 000 0000' } },
  strategy: {
    summary: 'Raqm builds identities for people who make things by hand.',
    mission: 'To make craft legible.',
    products: 'Brand strategy, Identity design, Guidelines',
    audience: 'Independent makers',
    positioning: 'The studio for the hand-made',
    values: ['Craft', 'Patience', 'Proof'],
    slogan: 'Made by hand, on purpose.',
    industry: 'Design studio',
  },
};

describe('content kinds', () => {
  it('gives Business Card and Email Signature the SAME kind', () => {
    // The email-signature designs hardcode the identical five fields. One
    // kind serves both; neither owns a private copy of "what a person is".
    expect(contentKindForTemplateType('business-cards')).toBe('person');
    expect(contentKindForTemplateType('email-sig')).toBe('person');
    expect(contentKindForTemplateType('web-email-signature')).toBe('person');
    expect(contentKindForTemplateType('letterhead')).toBe('letter');
    expect(contentKindForTemplateType('invoices')).toBe('invoice');
  });

  it('is TOTAL over every template type that says anything', () => {
    // The point of the list: a family added without a content kind is a
    // card whose Quick Edit panel would silently offer nothing.
    for (const type of ALL_TEMPLATE_TYPES) {
      const kind = contentKindForTemplateType(type);
      expect(kind, `${type} has no content kind`).not.toBeNull();
      expect(CONTENT_KINDS).toContain(kind as ContentKind);
    }
    expect(new Set(ALL_TEMPLATE_TYPES).size).toBe(ALL_TEMPLATE_TYPES.length);
  });

  it('routes a whole family to one kind', () => {
    for (const type of ['instagram-posts', 'instagram-stories', 'facebook-covers']) {
      expect(contentKindForTemplateType(type)).toBe('socialPost');
    }
    for (const type of ['pres-pitch', 'pres-plan', 'pres-proposal', 'pres-case', 'pres-portfolio']) {
      expect(contentKindForTemplateType(type)).toBe('deck');
    }
    for (const type of ['profile-icons', 'favicon']) {
      expect(contentKindForTemplateType(type)).toBe('profile');
    }
    for (const type of ['website', 'landing']) {
      expect(contentKindForTemplateType(type)).toBe('webHero');
    }
    for (const type of ['anim-reveal', 'anim-slide', 'anim-fade', 'anim-rotate']) {
      expect(contentKindForTemplateType(type)).toBe('motion');
    }
    for (const type of ['qr-branded', 'qr-minimal', 'qr-rounded', 'qr-square']) {
      expect(contentKindForTemplateType(type)).toBe('qr');
    }
    expect(contentKindForTemplateType('envelope')).toBe('address');
    expect(contentKindForTemplateType('notecard')).toBe('note');
    expect(contentKindForTemplateType('mockup-mug')).toBe('mockupLabel');
  });

  it('leaves the brand assets and the hidden guides with no kind', () => {
    // Their every value is the brand's own and belongs in Setup, not in a
    // per-card text field.
    expect(contentKindForTemplateType('brand-asset-logo')).toBeNull();
    expect(contentKindForTemplateType('guide-logo')).toBeNull();
    expect(contentKindForTemplateType('nonsense')).toBeNull();
  });

  it('derives defaults from the brand', () => {
    const person = defaultPersonContent(brand);
    expect(person).toMatchObject({
      email: 'hello@raqm.com',
      website: 'raqm.com',
      company: 'Raqm',
    });
  });

  it('prefers the brand\'s OWN facts over anything derived', () => {
    const person = defaultPersonContent(answered);
    expect(person.email).toBe('studio@raqm.studio');
    expect(person.phone).toBe('+20 100 000 0000');
    expect(person.website).toBe('raqm.studio');
    expect(person.tagline).toBe('Made by hand, on purpose.');
    expect(person.socialHandle).toBe('@raqmstudio');
  });

  it('bills for what the brand actually sells', () => {
    const invoice = defaultInvoiceContent(answered);
    expect(invoice.lineItems.map((i) => i.label)).toEqual([
      'Brand strategy',
      'Identity design',
      'Guidelines',
    ]);
    expect(invoice.issuerName).toBe('Raqm');
    // Never another company's name standing in for the customer's client.
    expect(invoice.clientName).toBe('Client name');
  });

  it('gives the letter a real date and a real paragraph', () => {
    // An empty body is what the letterhead designs paint as grey rules —
    // a finished-looking artifact that says nothing.
    const letter = defaultLetterContent(brand, new Date(2026, 7, 29));
    expect(letter.date).toBe('29 August 2026');
    expect(letter.body.length).toBeGreaterThan(80);
    expect(letter.body).toContain('Raqm');
    expect(letter.recipient).toBe('Recipient name');
  });

  it('writes ten slides about THIS brand', () => {
    const deck = defaultContentFor('deck', answered) as { kind: 'deck' } & DeckContent;
    expect(deck.slides).toHaveLength(10);
    expect(deck.slides[0].kind).toBe('title');
    expect(deck.slides[0].heading).toBe('Raqm');
    const text = JSON.stringify(deck);
    expect(text).toContain('Raqm builds identities');
    expect(text).toContain('To make craft legible.');
    expect(text).toContain('Independent makers');
    expect(text).toContain('Craft');
    // Deck ids are persistence keys; they must be stable and unique.
    expect(new Set(deck.slides.map((s) => s.id)).size).toBe(10);
  });

  it('leaves a hero statistic empty — a claim nobody made is not a default', () => {
    const hero = defaultContentFor('webHero', answered);
    if (hero.kind !== 'webHero') throw new Error('expected a hero');
    expect(hero.stats).toEqual([]);
    expect(hero.headline).toBe('Made by hand, on purpose.');
  });

  it('defaults are deterministic — no random ids', () => {
    const day = new Date(2026, 2, 12);
    const a = defaultInvoiceContent(brand, day);
    const b = defaultInvoiceContent(brand, day);
    expect(a).toEqual(b);
    expect(a.lineItems[0].id).toBe('li-1');
  });

  it('never reuses an id after a delete', () => {
    const items = defaultInvoiceContent(brand).lineItems;
    expect(nextLineItemId(items)).toBe(`li-${items.length + 1}`);
    const afterDelete = items.slice(0, 2);
    expect(nextLineItemId(afterDelete)).toBe('li-3');
    const reAdded = [...afterDelete, { id: 'li-3', label: '', qty: 1, unitPrice: 0 }];
    expect(nextLineItemId(reAdded)).toBe('li-4');
    // The same rule, for any list.
    expect(nextItemId([{ id: 'sl-2' }, { id: 'sl-7' }], 'sl')).toBe('sl-8');
    expect(nextItemId([], 'st')).toBe('st-1');
  });
});

/**
 * The bar the whole model exists to hold: nothing a customer reads on an
 * untouched card is somebody else's identity.
 */
describe('no invented identities in any default', () => {
  const BANNED = [
    'jane smith',
    'vice president',
    'acme',
    'lorem',
    '+1 234 56789',
    'brand.com',
    '$8,300',
    'sarah chen',
    '587 recipient ave',
    '1234 studio',
  ];

  for (const kind of CONTENT_KINDS) {
    it(`${kind} defaults are free of banned literals`, () => {
      for (const b of [brand, answered, { name: 'SKAM' }]) {
        const serialized = JSON.stringify(defaultContentFor(kind, b)).toLowerCase();
        for (const banned of BANNED) {
          expect(serialized, `${kind} default contains "${banned}"`).not.toContain(banned);
        }
      }
    });
  }

  it('names the brand rather than nobody', () => {
    // A generic default is allowed; an anonymous one is not — what the
    // customer reads has to be about them.
    for (const kind of ['letter', 'note', 'deck', 'mockupLabel', 'motion'] as const) {
      expect(JSON.stringify(defaultContentFor(kind, brand))).toContain('Raqm');
    }
  });
});

describe('brand facts', () => {
  it('reads a domain out of whatever the brand carries', () => {
    expect(brandDomain({ name: 'Raqm' })).toBe('raqm.com');
    expect(brandDomain({ name: 'Raqm', websites: [{ url: 'https://www.raqm.studio/x' }] }))
      .toBe('raqm.studio');
    // Junk in the shape must not throw — callers hand us three shapes.
    expect(brandDomain({ name: 'Raqm', websites: 'nope' })).toBe('raqm.com');
  });

  it('makes initials that fit in a favicon', () => {
    expect(brandInitials({ name: 'Raqm' })).toBe('RA');
    expect(brandInitials({ name: 'Studio Kern Works' })).toBe('SKW');
    // A nameless brand falls back to the honest placeholder name, so even
    // the initials read as a prompt rather than as a stray letter.
    expect(brandInitials({ name: '' })).toBe('YB');
  });

  it('splits one products answer into separate offerings', () => {
    expect(brandOfferings({ name: 'x', strategy: { products: 'Strategy, Identity\nGuidelines' } }))
      .toEqual(['Strategy', 'Identity', 'Guidelines']);
    expect(brandOfferings({ name: 'x' })).toEqual([]);
  });

  it('formats dates the same in every host', () => {
    // Not `toLocaleDateString`: the same kit renders in a browser, a test
    // runner and an offscreen export canvas, and a date that changes shape
    // with the host's locale changes the artwork.
    const day = new Date(2026, 7, 9);
    expect(formatLongDate(day)).toBe('9 August 2026');
    expect(formatShortDate(day)).toBe('09.08.26');
  });
});

describe('hydrateContent — stored work survives the model changing', () => {
  it('hydrates every kind from an empty object', () => {
    for (const kind of CONTENT_KINDS) {
      expect(hydrateContent(kind, brand, {})).toEqual(defaultContentFor(kind, brand));
      expect(hydrateContent(kind, brand, { kind })).toEqual(defaultContentFor(kind, brand));
    }
  });

  it('fills absent fields from defaults, keeping what was stored', () => {
    const stored = { kind: 'invoice', clientName: 'Globex', number: '99' };
    const c = hydrateContent('invoice', brand, stored) as InvoiceContent;
    expect(c.clientName).toBe('Globex');
    expect(c.number).toBe('99');
    // Absent in storage — comes from defaults rather than rendering blank.
    expect(c.lineItems.length).toBeGreaterThan(0);
    expect(c.taxRate).toBe(5);
  });

  it('keeps a deliberately empty string rather than "helpfully" refilling it', () => {
    const c = hydrateContent('invoice', brand, { kind: 'invoice', notes: '' }) as InvoiceContent;
    expect(c.notes).toBe('');
  });

  it('merges DEEP, so a nested half is not lost', () => {
    // Shallow assign is exactly how an envelope stored with only a sender
    // name would have lost its sender address lines.
    const c = hydrateContent('address', brand, {
      kind: 'address',
      sender: { name: 'Raqm Studio' },
    });
    if (c.kind !== 'address') throw new Error('expected an address');
    expect(c.sender.name).toBe('Raqm Studio');
    expect(c.sender.lines).toEqual(['Your address', 'raqm.com']);
    expect(c.recipient.name).toBe('Recipient name');
  });

  it('repairs malformed line items instead of rendering NaN', () => {
    const c = hydrateContent('invoice', brand, {
      kind: 'invoice',
      lineItems: [{ label: 'Fine' }, { id: 'li-9', label: 'Odd', qty: 'x', unitPrice: '250' }],
    }) as InvoiceContent;
    expect(c.lineItems[0]).toEqual({ id: 'li-1', label: 'Fine', qty: 1, unitPrice: 0 });
    expect(c.lineItems[1]).toEqual({ id: 'li-9', label: 'Odd', qty: 1, unitPrice: 250 });
  });

  it('repairs a slide whose kind is not one we know', () => {
    const c = hydrateContent('deck', brand, {
      kind: 'deck',
      slides: [{ id: 'sl-1', kind: 'spaceship', heading: 'Kept' }],
    });
    if (c.kind !== 'deck') throw new Error('expected a deck');
    expect(c.slides).toHaveLength(1);
    expect(c.slides[0]).toEqual({
      id: 'sl-1',
      kind: 'content',
      heading: 'Kept',
      body: '',
      bullets: [],
      stat: { value: '', label: '' },
      quote: { text: '', by: '' },
    });
  });

  it('drops a stored value whose TYPE disagrees with the field', () => {
    // A number field holding a string paints `NaN`; a boolean holding
    // "false" is always truthy.
    const c = hydrateContent('motion', brand, { kind: 'motion', durationMs: 'soon', loop: 'no' });
    if (c.kind !== 'motion') throw new Error('expected motion');
    expect(c.durationMs).toBe(1600);
    expect(c.loop).toBe(true);
    const edited = hydrateContent('motion', brand, { kind: 'motion', durationMs: 400, loop: false });
    if (edited.kind !== 'motion') throw new Error('expected motion');
    expect(edited).toMatchObject({ durationMs: 400, loop: false });
  });

  it('carries the design picks across, and drops what is not one', () => {
    // Content and picks are ONE saved object; hydration that kept only the
    // content half would repaint the card in the brand's defaults on every
    // reload and lose the customer's choice with no error attached.
    const c = hydrateContent('person', brand, {
      kind: 'person',
      picks: { primaryColor: '#123456', showLogo: false, nonsense: 1, fontId: 7 },
    });
    expect(c.picks).toEqual({ primaryColor: '#123456', showLogo: false });
    expect(hydrateContent('person', brand, { kind: 'person' }).picks).toBeUndefined();
  });

  it('ignores a stored value belonging to a different kind', () => {
    const c = hydrateContent('invoice', brand, { kind: 'person', fullName: 'Someone' });
    expect(c).toEqual(defaultContentFor('invoice', brand));
  });

  it('survives junk', () => {
    for (const junk of [null, undefined, 'nope', 42, []]) {
      expect(hydrateContent('person', brand, junk)).toEqual(defaultContentFor('person', brand));
    }
  });
});

describe('paths', () => {
  const content = defaultContentFor('invoice', brand) as { kind: 'invoice' } & InvoiceContent;

  it('reads through objects and arrays', () => {
    expect(getAtPath(content, 'clientName')).toBe('Client name');
    expect(getAtPath(content, 'lineItems.1.label')).toBe('Identity system');
    expect(getAtPath(content, 'lineItems.9.label')).toBeUndefined();
    expect(getStringAtPath(content, 'lineItems.0.unitPrice')).toBe('2500');
  });

  it('reads a nested object inside a list row', () => {
    const deck = defaultContentFor('deck', brand);
    expect(getAtPath(deck, 'slides.0.kind')).toBe('title');
    expect(getAtPath(deck, 'slides.9.quote.by')).toBe('Raqm');
  });

  it('writes immutably, copying only the spine to the change', () => {
    const next = setAtPath(content, 'lineItems.1.label', 'Renamed');
    expect(getAtPath(next, 'lineItems.1.label')).toBe('Renamed');
    // Original untouched...
    expect(getAtPath(content, 'lineItems.1.label')).toBe('Identity system');
    // ...and siblings are the SAME objects, so React re-renders only what changed.
    expect(next.lineItems[0]).toBe(content.lineItems[0]);
    expect(next.lineItems[1]).not.toBe(content.lineItems[1]);
  });

  it('refuses to invent structure a bound region asks for', () => {
    // A stale `<Bind>` pointing at a field that no longer exists must not
    // be able to corrupt content by writing a new key into it.
    expect(setAtPath(content, 'nope', 'x')).toBe(content);
    expect(setAtPath(content, 'lineItems.99.label', 'x')).toBe(content);
  });

  it('coerces typed text to the type the field already holds', () => {
    // Inline editing always hands back a string; the existing value is the
    // only reliable evidence of what the field is.
    expect(coerceToPathType(content, 'lineItems.0.unitPrice', '$1,250')).toBe(1250);
    expect(coerceToPathType(content, 'lineItems.0.qty', '3')).toBe(3);
    expect(coerceToPathType(content, 'clientName', '2400')).toBe('2400');
    // Unparseable input keeps the old number rather than writing NaN.
    expect(coerceToPathType(content, 'lineItems.0.unitPrice', 'abc')).toBe(2500);
  });

  it('finds the item index in a list path', () => {
    expect(indexInPath('lineItems.2.unitPrice')).toBe(2);
    expect(indexInPath('clientName')).toBeNull();
  });
});

describe('invoice totals — derived, never stored', () => {
  const base: InvoiceContent = {
    ...defaultInvoiceContent(brand),
    taxRate: 5,
    discountRate: 0,
    lineItems: [
      { id: 'li-1', label: 'A', qty: 1, unitPrice: 2400 },
      { id: 'li-2', label: 'B', qty: 1, unitPrice: 3800 },
      { id: 'li-3', label: 'C', qty: 1, unitPrice: 1200 },
      { id: 'li-4', label: 'D', qty: 1, unitPrice: 900 },
    ],
  };

  it('adds up the line items', () => {
    expect(lineItemTotal({ id: 'x', label: '', qty: 3, unitPrice: 250 })).toBe(750);
    const t = invoiceTotals(base);
    expect(t.subtotal).toBe(8300);
    expect(t.tax).toBe(415);
    expect(t.total).toBe(8715);
  });

  it('moves when a price moves — the bug this whole model exists to fix', () => {
    const edited: InvoiceContent = {
      ...base,
      lineItems: base.lineItems.map((i) => (i.id === 'li-1' ? { ...i, unitPrice: 3400 } : i)),
    };
    expect(invoiceTotals(edited).subtotal).toBe(9300);
    expect(invoiceTotals(edited).total).toBe(9765);
  });

  it('applies discount before tax', () => {
    const t = invoiceTotals({ ...base, discountRate: 10, taxRate: 10 });
    expect(t.subtotal).toBe(8300);
    expect(t.discount).toBe(830);
    expect(t.taxable).toBe(7470);
    expect(t.tax).toBe(747);
    expect(t.total).toBe(8217);
  });

  it('respects quantity', () => {
    const t = invoiceTotals({
      ...base,
      taxRate: 0,
      lineItems: [{ id: 'li-1', label: 'Day rate', qty: 12, unitPrice: 450 }],
    });
    expect(t.subtotal).toBe(5400);
    expect(t.total).toBe(5400);
  });

  it('clamps nonsense rates instead of printing a negative total', () => {
    expect(invoiceTotals({ ...base, taxRate: -5 }).tax).toBe(0);
    expect(invoiceTotals({ ...base, discountRate: 999 }).taxable).toBe(0);
    expect(invoiceTotals({ ...base, taxRate: Number.NaN }).total).toBe(8300);
  });

  it('is free of float dust', () => {
    const t = invoiceTotals({
      ...base,
      taxRate: 7.5,
      lineItems: [{ id: 'li-1', label: 'x', qty: 3, unitPrice: 33.33 }],
    });
    expect(t.subtotal).toBe(99.99);
    expect(t.total).toBe(107.49);
  });

  it('has no total to store — an empty invoice is zero, not blank', () => {
    const t = invoiceTotals({ ...base, lineItems: [] });
    expect(t).toEqual({ subtotal: 0, discount: 0, taxable: 0, tax: 0, total: 0 });
  });
});

describe('money and percent formatting', () => {
  it('drops decimals on whole amounts — the designs were drawn around "$2,400"', () => {
    expect(formatMoney(2400, 'USD')).toBe('$2,400');
    expect(formatMoney(8715.5, 'USD')).toBe('$8,715.50');
    expect(formatMoney(1200, 'EUR')).toBe('€1,200');
    expect(formatMoney(0, 'USD')).toBe('$0');
  });

  it('handles a currency it has no symbol for', () => {
    expect(formatMoney(10, 'XYZ')).toBe('XYZ 10');
  });

  it('trims trailing zeros from percentages', () => {
    expect(formatPercent(5)).toBe('5%');
    expect(formatPercent(7.5)).toBe('7.5%');
  });
});

describe('field specs drive the panel', () => {
  it('gives the invoice the controls its content actually needs', () => {
    const ids = fieldGroupsFor('invoice').map((g) => g.id);
    expect(ids).toEqual(['parties', 'reference', 'items', 'totals', 'notes']);
    const items = fieldGroupsFor('invoice').find((g) => g.id === 'items')!.fields[0];
    expect(items.type).toBe('list');
  });

  it('declares a nested list rather than a slide-shaped control', () => {
    // A deck slide is a row with its own list of bullets inside it. The
    // panel renders that by recursion; nothing in it knows what a slide is.
    const slides = fieldGroupsFor('deck').find((g) => g.id === 'slides')!.fields[0];
    if (slides.type !== 'list') throw new Error('expected a list');
    expect(slides.itemFields.some((f) => f.type === 'stringList' && f.path === 'bullets')).toBe(true);
    expect(slides.idPrefix).toBe('sl');
  });

  it('resolves a clicked region to its control, including inside a list', () => {
    const found = findFieldForPath('invoice', 'lineItems.2.unitPrice');
    expect(found?.field.type).toBe('money');
    expect(found?.absolutePath).toBe('lineItems.2.unitPrice');
    expect(found?.group.id).toBe('items');
  });

  it('resolves a path into a nested object and a nested list', () => {
    expect(findFieldForPath('deck', 'slides.3.quote.text')?.field.type).toBe('textarea');
    expect(findFieldForPath('deck', 'slides.3.quote.text')?.absolutePath).toBe('slides.3.quote.text');
    // One bullet resolves to the list that owns it — the control IS the list.
    const bullet = findFieldForPath('deck', 'slides.2.bullets.1');
    expect(bullet?.field.type).toBe('stringList');
    expect(bullet?.absolutePath).toBe('slides.2.bullets');
    expect(findFieldForPath('address', 'sender.name')?.group.id).toBe('sender');
    expect(findFieldForPath('webHero', 'nav.2')?.field.type).toBe('stringList');
  });

  it('resolves a plain field', () => {
    expect(findFieldForPath('person', 'jobTitle')?.group.id).toBe('identity');
    expect(findFieldForPath('person', 'nope')).toBeNull();
    expect(findFieldForPath('invoice', 'lineItems.2.nope')).toBeNull();
  });

  it('every field path exists in that kind\'s default content', () => {
    for (const kind of CONTENT_KINDS) {
      const content = defaultContentFor(kind, brand);
      for (const group of fieldGroupsFor(kind)) {
        for (const field of group.fields) {
          assertFieldResolves(kind, content, field, '');
        }
      }
    }
  });

  it('covers every top-level field of every kind', () => {
    // A field in the model with no control is a value only the renderer
    // can see — which is the state this whole model replaced.
    for (const kind of CONTENT_KINDS) {
      const content = defaultContentFor(kind, brand) as Record<string, unknown>;
      const paths = fieldGroupsFor(kind).flatMap((g) => g.fields.map((f) => f.path));
      for (const key of Object.keys(content)) {
        if (key === 'kind' || key === 'picks') continue;
        const covered = paths.some((p) => p === key || p.startsWith(`${key}.`));
        expect(covered, `${kind}.${key} has no control in the panel`).toBe(true);
      }
    }
  });
});

function assertFieldResolves(
  kind: ContentKind,
  root: unknown,
  field: FieldSpec,
  prefix: string,
): void {
  const path = prefix ? `${prefix}.${field.path}` : field.path;

  if (field.type === 'stringList') {
    expect(Array.isArray(getAtPath(root, path)), `${kind}.${path} should be a string list`).toBe(true);
    return;
  }

  if (field.type === 'list') {
    const list = getAtPath(root, path);
    expect(Array.isArray(list), `${kind}.${path} should be a list`).toBe(true);
    // The row Add creates must satisfy every control the row declares —
    // otherwise the first thing a user adds is a row of dead inputs.
    const template = field.itemDefaults ?? {};
    for (const itemField of field.itemFields) {
      expect(
        getAtPath(template, itemField.path),
        `${kind}.${path} itemDefaults is missing ${itemField.path}`,
      ).toBeDefined();
    }
    if (Array.isArray(list) && list.length > 0) {
      for (const itemField of field.itemFields) {
        assertFieldResolves(kind, root, itemField, `${path}.0`);
      }
    }
    return;
  }

  expect(
    getAtPath(root, path),
    `${kind}.${path} is declared by a panel field but absent from the model`,
  ).toBeDefined();
}
