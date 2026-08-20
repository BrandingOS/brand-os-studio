/**
 * Building a template-instance document, and instantiating one from a
 * master.
 *
 * The rule this file exists to enforce (spec §7.2): USE TEMPLATE COPIES.
 * `sourceTemplateId` is provenance — which CATALOG variant this came from
 * — and nothing resolves through it at load time. A user's filled-in
 * invoice must not be reshaped because someone tuned the master a month
 * later.
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
 * A deep, independent copy of a document under a new id.
 *
 * `structuredClone` rather than a spread: a document's payload is nested
 * (an invoice's line items are an array of objects, a page owns a layer
 * list), and a shallow copy would leave the copy sharing those nested
 * objects with its source — an edit to one silently reaching the other.
 *
 * Family lineage is deliberately dropped: a copy is its OWN design, not a
 * sibling variant of the source's resize family.
 */
export function duplicateDocument(
  source: BrandOSDocument,
  designId: string,
): BrandOSDocument {
  const next = structuredClone(source) as BrandOSDocument;
  next.id = designId;
  delete (next as { familyId?: string }).familyId;
  delete (next as { sourceDesignId?: string }).sourceDesignId;
  return next;
}

/**
 * A working Design from a master.
 *
 * Two things the copy must NOT inherit:
 *
 *   • `metadata.isTemplate` — the master carries it, and a copy that kept
 *     it would be a second master. It is written back as an explicit
 *     `false` rather than deleted, so a reader that asks "is this a
 *     template" gets an answer instead of an absence.
 *   • the master's identity as the template it came from. `metadata.
 *     sourceTemplateId` names the CATALOG variant (`invoices-ext-4`) on
 *     every path that writes it — the master's own document, the storage
 *     summary Brand Kit looks masters up by, and the Templates panel — so
 *     the copy keeps that same answer. Which DESIGN it was copied from is
 *     a different question and gets its own key.
 */
export function instantiateFromMaster(
  master: BrandOSDocument,
  designId: string,
): BrandOSDocument {
  if (master.body?.kind !== 'template-instance') {
    throw new Error('instantiateFromMaster: the master has no template-instance body');
  }
  const next = duplicateDocument(master, designId);
  const inherited = next.metadata?.sourceTemplateId;
  next.metadata = {
    ...(next.metadata ?? {}),
    isTemplate: false,
    sourceTemplateId:
      typeof inherited === 'string' && inherited ? inherited : master.body.templateId,
    sourceMasterId: master.id,
  };
  return next;
}
