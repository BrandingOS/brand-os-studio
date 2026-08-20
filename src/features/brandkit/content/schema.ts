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
 */
import { z } from 'zod';

export const PersonContentSchema = z.object({
  fullName: z.string(),
  jobTitle: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
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

/**
 * A line item as STORED: every field optional except the id, which is the
 * row's identity rather than one of its values (see above).
 */
const StoredInvoiceLineItemSchema = InvoiceLineItemSchema.partial().required({ id: true });

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
  PersonContentSchema.partial().extend({ kind: z.literal('person') }),
  LetterContentSchema.partial().extend({ kind: z.literal('letter') }),
  InvoiceContentSchema.partial().extend({
    kind: z.literal('invoice'),
    // `.partial()` is shallow, so the rows would still have been strict.
    lineItems: z.array(StoredInvoiceLineItemSchema).optional(),
  }),
]);

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
