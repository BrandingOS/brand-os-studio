import { describe, it, expect } from 'vitest';
import { createTemplateInstanceDocument, instantiateFromMaster } from './createDocument';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import { defaultContentFor } from '@/features/brandkit/content';

const BRAND = { name: 'SKAM' };

/**
 * The invoice the model itself hands out for this brand.
 *
 * Asserted through rather than copied: the defaults are FACTS about the
 * brand (`brandFacts.ts`) and are meant to move when the brand does, so a
 * literal here would pin this file to whatever the ladder said the day it
 * was written instead of to the behaviour it is testing.
 */
function defaultInvoice() {
  const content = defaultContentFor('invoice', BRAND);
  if (content.kind !== 'invoice') throw new Error('narrowing failed');
  return content;
}

const args = {
  designId: '22222222-2222-4222-8222-222222222222',
  brandId: 'skam',
  contentType: 'invoice',
  templateId: 'invoices-ext-4',
  // A FRESH object per document. `createTemplateInstanceDocument` puts
  // the content on the body by reference, so a shared fixture would let
  // the mutation test below reach into every other test's document.
  get content() {
    return defaultInvoice();
  },
  design: {},
};

describe('createTemplateInstanceDocument', () => {
  it('produces a document the schema accepts', () => {
    expect(() => BrandOSDocumentSchema.parse(createTemplateInstanceDocument(args))).not.toThrow();
  });

  it('carries exactly one page with no layers, sized from the content type', () => {
    const doc = createTemplateInstanceDocument(args);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].layers).toEqual([]);
    expect(doc.pages[0].width).toBe(1080);
    expect(doc.pages[0].height).toBe(1920);
  });
});

describe('instantiateFromMaster', () => {
  it('deep-copies the body — later master edits cannot reach the instance', () => {
    const master = createTemplateInstanceDocument(args);
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');

    if (master.body?.kind !== 'template-instance' || instance.body?.kind !== 'template-instance') {
      throw new Error('narrowing failed');
    }
    if (master.body.content.kind !== 'invoice' || instance.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }

    master.body.content.clientName = 'Changed On The Master';
    master.body.content.lineItems[0].label = 'Changed Too';

    const defaults = defaultInvoice();
    expect(instance.body.content.clientName).toBe(defaults.clientName);
    expect(instance.body.content.lineItems[0].label).toBe(defaults.lineItems[0].label);
    // ...and the master really did move, so the copy is what held still.
    expect(master.body.content.clientName).toBe('Changed On The Master');
  });

  it('records provenance and its own identity', () => {
    const master = createTemplateInstanceDocument({ ...args, sourceTemplateId: 'invoices-ext-4' });
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    expect(instance.id).toBe('33333333-3333-4333-8333-333333333333');
    // `sourceTemplateId` means the CATALOG variant on every path that
    // writes it — the copy keeps the master's answer rather than
    // overwriting it with a design id.
    expect(instance.metadata.sourceTemplateId).toBe('invoices-ext-4');
    // Which DESIGN it was copied from is a separate question.
    expect(instance.metadata.sourceMasterId).toBe(master.id);
  });

  it('falls back to the body templateId when the master has no metadata id', () => {
    const master = createTemplateInstanceDocument(args);
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    expect(instance.metadata.sourceTemplateId).toBe('invoices-ext-4');
  });

  it('never produces a second master', () => {
    const master = createTemplateInstanceDocument(args);
    master.metadata = { ...master.metadata, isTemplate: true };
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    expect(instance.metadata.isTemplate).toBe(false);
  });
});
