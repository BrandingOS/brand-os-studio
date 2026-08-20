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

export const DeliverableContentSchema = z.discriminatedUnion('kind', [
  PersonContentSchema.extend({ kind: z.literal('person') }),
  LetterContentSchema.extend({ kind: z.literal('letter') }),
  InvoiceContentSchema.extend({ kind: z.literal('invoice') }),
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
