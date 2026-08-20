/**
 * Which Design object is the canonical master for a deliverable variant.
 *
 * Masters are seeded LAZILY — on the first Edit Template, never for all
 * deliverables up front. A brand that never tunes its invoice never
 * accumulates a master for it.
 *
 * The master is identified by (contentType, sourceTemplateId, isTemplate)
 * rather than a separate index, so there is one storage model and nothing
 * to keep in sync.
 */
import type { DeliverableContent } from '@/features/brandkit/content';
import { createTemplateInstanceDocument } from '@/features/editor/renderers/template-instance/createDocument';
import type { IDesignStorage } from '@/core/types/services';

export async function ensureMasterDesign(args: {
  storage: IDesignStorage;
  brandId: string;
  contentType: string;
  templateId: string;
  label: string;
  seedContent: DeliverableContent;
}): Promise<string> {
  const existing = await args.storage.listDesigns(args.brandId);
  const master = existing.find(
    (d) =>
      d.isTemplate === true &&
      d.contentType === args.contentType &&
      d.sourceTemplateId === args.templateId,
  );
  if (master) return master.id;

  const designId = crypto.randomUUID();
  const doc = createTemplateInstanceDocument({
    designId,
    brandId: args.brandId,
    contentType: args.contentType,
    templateId: args.templateId,
    content: args.seedContent,
    design: {},
  });
  // Stamp `isTemplate` on the DOCUMENT itself too, not just the storage
  // summary — the editor route loads the doc body via `loadDesign` (no
  // summary attached), and it's the only signal it has for "am I looking
  // at a master?" (drives EditorDuplicateDesignButton's Use-template
  // behavior). The summary meta below remains the source of truth for
  // listing/lookup; this mirrors it onto the doc for readers who only
  // have the body.
  doc.metadata = { ...doc.metadata, isTemplate: true };
  await args.storage.saveDesign(args.brandId, designId, doc, {
    name: args.label,
    contentType: args.contentType,
    isTemplate: true,
    sourceTemplateId: args.templateId,
  });
  return designId;
}
