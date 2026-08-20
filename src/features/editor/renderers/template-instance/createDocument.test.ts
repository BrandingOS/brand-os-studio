import { describe, it, expect } from 'vitest';
import { createTemplateInstanceDocument, instantiateFromMaster } from './createDocument';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import { defaultContentFor } from '@/features/brandkit/content';

const args = {
  designId: '22222222-2222-4222-8222-222222222222',
  brandId: 'skam',
  contentType: 'invoice',
  templateId: 'invoices-ext-4',
  content: defaultContentFor('invoice', { name: 'SKAM' }),
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

    expect(instance.body.content.clientName).toBe('Acme Co.');
    expect(instance.body.content.lineItems[0].label).toBe('Brand Strategy');
  });

  it('records provenance and its own identity', () => {
    const master = createTemplateInstanceDocument(args);
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    expect(instance.id).toBe('33333333-3333-4333-8333-333333333333');
    expect(instance.metadata.sourceTemplateId).toBe(master.id);
  });
});
