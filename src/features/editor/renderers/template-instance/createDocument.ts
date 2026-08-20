/**
 * Building a template-instance document, and instantiating one from a
 * master.
 *
 * The rule this file exists to enforce (spec §7.2): USE TEMPLATE COPIES.
 * `sourceTemplateId` is provenance — which master this came from — and
 * nothing resolves through it at load time. A user's filled-in invoice
 * must not be reshaped because someone tuned the master a month later.
 */
import { getContentTypeConfig } from '@/features/editor/content-types';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { DeliverableContent, TemplateDesignPicks } from '@/features/brandkit/content';

export function createTemplateInstanceDocument(args: {
  designId: string;
  brandId: string;
  contentType: string;
  templateId: string;
  content: DeliverableContent;
  design: TemplateDesignPicks;
  sourceTemplateId?: string;
}): BrandOSDocument {
  const config = getContentTypeConfig(args.contentType);
  const { width, height } = config.defaultDimensions;
  return {
    schemaVersion: 1,
    id: args.designId,
    contentType: args.contentType,
    brandId: args.brandId,
    masterPages: [],
    // One page, no layers. It is not a formality — the shell reads its
    // dimensions for zoom-to-fit, thumbnails and export sizing.
    pages: [
      {
        id: crypto.randomUUID(),
        name: config.label,
        width,
        height,
        background: '#ffffff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: args.sourceTemplateId ? { sourceTemplateId: args.sourceTemplateId } : {},
    body: {
      kind: 'template-instance',
      templateId: args.templateId,
      content: args.content,
      design: args.design,
    },
  } as BrandOSDocument;
}

/**
 * A working Design from a master.
 *
 * `structuredClone` rather than a spread: an invoice's line items are an
 * array of objects, and a shallow copy would leave the instance sharing
 * rows with the master — the exact live-sync this design forbids.
 */
export function instantiateFromMaster(
  master: BrandOSDocument,
  designId: string,
): BrandOSDocument {
  if (master.body?.kind !== 'template-instance') {
    throw new Error('instantiateFromMaster: the master has no template-instance body');
  }
  return {
    ...structuredClone(master),
    id: designId,
    familyId: undefined,
    sourceDesignId: undefined,
    metadata: { ...structuredClone(master.metadata), sourceTemplateId: master.id },
  } as BrandOSDocument;
}
