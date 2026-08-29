/**
 * Zod mirrors of the content kinds.
 *
 * The TS types in `kinds.ts` stay the source of truth for authoring; these
 * exist because content now crosses a STORAGE boundary — it is the body of
 * a saved Design — and anything read back from storage must be validated
 * rather than trusted.
 *
 * `hydrateContent` is still what fills a partial value out to a complete
 * one. These schemas answer a narrower question: is this the right shape
 * at all.
 *
 * WHICH IS WHY THE STORED FORM IS TOLERANT. The schemas below describe
 * what a complete, freshly-authored value looks like; `DeliverableContent
 * Schema` — the one the document schema actually parses saved bodies
 * with — makes every field optional. Requiring them all would mean that
 * the moment a field is added to `kinds.ts`, every document saved before
 * it stopped parsing and became unopenable ("parse-failed"). That
 * directly contradicts `hydrateContent`'s documented job, which both the
 * template-instance canvas and its properties panel call precisely so a
 * body predating a field renders that field's default.
 *
 * The discriminant is the exception: `kind` stays required, because it is
 * what makes the union a union. A payload with no `kind` is not an
 * incomplete invoice, it is an unidentifiable object.
 *
 * `picks` rides along on every member. Content and design picks are ONE
 * saved object; a schema that knew only about the content half would
 * silently strip the other half on the way in, because `z.object` drops
 * what it was not told about — a data loss with no error attached.
 */
import { z } from 'zod';

/**
 * The choices that are not content: which brand colours, which logo,
 * which typeface. Every field optional — an unanswered pick means "use
 * the brand's default", which is what a freshly instantiated template
 * wants.
 */
export const TemplateDesignPicksSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoId: z.string().optional(),
  logoColor: z.string().optional(),
  fontId: z.string().optional(),
  showLogo: z.boolean().optional(),
});
export type TemplateDesignPicks = z.infer<typeof TemplateDesignPicksSchema>;

/* ── Complete forms ───────────────────────────────────────────────── */

export const PersonContentSchema = z.object({
  fullName: z.string(),
  jobTitle: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
  company: z.string(),
  address: z.string(),
  tagline: z.string(),
  pronouns: z.string().optional(),
  socialHandle: z.string().optional(),
});

export const LetterContentSchema = z.object({
  senderName: z.string(),
  senderAddress: z.string(),
  website: z.string(),
  phone: z.string(),
  date: z.string(),
  recipient: z.string(),
  subject: z.string(),
  body: z.string(),
});

export const InvoiceLineItemSchema = z.object({
  /**
   * Validated more strictly than its TS type (`string`) suggests, and
   * deliberately: this id is not descriptive, it is the item's IDENTITY
   * — what keeps a row stable across reorder, re-render and reload, and
   * what `nextLineItemId` derives the next id from. An empty string is
   * not a short id, it is a missing key, and two rows sharing it collide.
   * It is the ONE field the stored form below still insists on.
   */
  id: z.string().min(1),
  label: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
});

export const InvoiceContentSchema = z.object({
  issuerName: z.string(),
  issuerAddress: z.string(),
  clientName: z.string(),
  clientAddress: z.string(),
  number: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string(),
  lineItems: z.array(InvoiceLineItemSchema),
  discountRate: z.number(),
  taxRate: z.number(),
  notes: z.string(),
});

export const AddressBlockSchema = z.object({
  name: z.string(),
  lines: z.array(z.string()),
});

export const AddressContentSchema = z.object({
  sender: AddressBlockSchema,
  recipient: AddressBlockSchema,
  postageLabel: z.string().optional(),
});

export const NoteContentSchema = z.object({
  greeting: z.string(),
  message: z.string(),
  signOff: z.string(),
});

export const SocialPostContentSchema = z.object({
  headline: z.string(),
  subline: z.string(),
  body: z.string(),
  cta: z.string(),
  handle: z.string(),
  date: z.string(),
  tag: z.string(),
});

export const ProfileGlyphSchema = z.enum(['logo', 'initial', 'custom']);

export const ProfileContentSchema = z.object({
  glyph: ProfileGlyphSchema,
  text: z.string(),
  tabTitle: z.string(),
  url: z.string(),
});

export const WebHeroStatSchema = z.object({
  id: z.string().min(1),
  value: z.string(),
  label: z.string(),
});

export const WebHeroContentSchema = z.object({
  nav: z.array(z.string()),
  eyebrow: z.string(),
  headline: z.string(),
  subhead: z.string(),
  primaryCta: z.string(),
  secondaryCta: z.string(),
  stats: z.array(WebHeroStatSchema),
  url: z.string(),
});

export const DeckSlideKindSchema = z.enum([
  'title',
  'section',
  'content',
  'stat',
  'quote',
  'closing',
]);

export const DeckSlideSchema = z.object({
  id: z.string().min(1),
  kind: DeckSlideKindSchema,
  heading: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  stat: z.object({ value: z.string(), label: z.string() }),
  quote: z.object({ text: z.string(), by: z.string() }),
});

export const DeckContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  presenter: z.string(),
  date: z.string(),
  slides: z.array(DeckSlideSchema),
});

export const MockupLabelContentSchema = z.object({
  primaryText: z.string(),
  secondaryText: z.string(),
  badge: z.string(),
  url: z.string(),
});

export const MotionContentSchema = z.object({
  text: z.string(),
  durationMs: z.number(),
  loop: z.boolean(),
});

export const QrContentSchema = z.object({
  payload: z.string(),
  label: z.string(),
});

/* ── Stored forms ─────────────────────────────────────────────────── */

/**
 * A row as STORED: every field optional except the id, which is the row's
 * identity rather than one of its values (see above).
 */
const StoredInvoiceLineItemSchema = InvoiceLineItemSchema.partial().required({ id: true });
const StoredWebHeroStatSchema = WebHeroStatSchema.partial().required({ id: true });
const StoredDeckSlideSchema = DeckSlideSchema.partial()
  .required({ id: true })
  .extend({
    // `.partial()` is shallow, so these two would still have been strict.
    stat: z.object({ value: z.string().optional(), label: z.string().optional() }).optional(),
    quote: z.object({ text: z.string().optional(), by: z.string().optional() }).optional(),
  });
const StoredAddressBlockSchema = AddressBlockSchema.partial();

/** Every member of the stored union carries the design picks. */
function stored<K extends string, S extends z.ZodRawShape>(kind: K, shape: z.ZodObject<S>) {
  return shape.partial().extend({
    kind: z.literal(kind),
    picks: TemplateDesignPicksSchema.optional(),
  });
}

/**
 * What the document schema parses a saved body with.
 *
 * Additive by construction: adding a field to a content kind cannot make
 * an already-saved document unopenable, because the stored form never
 * required the field in the first place. `hydrateContent` fills it in on
 * the way to the renderer — which is exactly the division of labour the
 * canvas and the properties panel already document.
 */
export const DeliverableContentSchema = z.discriminatedUnion('kind', [
  stored('person', PersonContentSchema),
  stored('letter', LetterContentSchema),
  stored('invoice', InvoiceContentSchema).extend({
    lineItems: z.array(StoredInvoiceLineItemSchema).optional(),
  }),
  stored('address', AddressContentSchema).extend({
    sender: StoredAddressBlockSchema.optional(),
    recipient: StoredAddressBlockSchema.optional(),
  }),
  stored('note', NoteContentSchema),
  stored('socialPost', SocialPostContentSchema),
  stored('profile', ProfileContentSchema),
  stored('webHero', WebHeroContentSchema).extend({
    stats: z.array(StoredWebHeroStatSchema).optional(),
  }),
  stored('deck', DeckContentSchema).extend({
    slides: z.array(StoredDeckSlideSchema).optional(),
  }),
  stored('mockupLabel', MockupLabelContentSchema),
  stored('motion', MotionContentSchema),
  stored('qr', QrContentSchema),
]);
